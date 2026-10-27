from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.dependencies.auth import get_db
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenRefreshRequest,
    TokenRefreshResponse,
    UnifiedRegisterRequest,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user via Supabase Auth",
)
def register(data: UnifiedRegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register_user(db, data)


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Authenticate user via Supabase Auth",
)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login_user(db, data)


@router.post(
    "/refresh",
    response_model=TokenRefreshResponse,
    summary="Rotate Supabase refresh token",
)
def refresh(data: TokenRefreshRequest, db: Session = Depends(get_db)):
    return auth_service.rotate_refresh_token(db, data.refresh_token)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Revoke session in Supabase Auth",
)
def logout():
    auth_service.revoke_token()
    return {"message": "Logged out successfully"}


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Email a password reset link",
)
def forgot_password(data: ForgotPasswordRequest):
    auth_service.send_password_reset(data.email)
    return {"message": "If an account exists for that email, a password reset link has been sent."}


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Set a new password using the token from a reset link",
)
def reset_password(data: ResetPasswordRequest):
    auth_service.reset_password(data.access_token, data.new_password)
    return {"message": "Your password has been reset. You can now sign in."}


@router.post(
    "/resend-verification",
    response_model=MessageResponse,
    summary="Resend the email address confirmation link",
)
def resend_verification(data: ResendVerificationRequest):
    auth_service.resend_verification_email(data.email)
    return {"message": "If that account still needs verification, a new confirmation link has been sent."}
