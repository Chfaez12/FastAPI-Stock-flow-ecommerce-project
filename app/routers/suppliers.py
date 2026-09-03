from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.dependencies.auth import get_db, require_roles
from app.models.user import UserRole
from app.schemas.supplier import SupplierCreate, SupplierResponse, SupplierUpdate
from app.services import supplier_service

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("/", response_model=list[SupplierResponse], summary="[Business] List all suppliers")
def get_suppliers(
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    return supplier_service.list_suppliers(db)

@router.get("/{supplier_id}", response_model=SupplierResponse, summary="[Business] Get single supplier profile")
def get_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS)),
):
    return supplier_service.get_supplier_by_id(db, supplier_id)


@router.post(
    "/",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
    summary="[Business] Create a supplier"
)
def create_supplier(
    data: SupplierCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    return supplier_service.create_supplier(db, data)


@router.patch("/{supplier_id}", response_model=SupplierResponse, summary="[Business] Update supplier")
def update_supplier(
    supplier_id: str,
    data: SupplierUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    return supplier_service.update_supplier(db, supplier_id, data)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT, summary="[Business] Delete supplier")
def delete_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    supplier_service.delete_supplier(db, supplier_id)