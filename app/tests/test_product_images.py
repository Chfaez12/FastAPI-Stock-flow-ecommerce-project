import pytest

from app.core import storage

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 64


@pytest.fixture
def fake_storage(monkeypatch):
    """Replace Supabase Storage calls so tests never touch the real bucket."""
    calls = {"uploaded": [], "deleted": []}

    def fake_upload(product_id, content, content_type, extension, access_token=None):
        url = f"https://example.supabase.co/storage/v1/object/public/product-images/products/{product_id}/{len(calls['uploaded'])}.{extension}"
        calls["uploaded"].append(url)
        return url

    monkeypatch.setattr(storage, "upload_product_image", fake_upload)
    monkeypatch.setattr(
        storage, "delete_image_by_url", lambda url, access_token=None: calls["deleted"].append(url) if url else None
    )
    return calls


def _create_product(client, headers, sku="IMG-TEST-01"):
    res = client.post(
        "/products/",
        headers=headers,
        json={"sku": sku, "name": "Pictured Item", "price": "9.99", "initial_quantity": 4},
    )
    assert res.status_code == 201
    return res.json()["id"]


def test_upload_replace_and_remove_image(client, business_headers, fake_storage):
    product_id = _create_product(client, business_headers)

    first = client.post(
        f"/products/{product_id}/image",
        headers=business_headers,
        files={"file": ("photo.png", PNG_BYTES, "image/png")},
    )
    assert first.status_code == 200
    first_url = first.json()["image_url"]
    assert first_url.endswith(".png")
    assert first.json()["available_stock"] == 4

    detail = client.get(f"/products/{product_id}")
    assert detail.json()["image_url"] == first_url

    second = client.post(
        f"/products/{product_id}/image",
        headers=business_headers,
        files={"file": ("photo.jpg", JPEG_BYTES, "image/jpeg")},
    )
    assert second.status_code == 200
    assert second.json()["image_url"].endswith(".jpg")
    assert first_url in fake_storage["deleted"]

    removed = client.delete(f"/products/{product_id}/image", headers=business_headers)
    assert removed.status_code == 200
    assert removed.json()["image_url"] is None


def test_image_appears_in_product_listing(client, business_headers, fake_storage):
    product_id = _create_product(client, business_headers, sku="IMG-TEST-LIST")
    client.post(
        f"/products/{product_id}/image",
        headers=business_headers,
        files={"file": ("photo.png", PNG_BYTES, "image/png")},
    )
    listed = next(p for p in client.get("/products/", params={"search": "IMG-TEST-LIST"}).json()["items"] if p["id"] == product_id)
    assert listed["image_url"] == fake_storage["uploaded"][-1]


@pytest.mark.parametrize(
    "filename, content, content_type, expected_status",
    [
        ("notes.txt", b"hello", "text/plain", 400),
        ("fake.png", b"not really a png", "image/png", 400),
        ("empty.png", b"", "image/png", 400),
        ("huge.png", None, "image/png", 413),
    ],
    ids=["wrong-type", "bad-signature", "empty", "too-large"],
)
def test_rejects_invalid_images(client, business_headers, fake_storage, filename, content, content_type, expected_status):
    if content is None:
        # Built here rather than in the parameters, which would put 5 MB into the test id.
        content = PNG_BYTES + b"\x00" * storage.MAX_IMAGE_BYTES
    product_id = _create_product(client, business_headers, sku=f"IMG-BAD-{filename}")
    res = client.post(
        f"/products/{product_id}/image",
        headers=business_headers,
        files={"file": (filename, content, content_type)},
    )
    assert res.status_code == expected_status
    assert fake_storage["uploaded"] == []


def test_customer_cannot_upload_image(client, business_headers, customer_headers, fake_storage):
    product_id = _create_product(client, business_headers, sku="IMG-TEST-RBAC")
    res = client.post(
        f"/products/{product_id}/image",
        headers=customer_headers,
        files={"file": ("photo.png", PNG_BYTES, "image/png")},
    )
    assert res.status_code == 403


def test_upload_to_missing_product_returns_404(client, business_headers, fake_storage):
    res = client.post(
        "/products/does-not-exist/image",
        headers=business_headers,
        files={"file": ("photo.png", PNG_BYTES, "image/png")},
    )
    assert res.status_code == 404
