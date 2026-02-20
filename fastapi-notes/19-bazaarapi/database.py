# ============================================================
# BazaarAPI — Database Setup (SQLModel + SQLite)
# ============================================================
# Single responsibility: create engine, provide sessions,
# and initialize tables. Nothing else lives here.
# ============================================================

from sqlmodel import SQLModel, Session, create_engine
from typing import Generator

from config import settings

# SQLite needs connect_args for thread safety in FastAPI
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # SQL logging in dev mode
    connect_args=connect_args,
)


def create_db_and_tables() -> None:
    """Create all tables defined by SQLModel metadata."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """
    Dependency that provides a database session.

    Usage in routes:
        session: Session = Depends(get_session)

    The session is automatically closed after the request.
    """
    with Session(engine) as session:
        yield session
