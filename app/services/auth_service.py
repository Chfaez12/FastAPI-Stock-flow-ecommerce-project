import logging

import httpx
import jwt
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.supabase_client import supabase
from app.exceptions import (
    AuthenticationFailedException,
    PermissionDeniedException,
    StockFlowException,
)
from app.models.user import User, UserRole
from app.schemas.auth import UnifiedRegisterRequest, LoginRequest

logger = logging.getLogger("stockflow.auth")


def _frontend_link(path: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}{path}"


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
                },
                # Where the "confirm your email" link lands when email confirmation is enabled.
                "email_redirect_to": _frontend_link("/verify-email"),
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
        # Supabase returns no session until the address is confirmed.
        "email_verification_required": session is None,
    }


def login_user(db: Session, data: LoginRequest):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password,
        })
    except Exception as e:
        if "email not confirmed" in str(e).lower():
            raise StockFlowException(
                message="Please verify your email address before signing in.",
                status_code=403,
                details={"reason": "email_not_verified"},
            )
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


def send_password_reset(email: str) -> None:
    """Email a reset link. Errors are logged, not returned, so the endpoint never reveals whether an account exists."""
    try:
        supabase.auth.reset_password_for_email(email, {"redirect_to": _frontend_link("/reset-password")})
    except Exception as e:
        logger.warning(f"Password reset email for {email} failed: {e}")


def reset_password(access_token: str, new_password: str) -> None:
    # Only a session that came from a reset link may set a password without the current one,
    # so a stolen everyday access token cannot be used to take over the account.
    try:
        claims = jwt.decode(access_token, options={"verify_signature": False})
    except jwt.PyJWTError:
        raise AuthenticationFailedException("This password reset link is invalid or has expired.")
    methods = {entry.get("method") for entry in claims.get("amr", []) if isinstance(entry, dict)}
    if "recovery" not in methods:
        raise AuthenticationFailedException("This password reset link is invalid or has expired.")

    # Calls Supabase Auth directly with the recovery token (Supabase verifies its signature), so
    # the shared client's session is never touched.
    try:
        res = httpx.put(
            f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user",
            headers={"apikey": settings.SUPABASE_KEY, "Authorization": f"Bearer {access_token}"},
            json={"password": new_password},
            timeout=10,
        )
    except httpx.HTTPError as e:
        logger.error(f"Password reset request to Supabase failed: {e}")
        raise StockFlowException(message="Could not reach the authentication service.", status_code=502)

    if res.status_code in (401, 403):
        raise AuthenticationFailedException("This password reset link is invalid or has expired.")
    if res.status_code >= 400:
        body = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
        message = body.get("msg") or body.get("error_description") or body.get("message") or "Could not reset password."
        raise StockFlowException(message=message, status_code=400)


def resend_verification_email(email: str) -> None:
    """Send the signup confirmation email again. Like the reset flow, it does not reveal whether the account exists."""
    try:
        supabase.auth.resend({
            "type": "signup",
            "email": email,
            "options": {"email_redirect_to": _frontend_link("/verify-email")},
        })
    except Exception as e:
        logger.warning(f"Verification email for {email} failed: {e}")
