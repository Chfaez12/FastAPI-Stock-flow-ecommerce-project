from sqlalchemy.orm import Session
from app.core.supabase_client import supabase
from app.exceptions import (
    AuthenticationFailedException,
    PermissionDeniedException,
    StockFlowException,
)
from app.models.user import User, UserRole
from app.schemas.auth import UnifiedRegisterRequest, LoginRequest


def register_user(db: Session, data: UnifiedRegisterRequest):
    try:
        res = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {
                    "name": data.name,
                    "phone": data.phone,
                    "role": data.role.value,
                }
            },
        })
    except Exception as e:
        raise StockFlowException(message=str(e), status_code=400)

    if not res.user:
        raise StockFlowException(message="Registration failed in Supabase Auth", status_code=400)

    user_id = str(res.user.id)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(
            id=user_id,
            name=data.name,
            email=data.email,
            phone=data.phone,
            password_hash="SUPABASE_AUTH_MANAGED",
            role=data.role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    session = res.session
    access_token = session.access_token if session else ""
    refresh_token = session.refresh_token if session else ""

    return {
        "user": user,
        "access_token": access_token,
        "refresh_token": refresh_token,
    }


def login_user(db: Session, data: LoginRequest):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password,
        })
    except Exception:
        raise AuthenticationFailedException()

    if not res.user or not res.session:
        raise AuthenticationFailedException()

    user_id = str(res.user.id)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raw_metadata = res.user.user_metadata or {}
        user_role = raw_metadata.get("role", UserRole.CUSTOMER.value)
        user_name = raw_metadata.get("name", data.email.split("@")[0])
        user = User(
            id=user_id,
            name=user_name,
            email=data.email,
            phone=raw_metadata.get("phone"),
            password_hash="SUPABASE_AUTH_MANAGED",
            role=UserRole(user_role),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise PermissionDeniedException()

    return {
        "user": user,
        "access_token": res.session.access_token,
        "refresh_token": res.session.refresh_token,
    }


def rotate_refresh_token(db: Session, refresh_token: str):
    try:
        res = supabase.auth.refresh_session(refresh_token)
    except Exception:
        raise AuthenticationFailedException()

    if not res.session:
        raise AuthenticationFailedException()

    return {
        "access_token": res.session.access_token,
        "refresh_token": res.session.refresh_token,
    }


def revoke_token():
    try:
        supabase.auth.sign_out()
    except Exception:
        pass

