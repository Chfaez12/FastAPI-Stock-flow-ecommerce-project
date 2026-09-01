from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


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