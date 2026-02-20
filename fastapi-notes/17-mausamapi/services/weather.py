"""
MausamAPI — Weather service.

Calls the wttr.in API to fetch current weather data for any city.
Implements in-memory caching with configurable TTL to reduce
external API calls and improve response times.

wttr.in API docs: https://wttr.in/:help
JSON format: https://wttr.in/Mumbai?format=j1
"""

from datetime import datetime

import httpx
from fastapi import HTTPException

from config import settings
from models import WeatherResponse

# ---------------------------------------------------------------------------
# In-memory cache: { "city_name": { "data": WeatherResponse, "timestamp": datetime } }
# ---------------------------------------------------------------------------
_weather_cache: dict[str, dict] = {}


def _get_from_cache(city: str) -> WeatherResponse | None:
    """Check if fresh weather data exists in cache for the given city.

    Returns cached WeatherResponse if data is younger than WEATHER_CACHE_MINUTES,
    otherwise removes stale entry and returns None.
    """
    key = city.lower().strip()
    if key in _weather_cache:
        entry = _weather_cache[key]
        age_seconds = (datetime.utcnow() - entry["timestamp"]).total_seconds()
        max_age_seconds = settings.WEATHER_CACHE_MINUTES * 60

        if age_seconds < max_age_seconds:
            # Cache HIT — return cached data with cached=True flag
            cached_data: WeatherResponse = entry["data"]
            cached_data.cached = True
            return cached_data
        else:
            # Stale entry — remove it
            del _weather_cache[key]

    return None


def _store_in_cache(city: str, data: WeatherResponse) -> None:
    """Store weather data in cache with current timestamp."""
    key = city.lower().strip()
    _weather_cache[key] = {
        "data": data,
        "timestamp": datetime.utcnow(),
    }


def _parse_wttr_response(city: str, raw: dict) -> WeatherResponse:
    """Extract relevant fields from the deeply nested wttr.in JSON response.

    The raw response contains astronomical data, moon phases, and multi-day
    forecasts. We only extract current conditions — what Ramesh actually needs.
    """
    current = raw["current_condition"][0]

    return WeatherResponse(
        city=city,
        temperature_c=int(current.get("temp_C", 0)),
        feels_like_c=int(current.get("FeelsLikeC", 0)),
        humidity=int(current.get("humidity", 0)),
        description=current.get("weatherDesc", [{}])[0].get("value", "Unknown"),
        wind_speed_kmph=int(current.get("windspeedKmph", 0)),
        pressure_mb=int(current.get("pressure", 0)),
        visibility_km=int(current.get("visibility", 0)),
        uv_index=int(current.get("uvIndex", 0)),
        cached=False,
        fetched_at=datetime.utcnow().isoformat(),
    )


async def get_weather_data(city: str) -> WeatherResponse:
    """Fetch current weather data for a city.

    1. Check cache first (fast path)
    2. If cache miss, call wttr.in API
    3. Parse and cache the response
    4. Handle all error cases (timeout, 404, connection error)
    """
    # --- Cache check ---
    cached = _get_from_cache(city)
    if cached is not None:
        return cached

    # --- Call external API ---
    url = f"{settings.WTTR_BASE_URL}/{city}?format=j1"

    try:
        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT) as client:
            response = await client.get(url)
            response.raise_for_status()
            raw_data = response.json()

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail=f"Weather service timed out while fetching data for '{city}'",
        )
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail=f"City '{city}' not found on weather service",
            )
        raise HTTPException(
            status_code=502,
            detail=f"Weather service returned error: {exc.response.status_code}",
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="Could not reach weather service. Check your internet connection.",
        )

    # --- Parse response ---
    try:
        weather = _parse_wttr_response(city, raw_data)
    except (KeyError, IndexError, ValueError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to parse weather data: {exc}",
        )

    # --- Store in cache ---
    _store_in_cache(city, weather)

    return weather


def clear_weather_cache() -> int:
    """Clear the entire weather cache. Returns number of entries removed."""
    count = len(_weather_cache)
    _weather_cache.clear()
    return count
