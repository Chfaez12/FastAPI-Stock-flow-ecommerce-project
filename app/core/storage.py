import logging
import uuid

from storage3 import SyncStorageClient

from app.core.config import settings
from app.exceptions import StockFlowException

logger = logging.getLogger("stockflow.storage")

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def _storage(access_token: str | None) -> SyncStorageClient:
    """
    Build a Storage client for one request.

    With SUPABASE_SERVICE_ROLE_KEY set, uploads run with the service key and bypass RLS.
    Otherwise they run as the signed-in user (their Supabase JWT plus the publishable key), so the
    bucket's RLS policies decide who may upload (see supabase/storage_policies.sql).

    A separate client is used instead of the shared one in supabase_client.py, because that client
    also performs sign_in_with_password and would carry whichever user signed in last.
    """
    service_key = settings.SUPABASE_SERVICE_ROLE_KEY
    bearer = service_key or access_token
    if not bearer:
        raise StockFlowException(message="Storage credentials are missing for this request.", status_code=401)
    return SyncStorageClient(
        f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1",
        {"apiKey": service_key or settings.SUPABASE_KEY, "Authorization": f"Bearer {bearer}"},
    )


def validate_image(content: bytes, content_type: str | None) -> str:
    """Return the file extension for a valid image, or raise a 400/413 error."""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise StockFlowException(
            message="Unsupported image type. Upload a JPEG, PNG or WEBP file.",
            status_code=400,
        )
    if not content:
        raise StockFlowException(message="The uploaded file is empty.", status_code=400)
    if len(content) > MAX_IMAGE_BYTES:
        raise StockFlowException(message="Image is too large. The maximum size is 5 MB.", status_code=413)

    # Check the file signature so a renamed non-image file is rejected.
    is_jpeg = content[:3] == b"\xff\xd8\xff"
    is_png = content[:8] == b"\x89PNG\r\n\x1a\n"
    is_webp = content[:4] == b"RIFF" and content[8:12] == b"WEBP"
    if not (is_jpeg or is_png or is_webp):
        raise StockFlowException(message="The file is not a valid image.", status_code=400)

    return ALLOWED_IMAGE_TYPES[content_type]


def upload_product_image(
    product_id: str,
    content: bytes,
    content_type: str,
    extension: str,
    access_token: str | None = None,
) -> str:
    """Upload an image and return its public URL. Each upload gets a unique path to avoid stale CDN caches."""
    path = f"products/{product_id}/{uuid.uuid4().hex}.{extension}"
    bucket = _storage(access_token).from_(settings.PRODUCT_IMAGE_BUCKET)
    try:
        bucket.upload(path, content, {"content-type": content_type, "upsert": "false"})
    except Exception as exc:
        message = str(exc)
        logger.error(f"Image upload failed for product {product_id}: {message}")
        if "row-level security" in message or "Unauthorized" in message:
            raise StockFlowException(
                message=(
                    "Storage refused the upload. Apply supabase/storage_policies.sql in the Supabase "
                    "SQL editor, or set SUPABASE_SERVICE_ROLE_KEY in the backend .env."
                ),
                status_code=403,
            )
        if "Bucket not found" in message:
            raise StockFlowException(
                message=f"Storage bucket '{settings.PRODUCT_IMAGE_BUCKET}' was not found.",
                status_code=500,
            )
        raise StockFlowException(message="Image upload failed. Please try again.", status_code=502)
    return bucket.get_public_url(path)


def delete_image_by_url(url: str | None, access_token: str | None = None) -> None:
    """Best-effort removal of a previously uploaded image; never raises."""
    if not url:
        return
    marker = f"/object/public/{settings.PRODUCT_IMAGE_BUCKET}/"
    if marker not in url:
        return
    path = url.split(marker, 1)[1].split("?", 1)[0]
    try:
        _storage(access_token).from_(settings.PRODUCT_IMAGE_BUCKET).remove([path])
    except Exception as exc:
        logger.warning(f"Could not delete image '{path}': {exc}")
