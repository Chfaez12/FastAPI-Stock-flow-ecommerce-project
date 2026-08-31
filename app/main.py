from fastapi import FastAPI
from app.database import engine, Base
from app.routers import auth, test_roles

# Automatically creates all required tables in Supabase Postgres on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="StockFlow API", version="1.0.0")

app.include_router(auth.router, prefix="/api/v1")
app.include_router(test_roles.router, prefix="/api/v1")


@app.get("/")
def health_check():
    return {"status": "ok", "app": "StockFlow API"}