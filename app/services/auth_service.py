from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.supabase_client import supabase
from app.models.user import User, UserRole
from app.schemas.auth import UnifiedRegisterRequest, LoginRequest, TokenRefreshRequest


def register_user(db: Session, data: UnifiedRegisterRequest):
    try:
        res = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {
                    "name": data.name,
                    "phone": data.phone,
                    "role": data.role.value
                }
            }
        })
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not res.user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration failed in Supabase Auth")

    user_id = str(res.user.id)


    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(
            id=user_id,
            name=data.name,
            email=data.email,
            phone=data.phone,
            password_hash="SUPABASE_AUTH_MANAGED",
            role=data.role
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
        "refresh_token": refresh_token
    }


def login_user(db: Session, data: LoginRequest):
    try:
    
        res = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not res.user or not res.session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user_id = str(res.user.id)

    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user_role = res.user.user_metadata.get("role", UserRole.CUSTOMER.value)
        user_name = res.user.user_metadata.get("name", data.email.split("@")[0])
        user = User(
            id=user_id,
            name=user_name,
            email=data.email,
            phone=res.user.user_metadata.get("phone"),
            password_hash="SUPABASE_AUTH_MANAGED",
            role=UserRole(user_role)
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    return {
        "user": user,
        "access_token": res.session.access_token,
        "refresh_token": res.session.refresh_token
    }


def rotate_refresh_token(db: Session, refresh_token: str):
    try:
        
        res = supabase.auth.refresh_session(refresh_token)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    if not res.session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unable to refresh session")

    return {
        "access_token": res.session.access_token,
        "refresh_token": res.session.refresh_token
    }


def revoke_token():
    try:
        supabase.auth.sign_out()
    except Exception:
        pass