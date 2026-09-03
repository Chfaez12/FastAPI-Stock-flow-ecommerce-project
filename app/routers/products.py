from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.dependencies.auth import get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services import product_service

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/", response_model=list[ProductResponse], summary="List available products")
def get_products(
    category_id: str | None = None,
    db: Session = Depends(get_db),
):
    return product_service.list_products(db, category_id=category_id)

@router.get("/{product_id}", response_model=ProductResponse, summary="Get single product details")
def get_product(
    product_id: str,
    db: Session = Depends(get_db)
):
    return product_service.get_product_by_id(db, product_id)
  

@router.post(
    "/",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="[Business] Create a product"
)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    return product_service.create_product(db, data)

  
@router.patch("/{product_id}", response_model=ProductResponse, summary="[Business] Update product")
def update_product(
    product_id: str,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    return product_service.update_product(db, product_id, data)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT, summary="[Business] Delete product")
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS))
):
    product_service.delete_product(db, product_id)