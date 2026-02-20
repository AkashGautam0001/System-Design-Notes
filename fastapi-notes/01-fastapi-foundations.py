"""
============================================================
FILE 01: FASTAPI FOUNDATIONS AND YOUR FIRST API
============================================================
Topics: FastAPI overview, ASGI vs WSGI, installation,
        app creation, configuration, first routes, uvicorn,
        request-response lifecycle, interactive docs,
        async vs def, OpenAPI schema

WHY THIS MATTERS:
FastAPI is the fastest-growing Python web framework. It gives
you automatic validation, serialization, and documentation
out of the box — things Flask/Django devs build manually.
Mastering its foundations saves weeks of boilerplate.
============================================================
"""

# STORY: Swiggy — Flask to FastAPI for 2M Orders/Day
# Swiggy, India's leading food delivery platform, processes over
# 2 million orders daily across 500+ cities. Their early microservices
# were built on Flask — synchronous, no built-in validation, and docs
# were always out of date. When they migrated critical order-routing
# services to FastAPI, they saw 3x throughput improvement thanks to
# async support, and onboarding new engineers became faster because
# the auto-generated Swagger docs were always accurate. The lesson:
# choosing the right framework foundation compounds over time.

# ════════════════════════════════════════════════════════════
# SECTION 1 — What Is FastAPI and Why It Exists
# ════════════════════════════════════════════════════════════

# WHY: Understanding the building blocks helps you debug deeper
# issues and know which docs to read (FastAPI, Starlette, or Pydantic).

# FastAPI is built on two powerful libraries:
#   1. Starlette — the async web framework (routing, middleware, WebSockets)
#   2. Pydantic — the data validation library (models, parsing, serialization)
#
# FastAPI itself is a thin, opinionated layer that glues them together
# and adds automatic OpenAPI documentation generation.
#
# Think of it like this:
#   Starlette = engine + chassis (handles HTTP)
#   Pydantic  = safety system (validates data)
#   FastAPI   = the finished car (developer experience)
#
# Key stats (as of 2024):
#   - One of the fastest Python frameworks (on par with Node.js/Go in benchmarks)
#   - 70k+ GitHub stars
#   - Used by Microsoft, Netflix, Uber, and many Indian startups
#   - Built-in support for async/await (Python 3.7+)

# ════════════════════════════════════════════════════════════
# SECTION 2 — ASGI vs WSGI: The Protocol Difference
# ════════════════════════════════════════════════════════════

# WHY: If you've used Flask/Django, you used WSGI. Understanding
# ASGI explains why FastAPI can handle thousands of concurrent
# connections where Flask chokes.

# WSGI (Web Server Gateway Interface):
#   - Synchronous protocol — one request at a time per worker
#   - Used by Flask, Django (traditional)
#   - Each waiting request blocks a worker process
#   - To handle 1000 concurrent users, you need ~1000 workers
#
# ASGI (Asynchronous Server Gateway Interface):
#   - Asynchronous protocol — many requests per worker
#   - Used by FastAPI, Starlette, Django Channels
#   - While one request waits for DB/API, the worker handles others
#   - 1000 concurrent users? A few workers can manage it
#
# Real-world analogy (Swiggy context):
#   WSGI = one delivery partner per order (even if waiting at restaurant)
#   ASGI = one delivery partner picks up multiple orders intelligently
#
# Installation is simple:
#   pip install "fastapi[standard]"
#
# This installs FastAPI + uvicorn (the ASGI server) + other useful extras
# like python-multipart for form data and httpx for testing.

# ════════════════════════════════════════════════════════════
# SECTION 3 — Creating Your First FastAPI Application
# ════════════════════════════════════════════════════════════

# WHY: The app object is the heart of everything. Every route,
# middleware, and event handler is registered on it.

from fastapi import FastAPI
from fastapi import Request
import uvicorn

