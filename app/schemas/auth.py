from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UnifiedRegisterRequest(BaseModel):
    name: str 
    email: EmailStr
    password: str
    phone: str | None = None
    role: UserRole  


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str | None
    role: UserRole
    is_active: bool

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