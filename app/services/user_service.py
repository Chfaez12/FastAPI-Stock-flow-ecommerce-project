from sqlalchemy.orm import Session
from app.core.supabase_client import supabase
from app.exceptions import AuthenticationFailedException, StockFlowException
from app.models.user import User
from app.schemas.user import ChangePasswordRequest, UpdateAccountRequest


def update_account(db: Session, current_user: User, data: UpdateAccountRequest) -> User:
   
    user = db.merge(current_user)

    update_data = data.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if hasattr(user, field) and val is not None:
            setattr(user, field, val)

    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        supabase.auth.admin.update_user_by_id(
            user.id,
            {"user_metadata": {"name": user.name, "phone": user.phone}},
        )
    except Exception:
        pass  

    return user

def change_password(db: Session, current_user: User, data: ChangePasswordRequest) -> None:
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": current_user.email,
            "password": data.current_password,
        })
        if not auth_response.session:
            raise AuthenticationFailedException("Authentication failed: No active session.")
    except Exception:
        raise AuthenticationFailedException("Current password is incorrect.")

    try:
        supabase.auth.update_user({"password": data.new_password})
    except Exception as e:
        raise StockFlowException(
            message=f"Could not update password: {str(e)}",
            status_code=400,
        )



def delete_user_account(db: Session, current_user: User) -> None:
    user = db.merge(current_user)

    user.is_active = False
    user.name = "Deleted User"
    user.phone = None
    db.commit()

    try:
        supabase.auth.admin.delete_user(str(user.id))
    except Exception as e:
        raise StockFlowException(
            message=f"Account deactivated locally, but Supabase auth cleanup failed: {str(e)}",
            status_code=500,
        )