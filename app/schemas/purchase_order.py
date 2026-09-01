from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from app.models.purchase_order import PurchaseOrderStatus


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