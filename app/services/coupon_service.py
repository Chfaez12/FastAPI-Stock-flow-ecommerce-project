from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.pagination import PageParams, like_pattern, paginate
from app.exceptions import ResourceAlreadyExistsException, ResourceNotFoundException, StockFlowException
from app.models.coupon import Coupon, DiscountType
from app.models.order import Order, OrderStatus
from app.schemas.coupon import CouponCreate, CouponUpdate

CENT = Decimal("0.01")


class InvalidCouponException(StockFlowException):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=400)


def _as_aware(value: datetime | None) -> datetime | None:
    # SQLite returns naive datetimes; treat them as UTC so comparisons work on every backend.
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def calculate_discount(coupon: Coupon, subtotal: Decimal) -> Decimal:
    if coupon.discount_type == DiscountType.PERCENTAGE:
        discount = subtotal * Decimal(coupon.discount_value) / Decimal(100)
        if coupon.max_discount_amount is not None:
            discount = min(discount, Decimal(coupon.max_discount_amount))
    else:
        discount = Decimal(coupon.discount_value)
    # Never discount below zero.
    return min(discount, subtotal).quantize(CENT, rounding=ROUND_HALF_UP)


def _user_redemptions(db: Session, coupon_id: str, customer_id: str) -> int:
    return (
        db.query(func.count(Order.id))
        .filter(
            Order.coupon_id == coupon_id,
            Order.customer_id == customer_id,
            Order.status != OrderStatus.CANCELLED,
        )
        .scalar()
    )


def get_applicable_coupon(
    db: Session,
    code: str,
    customer_id: str,
    subtotal: Decimal,
    lock: bool = False,
) -> Coupon:
    """
    Return the coupon for `code` if this customer can use it on an order of `subtotal`, else raise.

    With lock=True the row is locked until the transaction ends, so concurrent checkouts cannot
    push times_used past usage_limit.
    """
    query = db.query(Coupon).filter(Coupon.code == code.strip().upper())
    if lock:
        query = query.with_for_update()
    coupon = query.first()

    if not coupon or not coupon.is_active:
        raise InvalidCouponException("This coupon code is not valid.")

    now = datetime.now(timezone.utc)
    if coupon.starts_at and _as_aware(coupon.starts_at) > now:
        raise InvalidCouponException("This coupon is not active yet.")
    if coupon.expires_at and _as_aware(coupon.expires_at) <= now:
        raise InvalidCouponException("This coupon has expired.")
    if coupon.usage_limit is not None and coupon.times_used >= coupon.usage_limit:
        raise InvalidCouponException("This coupon has reached its usage limit.")
    if coupon.min_order_amount is not None and subtotal < coupon.min_order_amount:
        raise InvalidCouponException(
            f"This coupon requires a minimum order of {Decimal(coupon.min_order_amount):.2f}."
        )
    if (
        coupon.usage_limit_per_user is not None
        and _user_redemptions(db, coupon.id, customer_id) >= coupon.usage_limit_per_user
    ):
        raise InvalidCouponException("You have already used this coupon the maximum number of times.")

    return coupon


def validate_coupon(db: Session, code: str, customer_id: str, subtotal: Decimal) -> dict:
    coupon = get_applicable_coupon(db, code, customer_id, subtotal)
    discount = calculate_discount(coupon, subtotal)
    return {
        "code": coupon.code,
        "description": coupon.description,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "subtotal": subtotal,
        "discount_amount": discount,
        "total": subtotal - discount,
    }


def release_coupon(db: Session, order: Order) -> None:
    """Give back a cancelled order's coupon use."""
    if not order.coupon_id:
        return
    coupon = db.query(Coupon).filter(Coupon.id == order.coupon_id).with_for_update().first()
    if coupon and coupon.times_used > 0:
        coupon.times_used -= 1


def create_coupon(db: Session, data: CouponCreate) -> Coupon:
    if db.query(Coupon).filter(Coupon.code == data.code).first():
        raise ResourceAlreadyExistsException(resource="Coupon", field="code", value=data.code)
    coupon = Coupon(**data.model_dump())
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


def list_coupons(db: Session, params: PageParams, search: str | None = None, is_active: bool | None = None) -> dict:
    query = db.query(Coupon)
    if search and search.strip():
        query = query.filter(Coupon.code.ilike(like_pattern(search.strip()), escape="\\"))
    if is_active is not None:
        query = query.filter(Coupon.is_active == is_active)
    return paginate(query.order_by(Coupon.created_at.desc(), Coupon.id), params)


def get_coupon(db: Session, coupon_id: str) -> Coupon:
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise ResourceNotFoundException(resource="Coupon", identifier=coupon_id)
    return coupon


def update_coupon(db: Session, coupon_id: str, data: CouponUpdate) -> Coupon:
    coupon = get_coupon(db, coupon_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(coupon, key, value)

    if coupon.discount_type == DiscountType.PERCENTAGE and coupon.discount_value > 100:
        raise StockFlowException(message="A percentage discount cannot exceed 100.", status_code=422)
    if coupon.starts_at and coupon.expires_at and _as_aware(coupon.expires_at) <= _as_aware(coupon.starts_at):
        raise StockFlowException(message="expires_at must be after starts_at.", status_code=422)

    db.commit()
    db.refresh(coupon)
    return coupon


def delete_coupon(db: Session, coupon_id: str) -> None:
    coupon = get_coupon(db, coupon_id)
    # Orders keep their coupon_code; the FK is set to NULL by the database.
    db.query(Order).filter(Order.coupon_id == coupon.id).update({Order.coupon_id: None})
    db.delete(coupon)
    db.commit()
