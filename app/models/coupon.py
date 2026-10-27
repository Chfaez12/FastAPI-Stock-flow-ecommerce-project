import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, String, DateTime, Enum as SQLEnum, Integer, Numeric, Text
from app.db.session import Base


class DiscountType(str, enum.Enum):
    PERCENTAGE = "PERCENTAGE"
    FIXED = "FIXED"


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Stored upper-case so codes match case-insensitively.
    code = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    discount_type = Column(SQLEnum(DiscountType, name="discount_type_enum"), nullable=False)
    discount_value = Column(Numeric(10, 2), nullable=False)
    min_order_amount = Column(Numeric(12, 2), nullable=True)
    # Caps a percentage discount, e.g. "20% off, up to $50".
    max_discount_amount = Column(Numeric(12, 2), nullable=True)
    starts_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    usage_limit = Column(Integer, nullable=True)
    usage_limit_per_user = Column(Integer, nullable=True)
    times_used = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
