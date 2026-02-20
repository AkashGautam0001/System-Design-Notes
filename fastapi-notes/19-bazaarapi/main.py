# ============================================================
# BazaarAPI — Main Application Entry Point
# ============================================================
# This is where everything comes together:
#   - FastAPI app initialization
#   - Lifespan: create tables, seed admin user
#   - Middleware stack: logging, timing, CORS
#   - Router inclusion: all feature modules
#   - Root and health check endpoints
#
# Run with: uvicorn main:app --reload
# ============================================================

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from config import settings
from database import engine, create_db_and_tables
from middleware.logging import RequestLoggingMiddleware
from middleware.timing import TimingMiddleware

# --- Import all routers ---
from users.routes import router as users_router
from categories.routes import router as categories_router
from products.routes import router as products_router
from cart.routes import router as cart_router
from orders.routes import router as orders_router
from payments.routes import router as payments_router
from admin.routes import router as admin_router

# --- Import models so SQLModel knows about all tables ---
from users.models import User  # noqa: F401
from categories.models import Category  # noqa: F401
from products.models import Product  # noqa: F401
from cart.models import CartItem  # noqa: F401
from orders.models import Order, OrderItem  # noqa: F401
from payments.models import Payment  # noqa: F401

# --- Logging setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ============================================================
# Lifespan: startup and shutdown logic
# ============================================================
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan handler.

    Startup:
    - Create all database tables
    - Seed the admin user

    Shutdown:
    - (cleanup would go here — close connections, flush logs, etc.)
    """
    logger.info("Starting BazaarAPI...")

    # Create tables
    create_db_and_tables()
    logger.info("Database tables created/verified")

    # Seed admin user
    from users.services import seed_admin_user
    with Session(engine) as session:
        seed_admin_user(session)
    logger.info("Admin user seeded")

    logger.info(f"BazaarAPI v{settings.APP_VERSION} is ready!")
    yield
    logger.info("Shutting down BazaarAPI...")


# ============================================================
# App initialization
# ============================================================
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "A full-featured e-commerce API built with FastAPI, SQLModel, "
        "and Razorpay. Supports user auth, product catalog, cart, "
        "orders, payments, and admin dashboard."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
)


# ============================================================
# Middleware stack (order matters — last added runs first)
# ============================================================

# CORS — must be added before custom middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware
app.add_middleware(TimingMiddleware)
app.add_middleware(RequestLoggingMiddleware)


# ============================================================
# Include routers
# ============================================================
app.include_router(users_router)
app.include_router(categories_router)
app.include_router(products_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(payments_router)
app.include_router(admin_router)


# ============================================================
# Root and health check endpoints
# ============================================================
@app.get("/", tags=["Root"])
def root() -> dict:
    """API root — basic info about BazaarAPI."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["Health"])
def health_check() -> dict:
    """
    Health check endpoint for load balancers and monitoring.

    Returns 200 if the app is running. In production, you'd also
    check database connectivity and external service health.
    """
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
    }
