from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.dependencies.auth import get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.order import OrderCreate, OrderResponse, OrderStatusUpdate
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post(
    "/",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="[Customer] Place a new order"
)
def place_order(
    data: OrderCreate,
    current_user: User = Depends(require_roles(UserRole.CUSTOMER)),
    db: Session = Depends(get_db)
):
    return order_service.place_customer_order(db, current_user.id, data)


@router.get("/me", response_model=list[OrderResponse], summary="[Customer] View own order history")
def get_my_orders(
    current_user: User = Depends(require_roles(UserRole.CUSTOMER)),
    db: Session = Depends(get_db)
):
    return order_service.get_customer_orders(db, current_user.id)


@router.get("/all", response_model=list[OrderResponse], summary="[Business] View all customer orders")
def get_all_orders(
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    return order_service.get_all_orders_for_business(db)


@router.patch("/{order_id}/status", response_model=OrderResponse, summary="[Business] Update order status")
def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    return order_service.update_order_status(db, order_id, data.status)