# --- Basic app creation ---
# The simplest possible FastAPI app:
# app = FastAPI()
# That's it. You have a working ASGI application.

# --- App with full configuration ---
# In production, you'll want metadata for your docs and API consumers.

app = FastAPI(
    title="Swiggy Order Service",               # Shows in Swagger UI header
    description=(
        "Internal API for managing food orders. "
        "Handles creation, tracking, and delivery assignment."
    ),
    version="2.1.0",                             # API version string
    docs_url="/docs",                            # Swagger UI path (default)
    redoc_url="/redoc",                          # ReDoc path (default)
    openapi_url="/openapi.json",                 # OpenAPI schema path
    # You can disable docs in production:
    # docs_url=None, redoc_url=None
)

# Key configuration options explained:
#   title          — name of your API (appears in docs header)
#   description    — markdown-supported description for docs
#   version        — semantic version of your API
#   docs_url       — URL path for Swagger UI (set None to disable)
#   redoc_url      — URL path for ReDoc (set None to disable)
#   openapi_url    — URL path for raw OpenAPI JSON schema
#   terms_of_service — URL to your ToS
#   contact        — dict with name, url, email
#   license_info   — dict with name, url

# ════════════════════════════════════════════════════════════
# SECTION 4 — Your First Routes and Running the Server
# ════════════════════════════════════════════════════════════

# WHY: Routes map URLs to functions. This is the core pattern
# you'll repeat hundreds of times in any real project.

# --- The simplest possible route ---
@app.get("/")
def read_root():
    """Root endpoint — health check / welcome message."""
    # FastAPI automatically converts this dict to JSON
    return {"message": "Welcome to Swiggy Order Service", "status": "healthy"}


# --- A route with more detail ---
@app.get("/about")
def about():
    """Returns API metadata."""
    return {
        "service": "order-service",
        "team": "backend-platform",
        "region": "ap-south-1",
        "version": "2.1.0"
    }


# --- Multiple routes for a resource ---
@app.get("/orders")
def list_orders():
    """List recent orders (dummy data for learning)."""
    return {
        "orders": [
            {"id": 1, "item": "Butter Chicken", "status": "delivered"},
            {"id": 2, "item": "Masala Dosa", "status": "preparing"},
            {"id": 3, "item": "Paneer Tikka", "status": "out_for_delivery"},
        ]
    }


@app.get("/orders/stats")
def order_stats():
    """Get order statistics."""
    return {
        "total_today": 2_340_567,
        "avg_delivery_time_min": 32,
        "top_city": "Bangalore"
    }


# --- Running with uvicorn ---
#
# FROM THE COMMAND LINE (most common):
#   uvicorn 01-fastapi-foundations:app --reload
#
#   --reload     → auto-restart on code changes (dev only!)
#   --host       → bind address (default 127.0.0.1)
#   --port       → port number (default 8000)
#   --workers    → number of worker processes (production)
#
# Examples:
#   uvicorn 01-fastapi-foundations:app --reload --port 9000
#   uvicorn 01-fastapi-foundations:app --host 0.0.0.0 --port 80 --workers 4
#
# PROGRAMMATIC (useful for debugging in IDE):
# if __name__ == "__main__":
#     uvicorn.run("01-fastapi-foundations:app", host="127.0.0.1",
#                 port=8000, reload=True)

# ════════════════════════════════════════════════════════════
# SECTION 5 — The Request-Response Lifecycle
# ════════════════════════════════════════════════════════════

# WHY: Knowing what happens between a client sending a request
# and receiving a response helps you debug middleware, auth,
# and performance issues.

