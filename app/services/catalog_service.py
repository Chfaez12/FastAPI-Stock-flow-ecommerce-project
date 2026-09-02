from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.inventory import Inventory
from app.models.product import Product, ProductStatus

from app.schemas.category import CategoryCreate, CategoryUpdate
from app.schemas.inventory import InventoryAdjustmentRequest
from app.schemas.product import ProductCreate, ProductUpdate

def create_category(db: Session, data: CategoryCreate) -> Category:
    if db.query(Category).filter(Category.name == data.name).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category name already exists")
    category = Category(name=data.name, description=data.description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def list_categories(db: Session) -> list[Category]:
    return db.query(Category).all()


def update_category(db: Session, category_id: str, data: CategoryUpdate) -> Category:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    if data.name and data.name != category.name:
        if db.query(Category).filter(Category.name == data.name).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category name taken")
        category.name = data.name
    if data.description is not None:
        category.description = data.description
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: str):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    db.delete(category)
    db.commit()


def create_product(db: Session, data: ProductCreate) -> Product:
    if db.query(Product).filter(Product.sku == data.sku).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already exists")
    if data.category_id and not db.query(Category).filter(Category.id == data.category_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

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
    return product


def list_products(db: Session, is_business: bool, category_id: str | None = None) -> list[dict]:
    query = db.query(Product)
    if not is_business:
        query = query.filter(Product.status == ProductStatus.ACTIVE)
    if category_id:
        query = query.filter(Product.category_id == category_id)

    products = query.all()
    result = []
    for p in products:
        inv = db.query(Inventory).filter(Inventory.product_id == p.id).first()
        res_dict = {
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "description": p.description,
            "price": p.price,
            "status": p.status,
            "category_id": p.category_id,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "available_stock": inv.quantity if inv else 0
        }
        result.append(res_dict)
    return result


def update_product(db: Session, product_id: str, data: ProductUpdate) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if data.sku and data.sku != product.sku:
        if db.query(Product).filter(Product.sku == data.sku).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already exists")
        product.sku = data.sku
    if data.category_id and not db.query(Category).filter(Category.id == data.category_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: str):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    db.delete(product)
    db.commit()


def adjust_inventory(db: Session, product_id: str, data: InventoryAdjustmentRequest) -> Inventory:
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).with_for_update().first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found")

    new_quantity = inv.quantity + data.quantity_delta
    if new_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient inventory. Current stock: {inv.quantity}"
        )

    inv.quantity = new_quantity
    if data.reorder_level is not None:
        inv.reorder_level = data.reorder_level

    db.commit()
    db.refresh(inv)
    return inv


def get_all_inventory(db: Session) -> list[Inventory]:
    return db.query(Inventory).all()