from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from app.dependencies.auth import get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.wishlist import WishlistAddRequest, WishlistItemResponse
from app.services import wishlist_service

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("/", response_model=list[WishlistItemResponse], summary="[Customer] View saved products")
def get_wishlist(
    current_user: User = Depends(require_roles(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
):
    return wishlist_service.list_wishlist(db, current_user.id)


@router.post(
    "/",
    response_model=WishlistItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="[Customer] Save a product (200 if it was already saved)",
)
def add_to_wishlist(
    data: WishlistAddRequest,
    response: Response,
    current_user: User = Depends(require_roles(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
):
    item, created = wishlist_service.add_to_wishlist(db, current_user.id, data.product_id)
    if not created:
        response.status_code = status.HTTP_200_OK
    return item


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="[Customer] Remove a product from the wishlist",
)
def remove_from_wishlist(
    product_id: str,
    current_user: User = Depends(require_roles(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
):
    wishlist_service.remove_from_wishlist(db, current_user.id, product_id)