# The lifecycle in FastAPI:
#
# 1. CLIENT sends HTTP request (e.g., GET /orders)
#          ↓
# 2. UVICORN (ASGI server) receives the raw bytes
#          ↓
# 3. STARLETTE routing matches the URL to a path operation
#          ↓
# 4. MIDDLEWARE runs (CORS, auth, logging, etc.)
#          ↓
# 5. DEPENDENCY INJECTION resolves (DB sessions, auth tokens)
#          ↓
# 6. PYDANTIC validates request data (path params, query, body)
#          ↓
# 7. YOUR FUNCTION runs (the route handler)
#          ↓
# 8. PYDANTIC validates/serializes the response
#          ↓
# 9. MIDDLEWARE runs (response side)
#          ↓
# 10. UVICORN sends HTTP response back to client
#
# If validation fails at step 6, FastAPI automatically returns
# a 422 Unprocessable Entity with detailed error messages.
# Your function (step 7) never even runs — saving compute.

# --- You can access the raw request object ---
@app.get("/debug/request-info")
async def request_info(request: Request):
    """Inspect the raw request object (useful for debugging)."""
    return {
        "method": request.method,
        "url": str(request.url),
        "headers": dict(request.headers),
        "client_host": request.client.host if request.client else None,
        "path_params": request.path_params,
        "query_params": dict(request.query_params),
    }


# ════════════════════════════════════════════════════════════
# SECTION 6 — Interactive Docs and Path Operation Parameters
# ════════════════════════════════════════════════════════════

# WHY: Auto-generated docs are one of FastAPI's killer features.
# They let frontend devs, QA, and partners test your API without
# Postman or curl — and they're always in sync with your code.

# Once your app is running, visit:
#   http://127.0.0.1:8000/docs     → Swagger UI (interactive, can send requests)
#   http://127.0.0.1:8000/redoc    → ReDoc (beautiful read-only docs)
#   http://127.0.0.1:8000/openapi.json → Raw OpenAPI 3.1 JSON schema
#
# Swagger UI features:
#   - "Try it out" button to send real requests
#   - Shows request/response schemas
#   - Groups routes by tags
#   - Shows authentication requirements
#
# The OpenAPI schema at /openapi.json can be imported into:
#   - Postman (for team collections)
#   - API Gateway (AWS, Azure)
#   - Code generators (openapi-generator for client SDKs)

# --- Path operation decorator parameters ---
# These control how the route appears in documentation.

@app.get(
    "/orders/active",
    summary="Get Active Orders",                  # Short title in docs
    description=(
        "Returns all orders that are currently being prepared "
        "or are out for delivery. Excludes cancelled and delivered."
    ),
    tags=["Orders"],                              # Groups in docs sidebar
    response_description="List of active order objects",
    deprecated=False,                             # Set True to mark as deprecated
)
def get_active_orders():
    """This docstring also appears in docs if description is not set."""
    return {
        "active_orders": [
            {"id": 2, "item": "Masala Dosa", "status": "preparing"},
            {"id": 3, "item": "Paneer Tikka", "status": "out_for_delivery"},
        ]
    }


# --- Tags help organize large APIs ---
@app.get("/restaurants", tags=["Restaurants"])
def list_restaurants():
    """List partner restaurants."""
    return {
        "restaurants": [
            {"id": 101, "name": "Punjab Grill", "city": "Delhi"},
            {"id": 102, "name": "MTR", "city": "Bangalore"},
        ]
    }


@app.get("/restaurants/featured", tags=["Restaurants"])
def featured_restaurants():
    """Get featured/promoted restaurants."""
    return {
        "featured": [
            {"id": 101, "name": "Punjab Grill", "rating": 4.5}
        ]
    }


# --- Deprecated endpoint example ---
@app.get(
    "/orders/v1/history",
    tags=["Orders"],
    deprecated=True,                              # Shows strikethrough in docs
    summary="[DEPRECATED] Use /orders/history/v2 instead",
)
def orders_history_v1():
    """Old history endpoint. Migrate to v2 by March 2025."""
    return {"orders": [], "warning": "This endpoint is deprecated"}


# ════════════════════════════════════════════════════════════
# SECTION 7 — async def vs def: When to Use Which
# ════════════════════════════════════════════════════════════

