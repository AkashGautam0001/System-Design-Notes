"""
MausamAPI — News and Dashboard route endpoints.

Endpoints:
  GET /api/news/{city}       — Get news articles for a city
  GET /api/dashboard/{city}  — Combined weather + news for a city
"""

import asyncio
from datetime import datetime

from fastapi import APIRouter

from models import DashboardResponse, NewsResponse
from services.news import get_news_for_city
from services.weather import get_weather_data

router = APIRouter(prefix="/api", tags=["News & Dashboard"])


@router.get(
    "/news/{city}",
    response_model=NewsResponse,
    summary="Get news for a city",
)
async def get_news(city: str) -> NewsResponse:
    """Fetch news articles relevant to the specified city.

    Currently uses mock data. Set NEWS_API_KEY in .env to enable
    real news API integration.
    """
    return await get_news_for_city(city)


@router.get(
    "/dashboard/{city}",
    response_model=DashboardResponse,
    summary="Get combined weather and news dashboard",
    responses={
        404: {"description": "City not found"},
        502: {"description": "External service error"},
        504: {"description": "External service timeout"},
    },
)
async def get_dashboard(city: str) -> DashboardResponse:
    """Aggregate weather and news data for a city into a single response.

    Both services are called concurrently using asyncio.gather() for
    optimal performance — total wait time is max(weather, news) instead
    of weather + news.
    """
    # Fetch weather and news concurrently
    weather, news_response = await asyncio.gather(
        get_weather_data(city),
        get_news_for_city(city),
    )

    return DashboardResponse(
        city=city,
        weather=weather,
        news=news_response.articles,
        generated_at=datetime.utcnow().isoformat(),
    )
