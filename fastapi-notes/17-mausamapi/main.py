"""
MausamAPI — External API Aggregator

Ramesh's personal meteorologist. Aggregates weather data from wttr.in
and news from multiple sources into a single, clean API.

Run with:
    uvicorn main:app --reload
"""

from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI

from config import settings
from models import HealthResponse
from routes.news import router as news_router
from routes.weather import router as weather_router


# ---------------------------------------------------------------------------
# Lifespan — startup and shutdown logic
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: log configuration. Shutdown: cleanup."""
    # Startup
    print(f"Starting {settings.APP_NAME}")
    print(f"  Debug mode: {settings.DEBUG}")
    print(f"  Weather cache TTL: {settings.WEATHER_CACHE_MINUTES} minutes")
    print(f"  News cache TTL: {settings.NEWS_CACHE_MINUTES} minutes")
    print(f"  Request timeout: {settings.REQUEST_TIMEOUT} seconds")

    if not settings.NEWS_API_KEY:
        print("  NEWS_API_KEY not set — using mock news data")

    yield

    # Shutdown
    print(f"Shutting down {settings.APP_NAME}")


# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Aggregates weather data and news for any Indian city into a single, "
        "clean API. Like having a personal meteorologist — powered by wttr.in "
        "and curated news sources."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Include routers
# ---------------------------------------------------------------------------
app.include_router(weather_router)
app.include_router(news_router)


# ---------------------------------------------------------------------------
# Health check — simple "are you alive?" endpoint
# ---------------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    """Health check endpoint for monitoring and load balancers.

    Returns a simple status object. Does NOT call external APIs —
    health checks should be fast and self-contained.
    """
    return HealthResponse(
        status="healthy",
        app=settings.APP_NAME,
        timestamp=datetime.utcnow().isoformat(),
    )


# ---------------------------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------------------------
@app.get("/", tags=["System"])
async def root() -> dict:
    """Welcome message and API information."""
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "message": "Mausam jaano, fasal bachao!",
        "endpoints": {
            "weather": "/api/weather/{city}",
            "news": "/api/news/{city}",
            "dashboard": "/api/dashboard/{city}",
        },
    }
