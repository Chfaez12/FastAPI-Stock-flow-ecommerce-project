from decimal import Decimal
from enum import Enum

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from app.core import storage
from app.core.pagination import PageParams, like_pattern, paginate
from app.exceptions import ResourceAlreadyExistsException, ResourceNotFoundException, StockFlowException
from app.models.category import Category
from app.models.inventory import Inventory
from app.models.order import OrderItem
from app.models.product import Product, ProductStatus
from app.models.purchase_order import PurchaseOrderItem
from app.models.review import Review
from app.schemas.product import ProductCreate, ProductUpdate


class ProductSort(str, Enum):
    FEATURED = "featured"
    NEWEST = "newest"
    OLDEST = "oldest"
    PRICE_ASC = "price_asc"
    PRICE_DESC = "price_desc"
    NAME_ASC = "name_asc"
    NAME_DESC = "name_desc"
    RATING = "rating"


def _rating_stats():
    return (
        select(
            Review.product_id.label("product_id"),
            func.avg(Review.rating).label("average_rating"),
            func.count(Review.id).label("review_count"),
        )
        .group_by(Review.product_id)
        .subquery()
    )


def _apply_stats(product: Product, quantity, average_rating, review_count) -> Product:
    setattr(product, "available_stock", quantity or 0)
    setattr(product, "average_rating", round(float(average_rating), 2) if average_rating is not None else None)
    setattr(product, "review_count", review_count or 0)
    return product


def with_stats(db: Session, product: Product) -> Product:
    """Attach stock and rating fields to a single product for ProductResponse."""
    quantity = db.query(Inventory.quantity).filter(Inventory.product_id == product.id).scalar()
    average_rating, review_count = (
        db.query(func.avg(Review.rating), func.count(Review.id)).filter(Review.product_id == product.id).one()
    )
    return _apply_stats(product, quantity, average_rating, review_count)


def create_product(db: Session, data: ProductCreate) -> Product:
    if db.query(Product).filter(Product.sku == data.sku).first():
        raise ResourceAlreadyExistsException(resource="Product", field="sku", value=data.sku)

    if data.category_id and not db.query(Category).filter(Category.id == data.category_id).first():
        raise ResourceNotFoundException(resource="Category", identifier=data.category_id)

    product = Product(
        sku=data.sku,
        name=data.name,
        description=data.description,
        price=data.price,
        status=data.status,
        category_id=data.category_id
    )
    db.add(product)
    db.flush()

    inventory = Inventory(product_id=product.id, quantity=data.initial_quantity)
    db.add(inventory)
    db.commit()
    db.refresh(product)
    return _apply_stats(product, data.initial_quantity, None, 0)


def list_products(
    db: Session,
    params: PageParams,
    search: str | None = None,
    category_id: str | None = None,
    status: ProductStatus | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    in_stock: bool = False,
    sort: ProductSort = ProductSort.NEWEST,
) -> dict:
    stats = _rating_stats()
    quantity = func.coalesce(Inventory.quantity, 0)
    # One query fetches products with their stock and rating, instead of one extra query per product.
    query = (
        db.query(Product, Inventory.quantity, stats.c.average_rating, stats.c.review_count)
        .outerjoin(Inventory, Inventory.product_id == Product.id)
        .outerjoin(stats, stats.c.product_id == Product.id)
    )

    if search and search.strip():
        pattern = like_pattern(search.strip())
        query = query.filter(
            or_(
                Product.name.ilike(pattern, escape="\\"),
                Product.description.ilike(pattern, escape="\\"),
                Product.sku.ilike(pattern, escape="\\"),
            )
        )
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if status:
        query = query.filter(Product.status == status)
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if in_stock:
        query = query.filter(quantity > 0)

    order_by = {
        ProductSort.FEATURED: [(quantity > 0).desc(), Product.created_at.desc()],
        ProductSort.NEWEST: [Product.created_at.desc()],
        ProductSort.OLDEST: [Product.created_at.asc()],
        ProductSort.PRICE_ASC: [Product.price.asc()],
        ProductSort.PRICE_DESC: [Product.price.desc()],
        ProductSort.NAME_ASC: [Product.name.asc()],
        ProductSort.NAME_DESC: [Product.name.desc()],
        ProductSort.RATING: [
            func.coalesce(stats.c.average_rating, 0).desc(),
            func.coalesce(stats.c.review_count, 0).desc(),
        ],
    }[sort]
    # The id tie-breaker keeps pages stable when many rows share a sort value.
    query = query.order_by(*order_by, Product.id)

    return paginate(query, params, lambda rows: [_apply_stats(*row) for row in rows])


def update_product(db: Session, product_id: str, data: ProductUpdate) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise ResourceNotFoundException(resource="Product", identifier=product_id)

    if data.sku and data.sku != product.sku:
        if db.query(Product).filter(Product.sku == data.sku).first():
            raise ResourceAlreadyExistsException(resource="Product", field="sku", value=data.sku)
        product.sku = data.sku

    if data.category_id and not db.query(Category).filter(Category.id == data.category_id).first():
        raise ResourceNotFoundException(resource="Category", identifier=data.category_id)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return with_stats(db, product)


def delete_product(db: Session, product_id: str, access_token: str | None = None):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise ResourceNotFoundException(resource="Product", identifier=product_id)

    # Orders and purchase orders keep a permanent record of what was sold or bought.
    on_orders = db.query(OrderItem.id).filter(OrderItem.product_id == product_id).first() is not None
    on_purchase_orders = (
        db.query(PurchaseOrderItem.id).filter(PurchaseOrderItem.product_id == product_id).first() is not None
    )
    if on_orders or on_purchase_orders:
        where = " and ".join(
            label for label, used in (("customer orders", on_orders), ("purchase orders", on_purchase_orders)) if used
        )
        raise StockFlowException(
            message=f"'{product.name}' appears on existing {where}, so it can't be deleted. Archive it instead.",
            status_code=409,
            details={"reason": "product_in_use"},
        )

    image_url = product.image_url
    db.delete(product)
    db.commit()
    storage.delete_image_by_url(image_url, access_token)

def get_product_by_id(db: Session, product_id: str) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise ResourceNotFoundException(resource="Product", identifier=product_id)
    return product


def get_product_detail(db: Session, product_id: str) -> Product:
    return with_stats(db, get_product_by_id(db, product_id))


def set_product_image(
    db: Session,
    product_id: str,
    content: bytes,
    content_type: str | None,
    access_token: str | None = None,
) -> Product:
    product = get_product_by_id(db, product_id)
    extension = storage.validate_image(content, content_type)
    new_url = storage.upload_product_image(product.id, content, content_type, extension, access_token)

    old_url = product.image_url
    product.image_url = new_url
    db.commit()
    db.refresh(product)
    storage.delete_image_by_url(old_url, access_token)
    return with_stats(db, product)


def remove_product_image(db: Session, product_id: str, access_token: str | None = None) -> Product:
    product = get_product_by_id(db, product_id)
    old_url = product.image_url
    product.image_url = None
    db.commit()
    db.refresh(product)
    storage.delete_image_by_url(old_url, access_token)
    return with_stats(db, product)
