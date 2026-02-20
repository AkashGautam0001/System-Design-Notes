# ============================================================
# DwarPal — Configuration (pydantic-settings)
# ============================================================
# All application settings in one place, loaded from environment
# variables or a .env file. Never hardcode secrets in source code.
# ============================================================

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables or .env file.

    In production, override these via environment variables:
        export SECRET_KEY="a-very-long-random-string"
        export DATABASE_URL="postgresql://user:pass@host/db"
    """

    # --- Database ---
    DATABASE_URL: str = "sqlite:///./dwarpal.db"

    # --- JWT Settings ---
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # --- Admin Seed ---
    ADMIN_USERNAME: str = "admin"
    ADMIN_EMAIL: str = "admin@dwarpal.local"
    ADMIN_PASSWORD: str = "admin123"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Singleton instance — import this throughout the app
settings = Settings()
