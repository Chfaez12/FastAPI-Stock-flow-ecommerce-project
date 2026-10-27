from decimal import Decimal

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session
from fastapi.security import HTTPAuthorizationCredentials
from app.core.pagination import PageParams, page_params
from app.dependencies.auth import bearer_scheme, get_current_user, get_db, require_roles
from app.models.product import ProductStatus
from app.models.user import User, UserRole
from app.schemas.pagination import Page
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.core import storage
from app.services import product_service
from app.services.product_service import ProductSort

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/", response_model=Page[ProductResponse], summary="Search, filter, sort and page through products")
def get_products(
    search: str | None = Query(None, max_length=100, description="Matches name, description or SKU"),
    category_id: str | None = None,
    product_status: ProductStatus | None = Query(None, alias="status"),
    min_price: Decimal | None = Query(None, ge=0),
    max_price: Decimal | None = Query(None, ge=0),
    in_stock: bool = Query(False, description="Only products with stock available"),
    sort: ProductSort = ProductSort.NEWEST,
    params: PageParams = Depends(page_params),
    db: Session = Depends(get_db),
):
    return product_service.list_products(
        db,
        params,
        search=search,
        category_id=category_id,
        status=product_status,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
        sort=sort,
    )

@router.get("/{product_id}", response_model=ProductResponse, summary="Get single product details")
def get_product(
    product_id: str,
    db: Session = Depends(get_db)
):
    return product_service.get_product_detail(db, product_id)
  

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
    _user=Depends(require_roles(UserRole.BUSINESS)),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    product_service.delete_product(db, product_id, credentials.credentials)


@router.post(
    "/{product_id}/image",
    response_model=ProductResponse,
    summary="[Business] Upload or replace a product image (JPEG, PNG or WEBP, max 5 MB)",
)
async def upload_product_image(
    product_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS)),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    # Read one byte past the limit so oversized files are rejected without loading them fully.
    content = await file.read(storage.MAX_IMAGE_BYTES + 1)
    # The caller's token lets Storage RLS authorize the upload when no service key is configured.
    return product_service.set_product_image(db, product_id, content, file.content_type, credentials.credentials)


@router.delete("/{product_id}/image", response_model=ProductResponse, summary="[Business] Remove a product image")
def delete_product_image(
    product_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(UserRole.BUSINESS)),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    return product_service.remove_product_image(db, product_id, credentials.credentials)
