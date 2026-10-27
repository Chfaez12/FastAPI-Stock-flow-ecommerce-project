from unittest.mock import MagicMock, patch

import jwt


def _token(amr_method: str) -> str:
    return jwt.encode({"sub": "user-1", "amr": [{"method": amr_method, "timestamp": 1}]}, "x" * 32, algorithm="HS256")


def test_forgot_password_never_reveals_whether_account_exists(client):
    with patch(
        "app.core.supabase_client.supabase.auth.reset_password_for_email",
        side_effect=Exception("User not found"),
    ) as send:
        res = client.post("/auth/forgot-password", json={"email": "ghost@stockflow.dev"})
    assert res.status_code == 200
    assert "If an account exists" in res.json()["message"]
    assert send.call_args.args[1]["redirect_to"].endswith("/reset-password")


def test_reset_password_rejects_a_normal_session_token(client):
    with patch("app.services.auth_service.httpx.put") as put:
        res = client.post(
            "/auth/reset-password",
            json={"access_token": _token("password"), "new_password": "NewSecret123"},
        )
    assert res.status_code == 401
    put.assert_not_called()


def test_reset_password_with_recovery_token(client):
    response = MagicMock(status_code=200)
    with patch("app.services.auth_service.httpx.put", return_value=response) as put:
        res = client.post(
            "/auth/reset-password",
            json={"access_token": _token("recovery"), "new_password": "NewSecret123"},
        )
    assert res.status_code == 200
    assert put.call_args.kwargs["json"] == {"password": "NewSecret123"}
    assert put.call_args.kwargs["headers"]["Authorization"] == f"Bearer {_token('recovery')}"


def test_reset_password_expired_link(client):
    with patch("app.services.auth_service.httpx.put", return_value=MagicMock(status_code=401)):
        res = client.post(
            "/auth/reset-password",
            json={"access_token": _token("recovery"), "new_password": "NewSecret123"},
        )
    assert res.status_code == 401
    assert "expired" in res.json()["error"]["message"]


def test_reset_password_enforces_minimum_length(client):
    res = client.post("/auth/reset-password", json={"access_token": _token("recovery"), "new_password": "abc"})
    assert res.status_code == 422


def test_register_reports_pending_email_verification(client):
    pending = MagicMock()
    pending.user = MagicMock(id="pending-verify-uuid")
    pending.session = None
    with patch("app.core.supabase_client.supabase.auth.sign_up", return_value=pending) as sign_up:
        res = client.post(
            "/auth/register",
            json={"email": "verify@stockflow.dev", "password": "Secret123!", "name": "Verify Me", "role": "CUSTOMER"},
        )
    assert res.status_code == 201
    assert res.json()["email_verification_required"] is True
    assert res.json()["access_token"] == ""
    assert sign_up.call_args.args[0]["options"]["email_redirect_to"].endswith("/verify-email")


def test_login_with_unverified_email_says_so(client):
    with patch(
        "app.core.supabase_client.supabase.auth.sign_in_with_password",
        side_effect=Exception("Email not confirmed"),
    ):
        res = client.post("/auth/login", json={"email": "verify@stockflow.dev", "password": "Secret123!"})
    assert res.status_code == 403
    assert res.json()["error"]["details"] == {"reason": "email_not_verified"}


def test_resend_verification(client):
    with patch("app.core.supabase_client.supabase.auth.resend") as resend:
        res = client.post("/auth/resend-verification", json={"email": "verify@stockflow.dev"})
    assert res.status_code == 200
    assert resend.call_args.args[0]["type"] == "signup"
