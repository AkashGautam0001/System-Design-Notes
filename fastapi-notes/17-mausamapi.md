# ============================================================
# FILE 17: MAUSAMAPI — EXTERNAL API AGGREGATOR
# ============================================================
# Topics: External APIs, httpx, async, env vars, caching, error handling
#
# WHY THIS MATTERS:
# Most real apps don't exist in isolation — they call external APIs.
# Learning to aggregate, cache, and handle failures from third-party
# services is a critical backend skill.
# ============================================================

## STORY: The Indian Farmer and Weather Data

Ramesh, a farmer in Vidarbha, Maharashtra, checks weather predictions
before deciding when to sow cotton seeds. IMD (India Meteorological
Department) data is scattered across different sources. MausamAPI
aggregates weather data and news for any Indian city into a single,
clean API — like having a personal meteorologist.

Every kharif season, Ramesh asks the same questions: "Will it rain this
week? Should I sow today or wait?" He calls his neighbor, checks the TV
news, asks at the mandal office — three different sources, three different
answers. MausamAPI solves this by pulling weather data from a reliable
source (wttr.in) and combining it with relevant agricultural news — all
in one API call. One endpoint, one answer, one decision.

This chapter teaches you how to call external APIs, handle their failures
gracefully, cache results to avoid hammering third-party servers, and
aggregate multiple data sources into a single, clean response.

---

## SECTION 1 — Project Setup and Architecture

### WHY: External API projects need a different structure

Unlike NotesKaro (Chapter 16) which talks to its own database, MausamAPI
talks to the outside world. This means we need:
- **Services layer** — Functions that call external APIs
- **Config management** — API keys and settings from environment variables
- **Caching** — So we do not call external APIs on every single request
- **Error handling** — External APIs fail. A lot. Our app must not crash.

### Architecture Diagram

```
Client Request
    -> FastAPI Route (routes/)
    -> Service Layer (services/)
    -> Cache Check (hit? return cached)
    -> External API Call (wttr.in, news API)
    -> Parse Response
    -> Cache Store
    -> Return to Client
```

### Project Structure

```
17-mausamapi/
  main.py           # FastAPI app, lifespan, router inclusion, health check
  config.py          # Settings from environment variables (pydantic-settings)
  models.py          # Response models for weather and news data
  services/
    __init__.py      # Empty — makes services a package
    weather.py       # Calls wttr.in, parses weather data, caches results
    news.py          # Mock news data (with real API structure)
  routes/
    __init__.py      # Empty — makes routes a package
    weather.py       # Weather endpoints
    news.py          # News endpoints + combined dashboard
  .env.example       # Template for environment variables
  requirements.txt   # Dependencies
```

### Tech Stack

| Component        | Technology         |
|------------------|--------------------|
| Framework        | FastAPI            |
| HTTP Client      | httpx (async)      |
| Config           | pydantic-settings  |
| Server           | Uvicorn            |
| Weather API      | wttr.in (free)     |
| News Data        | Mock data fallback |

---

## SECTION 2 — Configuration Management

### WHY: Hardcoded API keys are a security disaster

Never, ever, EVER put API keys directly in your code. If you push to GitHub,
bots will find your key within minutes and abuse it. Environment variables
keep secrets out of your codebase.

### pydantic-settings BaseSettings

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "MausamAPI"
    DEBUG: bool = True
    NEWS_API_KEY: str = ""
    WEATHER_CACHE_MINUTES: int = 30
    NEWS_CACHE_MINUTES: int = 60
    REQUEST_TIMEOUT: int = 10

    model_config = SettingsConfigDict(env_file=".env")
