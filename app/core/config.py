from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str 
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_JWT_SECRET: str
    JWT_ALGORITHM: str 

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()