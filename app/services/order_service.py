from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from enum import Enum

from sqlalchemy.orm import Session, selectinload
from app.core.pagination import PageParams, paginate
from app.exceptions import (
    InsufficientStockException,
    PermissionDeniedException,
    ResourceNotFoundException,
    StockFlowException,
)
from app.models.inventory import Inventory
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product, ProductStatus
from app.schemas.order import OrderCreate
from app.services import coupon_service


class OrderSort(str, Enum):
    NEWEST = "newest"
    OLDEST = "oldest"
    TOTAL_DESC = "total_desc"
    TOTAL_ASC = "total_asc"


def place_customer_order(db: Session, customer_id: str, data: OrderCreate) -> Order:
    # Check every item and the coupon before changing anything, so a rejected order leaves no
    # partial stock deductions behind.
    lines: list[tuple[Product, Inventory, int]] = []
    reserved: dict[str, int] = {}
    subtotal = Decimal("0.00")

    for item_data in data.items:
        inv = db.query(Inventory).filter(Inventory.product_id == item_data.product_id).with_for_update().first()
        product = db.query(Product).filter(Product.id == item_data.product_id).first()

        if not product or product.status != ProductStatus.ACTIVE:
            raise StockFlowException(
                message=f"Product '{item_data.product_id}' is unavailable or inactive.",
                status_code=400
            )

        prod_name = product.name
        # The same product may appear on several lines, so count what earlier lines already took.
        avail_qty = (inv.quantity if inv else 0) - reserved.get(product.id, 0)

        if avail_qty < item_data.quantity:
            raise InsufficientStockException(
                product_name=prod_name,
                available=avail_qty,
                requested=item_data.quantity
            )

        reserved[product.id] = reserved.get(product.id, 0) + item_data.quantity
        subtotal += product.price * item_data.quantity
        lines.append((product, inv, item_data.quantity))

    coupon = None
    discount = Decimal("0.00")
    if data.coupon_code:
        # Re-checked here with the row locked: the discount the customer previewed is not trusted.
        coupon = coupon_service.get_applicable_coupon(db, data.coupon_code, customer_id, subtotal, lock=True)
        discount = coupon_service.calculate_discount(coupon, subtotal)

    order = Order(customer_id=customer_id, status=OrderStatus.PENDING)
    db.add(order)
    db.flush()

    for product, inv, quantity in lines:
        inv.quantity -= quantity
        db.add(OrderItem(order_id=order.id, product_id=product.id, quantity=quantity, unit_price=product.price))

    if coupon:
        coupon.times_used += 1
        order.coupon_id = coupon.id
        order.coupon_code = coupon.code

    order.subtotal_amount = subtotal
    order.discount_amount = discount
    order.total_amount = subtotal - discount
    db.commit()
    db.refresh(order)
    return order


def list_orders(
    db: Session,
    params: PageParams,
    customer_id: str | None = None,
    status: OrderStatus | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort: OrderSort = OrderSort.NEWEST,
) -> dict:
    query = db.query(Order).options(selectinload(Order.items))
    if customer_id:
        query = query.filter(Order.customer_id == customer_id)
    if status:
        query = query.filter(Order.status == status)
    if date_from:
        query = query.filter(Order.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        # Inclusive of the whole end day.
        end = datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=timezone.utc)
        query = query.filter(Order.created_at < end)

    order_by = {
        OrderSort.NEWEST: Order.created_at.desc(),
        OrderSort.OLDEST: Order.created_at.asc(),
        OrderSort.TOTAL_DESC: Order.total_amount.desc(),
        OrderSort.TOTAL_ASC: Order.total_amount.asc(),
    }[sort]
    return paginate(query.order_by(order_by, Order.id), params)


def _restock(db: Session, order: Order) -> None:
    for item in order.items:
        inv = db.query(Inventory).filter(Inventory.product_id == item.product_id).with_for_update().first()
        if inv:
            inv.quantity += item.quantity


def update_order_status(db: Session, order_id: str, new_status: OrderStatus) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ResourceNotFoundException(resource="Order", identifier=order_id)

    if new_status == OrderStatus.CANCELLED and order.status != OrderStatus.CANCELLED:
        _restock(db, order)
        coupon_service.release_coupon(db, order)

    order.status = new_status
    db.commit()
    db.refresh(order)
    return order

def cancel_customer_order(db: Session, order_id: str, customer_id: str) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ResourceNotFoundException(resource="Order", identifier=order_id)

    if order.customer_id != customer_id:
        raise PermissionDeniedException("You do not have permission to cancel this order.")

    if order.status != OrderStatus.PENDING:
        raise StockFlowException(
            message=f"Only PENDING orders can be cancelled. Current status is {order.status.value}.",
            status_code=400,
        )

    _restock(db, order)
    coupon_service.release_coupon(db, order)

    order.status = OrderStatus.CANCELLED
    db.commit()
    db.refresh(order)
    return order
