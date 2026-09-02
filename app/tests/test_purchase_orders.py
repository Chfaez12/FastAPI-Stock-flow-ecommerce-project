
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