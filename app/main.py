import logging
import time
from fastapi import FastAPI, Request
from app.exceptions import register_exception_handlers
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.categories import router as categories_router
from app.routers.products import router as products_router
from app.routers.inventory import router as inventory_router
from app.routers.suppliers import router as suppliers_router
from app.routers.orders import router as orders_router
from app.routers.purchase_orders import router as purchase_orders_router

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


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(categories_router)
app.include_router(products_router)
app.include_router(inventory_router)
app.include_router(suppliers_router)
app.include_router(orders_router)
app.include_router(purchase_orders_router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "app": "StockFlow API"}