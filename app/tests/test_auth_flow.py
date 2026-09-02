from unittest.mock import MagicMock, patch
from jose import jwt


def test_register_user_success(client):
    mock_auth_response = MagicMock()
    mock_auth_response.user = MagicMock(id="new-supabase-user-uuid-1")
    mock_auth_response.session = MagicMock(
        access_token="mock-access-token",
        refresh_token="mock-refresh-token",
    )

    with patch("app.core.supabase_client.supabase.auth.sign_up", return_value=mock_auth_response):
        response = client.post(
            "/auth/register",
            json={
                "email": "newuser@stockflow.dev",
                "password": "SecurePassword123!",
                "name": "New Tester",
                "phone": "03001234567",
                "role": "CUSTOMER",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["access_token"] == "mock-access-token"
        assert data["user"]["email"] == "newuser@stockflow.dev"


def test_login_user_success(client):
    mock_auth_response = MagicMock()
    mock_auth_response.user = MagicMock(
        id="login-user-uuid-2",
        user_metadata={"role": "CUSTOMER", "name": "Login Tester"},
    )
    mock_auth_response.session = MagicMock(
        access_token="valid-login-access-token",
        refresh_token="valid-login-refresh-token",
    )

    with patch("app.core.supabase_client.supabase.auth.sign_in_with_password", return_value=mock_auth_response):
        response = client.post(
            "/auth/login",
            json={
                "email": "login@stockflow.dev",
                "password": "SecurePassword123!",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "valid-login-access-token"
        assert data["refresh_token"] == "valid-login-refresh-token"


def test_login_invalid_credentials_returns_custom_error(client):
    with patch("app.core.supabase_client.supabase.auth.sign_in_with_password", side_effect=Exception("Invalid login credentials")):
        response = client.post(
            "/auth/login",
            json={"email": "wrong@stockflow.dev", "password": "BadPassword!"},
        )
        assert response.status_code == 401
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == 401


def test_refresh_token_rotation_success(client):
    mock_session = MagicMock()
    mock_session.session = MagicMock(
        access_token="rotated-access-token-999",
        refresh_token="rotated-refresh-token-999",
    )

    with patch("app.core.supabase_client.supabase.auth.refresh_session", return_value=mock_session):
        response = client.post(
            "/auth/refresh",
            json={"refresh_token": "valid-old-refresh-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "rotated-access-token-999"
        assert data["refresh_token"] == "rotated-refresh-token-999"


def test_logout_revocation(client):
    with patch("app.core.supabase_client.supabase.auth.sign_out", return_value=None):
        response = client.post(
            "/auth/logout",
            json={"refresh_token": "mock-refresh-token-to-revoke"},
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Logged out successfully"


def test_expired_or_invalid_jwt_token(client):
    fake_token = jwt.encode(
        {"sub": "non-existent-user", "aud": "authenticated"},
        "wrong-secret-key",
        algorithm="HS256",
    )
    response = client.get(
        "/orders/all",
        headers={"Authorization": f"Bearer {fake_token}"},
    )
    assert response.status_code == 401
    assert response.json()["success"] is False