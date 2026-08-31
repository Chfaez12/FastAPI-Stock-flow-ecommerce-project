import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User, BusinessProfile, CustomerProfile, RefreshToken, UserRole
from app.schemas.auth import CustomerRegisterRequest, BusinessRegisterRequest, LoginRequest
from app.utils.security import (
    hash_password,
    verify_password,
    hash_token,
    generate_random_token,
    create_access_token
)
from app.config import settings


def _issue_refresh_token(db: Session, user_id: str, family_id: str | None = None) -> str:
    raw_token = generate_random_token()
    token_hashed = hash_token(raw_token)
    family = family_id or str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    token_record = RefreshToken(
        user_id=user_id,
        token_hash=token_hashed,
        family_id=family,
        expires_at=expires_at
    )
    db.add(token_record)
    db.commit()
    return raw_token


def register_customer(db: Session, data: CustomerRegisterRequest):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role=UserRole.CUSTOMER
    )
    db.add(user)
    db.flush()

    profile = CustomerProfile(
        user_id=user.id,
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        shipping_address=data.shipping_address
    )
    db.add(profile)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.id, user.email, user.role.value)
    refresh_token = _issue_refresh_token(db, user.id)
    return {"user": user, "access_token": access_token, "refresh_token": refresh_token}


def register_business(db: Session, data: BusinessRegisterRequest):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role=UserRole.BUSINESS
    )
    db.add(user)
    db.flush()

    profile = BusinessProfile(
        user_id=user.id,
        company_name=data.company_name,
        tax_identifier=data.tax_identifier,
        contact_phone=data.contact_phone,
        address=data.address
    )
    db.add(profile)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.id, user.email, user.role.value)
    refresh_token = _issue_refresh_token(db, user.id)
    return {"user": user, "access_token": access_token, "refresh_token": refresh_token}


def login_user(db: Session, data: LoginRequest):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    access_token = create_access_token(user.id, user.email, user.role.value)
    refresh_token = _issue_refresh_token(db, user.id)
    return {"user": user, "access_token": access_token, "refresh_token": refresh_token}


def rotate_refresh_token(db: Session, raw_token: str):
    token_hashed = hash_token(raw_token)
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hashed).first()

    if not record:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if record.is_revoked:
        db.query(RefreshToken).filter(RefreshToken.family_id == record.family_id).update({"is_revoked": True})
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token reuse detected. All sessions revoked for security."
        )

    if record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    record.is_revoked = True

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or removed")

    new_access_token = create_access_token(user.id, user.email, user.role.value)
    new_refresh_token = _issue_refresh_token(db, user.id, family_id=record.family_id)
    return {"access_token": new_access_token, "refresh_token": new_refresh_token}


def revoke_refresh_token(db: Session, raw_token: str):
    token_hashed = hash_token(raw_token)
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hashed).first()
    if record:
        record.is_revoked = True
        db.commit()