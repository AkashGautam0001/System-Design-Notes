"""
============================================================
FILE 13: APIROUTER, PROJECT STRUCTURE, AND CONFIG
============================================================
Topics: APIRouter, prefix, tags, include_router, nested routers,
        project structure, pydantic-settings, BaseSettings,
        .env files, environment-based config, modular app

WHY THIS MATTERS:
A 500-line main.py is unmaintainable. When three developers
work on flights, hotels, and buses, they need separate files.
APIRouter and proper project structure are how professional
Python teams organize FastAPI applications.
============================================================
"""

# STORY: MakeMyTrip — Flights/Hotels/Buses as Separate Modules
# MakeMyTrip has 80M+ monthly users booking flights, hotels,
# buses, trains, and holidays. Each travel vertical is owned by
# a different team. The flights team cannot be editing the same
# file as the hotels team — that causes merge conflicts daily.
# They split the API into modules: flights/, hotels/, buses/,
# each with its own router, models, and business logic. The main
# app just includes these routers. This is what we will learn.

from typing import Optional, List
from datetime import datetime, timezone

from fastapi import FastAPI, APIRouter, Depends, Query, HTTPException

# ════════════════════════════════════════════════════════════
# SECTION 1 — Why Split Into Multiple Files
# ════════════════════════════════════════════════════════════

# WHY: As your app grows, a single file becomes unmanageable.
# Splitting gives you: team isolation, easier testing, clear
# ownership, and faster code reviews.

# Problems with a single main.py: 2000+ lines, merge conflicts,
# hard to navigate, no separation of concerns.
# Solution: APIRouter — create mini-apps that plug into the main app.


# ════════════════════════════════════════════════════════════
# SECTION 2 — APIRouter Basics
# ════════════════════════════════════════════════════════════

# WHY: APIRouter is a "mini FastAPI" that you define separately
# and then include in the main app. It has the same decorators
# (@router.get, @router.post) but lives in its own file.

# --- A simple router ---

flights_router = APIRouter()

# This endpoint will be at /flights/search when included
@flights_router.get("/search")
def search_flights(
    origin: str = Query(..., example="DEL"),
    destination: str = Query(..., example="BOM"),
    date: str = Query(..., example="2025-03-15"),
):
    """Search available flights between two cities."""
    return {
        "flights": [
            {
                "airline": "IndiGo",
                "flight_no": "6E 2345",
                "origin": origin,
                "destination": destination,
                "date": date,
                "price": 4500,
                "departure": "06:30",
                "arrival": "08:45",
            },
            {
                "airline": "Air India",
                "flight_no": "AI 680",
                "origin": origin,
                "destination": destination,
                "date": date,
                "price": 5200,
                "departure": "09:00",
                "arrival": "11:15",
            },
        ]
    }


@flights_router.get("/{flight_id}")
def get_flight(flight_id: int):
    """Get flight details by ID."""
    return {
        "flight_id": flight_id,
        "airline": "IndiGo",
        "flight_no": "6E 2345",
        "status": "on_time",
    }


@flights_router.post("/book")
def book_flight(flight_id: int, passengers: int = Query(1, ge=1, le=9)):
    """Book seats on a flight."""
    return {
        "booking_id": "MMT-FL-20250315-001",
        "flight_id": flight_id,
        "passengers": passengers,
        "status": "confirmed",
    }


# ════════════════════════════════════════════════════════════
# SECTION 3 — Router with Prefix, Tags, and Dependencies
# ════════════════════════════════════════════════════════════

# WHY: Prefix avoids repeating "/hotels" in every route. Tags
# group endpoints in Swagger docs. Dependencies enforce rules
# (like auth) on all endpoints in the router.

# --- Simulated auth dependency for the hotels module ---

def get_current_user_id(x_user_id: int = Query(1, description="Simulated user ID")):
    """Simulated auth — in production, this extracts from JWT."""
    return x_user_id


# --- Hotels router with prefix and tags ---

hotels_router = APIRouter(
    prefix="/hotels",
    tags=["Hotels"],
    responses={404: {"description": "Hotel not found"}},
)

# Sample hotel data
HOTELS_DB = [
    {"id": 1, "name": "Taj Palace Delhi", "city": "Delhi", "price": 15000, "rating": 4.8},
    {"id": 2, "name": "Oberoi Bangalore", "city": "Bangalore", "price": 12000, "rating": 4.7},
    {"id": 3, "name": "ITC Maratha Mumbai", "city": "Mumbai", "price": 18000, "rating": 4.9},
    {"id": 4, "name": "Lemon Tree Pune", "city": "Pune", "price": 3500, "rating": 4.1},
]


