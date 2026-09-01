from fastapi import FastAPI
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.categories import router as categories_router
from app.routers.products import router as products_router
from app.routers.inventory import router as inventory_router
from app.routers.suppliers import router as suppliers_router
from app.routers.orders import router as orders_router
from app.routers.purchase_orders import router as purchase_orders_router

app = FastAPI(
    title="StockFlow API",
    description="E-Commerce & Inventory Management Backend",
    version="1.0.0"
)

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