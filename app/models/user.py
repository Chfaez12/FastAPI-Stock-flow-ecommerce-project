import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    BUSINESS = "BUSINESS"
    CUSTOMER = "CUSTOMER"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole, name="user_role_enum"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    business_profile = relationship("BusinessProfile", back_populates="user", uselist=False, cascade="all, delete")
    customer_profile = relationship("CustomerProfile", back_populates="user", uselist=False, cascade="all, delete")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete")


class BusinessProfile(Base):
    __tablename__ = "business_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_name = Column(String(255), nullable=False)
    tax_identifier = Column(String(100), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)

    user = relationship("User", back_populates="business_profile")


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(50), nullable=True)
    shipping_address = Column(Text, nullable=True)

    user = relationship("User", back_populates="customer_profile")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)
    family_id = Column(String(36), index=True, nullable=False)
    is_revoked = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="refresh_tokens")