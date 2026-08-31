from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.dependencies.auth import get_db
from app.schemas.auth import (
    CustomerRegisterRequest,
    BusinessRegisterRequest,
    LoginRequest,
    TokenRefreshRequest,
    LogoutRequest,
    AuthResponse,
    TokenRefreshResponse
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register/customer", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_customer(data: CustomerRegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register_customer(db, data)


@router.post("/register/business", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_business(data: BusinessRegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register_business(db, data)


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login_user(db, data)


@router.post("/refresh", response_model=TokenRefreshResponse)
def refresh(data: TokenRefreshRequest, db: Session = Depends(get_db)):
    return auth_service.rotate_refresh_token(db, data.refresh_token)


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(data: LogoutRequest, db: Session = Depends(get_db)):
    auth_service.revoke_refresh_token(db, data.refresh_token)
    return {"message": "Logged out successfully"}