"""
MausamAPI — Configuration management with pydantic-settings.

Settings are loaded in this priority order:
1. Environment variables (highest priority)
2. .env file
3. Default values (lowest priority)

Never hardcode API keys or secrets — always use environment variables.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    # -- App metadata --
    APP_NAME: str = "MausamAPI"
    DEBUG: bool = True

    # -- API keys --
    NEWS_API_KEY: str = ""

    # -- Cache TTL (in minutes) --
    WEATHER_CACHE_MINUTES: int = 30
    NEWS_CACHE_MINUTES: int = 60

    # -- HTTP client settings --
    REQUEST_TIMEOUT: int = 10

    # -- External API URLs --
    WTTR_BASE_URL: str = "https://wttr.in"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


# Singleton instance — import this everywhere instead of creating new Settings()
settings = Settings()
