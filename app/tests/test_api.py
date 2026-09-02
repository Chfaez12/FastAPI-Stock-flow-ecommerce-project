def test_health_check(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_unauthenticated_protected_route(client):
    response = client.get("orders/all")
    assert response.status_code == 401