@hotels_router.get("/")
def list_hotels(
    city: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = Query("price", enum=["price", "rating", "name"]),
):
    """List hotels with optional filters."""
    results = HOTELS_DB.copy()

    if city:
        results = [h for h in results if h["city"].lower() == city.lower()]
    if min_price is not None:
        results = [h for h in results if h["price"] >= min_price]
    if max_price is not None:
        results = [h for h in results if h["price"] <= max_price]

    results.sort(key=lambda h: h.get(sort_by, 0))
    return {"hotels": results, "count": len(results)}


@hotels_router.get("/{hotel_id}")
def get_hotel(hotel_id: int):
    """Get hotel details by ID."""
    hotel = next((h for h in HOTELS_DB if h["id"] == hotel_id), None)
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return hotel


@hotels_router.post("/book")
def book_hotel(
    hotel_id: int,
    check_in: str = Query(..., example="2025-03-15"),
    check_out: str = Query(..., example="2025-03-17"),
    user_id: int = Depends(get_current_user_id),
):
    """Book a hotel room."""
    hotel = next((h for h in HOTELS_DB if h["id"] == hotel_id), None)
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return {
        "booking_id": "MMT-HT-20250315-001",
        "hotel": hotel["name"],
        "check_in": check_in,
        "check_out": check_out,
        "booked_by": user_id,
        "status": "confirmed",
    }


# ════════════════════════════════════════════════════════════
# SECTION 4 — Buses Router and Multiple Routers Together
# ════════════════════════════════════════════════════════════

# WHY: Each team (flights, hotels, buses) defines their router
# independently. The main app includes all of them. This is
# how MakeMyTrip's architecture works at scale.

buses_router = APIRouter(
    prefix="/buses",
    tags=["Buses"],
)


@buses_router.get("/search")
def search_buses(
    origin: str = Query(..., example="Bangalore"),
    destination: str = Query(..., example="Chennai"),
    date: str = Query(..., example="2025-03-15"),
):
    """Search available buses between two cities."""
    return {
        "buses": [
            {
                "operator": "RedBus VRL",
                "departure": "22:00",
                "arrival": "06:00",
                "price": 850,
                "type": "Sleeper AC",
                "seats_available": 12,
            },
            {
                "operator": "SRS Travels",
                "departure": "23:00",
                "arrival": "07:00",
                "price": 650,
                "type": "Semi-Sleeper",
                "seats_available": 23,
            },
        ]
    }


@buses_router.get("/{bus_id}")
def get_bus(bus_id: int):
    """Get bus details by ID."""
    return {"bus_id": bus_id, "operator": "RedBus VRL", "status": "on_time"}


# --- Nested Router: Bus Reviews inside Buses ---

bus_reviews_router = APIRouter()


@bus_reviews_router.get("/")
def list_bus_reviews(bus_id: int):
    """List reviews for a specific bus operator."""
    return {
        "bus_id": bus_id,
        "reviews": [
            {"user": "Priya", "rating": 4, "comment": "Clean bus, on time"},
            {"user": "Amit", "rating": 3, "comment": "AC was not working properly"},
        ],
    }


@bus_reviews_router.post("/")
def add_bus_review(bus_id: int, rating: int = Query(ge=1, le=5), comment: str = ""):
    """Add a review for a bus."""
    return {"bus_id": bus_id, "rating": rating, "comment": comment, "status": "added"}


# Include nested router inside buses router
buses_router.include_router(
    bus_reviews_router,
    prefix="/{bus_id}/reviews",
    tags=["Bus Reviews"],
)


# ════════════════════════════════════════════════════════════
# SECTION 5 — Including Routers in the Main App
# ════════════════════════════════════════════════════════════

# WHY: The main app file should be thin — just create the app,
# include routers, and add middleware. All business logic lives
# in the router modules.

app = FastAPI(
    title="MakeMyTrip API",
    description="Travel booking API with modular architecture",
    version="2.0.0",
)

# Include all routers
app.include_router(flights_router, prefix="/flights", tags=["Flights"])
app.include_router(hotels_router)   # prefix already set on router
app.include_router(buses_router)    # prefix already set on router


