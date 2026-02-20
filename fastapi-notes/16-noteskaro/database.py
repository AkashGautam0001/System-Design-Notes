"""
NotesKaro — Database configuration.

Provides:
- SQLite engine (file-based, zero configuration)
- Session dependency for FastAPI route injection
- Table creation function called during app lifespan
"""

from sqlmodel import Session, SQLModel, create_engine

# ---------------------------------------------------------------------------
# Database URL — SQLite stores everything in a single file
# Three slashes = relative path (file sits next to the code)
# ---------------------------------------------------------------------------
DATABASE_URL = "sqlite:///./noteskaro.db"

# echo=True prints every SQL statement to the console — great for learning,
# turn it off in production for cleaner logs.
engine = create_engine(DATABASE_URL, echo=True)


def create_db_and_tables() -> None:
    """Create all tables defined by SQLModel metadata.

    This is safe to call multiple times — it only creates tables that
    do not already exist (uses CREATE TABLE IF NOT EXISTS internally).
    """
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency that provides a database session.

    Uses a generator so the session is automatically closed after
    the request completes — even if an error occurs.
    """
    with Session(engine) as session:
        yield session
