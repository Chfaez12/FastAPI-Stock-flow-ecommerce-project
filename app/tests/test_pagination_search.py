import pytest


@pytest.fixture
def catalog(client, business_headers):
    """Five products with distinct names, prices and stock, tagged with a unique SKU prefix."""
    category_id = client.post("/categories/", headers=business_headers, json={"name": "Pager Cat"}).json()["id"]
    specs = [
        ("PGN-001", "Alpha Mouse", "10.00", 5, category_id),
        ("PGN-002", "Bravo Keyboard", "45.00", 0, category_id),
        ("PGN-003", "Charlie Monitor", "199.99", 3, None),
        ("PGN-004", "Delta Mouse Pad", "8.50", 12, category_id),
        ("PGN-005", "Echo Webcam", "60.00", 1, None),
    ]
    ids = {}
    for sku, name, price, qty, cat in specs:
        res = client.post(
            "/products/",
            headers=business_headers,
            json={"sku": sku, "name": name, "price": price, "initial_quantity": qty, "category_id": cat},
        )
        assert res.status_code == 201
        ids[sku] = res.json()["id"]
    return {"ids": ids, "category_id": category_id}


def _skus(res):
    return [p["sku"] for p in res.json()["items"]]


def test_products_response_is_a_page(client, catalog):
    res = client.get("/products/", params={"search": "PGN-", "size": 2, "page": 1, "sort": "name_asc"})
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 5
    assert body["pages"] == 3
    assert body["page"] == 1 and body["size"] == 2
    assert _skus(res) == ["PGN-001", "PGN-002"]

    last = client.get("/products/", params={"search": "PGN-", "size": 2, "page": 3, "sort": "name_asc"})
    assert _skus(last) == ["PGN-005"]


def test_page_past_the_end_is_empty_not_404(client, catalog):
    res = client.get("/products/", params={"search": "PGN-", "size": 10, "page": 9})
    assert res.status_code == 200
    assert res.json()["items"] == []
    assert res.json()["total"] == 5


def test_search_matches_name_case_insensitively(client, catalog):
    res = client.get("/products/", params={"search": "mouse"})
    assert set(_skus(res)) == {"PGN-001", "PGN-004"}


def test_search_treats_wildcards_literally(client, catalog):
    res = client.get("/products/", params={"search": "%"})
    assert res.json()["total"] == 0


def test_filters_combine(client, catalog):
    res = client.get(
        "/products/",
        params={"search": "PGN-", "category_id": catalog["category_id"], "in_stock": True, "max_price": "20"},
    )
    assert set(_skus(res)) == {"PGN-001", "PGN-004"}


def test_price_range_and_sorting(client, catalog):
    res = client.get("/products/", params={"search": "PGN-", "min_price": "40", "sort": "price_desc"})
    assert _skus(res) == ["PGN-003", "PGN-005", "PGN-002"]


def test_listing_includes_stock_and_rating_fields(client, catalog):
    item = client.get("/products/", params={"search": "PGN-003"}).json()["items"][0]
    assert item["available_stock"] == 3
    assert item["average_rating"] is None
    assert item["review_count"] == 0


def test_invalid_sort_and_page_size_are_rejected(client):
    assert client.get("/products/", params={"sort": "random"}).status_code == 422
    assert client.get("/products/", params={"size": 500}).status_code == 422
    assert client.get("/products/", params={"page": 0}).status_code == 422


def test_order_lists_are_paginated_and_filterable(client, business_headers, customer_headers, catalog):
    product_id = catalog["ids"]["PGN-004"]
    order_ids = []
    for qty in (1, 2, 3):
        res = client.post("/orders/", headers=customer_headers, json={"items": [{"product_id": product_id, "quantity": qty}]})
        assert res.status_code == 201
        order_ids.append(res.json()["id"])
    client.post(f"/orders/{order_ids[0]}/cancel", headers=customer_headers)

    mine = client.get("/orders/me", headers=customer_headers, params={"size": 2}).json()
    assert mine["total"] >= 3
    assert len(mine["items"]) == 2

    cancelled = client.get("/orders/me", headers=customer_headers, params={"status": "CANCELLED"}).json()
    assert order_ids[0] in [o["id"] for o in cancelled["items"]]
    assert all(o["status"] == "CANCELLED" for o in cancelled["items"])

    by_total = client.get(
        "/orders/all", headers=business_headers, params={"status": "PENDING", "sort": "total_desc"}
    ).json()["items"]
    totals = [float(o["total_amount"]) for o in by_total]
    assert totals == sorted(totals, reverse=True)


def test_customer_with_no_orders_gets_empty_page(client, customer_headers):
    res = client.get("/orders/me", headers=customer_headers, params={"status": "DELIVERED"})
    assert res.status_code == 200
    assert res.json()["items"] == []
