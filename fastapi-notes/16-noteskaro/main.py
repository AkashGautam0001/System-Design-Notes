"""
NotesKaro — A Simple Notes CRUD API

Rahul's digital notebook for organizing JEE preparation notes.
Full CRUD with pagination, filtering, and search.

Run with:
    uvicorn main:app --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import create_db_and_tables
from routes.notes import router as notes_router


# ---------------------------------------------------------------------------
# Lifespan — runs code on startup and shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables when the app starts up."""
    create_db_and_tables()
    yield
    # Cleanup code (if needed) goes after yield


# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="NotesKaro",
    description=(
        "A simple notes CRUD API for JEE aspirants. "
        "Organize notes by subject and topic, search instantly, "
        "and never lose a formula again."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Include routers
# ---------------------------------------------------------------------------
app.include_router(notes_router)


# ---------------------------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------------------------
@app.get("/")
def root() -> dict:
    """Welcome message and API information."""
    return {
        "app": "NotesKaro",
        "version": "1.0.0",
        "docs": "/docs",
        "message": "Apna notes organize karo — JEE crack karo!",
    }
