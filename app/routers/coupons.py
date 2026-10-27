from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.pagination import PageParams, page_params
from app.dependencies.auth import get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.coupon import (
    CouponCreate,
    CouponResponse,
    CouponUpdate,
    CouponValidateRequest,
    CouponValidateResponse,
)
from app.schemas.pagination import Page
from app.services import coupon_service

router = APIRouter(prefix="/coupons", tags=["Coupons"])


@router.post(
    "/validate",
    response_model=CouponValidateResponse,
    summary="[Customer] Preview the discount a coupon gives on a cart subtotal",
)
def validate_coupon(
    data: CouponValidateRequest,
    current_user: User = Depends(require_roles(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
):
    return coupon_service.validate_coupon(db, data.code, current_user.id, data.subtotal)


@router.get("/", response_model=Page[CouponResponse], summary="[Business] List coupons")
def list_coupons(
    search: str | None = Query(None, max_length=50, description="Matches part of the code"),
    is_active: bool | None = None,
    params: PageParams = Depends(page_params),
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS)),
):
    return coupon_service.list_coupons(db, params, search=search, is_active=is_active)


@router.post(
    "/",
    response_model=CouponResponse,
    status_code=status.HTTP_201_CREATED,
    summary="[Business] Create a coupon",
)
def create_coupon(
    data: CouponCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS)),
):
    return coupon_service.create_coupon(db, data)


@router.get("/{coupon_id}", response_model=CouponResponse, summary="[Business] Get a coupon")
def get_coupon(
    coupon_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS)),
):
    return coupon_service.get_coupon(db, coupon_id)


@router.patch("/{coupon_id}", response_model=CouponResponse, summary="[Business] Update a coupon")
def update_coupon(
    coupon_id: str,
    data: CouponUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS)),
):
    return coupon_service.update_coupon(db, coupon_id, data)


@router.delete("/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT, summary="[Business] Delete a coupon")
def delete_coupon(
    coupon_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS)),
):
    coupon_service.delete_coupon(db, coupon_id)
