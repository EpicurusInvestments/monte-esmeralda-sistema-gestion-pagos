"""Application configuration loaded from environment variables."""
from __future__ import annotations

import urllib.parse

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # General
    app_name: str = "Sistema de Gestión de Pagos y Flujo de Efectivo – Monte Esmeralda"
    environment: str = "development"

    # Database backend selector: "sqlite" (local default) or "sqlserver"
    # (AWS RDS SQL Server, production). See the sqlalchemy_url property below.
    db_backend: str = "sqlite"

    # Local SQLite path. Used when db_backend == "sqlite" so the backend can run
    # without a database server.
    database_url: str = "sqlite:///./monte_esmeralda.db"

    # SQL Server (AWS RDS). Credentials come from the environment only, never
    # from code. Encrypt / TrustServerCertificate use ODBC Driver 18 values.
    db_host: str = ""
    db_port: int = 1433
    db_name: str = "MESistemaGestionPagos"
    db_user: str = ""
    db_password: str = ""
    db_encrypt: str = "yes"
    db_trust_server_certificate: str = "yes"
    odbc_driver: str = "ODBC Driver 18 for SQL Server"

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

    @property
    def sqlalchemy_url(self) -> str:
        """Connection URL for the selected backend.

        For SQL Server the ODBC connection string is passed through
        ``odbc_connect=`` URL-encoded, so characters that are illegal in a URL
        (a dash in the database name, symbols in the password) survive intact.
        Any other value of db_backend falls back to the local SQLite URL.
        """
        if self.db_backend.strip().lower() == "sqlserver":
            odbc_str = (
                f"DRIVER={{{self.odbc_driver}}};"
                f"SERVER={self.db_host},{self.db_port};"
                f"DATABASE={self.db_name};"
                f"UID={self.db_user};"
                f"PWD={self.db_password};"
                f"Encrypt={self.db_encrypt};"
                f"TrustServerCertificate={self.db_trust_server_certificate};"
            )
            return "mssql+pyodbc:///?odbc_connect=" + urllib.parse.quote_plus(odbc_str)
        return self.database_url


settings = Settings()
