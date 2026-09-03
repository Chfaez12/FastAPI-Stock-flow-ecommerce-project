from sqlalchemy.orm import Session
from app.exceptions import ResourceAlreadyExistsException, ResourceNotFoundException
from app.models.category import Category
from app.models.inventory import Inventory
from app.models.product import Product, ProductStatus
from app.schemas.product import ProductCreate, ProductUpdate


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
    return product


def list_products(db: Session, category_id: str | None = None) -> list[dict]:
    query = db.query(Product)
    
    if category_id:
        query = query.filter(Product.category_id == category_id)

    products = query.all()
    result = []
    for p in products:
        inv = db.query(Inventory).filter(Inventory.product_id == p.id).first()
        result.append({
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
        })
    return result


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
    return product


def delete_product(db: Session, product_id: str):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise ResourceNotFoundException(resource="Product", identifier=product_id)
    db.delete(product)
    db.commit()

def get_product_by_id(db: Session, product_id: str) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise ResourceNotFoundException(resource="Product", identifier=product_id)
    return product