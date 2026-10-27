from pydantic import BaseModel, EmailStr, Field
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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    # The access token Supabase puts in the reset link's URL fragment (#access_token=...).
    access_token: str
    new_password: str = Field(..., min_length=6)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class MessageResponse(BaseModel):
    message: str


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
    # Empty when email confirmation is on: the user must verify before a session is issued.
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    email_verification_required: bool = False


class TokenRefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