# WHY: Using async wrong can actually hurt performance. This
# is the #1 mistake new FastAPI developers make.

# RULE OF THUMB:
#
# Use `async def` when:
#   - You call async libraries (httpx, aiohttp, databases, aioredis)
#   - You use `await` inside the function
#   - You're doing I/O that has an async driver
#
# Use plain `def` when:
#   - You call synchronous libraries (requests, psycopg2, pymongo)
#   - You do CPU-bound work
#   - You're not sure (def is the safe default!)
#
# WHY THIS MATTERS:
#   - `async def` runs on the main event loop
#   - `def` runs in a thread pool (FastAPI handles this automatically!)
#   - If you use `async def` but call sync code inside it,
#     you BLOCK the entire event loop = terrible performance
#
# Swiggy example:
#   Their order service calls MongoDB (motor = async driver) → async def
#   Their analytics service calls pandas (sync) → plain def

# --- Correct: async function with async I/O ---
@app.get("/demo/async-correct", tags=["Demo"])
async def async_correct():
    """Correct use of async — would use await for DB/HTTP calls."""
    # In real code: result = await async_db.find_one({"id": 1})
    # For demo, just returning data
    return {"pattern": "async def + await = correct"}


# --- Correct: sync function with sync I/O ---
@app.get("/demo/sync-correct", tags=["Demo"])
def sync_correct():
    """Correct use of def — FastAPI runs this in a thread pool."""
    # In real code: result = requests.get("https://api.example.com")
    # FastAPI automatically runs this in a threadpool, so it won't block
    return {"pattern": "def + sync library = correct (threadpool)"}


# --- WRONG pattern (don't do this!) ---
# @app.get("/demo/async-wrong")
# async def async_wrong():
#     """WRONG: async def with sync blocking call."""
#     import time
#     time.sleep(5)  # This blocks the ENTIRE event loop!
#     # Use: await asyncio.sleep(5) instead
#     return {"pattern": "DON'T DO THIS"}
#
# The fix for the above is either:
#   1. Change to plain `def` (FastAPI uses threadpool)
#   2. Use the async equivalent (asyncio.sleep, httpx, etc.)


# --- A mini summary route ---
@app.get("/demo/async-summary", tags=["Demo"])
def async_summary():
    """Quick reference for async vs def decision."""
    return {
        "async_def_use_when": [
            "Using async DB drivers (motor, databases, asyncpg)",
            "Using httpx or aiohttp for HTTP calls",
            "Using aioredis or aio-pika for Redis/RabbitMQ",
        ],
        "plain_def_use_when": [
            "Using requests, pymongo, psycopg2 (sync drivers)",
            "Doing CPU-bound work (pandas, numpy)",
            "Not sure which to use (safe default)",
        ],
        "golden_rule": "Never call blocking code inside async def"
    }


# ════════════════════════════════════════════════════════════
# KEY TAKEAWAYS
# ════════════════════════════════════════════════════════════
# 1. FastAPI = Starlette (async HTTP) + Pydantic (validation) + OpenAPI (docs).
# 2. ASGI (async) handles thousands of concurrent connections; WSGI (sync) cannot.
# 3. Install with: pip install "fastapi[standard]" — gives you everything.
# 4. The FastAPI() app object is configured once and used everywhere.
# 5. Every route is a decorator (@app.get, @app.post, etc.) on a function.
# 6. /docs and /redoc give you free, always-accurate interactive API docs.
# 7. Use `def` for sync code, `async def` only when you actually await things.
# 8. The OpenAPI schema at /openapi.json can be exported to Postman, API Gateways,
#    and client SDK generators — making your API a product, not just endpoints.
# "First, solve the problem. Then, write the code." — John Johnson

# --- Programmatic server start (uncomment to run directly) ---
if __name__ == "__main__":
    uvicorn.run(
        "01-fastapi-foundations:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
