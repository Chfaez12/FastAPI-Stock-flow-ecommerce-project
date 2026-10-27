import logging
import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.exceptions import register_exception_handlers
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.categories import router as categories_router
from app.routers.products import router as products_router
from app.routers.inventory import router as inventory_router
from app.routers.suppliers import router as suppliers_router
from app.routers.orders import router as orders_router
from app.routers.purchase_orders import router as purchase_orders_router
from app.routers.reviews import router as reviews_router
from app.routers.wishlist import router as wishlist_router
from app.routers.coupons import router as coupons_router
from app.core.config import settings
from fastapi.middleware.cors import CORSMiddleware


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("stockflow.api")

app = FastAPI(
    title="StockFlow API",
    description="E-Commerce & Inventory Management Backend",
    version="1.0.0",
)

register_exception_handlers(app)

@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    start_time = time.perf_counter()
    client_ip = request.client.host if request.client else "unknown"
    method = request.method
    path = request.url.path

    logger.info(f"Incoming request: {method} {path} from {client_ip}")

    try:
        response = await call_next(request)
        process_time = (time.perf_counter() - start_time) * 1000
        logger.info(
            f"Completed: {method} {path} | Status: {response.status_code} | Duration: {process_time:.2f}ms"
        )
        return response
    except Exception as exc:
        process_time = (time.perf_counter() - start_time) * 1000
        logger.error(
            f"Failed: {method} {path} | Error: {str(exc)} | Duration: {process_time:.2f}ms"
        )
        raise exc


app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL.rstrip("/")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(categories_router)
app.include_router(products_router)
app.include_router(inventory_router)
app.include_router(suppliers_router)
app.include_router(orders_router)
app.include_router(purchase_orders_router)
app.include_router(reviews_router)
app.include_router(wishlist_router)
app.include_router(coupons_router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "app": "StockFlow API"}


@app.get("/health", tags=["Health"])
def readiness_check():
    """Used by the Docker HEALTHCHECK: reports whether the database answers."""
    from sqlalchemy import text
    from app.db.session import engine

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(status_code=503, content={"status": "unavailable", "database": "down"})
    return {"status": "ok", "database": "up"}
