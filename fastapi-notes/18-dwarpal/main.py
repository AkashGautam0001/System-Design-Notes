# ============================================================
# DwarPal — Main Application Entry Point
# ============================================================
# The DwarPal (doorkeeper) Authentication System.
#
# Like the security guard at Prestige Lakeside Habitat who:
# - Checks IDs (authentication)
# - Issues visitor passes (JWT tokens)
# - Controls facility access (RBAC)
# - Maintains a visitor log (audit trail)
#
# Run with: uvicorn main:app --reload
# Docs at:  http://127.0.0.1:8000/docs
# ============================================================

from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlmodel import Session, select

from auth.models import User, UserRole
from auth.routes import router as auth_router
from auth.services import hash_password
from database import create_db_and_tables, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events.

    On startup:
    1. Create all database tables
    2. Seed the admin user if it doesn't exist

    The admin seed ensures there's always at least one admin
    account to manage the system — like the housing society
    secretary who has the master key on day one.
    """
    # --- Startup ---
    create_db_and_tables()

    # Seed admin user if not exists
    with Session(engine) as session:
        existing_admin = session.exec(
            select(User).where(User.username == "admin")
        ).first()

        if not existing_admin:
            admin_user = User(
                username="admin",
                email="admin@dwarpal.local",
                hashed_password=hash_password("admin123"),
                full_name="System Administrator",
                role=UserRole.admin,
                is_active=True,
            )
            session.add(admin_user)
            session.commit()

    yield  # Application runs here

    # --- Shutdown ---
    # Cleanup resources if needed


# Create the FastAPI application
app = FastAPI(
    title="DwarPal — Authentication System",
    description=(
        "A complete authentication and authorization system for FastAPI. "
        "Like the DwarPal (doorkeeper) of a housing society — checks IDs, "
        "issues passes, and controls who can access what."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Include the auth router
app.include_router(auth_router)


@app.get("/", tags=["Root"])
def root():
    """Welcome endpoint — the front gate of DwarPal."""
    return {
        "message": "Welcome to DwarPal — Authentication System",
        "docs": "/docs",
        "register": "/auth/register",
        "login": "/auth/login",
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for monitoring and load balancers."""
    return {"status": "healthy", "service": "dwarpal"}
