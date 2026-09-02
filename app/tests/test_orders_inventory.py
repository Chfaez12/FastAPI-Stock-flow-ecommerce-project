
def test_order_placement_deducts_inventory(client, business_headers, customer_headers):
    
    cat_res = client.post(
        "/categories/",
        headers=business_headers,
        json={"name": "Peripherals"},
    )
    category_id = cat_res.json()["id"]

    prod_res = client.post(
        "/products/",
        headers=business_headers,
        json={
            "sku": "KB-RGB-01",
            "name": "RGB Keyboard",
            "price": "50.00",
            "status": "ACTIVE",
            "category_id": category_id,
            "initial_quantity": 10,
        },
    )
    assert prod_res.status_code == 201
    product_id = prod_res.json()["id"]

    order_res = client.post(
        "/orders/",
        headers=customer_headers,
        json={"items": [{"product_id": product_id, "quantity": 3}]},
    )
    assert order_res.status_code == 201
    assert float(order_res.json()["total_amount"]) == 150.00

    inv_res = client.get("/inventory/", headers=business_headers)
    assert inv_res.status_code == 200
    item_inv = next(i for i in inv_res.json() if i["product_id"] == product_id)
    assert item_inv["quantity"] == 7


def test_insufficient_stock_raises_custom_error(client, business_headers, customer_headers):
    prod_res = client.post(
        "/products/",
        headers=business_headers,
        json={
            "sku": "HEADSET-LOW",
            "name": "Gaming Headset",
            "price": "80.00",
            "status": "ACTIVE",
            "initial_quantity": 2,
        },
    )
    product_id = prod_res.json()["id"]

    order_res = client.post(
        "/orders/",
        headers=customer_headers,
        json={"items": [{"product_id": product_id, "quantity": 5}]},
    )
    assert order_res.status_code == 400
    data = order_res.json()
    assert data["success"] is False
    assert "Insufficient stock" in data["error"]["message"]
    assert data["error"]["details"]["available"] == 2