from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from app.models.order import OrderStatus


class OrderItemCreate(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(..., min_length=1)
    coupon_code: str | None = Field(default=None, max_length=50)


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
    subtotal_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    coupon_code: str | None = None
    status: OrderStatus
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse] = []

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: OrderStatus