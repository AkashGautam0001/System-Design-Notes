# ============================================================
# BazaarAPI — Configuration (pydantic-settings)
# ============================================================
# All configuration is loaded from environment variables or .env file.
# This single source of truth prevents hardcoded secrets.
# ============================================================

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    In production, these come from actual env vars or a secrets manager.
    In development, they're loaded from a .env file.
    """

    # --- Database ---
    DATABASE_URL: str = "sqlite:///./bazaarapi.db"

    # --- JWT Auth ---
    SECRET_KEY: str = "change-this-to-a-random-secret-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # --- Razorpay ---
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # --- CORS ---
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # --- App ---
    DEBUG: bool = True
    APP_NAME: str = "BazaarAPI"
    APP_VERSION: str = "1.0.0"

    # --- Admin Seed ---
    ADMIN_EMAIL: str = "admin@bazaarapi.com"
    ADMIN_PASSWORD: str = "admin123"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


# Singleton — import this everywhere
settings = Settings()
