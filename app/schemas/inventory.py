from datetime import datetime
from pydantic import BaseModel, Field


class InventoryAdjustmentRequest(BaseModel):
    quantity_delta: int = Field(..., description="Positive to add, negative to deduct")
    reorder_level: int | None = Field(default=None, ge=0)


class InventoryResponse(BaseModel):
    product_id: str
    quantity: int
    reorder_level: int
    updated_at: datetime

    class Config:
        from_attributes = True