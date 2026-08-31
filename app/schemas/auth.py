from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class CustomerRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str | None = None
    shipping_address: str | None = None


class BusinessRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    company_name: str
    tax_identifier: str | None = None
    contact_phone: str | None = None
    address: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    role: UserRole

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"