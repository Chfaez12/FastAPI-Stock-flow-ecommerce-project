from datetime import datetime, timedelta, timezone

import pytest


@pytest.fixture
def product_id(client, business_headers):
    res = client.post(
        "/products/",
        headers=business_headers,
        json={"sku": "CPN-001", "name": "Coupon Lamp", "price": "50.00", "initial_quantity": 20},
    )
    return res.json()["id"]


def _coupon(client, business_headers, **overrides):
    payload = {"code": "save10", "discount_type": "PERCENTAGE", "discount_value": "10"} | overrides
    res = client.post("/coupons/", headers=business_headers, json=payload)
    assert res.status_code == 201, res.json()
    return res.json()


def _order(client, customer_headers, product_id, quantity=2, code=None):
    payload = {"items": [{"product_id": product_id, "quantity": quantity}]}
    if code:
        payload["coupon_code"] = code
    return client.post("/orders/", headers=customer_headers, json=payload)


def test_codes_are_normalized_and_unique(client, business_headers):
    coupon = _coupon(client, business_headers)
    assert coupon["code"] == "SAVE10"
    dup = client.post(
        "/coupons/", headers=business_headers, json={"code": "Save10", "discount_type": "FIXED", "discount_value": "5"}
    )
    assert dup.status_code == 409


def test_percentage_over_100_is_rejected(client, business_headers):
    res = client.post(
        "/coupons/", headers=business_headers, json={"code": "TOOMUCH", "discount_type": "PERCENTAGE", "discount_value": "150"}
    )
    assert res.status_code == 422


def test_validate_previews_discount_with_cap(client, business_headers, customer_headers):
    _coupon(client, business_headers, code="BIG20", discount_value="20", max_discount_amount="15")
    res = client.post("/coupons/validate", headers=customer_headers, json={"code": "big20", "subtotal": "100"})
    assert res.status_code == 200
    body = res.json()
    assert float(body["discount_amount"]) == 15.0
    assert float(body["total"]) == 85.0


def test_order_with_coupon_applies_discount_and_counts_use(client, business_headers, customer_headers, product_id):
    coupon = _coupon(client, business_headers, code="FIVEOFF", discount_type="FIXED", discount_value="5")
    res = _order(client, customer_headers, product_id, quantity=2, code="fiveoff")
    assert res.status_code == 201
    order = res.json()
    assert float(order["subtotal_amount"]) == 100.0
    assert float(order["discount_amount"]) == 5.0
    assert float(order["total_amount"]) == 95.0
    assert order["coupon_code"] == "FIVEOFF"

    assert client.get(f"/coupons/{coupon['id']}", headers=business_headers).json()["times_used"] == 1

    # Cancelling gives the use back.
    client.post(f"/orders/{order['id']}/cancel", headers=customer_headers)
    assert client.get(f"/coupons/{coupon['id']}", headers=business_headers).json()["times_used"] == 0


def test_fixed_discount_never_exceeds_subtotal(client, business_headers, customer_headers, product_id):
    _coupon(client, business_headers, code="HUGE", discount_type="FIXED", discount_value="500")
    order = _order(client, customer_headers, product_id, quantity=1, code="HUGE").json()
    assert float(order["total_amount"]) == 0.0


@pytest.mark.parametrize(
    "overrides, message",
    [
        ({"is_active": False}, "not valid"),
        ({"expires_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()}, "expired"),
        ({"starts_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()}, "not active yet"),
        ({"min_order_amount": "500"}, "minimum order"),
    ],
)
def test_unusable_coupons_are_rejected(client, business_headers, customer_headers, product_id, overrides, message):
    _coupon(client, business_headers, code="RULES", **overrides)
    res = _order(client, customer_headers, product_id, code="RULES")
    assert res.status_code == 400
    assert message in res.json()["error"]["message"]


def test_unknown_code_does_not_place_order_or_take_stock(client, business_headers, customer_headers, product_id):
    res = _order(client, customer_headers, product_id, quantity=3, code="NOPE")
    assert res.status_code == 400
    stock = next(i for i in client.get("/inventory/", headers=business_headers).json() if i["product_id"] == product_id)
    assert stock["quantity"] == 20


def test_usage_limits(client, business_headers, customer_headers, product_id):
    _coupon(client, business_headers, code="ONCE", usage_limit_per_user=1)
    assert _order(client, customer_headers, product_id, code="ONCE").status_code == 201
    second = _order(client, customer_headers, product_id, code="ONCE")
    assert second.status_code == 400
    assert "maximum number of times" in second.json()["error"]["message"]

    _coupon(client, business_headers, code="GLOBAL1", usage_limit=1)
    assert _order(client, customer_headers, product_id, code="GLOBAL1").status_code == 201
    assert "usage limit" in _order(client, customer_headers, product_id, code="GLOBAL1").json()["error"]["message"]


def test_coupon_admin_is_business_only(client, customer_headers):
    assert client.get("/coupons/", headers=customer_headers).status_code == 403


def test_deleting_a_coupon_keeps_the_code_on_orders(client, business_headers, customer_headers, product_id):
    coupon = _coupon(client, business_headers, code="GONE")
    order = _order(client, customer_headers, product_id, code="GONE").json()
    assert client.delete(f"/coupons/{coupon['id']}", headers=business_headers).status_code == 204

    mine = client.get("/orders/me", headers=customer_headers, params={"size": 100}).json()["items"]
    assert next(o for o in mine if o["id"] == order["id"])["coupon_code"] == "GONE"
