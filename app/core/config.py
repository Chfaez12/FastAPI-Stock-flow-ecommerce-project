from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str 
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_JWT_SECRET: str
    JWT_ALGORITHM: str
    # Secret / service_role key for server-side Storage uploads. Never expose it to the frontend.
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    PRODUCT_IMAGE_BUCKET: str = "product-images"
    # The React app's origin: allowed by CORS and used for the links in auth emails.
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()