import os
import pytest
from collections.abc import Generator
from fastapi import HTTPException, Header, status
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.session import Base
from app.dependencies.auth import get_db, get_current_user
from app.models.user import User, UserRole
from app.core.config import settings

# Point TEST_DATABASE_URL at a throwaway database (e.g. the `db` service in docker-compose.yml)
# so test runs never create tables in the real one.
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", settings.DATABASE_URL)

engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
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


@pytest.fixture(scope="function")
def client(db_session, business_user, customer_user) -> Generator[TestClient, None, None]:
    def override_get_db():
        yield db_session

    def override_get_current_user(authorization: str = Header(default="")):
        token = ""
        if authorization.startswith("Bearer "):
            token = authorization.split(" ", 1)[1].strip()

        if token == "test-business-mock-token":
            return business_user
        if token == "test-customer-mock-token":
            return customer_user

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def business_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test-business-mock-token"}


@pytest.fixture
def customer_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test-customer-mock-token"}