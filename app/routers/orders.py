from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.pagination import PageParams, page_params
from app.dependencies.auth import get_db, require_roles, get_current_user
from app.models.order import OrderStatus
from app.models.user import User, UserRole
from app.schemas.order import OrderCreate, OrderResponse, OrderStatusUpdate
from app.schemas.pagination import Page
from app.services import order_service
from app.services.order_service import OrderSort

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


@router.get("/me", response_model=Page[OrderResponse], summary="[Customer] View own order history")
def get_my_orders(
    order_status: OrderStatus | None = Query(None, alias="status"),
    date_from: date | None = None,
    date_to: date | None = None,
    sort: OrderSort = OrderSort.NEWEST,
    params: PageParams = Depends(page_params),
    current_user: User = Depends(require_roles(UserRole.CUSTOMER)),
    db: Session = Depends(get_db)
):
    return order_service.list_orders(
        db, params, customer_id=current_user.id, status=order_status, date_from=date_from, date_to=date_to, sort=sort
    )


@router.get("/all", response_model=Page[OrderResponse], summary="[Business] View all customer orders")
def get_all_orders(
    order_status: OrderStatus | None = Query(None, alias="status"),
    customer_id: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort: OrderSort = OrderSort.NEWEST,
    params: PageParams = Depends(page_params),
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    return order_service.list_orders(
        db, params, customer_id=customer_id, status=order_status, date_from=date_from, date_to=date_to, sort=sort
    )


@router.patch("/{order_id}/status", response_model=OrderResponse, summary="[Business] Update order status")
def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    return order_service.update_order_status(db, order_id, data.status)

@router.post(
    "/{order_id}/cancel",
    response_model=OrderResponse,
    summary="[Customer] Cancel a pending order",
)
def cancel_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CUSTOMER)),
):
    return order_service.cancel_customer_order(db, order_id, current_user.id)