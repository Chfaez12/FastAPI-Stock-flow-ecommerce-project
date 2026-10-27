
def test_purchase_order_replenishes_stock(client, business_headers):

    sup_res = client.post(
        "/suppliers/",
        headers=business_headers,
        json={"name": "Global Tech Suppliers", "email": "sales@globaltech.com"},
    )
    supplier_id = sup_res.json()["id"]

    prod_res = client.post(
        "/products/",
        headers=business_headers,
        json={
            "sku": "MIC-USB-01",
            "name": "Studio Microphone",
            "price": "100.00",
            "status": "ACTIVE",
            "initial_quantity": 5,
        },
    )
    product_id = prod_res.json()["id"]

    po_res = client.post(
        "/purchase-orders/",
        headers=business_headers,
        json={
            "supplier_id": supplier_id,
            "items": [{"product_id": product_id, "quantity": 15, "unit_cost": "60.00"}],
        },
    )
    assert po_res.status_code == 201
    po_id = po_res.json()["id"]
    assert po_res.json()["status"] == "DRAFT"

    patch_res = client.patch(
        f"/purchase-orders/{po_id}/status",
        headers=business_headers,
        json={"status": "RECEIVED"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "RECEIVED"

    inv_res = client.get("/inventory/", headers=business_headers)
    item_inv = next(i for i in inv_res.json() if i["product_id"] == product_id)
    assert item_inv["quantity"] == 20

def _product(client, business_headers, sku):
    res = client.post(
        "/products/",
        headers=business_headers,
        json={"sku": sku, "name": f"Product {sku}", "price": "20.00", "initial_quantity": 10},
    )
    return res.json()["id"]


def test_product_on_a_purchase_order_cannot_be_deleted(client, business_headers):
    supplier_id = client.post("/suppliers/", headers=business_headers, json={"name": "Delete Guard Supplier"}).json()["id"]
    product_id = _product(client, business_headers, "DEL-PO-01")
    client.post(
        "/purchase-orders/",
        headers=business_headers,
        json={"supplier_id": supplier_id, "items": [{"product_id": product_id, "quantity": 11, "unit_cost": "10.00"}]},
    )

    res = client.delete(f"/products/{product_id}", headers=business_headers)
    assert res.status_code == 409
    assert "purchase orders" in res.json()["error"]["message"]
    assert res.json()["error"]["details"] == {"reason": "product_in_use"}
    assert client.get(f"/products/{product_id}").status_code == 200


def test_product_on_a_customer_order_cannot_be_deleted(client, business_headers, customer_headers):
    product_id = _product(client, business_headers, "DEL-ORD-01")
    client.post("/orders/", headers=customer_headers, json={"items": [{"product_id": product_id, "quantity": 1}]})

    res = client.delete(f"/products/{product_id}", headers=business_headers)
    assert res.status_code == 409
    assert "customer orders" in res.json()["error"]["message"]


def test_unused_product_can_be_deleted(client, business_headers):
    product_id = _product(client, business_headers, "DEL-FREE-01")
    assert client.delete(f"/products/{product_id}", headers=business_headers).status_code == 204
    assert client.get(f"/products/{product_id}").status_code == 404
