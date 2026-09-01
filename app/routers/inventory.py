from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.dependencies.auth import get_db, require_roles
from app.models.user import UserRole
from app.schemas.entities import InventoryResponse, InventoryAdjustmentRequest
from app.services import catalog_service

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/", response_model=list[InventoryResponse], summary="[Business] View stock across all products")
def get_inventory(
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    return catalog_service.get_all_inventory(db)


@router.post("/{product_id}/adjust", response_model=InventoryResponse, summary="[Business] Adjust stock levels")
def adjust_inventory(
    product_id: str,
    data: InventoryAdjustmentRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    return catalog_service.adjust_inventory(db, product_id, data)