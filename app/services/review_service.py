from enum import Enum

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.core.pagination import PageParams, paginate
from app.exceptions import (
    PermissionDeniedException,
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
    StockFlowException,
)
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.review import Review
from app.models.user import User, UserRole
from app.schemas.review import ReviewCreate, ReviewUpdate


class ReviewSort(str, Enum):
    NEWEST = "newest"
    OLDEST = "oldest"
    HIGHEST = "highest"
    LOWEST = "lowest"


def _ensure_product(db: Session, product_id: str) -> None:
    if not db.query(Product.id).filter(Product.id == product_id).first():
        raise ResourceNotFoundException(resource="Product", identifier=product_id)


def _has_received(db: Session, customer_id: str, product_id: str) -> bool:
    """Whether the customer has a delivered order containing the product."""
    return (
        db.query(OrderItem.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(
            Order.customer_id == customer_id,
            Order.status == OrderStatus.DELIVERED,
            OrderItem.product_id == product_id,
        )
        .first()
        is not None
    )


def _get_review(db: Session, review_id: str) -> Review:
    review = db.query(Review).options(joinedload(Review.user)).filter(Review.id == review_id).first()
    if not review:
        raise ResourceNotFoundException(resource="Review", identifier=review_id)
    return review


def _own_review(db: Session, product_id: str, user_id: str) -> Review | None:
    return (
        db.query(Review)
        .options(joinedload(Review.user))
        .filter(Review.product_id == product_id, Review.user_id == user_id)
        .first()
    )


def list_reviews(
    db: Session,
    product_id: str,
    params: PageParams,
    rating: int | None = None,
    sort: ReviewSort = ReviewSort.NEWEST,
) -> dict:
    _ensure_product(db, product_id)
    query = db.query(Review).options(joinedload(Review.user)).filter(Review.product_id == product_id)
    if rating:
        query = query.filter(Review.rating == rating)

    order_by = {
        ReviewSort.NEWEST: [Review.created_at.desc()],
        ReviewSort.OLDEST: [Review.created_at.asc()],
        ReviewSort.HIGHEST: [Review.rating.desc(), Review.created_at.desc()],
        ReviewSort.LOWEST: [Review.rating.asc(), Review.created_at.desc()],
    }[sort]
    return paginate(query.order_by(*order_by, Review.id), params)


def get_summary(db: Session, product_id: str) -> dict:
    _ensure_product(db, product_id)
    counts = dict(
        db.query(Review.rating, func.count(Review.id))
        .filter(Review.product_id == product_id)
        .group_by(Review.rating)
        .all()
    )
    total = sum(counts.values())
    average = sum(star * n for star, n in counts.items()) / total if total else None
    return {
        "product_id": product_id,
        "average_rating": round(average, 2) if average is not None else None,
        "review_count": total,
        "distribution": {str(star): counts.get(star, 0) for star in range(1, 6)},
    }


def get_eligibility(db: Session, product_id: str, customer: User) -> dict:
    _ensure_product(db, product_id)
    existing = _own_review(db, product_id, customer.id)
    if existing:
        return {"can_review": False, "reason": "You have already reviewed this product.", "existing_review": existing}
    if not _has_received(db, customer.id, product_id):
        return {"can_review": False, "reason": "Only customers who received this product can review it."}
    return {"can_review": True}


def create_review(db: Session, product_id: str, customer: User, data: ReviewCreate) -> Review:
    _ensure_product(db, product_id)
    if _own_review(db, product_id, customer.id):
        raise ResourceAlreadyExistsException(resource="Review", field="product", value=product_id)
    if not _has_received(db, customer.id, product_id):
        raise StockFlowException(
            message="Only customers who received this product can review it.",
            status_code=403,
        )

    review = Review(product_id=product_id, user_id=customer.id, **data.model_dump())
    db.add(review)
    db.commit()
    return _get_review(db, review.id)


def update_review(db: Session, review_id: str, user: User, data: ReviewUpdate) -> Review:
    review = _get_review(db, review_id)
    if review.user_id != user.id:
        raise PermissionDeniedException("You can only edit your own reviews.")
    for key, value in data.model_dump(exclude_unset=True).items():
        if key == "rating" and value is None:
            continue
        setattr(review, key, value)
    db.commit()
    return _get_review(db, review.id)


def delete_review(db: Session, review_id: str, user: User) -> None:
    review = _get_review(db, review_id)
    # Authors can remove their reviews; business users can moderate any review.
    if review.user_id != user.id and user.role != UserRole.BUSINESS:
        raise PermissionDeniedException("You can only delete your own reviews.")
    db.delete(review)
    db.commit()
