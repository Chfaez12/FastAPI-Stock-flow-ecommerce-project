
def test_customer_forbidden_from_business_actions(client, customer_headers):
    response = client.post(
        "/categories/",
        headers=customer_headers,
        json={"name": "Restricted Tech", "description": "Business only"},
    )
    assert response.status_code == 403
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == 403


def test_business_can_create_category(client, business_headers):
    response = client.post(
        "/categories/",
        headers=business_headers,
        json={"name": "Test Components", "description": "Internal parts"},
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Test Components"


def test_duplicate_category_raises_conflict(client, business_headers):
    payload = {"name": "Unique Gadgets", "description": "One of a kind"}
    res1 = client.post("/categories/", headers=business_headers, json=payload)
    assert res1.status_code == 201

    res2 = client.post("/categories/", headers=business_headers, json=payload)
    assert res2.status_code == 409
    assert res2.json()["success"] is False
    assert res2.json()["error"]["code"] == 409