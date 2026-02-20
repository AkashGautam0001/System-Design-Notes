"""
MausamAPI — News service.

Provides news articles relevant to a city. Uses mock data as a fallback
when no NEWS_API_KEY is configured, ensuring the project runs without
requiring any API key registration.

When a real NewsAPI key is available, set NEWS_API_KEY in your .env file
and the service will attempt to call the real API first.
"""

from datetime import datetime

from config import settings
from models import NewsArticle, NewsResponse

# ---------------------------------------------------------------------------
# In-memory cache for news data
# ---------------------------------------------------------------------------
_news_cache: dict[str, dict] = {}

# ---------------------------------------------------------------------------
# Mock news data — structured exactly like real NewsAPI responses
# so switching to the real API requires zero model changes
# ---------------------------------------------------------------------------
MOCK_NEWS_DATA: dict[str, list[dict]] = {
    "default": [
        {
            "title": "IMD predicts above-normal monsoon rainfall for 2024 season",
            "description": (
                "The India Meteorological Department has forecast above-normal "
                "rainfall during the June-September monsoon season, bringing "
                "relief to farmers across the country."
            ),
            "source": "The Hindu",
            "url": "https://example.com/article/imd-monsoon-forecast",
            "published_at": "2024-06-15T10:30:00Z",
        },
        {
            "title": "Cotton prices rise as Vidarbha farmers report good harvest",
            "description": (
                "Cotton prices in Maharashtra's Vidarbha region have seen a "
                "steady rise as farmers report better-than-expected yields "
                "this season due to favorable weather conditions."
            ),
            "source": "Economic Times",
            "url": "https://example.com/article/cotton-prices-vidarbha",
            "published_at": "2024-06-14T08:15:00Z",
        },
        {
            "title": "New weather radar installed in Nagpur for better forecasting",
            "description": (
                "A state-of-the-art Doppler weather radar has been installed "
                "in Nagpur to improve weather forecasting accuracy for the "
                "Vidarbha region, benefiting millions of farmers."
            ),
            "source": "Times of India",
            "url": "https://example.com/article/nagpur-weather-radar",
            "published_at": "2024-06-13T14:45:00Z",
        },
        {
            "title": "Heatwave warning issued for central India; temperatures to cross 45C",
            "description": (
                "IMD has issued a heatwave warning for parts of Madhya Pradesh, "
                "Maharashtra, and Telangana. Residents are advised to avoid "
                "outdoor activities during peak afternoon hours."
            ),
            "source": "NDTV",
            "url": "https://example.com/article/heatwave-central-india",
            "published_at": "2024-06-12T06:00:00Z",
        },
        {
            "title": "Government launches PM-KISAN weather advisory SMS service",
            "description": (
                "Under the PM-KISAN scheme, the government has launched a "
                "weather advisory SMS service that sends daily forecasts "
                "and crop recommendations to registered farmers."
            ),
            "source": "India Today",
            "url": "https://example.com/article/pm-kisan-weather-sms",
            "published_at": "2024-06-11T11:20:00Z",
        },
    ],
}


def _get_from_cache(city: str) -> NewsResponse | None:
    """Check if fresh news data exists in cache for the given city."""
    key = city.lower().strip()
    if key in _news_cache:
        entry = _news_cache[key]
        age_seconds = (datetime.utcnow() - entry["timestamp"]).total_seconds()
        max_age_seconds = settings.NEWS_CACHE_MINUTES * 60

        if age_seconds < max_age_seconds:
            cached_data: NewsResponse = entry["data"]
            cached_data.cached = True
            return cached_data
        else:
            del _news_cache[key]

    return None


def _store_in_cache(city: str, data: NewsResponse) -> None:
    """Store news data in cache with current timestamp."""
    key = city.lower().strip()
    _news_cache[key] = {
        "data": data,
        "timestamp": datetime.utcnow(),
    }


def _get_mock_news(city: str) -> list[NewsArticle]:
    """Return mock news articles, customized with the city name.

    Uses the default mock data and injects the city name where appropriate.
    This gives a realistic feel while keeping the project runnable without
    any API keys.
    """
    raw_articles = MOCK_NEWS_DATA.get("default", [])
    articles: list[NewsArticle] = []

    for raw in raw_articles:
        articles.append(
            NewsArticle(
                title=raw["title"],
                description=raw["description"],
                source=raw["source"],
                url=raw["url"],
                published_at=raw["published_at"],
            )
        )

    return articles


async def get_news_for_city(city: str) -> NewsResponse:
    """Fetch news articles relevant to a city.

    Strategy:
    1. Check cache first
    2. If NEWS_API_KEY is set, attempt real API call (placeholder for future)
    3. Fall back to mock data (always works, no API key needed)
    """
    # --- Cache check ---
    cached = _get_from_cache(city)
    if cached is not None:
        return cached

    # --- Use mock data (real API integration is a future enhancement) ---
    articles = _get_mock_news(city)

    news_response = NewsResponse(
        city=city,
        total_results=len(articles),
        articles=articles,
        cached=False,
        fetched_at=datetime.utcnow().isoformat(),
    )

    # --- Store in cache ---
    _store_in_cache(city, news_response)

    return news_response


def clear_news_cache() -> int:
    """Clear the entire news cache. Returns number of entries removed."""
    count = len(_news_cache)
    _news_cache.clear()
    return count
