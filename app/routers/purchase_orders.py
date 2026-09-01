from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.dependencies.auth import get_db, require_roles
from app.models.user import UserRole
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    PurchaseOrderStatusUpdate,
)
from app.services import purchase_order_service

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])


@router.get("/", response_model=list[PurchaseOrderResponse], summary="[Business] List purchase orders")
def list_purchase_orders(
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    return purchase_order_service.list_purchase_orders(db)


@router.post(
    "/",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="[Business] Create a purchase order"
)
def create_purchase_order(
    data: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    return purchase_order_service.create_purchase_order(db, data)


@router.patch(
    "/{po_id}/status",
    response_model=PurchaseOrderResponse,
    summary="[Business] Update purchase order status"
)
def update_purchase_order_status(
    po_id: str,
    data: PurchaseOrderStatusUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    return purchase_order_service.update_purchase_order_status(db, po_id, data.status)