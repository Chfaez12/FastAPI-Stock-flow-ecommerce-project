from sqlalchemy.orm import Session, joinedload
from app.exceptions import ResourceNotFoundException
from app.models.product import Product
from app.models.wishlist import WishlistItem
from app.services.product_service import with_stats


def list_wishlist(db: Session, user_id: str) -> list[WishlistItem]:
    items = (
        db.query(WishlistItem)
        .options(joinedload(WishlistItem.product))
        .filter(WishlistItem.user_id == user_id)
        .order_by(WishlistItem.created_at.desc())
        .all()
    )
    for item in items:
        with_stats(db, item.product)
    return items


def add_to_wishlist(db: Session, user_id: str, product_id: str) -> tuple[WishlistItem, bool]:
    """Add a product, returning (item, created). Adding a saved product again is a no-op."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise ResourceNotFoundException(resource="Product", identifier=product_id)

    item = (
        db.query(WishlistItem)
        .filter(WishlistItem.user_id == user_id, WishlistItem.product_id == product_id)
        .first()
    )
    created = item is None
    if created:
        item = WishlistItem(user_id=user_id, product_id=product_id)
        db.add(item)
        db.commit()
        db.refresh(item)
    with_stats(db, item.product)
    return item, created


def remove_from_wishlist(db: Session, user_id: str, product_id: str) -> None:
    item = (
        db.query(WishlistItem)
        .filter(WishlistItem.user_id == user_id, WishlistItem.product_id == product_id)
        .first()
    )
    if not item:
        raise ResourceNotFoundException(resource="Wishlist item", identifier=product_id)
    db.delete(item)
    db.commit()
