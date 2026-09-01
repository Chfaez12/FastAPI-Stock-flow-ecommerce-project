from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from app.models.product import ProductStatus


class ProductBase(BaseModel):
    sku: str = Field(..., max_length=100)
    name: str = Field(..., max_length=255)
    description: str | None = None
    price: Decimal = Field(..., gt=0)
    status: ProductStatus = ProductStatus.ACTIVE
    category_id: str | None = None


class ProductCreate(ProductBase):
    initial_quantity: int = Field(default=0, ge=0)


class ProductUpdate(BaseModel):
    sku: str | None = None
    name: str | None = None
    description: str | None = None
    price: Decimal | None = Field(default=None, gt=0)
    status: ProductStatus | None = None
    category_id: str | None = None


class ProductResponse(ProductBase):
    id: str
    created_at: datetime
    updated_at: datetime
    available_stock: int | None = None

    class Config:
        from_attributes = True