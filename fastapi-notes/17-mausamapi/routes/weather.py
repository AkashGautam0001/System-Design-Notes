"""
MausamAPI — Weather route endpoints.

Endpoints:
  GET /api/weather/{city}   — Get current weather for a city
  GET /api/weather/cache/clear — Clear weather cache (admin utility)
"""

from fastapi import APIRouter

from models import WeatherResponse
from services.weather import clear_weather_cache, get_weather_data

router = APIRouter(prefix="/api/weather", tags=["Weather"])


@router.get(
    "/{city}",
    response_model=WeatherResponse,
    summary="Get current weather for a city",
    responses={
        404: {"description": "City not found"},
        502: {"description": "Weather service error"},
        504: {"description": "Weather service timeout"},
    },
)
async def get_weather(city: str) -> WeatherResponse:
    """Fetch current weather data for the specified city.

    The response is cached for 30 minutes (configurable via
    WEATHER_CACHE_MINUTES). Subsequent requests within the cache
    window return instantly without calling the external API.
    """
    return await get_weather_data(city)


@router.delete(
    "/cache/clear",
    summary="Clear weather cache",
)
async def clear_cache() -> dict:
    """Remove all cached weather data. Returns the number of entries cleared."""
    count = clear_weather_cache()
    return {"cleared": count, "message": f"Cleared {count} cached weather entries"}