```

**How it works:**

1. First, checks environment variables (highest priority)
2. Then, checks `.env` file
3. Finally, uses default values

**ANALOGY:** Think of it like Ramesh checking weather. First he looks outside
(environment variable — most direct). If cloudy, he checks the TV (`.env` file).
If TV is off, he goes with "probably the same as yesterday" (default value).

### The `.env.example` File

```
NEWS_API_KEY=your_news_api_key_here
WEATHER_CACHE_MINUTES=30
NEWS_CACHE_MINUTES=60
DEBUG=true
```

**RULE:** `.env` goes in `.gitignore`. `.env.example` gets committed. This way,
new developers know what variables to set without seeing actual secrets.

---

## SECTION 3 — The httpx Async HTTP Client

### WHY: `requests` is synchronous and blocks your entire server

When your FastAPI server calls an external API using the `requests` library,
the entire server thread is blocked waiting for the response. If wttr.in takes
3 seconds to respond, your server cannot handle ANY other requests during
those 3 seconds.

`httpx` supports async/await, which means your server can handle hundreds of
other requests while waiting for the external API to respond.

### Basic httpx Usage

```python
import httpx

async def get_weather(city: str) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"https://wttr.in/{city}?format=j1")
        response.raise_for_status()
        return response.json()
```

**Line-by-line:**

1. `async with httpx.AsyncClient()` — Creates an async HTTP client that
   automatically closes when done (like a database session).
2. `timeout=10.0` — If wttr.in does not respond in 10 seconds, raise an error.
   Without this, your request could hang forever.
3. `response.raise_for_status()` — If the API returns 4xx or 5xx, raise an
   `httpx.HTTPStatusError`. This converts silent failures into loud errors.
4. `response.json()` — Parse the JSON response body.

### Why Not `requests`?

| Feature           | requests       | httpx (async)     |
|-------------------|----------------|-------------------|
| Blocking          | Yes            | No                |
| Concurrent calls  | No (without threads) | Yes (native) |
| FastAPI compatible| Works but bad  | Perfect fit       |
| API similarity    | requests-like  | requests-like     |

**INSIGHT:** httpx was designed to be a drop-in replacement for `requests`
with async support. If you know `requests`, you already know 90% of httpx.

---

## SECTION 4 — Weather Service with Caching

### WHY: External APIs have rate limits, and weather does not change every second

wttr.in is free, but it has fair-use limits. More importantly, weather data
does not change minute by minute. Caching the result for 30 minutes means:
- Faster responses (cache hit = no network call)
- Less load on wttr.in (be a good API citizen)
- Your app works even if wttr.in is temporarily down (serve stale cache)

### In-Memory Cache Implementation

```python
_weather_cache: dict[str, dict] = {}

def _get_from_cache(city: str) -> dict | None:
    key = city.lower().strip()
    if key in _weather_cache:
        entry = _weather_cache[key]
        age = (datetime.utcnow() - entry["timestamp"]).total_seconds()
        if age < settings.WEATHER_CACHE_MINUTES * 60:
            return entry["data"]
        else:
            del _weather_cache[key]
    return None
```

**How the cache works:**

1. Store weather data in a dictionary: `{city: {data: ..., timestamp: ...}}`
2. On request, check if city exists in cache
3. If exists, check if the cached data is younger than 30 minutes
4. If fresh, return cached data (cache HIT)
5. If stale or missing, call the API and store the result (cache MISS)

**LIMITATION:** This is an in-memory cache. If the server restarts, the cache
is empty. For production, use Redis. But for learning and small apps, this
is perfectly fine.

### Parsing wttr.in Response

The wttr.in API returns a deeply nested JSON structure. Our service extracts
only what Ramesh cares about:

```python
{
    "city": "Nagpur",
    "temperature_c": 32,
    "feels_like_c": 36,
    "humidity": 65,
    "description": "Partly cloudy",
    "wind_speed_kmph": 12,
    "pressure_mb": 1008,
    "visibility_km": 6,
    "uv_index": 7
}
```

**WHY parse?** The raw wttr.in response is 200+ lines of JSON with data Ramesh
does not need (astronomical data, moon phase, etc.). Our API is an
**aggregator** — it takes complex data and simplifies it.

---

## SECTION 5 — News Service with Mock Fallback

### WHY: Real APIs need real API keys, but learning should not be blocked

NewsAPI (newsapi.org) requires registration and an API key. Rather than making
you sign up before you can run this project, we provide mock data that mimics
the real API structure. When you get a real API key, just drop it in `.env`
and the same code works.

### Mock Data Strategy

```python
MOCK_NEWS = [
    {
        "title": "IMD predicts above-normal monsoon rainfall",
        "description": "The India Meteorological Department has predicted...",
        "source": "The Hindu",
        "url": "https://example.com/article/1",
        "published_at": "2024-06-15T10:30:00Z"
    },
    # ... more mock articles
]
```

**PATTERN:** The mock data has the exact same structure as the real API would
return. This means:
- Your models work with both mock and real data
- Your routes do not change when you switch to real data
- You can develop and test without an internet connection

---

## SECTION 6 — Response Models

### WHY: External data is messy — your API should be clean

wttr.in returns temperature as a string "32". NewsAPI returns dates in
different formats. Your API should normalize everything into consistent,
well-typed models.

### Weather Response Model

```python
class WeatherResponse(BaseModel):
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
```

**The `cached` field:** This tells the client whether the data came from cache
or a fresh API call. Useful for debugging and transparency.

### Dashboard Response Model

```python
class DashboardResponse(BaseModel):
    city: str
    weather: WeatherResponse
    news: list[NewsArticle]
    generated_at: str