@app.get("/", tags=["Health"])
def root():
    """Health check endpoint."""
    return {
        "app": "MakeMyTrip API",
        "version": "2.0.0",
        "modules": ["flights", "hotels", "buses"],
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "flights": "up",
            "hotels": "up",
            "buses": "up",
            "database": "up",
        },
    }


# ════════════════════════════════════════════════════════════
# SECTION 6 — Recommended Project Structure
# ════════════════════════════════════════════════════════════

# WHY: A consistent folder layout means any new developer can
# find code immediately. This structure is used by most
# professional FastAPI teams.

# makemytrip-api/
# |
# |-- main.py                  # App creation, include routers
# |-- config.py                # Settings, env vars
# |-- database.py              # Engine, session, create_tables
# |-- models.py                # SQLModel table definitions
# |
# |-- routes/                  # Each module gets its own file
# |   |-- __init__.py
# |   |-- flights.py           # flights_router
# |   |-- hotels.py            # hotels_router
# |   |-- buses.py             # buses_router
# |   |-- users.py             # users_router
# |
# |-- schemas/                 # Pydantic models (request/response)
# |   |-- __init__.py
# |   |-- flights.py
# |   |-- hotels.py
# |   |-- users.py
# |
# |-- services/                # Business logic (not in routes)
# |   |-- __init__.py
# |   |-- flight_service.py
# |   |-- hotel_service.py
# |   |-- email_service.py
# |
# |-- dependencies/            # Shared dependencies
# |   |-- __init__.py
# |   |-- auth.py              # get_current_user, require_role
# |   |-- database.py          # get_session
# |   |-- pagination.py        # common_pagination
# |
# |-- tests/                   # Tests mirror the routes structure
# |   |-- __init__.py
# |   |-- test_flights.py
# |   |-- test_hotels.py
# |
# |-- alembic/                 # Database migrations
# |   |-- versions/
# |
# |-- .env                     # Environment variables (git-ignored)
# |-- .env.example             # Template for .env
# |-- requirements.txt
# |-- Dockerfile
# |-- docker-compose.yml


# ════════════════════════════════════════════════════════════
# SECTION 7 — Config Management with Pydantic Settings
# ════════════════════════════════════════════════════════════

# WHY: Hardcoding database URLs and API keys is a security risk
# and makes deployment painful. Settings should come from
# environment variables or .env files, validated at startup.

# In a real project, you would install pydantic-settings:
#   pip install pydantic-settings
#
# Here we show the pattern with a simulated version that
# compiles without the optional dependency.

# --- What config.py would look like ---
#
# from pydantic_settings import BaseSettings
# from functools import lru_cache
#
# class Settings(BaseSettings):
#     """
#     Application settings loaded from environment variables.
#     Pydantic validates types automatically.
#     """
#     # App
#     app_name: str = "MakeMyTrip API"
#     app_version: str = "2.0.0"
#     debug: bool = False
#
#     # Database
#     database_url: str = "sqlite:///./makemytrip.db"
#     db_pool_size: int = 10
#     db_max_overflow: int = 20
#
#     # Auth
#     jwt_secret: str = "change-me-in-production"
#     jwt_algorithm: str = "HS256"
#     jwt_expiration_minutes: int = 30
#
#     # External Services
#     email_api_key: str = ""
#     sms_api_key: str = ""
#     redis_url: str = "redis://localhost:6379"
#
#     # CORS
#     allowed_origins: list[str] = ["http://localhost:3000"]
#
#     class Config:
#         env_file = ".env"
#         env_file_encoding = "utf-8"
#
# @lru_cache()
# def get_settings() -> Settings:
#     """
#     Cached settings — loaded once, reused everywhere.
#     lru_cache ensures .env is read only once.
#     """
#     return Settings()

# --- Simulated version for this teaching file ---

import os


class Settings:
    """Simulated settings class (works without pydantic-settings)."""

    def __init__(self):
        self.app_name: str = os.getenv("APP_NAME", "MakeMyTrip API")
        self.app_version: str = os.getenv("APP_VERSION", "2.0.0")
        self.debug: bool = os.getenv("DEBUG", "false").lower() == "true"
        self.database_url: str = os.getenv("DATABASE_URL", "sqlite:///./makemytrip.db")
        self.jwt_secret: str = os.getenv("JWT_SECRET", "change-me-in-production")
        self.jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
        self.jwt_expiration_minutes: int = int(os.getenv("JWT_EXPIRATION_MINUTES", "30"))
        self.allowed_origins: list = os.getenv(
            "ALLOWED_ORIGINS", "http://localhost:3000"
        ).split(",")


