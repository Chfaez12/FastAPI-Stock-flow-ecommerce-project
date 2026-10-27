from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.product import ProductResponse


class WishlistAddRequest(BaseModel):
    product_id: str


class WishlistItemResponse(BaseModel):
    id: str
    product_id: str
    created_at: datetime
    product: ProductResponse

    model_config = ConfigDict(from_attributes=True)
