from pydantic import BaseModel, Field, EmailStr
from decimal import Decimal
from datetime import datetime
from app.models.entities import ProductStatus, OrderStatus, PurchaseOrderStatus


class CategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: str | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class CategoryResponse(CategoryBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


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


class InventoryResponse(BaseModel):
    product_id: str
    quantity: int
    reorder_level: int
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductResponse(ProductBase):
    id: str
    created_at: datetime
    updated_at: datetime
    available_stock: int | None = None

    class Config:
        from_attributes = True


class InventoryAdjustmentRequest(BaseModel):
    quantity_delta: int = Field(..., description="Positive to add, negative to deduct")
    reorder_level: int | None = Field(default=None, ge=0)


class SupplierBase(BaseModel):
    name: str = Field(..., max_length=255)
    contact_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: str | None = None
    contact_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None


class SupplierResponse(SupplierBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class OrderItemCreate(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(..., min_length=1)


class OrderItemResponse(BaseModel):
    id: str
    product_id: str
    quantity: int
    unit_price: Decimal

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: str
    customer_id: str
    total_amount: Decimal
    status: OrderStatus
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse] = []

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class PurchaseOrderItemCreate(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)
    unit_cost: Decimal = Field(..., gt=0)


class PurchaseOrderCreate(BaseModel):
    supplier_id: str
    items: list[PurchaseOrderItemCreate] = Field(..., min_length=1)


class PurchaseOrderItemResponse(BaseModel):
    id: str
    product_id: str
    quantity: int
    unit_cost: Decimal

    class Config:
        from_attributes = True


class PurchaseOrderResponse(BaseModel):
    id: str
    supplier_id: str
    total_amount: Decimal
    status: PurchaseOrderStatus
    created_at: datetime
    updated_at: datetime
    items: list[PurchaseOrderItemResponse] = []

    class Config:
        from_attributes = True


class PurchaseOrderStatusUpdate(BaseModel):
    status: PurchaseOrderStatus