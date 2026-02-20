"""
MausamAPI — Pydantic response models.

These models define the shape of data returned by the API.
External API responses are parsed and normalized into these
clean, well-typed models before being sent to the client.
"""

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Weather Models
# ---------------------------------------------------------------------------
class WeatherResponse(BaseModel):
    """Normalized weather data for a city."""

    city: str
    temperature_c: int
    feels_like_c: int
    humidity: int
    description: str
    wind_speed_kmph: int
    pressure_mb: int
    visibility_km: int
    uv_index: int
    cached: bool = False
    fetched_at: str


# ---------------------------------------------------------------------------
# News Models
# ---------------------------------------------------------------------------
class NewsArticle(BaseModel):
    """A single news article."""

    title: str
    description: str
    source: str
    url: str
    published_at: str


class NewsResponse(BaseModel):
    """Collection of news articles for a city/topic."""

    city: str
    total_results: int
    articles: list[NewsArticle]
    cached: bool = False
    fetched_at: str


# ---------------------------------------------------------------------------
# Dashboard Model — aggregates weather + news
# ---------------------------------------------------------------------------
class DashboardResponse(BaseModel):
    """Combined weather and news for a single city."""

    city: str
    weather: WeatherResponse
    news: list[NewsArticle]
    generated_at: str


# ---------------------------------------------------------------------------
# Health Check Model
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    app: str
    timestamp: str