def get_settings() -> Settings:
    """Return application settings."""
    return Settings()


# --- Using settings as a dependency ---

@app.get("/config-demo", tags=["Config"])
def config_demo(settings: Settings = Depends(get_settings)):
    """Show current configuration (non-sensitive fields only)."""
    return {
        "app_name": settings.app_name,
        "version": settings.app_version,
        "debug": settings.debug,
        "allowed_origins": settings.allowed_origins,
    }


# ════════════════════════════════════════════════════════════
# SECTION 8 — What Each File Would Contain
# ════════════════════════════════════════════════════════════

# WHY: Seeing concrete code for each file removes ambiguity.
# Here is exactly what goes in each file of the project structure.

# -------------------------------------------------------
# FILE: main.py
# -------------------------------------------------------
# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from config import get_settings
# from routes import flights, hotels, buses, users
# from database import create_tables
#
# settings = get_settings()
#
# app = FastAPI(title=settings.app_name, version=settings.app_version)
#
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=settings.allowed_origins,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
#
# app.include_router(flights.router, prefix="/flights", tags=["Flights"])
# app.include_router(hotels.router, prefix="/hotels", tags=["Hotels"])
# app.include_router(buses.router, prefix="/buses", tags=["Buses"])
# app.include_router(users.router, prefix="/users", tags=["Users"])
#
# @app.on_event("startup")
# def startup():
#     create_tables()
#
# @app.get("/")
# def root():
#     return {"app": settings.app_name}

# -------------------------------------------------------
# FILE: database.py
# -------------------------------------------------------
# from sqlmodel import SQLModel, Session, create_engine
# from config import get_settings
#
# settings = get_settings()
# engine = create_engine(settings.database_url, echo=settings.debug)
#
# def create_tables():
#     SQLModel.metadata.create_all(engine)
#
# def get_session():
#     with Session(engine) as session:
#         yield session

# -------------------------------------------------------
# FILE: routes/flights.py
# -------------------------------------------------------
# from fastapi import APIRouter, Depends, Query
# from sqlmodel import Session, select
# from database import get_session
# from models import Flight
#
# router = APIRouter()
#
# @router.get("/search")
# def search_flights(origin: str, destination: str, date: str,
#                    session: Session = Depends(get_session)):
#     statement = select(Flight).where(
#         Flight.origin == origin,
#         Flight.destination == destination,
#     )
#     return session.exec(statement).all()

# -------------------------------------------------------
# FILE: models.py
# -------------------------------------------------------
# from sqlmodel import SQLModel, Field
# from typing import Optional
#
# class Flight(SQLModel, table=True):
#     id: Optional[int] = Field(default=None, primary_key=True)
#     airline: str
#     flight_no: str
#     origin: str
#     destination: str
#     price: float
#
# class Hotel(SQLModel, table=True):
#     id: Optional[int] = Field(default=None, primary_key=True)
#     name: str
#     city: str
#     price: float
#     rating: float

# -------------------------------------------------------
# FILE: .env  (git-ignored, contains real secrets)
# -------------------------------------------------------
# APP_NAME=MakeMyTrip API
# DEBUG=true
# DATABASE_URL=postgresql://user:pass@localhost:5432/mmt
# JWT_SECRET=super-secret-key-change-in-prod
# ALLOWED_ORIGINS=http://localhost:3000,https://makemytrip.com

# -------------------------------------------------------
# FILE: .env.example  (committed to git, no real secrets)
# -------------------------------------------------------
# APP_NAME=MakeMyTrip API
# DEBUG=false
# DATABASE_URL=postgresql://user:pass@localhost:5432/mmt
# JWT_SECRET=change-me
# ALLOWED_ORIGINS=http://localhost:3000


# ════════════════════════════════════════════════════════════
# KEY TAKEAWAYS
# ════════════════════════════════════════════════════════════
# 1. APIRouter is a "mini FastAPI" — define endpoints separately
# 2. Use prefix to avoid repeating the module path in every route
# 3. Use tags to group endpoints in Swagger documentation
# 4. Router-level dependencies apply to all endpoints in that router
# 5. Nested routers let you compose sub-modules (reviews inside buses)
# 6. Keep main.py thin — only app creation, router inclusion, middleware
# 7. Use pydantic-settings (BaseSettings) for type-safe config from .env
# 8. Never commit .env with secrets — commit .env.example as a template
# "Any fool can write code that a computer can understand.
#  Good programmers write code that humans can understand." — Martin Fowler
