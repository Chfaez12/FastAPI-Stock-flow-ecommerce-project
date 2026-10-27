import pytest


@pytest.fixture
def product_id(client, business_headers):
    res = client.post(
        "/products/",
        headers=business_headers,
        json={"sku": "REV-001", "name": "Reviewed Speaker", "price": "70.00", "initial_quantity": 10},
    )
    return res.json()["id"]


def _deliver_order(client, business_headers, customer_headers, product_id):
    order = client.post("/orders/", headers=customer_headers, json={"items": [{"product_id": product_id, "quantity": 1}]})
    client.patch(f"/orders/{order.json()['id']}/status", headers=business_headers, json={"status": "DELIVERED"})


def test_review_requires_a_delivered_order(client, customer_headers, product_id):
    eligibility = client.get(f"/products/{product_id}/reviews/eligibility", headers=customer_headers).json()
    assert eligibility["can_review"] is False

    res = client.post(f"/products/{product_id}/reviews", headers=customer_headers, json={"rating": 5})
    assert res.status_code == 403


def test_review_lifecycle_updates_product_rating(client, business_headers, customer_headers, product_id):
    _deliver_order(client, business_headers, customer_headers, product_id)
    assert client.get(f"/products/{product_id}/reviews/eligibility", headers=customer_headers).json()["can_review"]

    created = client.post(
        f"/products/{product_id}/reviews",
        headers=customer_headers,
        json={"rating": 4, "title": "Solid", "comment": "Good bass."},
    )
    assert created.status_code == 201
    review = created.json()
    assert review["reviewer_name"] == "Customer Tester"

    duplicate = client.post(f"/products/{product_id}/reviews", headers=customer_headers, json={"rating": 1})
    assert duplicate.status_code == 409

    product = client.get(f"/products/{product_id}").json()
    assert product["average_rating"] == 4.0
    assert product["review_count"] == 1

    updated = client.patch(f"/reviews/{review['id']}", headers=customer_headers, json={"rating": 2})
    assert updated.status_code == 200 and updated.json()["rating"] == 2

    summary = client.get(f"/products/{product_id}/reviews/summary").json()
    assert summary["distribution"] == {"1": 0, "2": 1, "3": 0, "4": 0, "5": 0}

    listed = client.get(f"/products/{product_id}/reviews").json()
    assert listed["total"] == 1 and listed["items"][0]["title"] == "Solid"

    # Business users moderate: they can delete, but not edit, a customer's review.
    assert client.patch(f"/reviews/{review['id']}", headers=business_headers, json={"rating": 5}).status_code == 403
    assert client.delete(f"/reviews/{review['id']}", headers=business_headers).status_code == 204
    assert client.get(f"/products/{product_id}/reviews/summary").json()["review_count"] == 0


def test_review_rating_must_be_one_to_five(client, business_headers, customer_headers, product_id):
    _deliver_order(client, business_headers, customer_headers, product_id)
    res = client.post(f"/products/{product_id}/reviews", headers=customer_headers, json={"rating": 6})
    assert res.status_code == 422


def test_reviews_for_missing_product_return_404(client):
    assert client.get("/products/nope/reviews").status_code == 404


def test_wishlist_add_is_idempotent_and_removable(client, customer_headers, product_id):
    first = client.post("/wishlist/", headers=customer_headers, json={"product_id": product_id})
    assert first.status_code == 201
    assert first.json()["product"]["name"] == "Reviewed Speaker"

    again = client.post("/wishlist/", headers=customer_headers, json={"product_id": product_id})
    assert again.status_code == 200
    assert again.json()["id"] == first.json()["id"]

    items = client.get("/wishlist/", headers=customer_headers).json()
    assert [i["product_id"] for i in items] == [product_id]
    assert items[0]["product"]["available_stock"] == 10

    assert client.delete(f"/wishlist/{product_id}", headers=customer_headers).status_code == 204
    assert client.get("/wishlist/", headers=customer_headers).json() == []
    assert client.delete(f"/wishlist/{product_id}", headers=customer_headers).status_code == 404


def test_wishlist_rejects_unknown_product_and_business_users(client, business_headers, customer_headers):
    assert client.post("/wishlist/", headers=customer_headers, json={"product_id": "missing"}).status_code == 404
    assert client.get("/wishlist/", headers=business_headers).status_code == 403