```

**WHY a dashboard?** Ramesh does not want to make two API calls. He wants ONE
call that gives him weather + news for his city. The dashboard endpoint
aggregates both services into a single response.

---

## SECTION 7 — Error Handling for External APIs

### WHY: External APIs fail in ways your own database never will

Your SQLite database is sitting on your own machine — it is reliable. External
APIs? They can:
- Time out (slow network)
- Return 404 (city not found)
- Return 500 (their server crashed)
- Return garbage (API changed format)
- Be completely unreachable (DNS failure)

### Error Handling Strategy

```python
try:
    async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT) as client:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()
except httpx.TimeoutException:
    raise HTTPException(status_code=504, detail="Weather service timed out")
except httpx.HTTPStatusError as e:
    if e.response.status_code == 404:
        raise HTTPException(status_code=404, detail=f"City '{city}' not found")
    raise HTTPException(status_code=502, detail="Weather service error")
except httpx.RequestError:
    raise HTTPException(status_code=502, detail="Could not reach weather service")
```

**HTTP Status Codes for Proxy Errors:**

| Code | Meaning              | When to use                     |
|------|----------------------|---------------------------------|
| 502  | Bad Gateway          | External API returned an error  |
| 503  | Service Unavailable  | External API is down            |
| 504  | Gateway Timeout      | External API took too long      |

**INSIGHT:** These 5xx codes tell the client "it is not YOUR fault, and it is
not MY fault — a third-party service failed." This is critical for debugging.

---

## SECTION 8 — The Combined Dashboard Endpoint

### WHY: Aggregation is the killer feature of backend APIs

Any client can call wttr.in directly. The value MausamAPI adds is
**aggregation** — combining multiple data sources into one clean response.

### Implementation

```python
@router.get("/dashboard/{city}", response_model=DashboardResponse)
async def get_dashboard(city: str):
    weather = await get_weather_data(city)
    news = await get_news_for_city(city)
    return DashboardResponse(
        city=city,
        weather=weather,
        news=news,
        generated_at=datetime.utcnow().isoformat()
    )
```

**IMPROVEMENT OPPORTUNITY:** Right now, weather and news are fetched
sequentially. With `asyncio.gather()`, both can be fetched simultaneously:

```python
weather, news = await asyncio.gather(
    get_weather_data(city),
    get_news_for_city(city)
)
```

This cuts the total wait time from (weather_time + news_time) to
max(weather_time, news_time). If weather takes 2s and news takes 1s, the
sequential version takes 3s but the parallel version takes only 2s.

---

## SECTION 9 — Health Check Endpoint

### WHY: Monitoring tools need a simple "are you alive?" endpoint

In production, load balancers and monitoring services (like AWS ALB, Kubernetes,
or UptimeRobot) regularly ping a health endpoint. If it returns 200, the app
is healthy. If it fails, alerts fire.

```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "timestamp": datetime.utcnow().isoformat()
    }
