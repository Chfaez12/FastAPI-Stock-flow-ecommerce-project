from collections.abc import Generator
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import SessionLocal
from app.exceptions import AuthenticationFailedException, PermissionDeniedException
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_aud": False}
        )
        user_id: str = payload.get("sub")
        if not user_id:
            raise AuthenticationFailedException("Token subject claim ('sub') missing.")
    except JWTError:
        raise AuthenticationFailedException("Invalid or expired authentication token.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise AuthenticationFailedException("User not registered in local database.")
    if not user.is_active:
        raise PermissionDeniedException("Account is currently deactivated.")
    return user


def require_roles(*allowed_roles: UserRole):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise PermissionDeniedException(
                f"Action requires one of the following roles: {[r.value for r in allowed_roles]}."
            )
        return current_user
    return role_checker