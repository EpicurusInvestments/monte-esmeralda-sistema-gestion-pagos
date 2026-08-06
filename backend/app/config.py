"""Application configuration loaded from environment variables."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # General
    app_name: str = "Sistema de Gestión de Pagos y Flujo de Efectivo – Monte Esmeralda"
    environment: str = "development"

    # Database. Defaults to a local SQLite file so the backend can run without
    # Postgres/Docker; docker-compose overrides this with a Postgres URL.
    database_url: str = "sqlite:///./monte_esmeralda.db"

    # Auth
    jwt_secret: str = "dev-insecure-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12  # 12 hours

    # File storage. "local" stores files on disk under storage_dir; the
    # interface is S3-compatible so a real bucket can be swapped in later.
    storage_backend: str = "local"
    storage_dir: str = "./uploads"

    # CORS — the Next.js dev server origin.
    frontend_origin: str = "http://localhost:3000"


settings = Settings()
