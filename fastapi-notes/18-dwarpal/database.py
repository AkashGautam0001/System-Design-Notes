# ============================================================
# DwarPal — Database Setup (SQLModel + SQLite)
# ============================================================
# Engine creation, session management, and table initialization.
# Uses SQLModel which combines SQLAlchemy and Pydantic.
# ============================================================

from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from config import settings

# Create the database engine
# connect_args is needed for SQLite to allow multi-threaded access
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},  # SQLite-specific
)


def create_db_and_tables() -> None:
    """
    Create all tables defined by SQLModel models.
    Called once at application startup via the lifespan event.
    """
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """
    Dependency that provides a database session.
    Yields a session and ensures it's closed after the request.

    Usage in routes:
        session: Session = Depends(get_session)
    """
    with Session(engine) as session:
        yield session
