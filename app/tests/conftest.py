import os
import pytest
from collections.abc import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from jose import jwt

from app.main import app
from app.db.session import Base
from app.dependencies.auth import get_db
from app.models.user import User, UserRole
from app.core.config import settings

SUPABASE_DB_URL = settings.DATABASE_URL

engine = create_engine(SUPABASE_DB_URL, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture(scope="function")
def db_session() -> Generator:
    
    connection = engine.connect()
    transaction = connection.begin()
    db = TestingSessionLocal(bind=connection)

    try:
        yield db
    finally:
        db.close()
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def client(db_session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def business_user(db_session) -> User:
    user = db_session.query(User).filter(User.email == "business_test@stockflow.dev").first()
    if not user:
        user = User(
            id="test-business-supabase-uuid",
            email="business_test@stockflow.dev",
            name="Business Tester",
            phone="1234567890",
            password_hash="SUPABASE_AUTH_MANAGED",
            role=UserRole.BUSINESS,
            is_active=True,
        )
        db_session.add(user)
        db_session.flush()
    return user


@pytest.fixture
def customer_user(db_session) -> User:

    user = db_session.query(User).filter(User.email == "customer_test@stockflow.dev").first()
    if not user:
        user = User(
            id="test-customer-supabase-uuid",
            email="customer_test@stockflow.dev",
            name="Customer Tester",
            phone="0987654321",
            password_hash="SUPABASE_AUTH_MANAGED",
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        db_session.add(user)
        db_session.flush()
    return user


def create_token(user_id: str) -> str:
    return jwt.encode(
        {"sub": user_id, "aud": "authenticated"},
        settings.SUPABASE_JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )


@pytest.fixture
def business_headers(business_user) -> dict[str, str]:
    token = create_token(business_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def customer_headers(customer_user) -> dict[str, str]:
    token = create_token(customer_user.id)
    return {"Authorization": f"Bearer {token}"}