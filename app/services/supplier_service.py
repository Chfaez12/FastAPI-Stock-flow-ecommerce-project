from sqlalchemy.orm import Session
from app.exceptions import ResourceAlreadyExistsException, ResourceNotFoundException
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate


def create_supplier(db: Session, data: SupplierCreate) -> Supplier:
    if db.query(Supplier).filter(Supplier.name == data.name).first():
        raise ResourceAlreadyExistsException(resource="Supplier", field="name", value=data.name)
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def list_suppliers(db: Session) -> list[Supplier]:
    return db.query(Supplier).all()


def update_supplier(db: Session, supplier_id: str, data: SupplierUpdate) -> Supplier:
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise ResourceNotFoundException(resource="Supplier", identifier=supplier_id)

    if data.name and data.name != supplier.name:
        if db.query(Supplier).filter(Supplier.name == data.name).first():
            raise ResourceAlreadyExistsException(resource="Supplier", field="name", value=data.name)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(supplier, key, value)

    db.commit()
    db.refresh(supplier)
    return supplier


def delete_supplier(db: Session, supplier_id: str):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise ResourceNotFoundException(resource="Supplier", identifier=supplier_id)
    db.delete(supplier)
    db.commit()


def get_supplier_by_id(db: Session, supplier_id: str) -> Supplier:
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise ResourceNotFoundException(resource="Supplier", identifier=supplier_id)
    return supplier