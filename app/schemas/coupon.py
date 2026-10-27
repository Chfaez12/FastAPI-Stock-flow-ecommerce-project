from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.models.coupon import DiscountType


class CouponBase(BaseModel):
    code: str = Field(..., min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_-]+$")
    description: str | None = None
    discount_type: DiscountType
    discount_value: Decimal = Field(..., gt=0)
    min_order_amount: Decimal | None = Field(default=None, ge=0)
    max_discount_amount: Decimal | None = Field(default=None, gt=0)
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    usage_limit: int | None = Field(default=None, ge=1)
    usage_limit_per_user: int | None = Field(default=None, ge=1)
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().upper()


class CouponCreate(CouponBase):
    @model_validator(mode="after")
    def check_rules(self):
        if self.discount_type == DiscountType.PERCENTAGE and self.discount_value > 100:
            raise ValueError("A percentage discount cannot exceed 100.")
        if self.starts_at and self.expires_at and self.expires_at <= self.starts_at:
            raise ValueError("expires_at must be after starts_at.")
        return self


class CouponUpdate(BaseModel):
    description: str | None = None
    discount_type: DiscountType | None = None
    discount_value: Decimal | None = Field(default=None, gt=0)
    min_order_amount: Decimal | None = Field(default=None, ge=0)
    max_discount_amount: Decimal | None = Field(default=None, gt=0)
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    usage_limit: int | None = Field(default=None, ge=1)
    usage_limit_per_user: int | None = Field(default=None, ge=1)
    is_active: bool | None = None


class CouponResponse(CouponBase):
    id: str
    times_used: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CouponValidateRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    subtotal: Decimal = Field(..., ge=0)


class CouponValidateResponse(BaseModel):
    code: str
    description: str | None
    discount_type: DiscountType
    discount_value: Decimal
    subtotal: Decimal
    discount_amount: Decimal
    total: Decimal
