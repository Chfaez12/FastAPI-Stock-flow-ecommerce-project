from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.user import ChangePasswordRequest, UpdateAccountRequest
from app.services import user_service as auth_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse, summary="Get current authenticated user account")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse, summary="Update permitted account information")
def update_me(
    data: UpdateAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return auth_service.update_account(db, current_user, data)


@router.post(
    "/me/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change account password",
)
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_service.change_password(db, current_user, data)
    return {"message": "Password updated successfully"}

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT, summary="Delete current authenticated user account")
def delete_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_service.delete_user_account(db, current_user)
    auth_service.revoke_token()
    return None