```

**Keep it simple.** A health check should not call external APIs or do heavy
computation. It should just confirm "yes, the FastAPI server is running and
can respond to requests."

---

## SECTION 10 — Running and Testing

### WHY: An API you cannot test is an API you cannot trust

### Setup

```bash
cd 17-mausamapi/
cp .env.example .env        # Copy environment template
pip install -r requirements.txt
uvicorn main:app --reload
```

### Test Endpoints

1. **Health check:**
   ```bash
   curl http://127.0.0.1:8000/health
   ```

2. **Get weather for a city:**
   ```bash
   curl http://127.0.0.1:8000/api/weather/Mumbai
   ```

3. **Get weather again (cached):**
   ```bash
   curl http://127.0.0.1:8000/api/weather/Mumbai
   # Notice "cached": true in the response
   ```

4. **Get news for a city:**
   ```bash
   curl http://127.0.0.1:8000/api/news/Mumbai
   ```

5. **Get combined dashboard:**
   ```bash
   curl http://127.0.0.1:8000/api/dashboard/Mumbai
   ```

6. **Test error handling (invalid city):**
   ```bash
   curl http://127.0.0.1:8000/api/weather/xyznonexistent
   ```

### Interactive Docs

Open `http://127.0.0.1:8000/docs` for the Swagger UI. Every endpoint is
documented with request/response schemas automatically generated from your
Pydantic models.

---

## SECTION 11 — Comparing NotesKaro and MausamAPI

### WHY: Recognizing patterns across projects deepens understanding

| Aspect            | NotesKaro (Ch 16)       | MausamAPI (Ch 17)         |
|-------------------|-------------------------|---------------------------|
| Data source       | Own SQLite database     | External APIs             |
| HTTP methods      | GET, POST, PATCH, DELETE| GET only                  |
| Error source      | Missing records (404)   | API failures (502, 504)   |
| Performance trick | DB indexing             | Response caching          |
| Config            | Hardcoded DB URL        | pydantic-settings + .env  |
| HTTP client       | None needed             | httpx (async)             |
| Sync vs Async     | Sync (DB operations)    | Async (network calls)     |

**INSIGHT:** These two projects represent the two fundamental types of backend
services: **data stores** (CRUD apps that manage their own data) and
**aggregators** (apps that combine external data sources). Most real-world
applications are a combination of both.

---

## SECTION 12 — Production Considerations

### WHY: Learning projects become production services faster than you think

If Ramesh's MausamAPI becomes popular in his village:

1. **Replace in-memory cache with Redis** — Survives server restarts, shared
   across multiple server instances.
2. **Add rate limiting** — Prevent one client from making 1000 requests/second.
3. **Add request logging** — Track which cities are most popular.
4. **Set up proper monitoring** — Alerts when external APIs fail.
5. **Use a real news API** — Drop in the NewsAPI key or use GNews.
6. **Add authentication** — So only authorized apps can use your API.

---

## KEY TAKEAWAYS

1. **Use httpx, not requests, for async FastAPI**: The `requests` library blocks
   the event loop. `httpx.AsyncClient` is the correct choice for async endpoints.
2. **Always set timeouts on external API calls**: Without timeouts, a slow
   external API will make YOUR API hang indefinitely.
3. **Cache external API responses**: Weather does not change every second. Cache
   aggressively to improve speed and reduce external API load.
4. **Use pydantic-settings for configuration**: Environment variables for secrets,
   `.env` files for development, defaults for safety. Never hardcode API keys.
5. **Handle every failure mode**: Timeouts, HTTP errors, connection errors,
   invalid cities — each needs a specific, helpful error message.
6. **Aggregation adds value**: Combining multiple data sources into one clean
   endpoint is the core value proposition of backend APIs.
7. **Mock data enables development**: Do not let missing API keys block your
   progress. Mock the data, build the structure, add real APIs later.
