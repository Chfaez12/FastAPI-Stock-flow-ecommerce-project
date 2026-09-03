
def test_category_update_and_delete_flow(client, business_headers):
    create_res = client.post(
        "/categories/",
        headers=business_headers,
        json={"name": "Old Category", "description": "Description to update"},
    )
    assert create_res.status_code == 201
    cat_id = create_res.json()["id"]

    patch_res = client.patch(
        f"/categories/{cat_id}",
        headers=business_headers,
        json={"name": "Updated Category", "description": "New description"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Updated Category"

    del_res = client.delete(f"/categories/{cat_id}", headers=business_headers)
    assert del_res.status_code in [200, 204]


def test_inventory_manual_adjustment(client, business_headers):
    prod_res = client.post(
        "/products/",
        headers=business_headers,
        json={
            "sku": "ADJ-TEST-01",
            "name": "Adjustable Item",
            "price": "15.50",
            "status": "ACTIVE",
            "initial_quantity": 10,
        },
    )
    assert prod_res.status_code == 201
    product_id = prod_res.json()["id"]

    adj_res = client.post(
        f"/inventory/{product_id}/adjust",
        headers=business_headers,
        json={"quantity_delta": 5, "reorder_level": 3},
    )
    assert adj_res.status_code == 200
    assert adj_res.json()["quantity"] == 15

    neg_adj_res = client.post(
        f"/inventory/{product_id}/adjust",
        headers=business_headers,
        json={"quantity_delta": -25},
    )
    assert neg_adj_res.status_code == 400
    assert neg_adj_res.json()["success"] is False


def test_customer_order_history_workflow(client, business_headers, customer_headers):
    prod_res = client.post(
        "/products/",
        headers=business_headers,
        json={
            "sku": "HIST-TEST-01",
            "name": "History Check Product",
            "price": "30.00",
            "status": "ACTIVE",
            "initial_quantity": 8,
        },
    )
    product_id = prod_res.json()["id"]

    client.post(
        "/orders/",
        headers=customer_headers,
        json={"items": [{"product_id": product_id, "quantity": 2}]},
    )

    history_res = client.get("/orders/me", headers=customer_headers)
    assert history_res.status_code == 200
    orders_list = history_res.json()
    assert len(orders_list) >= 1


def test_pydantic_validation_error_format(client, business_headers):
    response = client.post(
        "/categories/",
        headers=business_headers,
        json={"description": "Missing title"},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == 422