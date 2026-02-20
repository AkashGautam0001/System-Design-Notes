"""
============================================================
FILE 10: DATABASE INTEGRATION WITH SQLMODEL AND SQLITE
============================================================
Topics: SQLModel, SQLite, create_engine, Session, CRUD with DB,
        model separation (Base/Create/Read/Table), Depends,
        lifespan, pagination, relationships, timestamps

WHY THIS MATTERS:
In-memory data stores vanish when the server restarts. Every
production application needs a database. SQLModel combines the
best of SQLAlchemy (database power) and Pydantic (validation)
into one elegant library built by the creator of FastAPI.
============================================================
"""

# STORY: BookMyShow — Every Seat Is a DB Record Across India
# BookMyShow handles 250+ million visitors per year, selling tickets
# for movies, concerts, and events across 650+ cities. When a user
# browses "Pushpa 3" in PVR Bangalore, the system queries the database
# for available shows, seat maps, and pricing — all in real-time.
# Every seat is a row in the database. Every booking is a transaction.
# Every show schedule is a record linked to a movie and a venue.
# Without a robust database layer, BookMyShow would collapse under
# the first-day-first-show rush that India is famous for.

# Requires: pip install sqlmodel
# SQLModel internally uses SQLAlchemy + Pydantic v2

from fastapi import FastAPI, HTTPException, Depends, Query
from sqlmodel import SQLModel, Field, Session, create_engine, select
from typing import Optional
from datetime import datetime, timezone, date, time
from contextlib import asynccontextmanager
from enum import Enum


# ════════════════════════════════════════════════════════════
# SECTION 1 — Why Databases Over In-Memory Stores
# ════════════════════════════════════════════════════════════

# WHY: Understanding the limitations of in-memory data helps you
# appreciate what a database brings to the table.

# In-Memory Store Problems:
# 1. PERSISTENCE: Server restart = data gone. Database = data survives.
# 2. CONCURRENCY: Multiple workers (uvicorn --workers 4) each have
#    their own copy of in-memory data. Database = shared state.
# 3. QUERYING: Filtering a Python list is O(n). Database indexes
#    make lookups O(log n) or O(1).
# 4. SCALE: A Python dict is limited by RAM. Databases handle TB+.
# 5. ACID: Databases guarantee Atomicity, Consistency, Isolation,
#    Durability. In-memory stores have no transactions.

# SQLite is perfect for learning and small apps:
# - Zero configuration (no server to install)
# - Single file database (easy to backup/share)
# - Included in Python standard library
# - Handles moderate traffic well (reads: fast, writes: serialized)


# ════════════════════════════════════════════════════════════
# SECTION 2 — SQLModel: Defining Database Models
# ════════════════════════════════════════════════════════════

# WHY: SQLModel models serve double duty — they are BOTH Pydantic
# models (for validation) AND SQLAlchemy models (for database ORM).
# One class, two powers.

# --- Movie Model (Database Table) ---
# table=True makes this a database table, not just a Pydantic model
class Movie(SQLModel, table=True):
    """
    A movie in the BookMyShow catalog.

    table=True tells SQLModel to create a database table for this class.
    Without table=True, it is just a regular Pydantic model.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(min_length=1, max_length=200, index=True)
    language: str = Field(max_length=50)
    genre: str = Field(max_length=50)
    duration_minutes: int = Field(ge=1, le=600)
    rating: Optional[float] = Field(default=None, ge=0, le=10)
    release_date: Optional[str] = Field(default=None)
    is_active: bool = Field(default=True)
    created_at: Optional[str] = Field(default=None)
    updated_at: Optional[str] = Field(default=None)


# --- Show Model (Database Table) ---
class Show(SQLModel, table=True):
    """
    A specific show/screening of a movie at a venue.
    Links to a Movie via movie_id (foreign key in a full app).
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    movie_id: int = Field(index=True)
    venue_name: str = Field(max_length=200)
    city: str = Field(max_length=100, index=True)
    show_date: str  # YYYY-MM-DD
    show_time: str  # HH:MM
    total_seats: int = Field(ge=1, le=1000)
    available_seats: int = Field(ge=0)
    price: float = Field(gt=0)
    is_active: bool = Field(default=True)
    created_at: Optional[str] = Field(default=None)


# ════════════════════════════════════════════════════════════
# SECTION 3 — Separate Models: Base, Create, Read, Table
# ════════════════════════════════════════════════════════════

# WHY: A single model for everything creates problems:
# - Create: client should NOT send id or created_at
# - Read: response SHOULD include id and created_at
# - Table: needs id as primary key + table=True
# The solution: a model hierarchy.

# --- Base: shared fields (no table, no id) ---
class MovieBase(SQLModel):
    """Fields shared by all Movie models."""
    title: str = Field(min_length=1, max_length=200)
    language: str = Field(max_length=50)
    genre: str = Field(max_length=50)
    duration_minutes: int = Field(ge=1, le=600)
    rating: Optional[float] = Field(default=None, ge=0, le=10)
    release_date: Optional[str] = Field(default=None)


# --- Create: what the client sends (no id, no timestamps) ---
class MovieCreate(MovieBase):
    """Request body for creating a movie. No id, no timestamps."""
    pass


# --- Read: what the API returns (includes id + timestamps) ---
class MovieRead(MovieBase):
    """Response model with id and metadata."""
    id: int
    is_active: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# --- Update: for partial updates (all fields optional) ---
class MovieUpdate(SQLModel):
    """Partial update — all fields optional."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    language: Optional[str] = Field(default=None, max_length=50)
    genre: Optional[str] = Field(default=None, max_length=50)
    duration_minutes: Optional[int] = Field(default=None, ge=1, le=600)
    rating: Optional[float] = Field(default=None, ge=0, le=10)
    release_date: Optional[str] = None
    is_active: Optional[bool] = None


# --- Show models ---
class ShowBase(SQLModel):
    movie_id: int
    venue_name: str = Field(max_length=200)
    city: str = Field(max_length=100)
    show_date: str
    show_time: str
    total_seats: int = Field(ge=1, le=1000)
    price: float = Field(gt=0)


class ShowCreate(ShowBase):
    pass


class ShowRead(ShowBase):
    id: int
    available_seats: int
    is_active: bool
    created_at: Optional[str] = None


# ════════════════════════════════════════════════════════════
# SECTION 4 — Engine, Lifespan, and Session Dependency
# ════════════════════════════════════════════════════════════

# WHY: The engine is your database connection. The lifespan creates
# tables at startup. The session dependency injects DB access into routes.

# --- Create SQLite engine ---
# echo=True prints SQL statements to console (useful for learning)
DATABASE_URL = "sqlite:///./bookmyshow.db"
engine = create_engine(DATABASE_URL, echo=False)

# connect_args={"check_same_thread": False} is needed for SQLite only
# because SQLite connections are not thread-safe by default
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)


# --- Lifespan: runs on startup and shutdown ---
@asynccontextmanager
async def lifespan(the_app: FastAPI):
    """
    Lifespan replaces the old @app.on_event("startup") pattern.
    Code before 'yield' runs on STARTUP.
    Code after 'yield' runs on SHUTDOWN.
    """
    # STARTUP: Create all tables defined by SQLModel
    SQLModel.metadata.create_all(engine)
    print("Database tables created (if not existing).")
    yield
    # SHUTDOWN: cleanup if needed
    print("Application shutting down.")


app = FastAPI(title="BookMyShow API", lifespan=lifespan)


# --- Session dependency using yield ---
def get_session():
    """
    Dependency that provides a database session.
    'yield' means the session stays open during the request,
    and is properly closed after the response is sent.
    """
    with Session(engine) as session:
        yield session


# ════════════════════════════════════════════════════════════
# SECTION 5 — CREATE: Adding Records to the Database
# ════════════════════════════════════════════════════════════

# WHY: session.add() stages a record. session.commit() writes it.
# session.refresh() reloads it with the auto-generated id.

@app.post("/movies", response_model=MovieRead, status_code=201)
def create_movie(
    movie_data: MovieCreate,
    session: Session = Depends(get_session),
):
    """
    Create a new movie in the database.

    Flow:
    1. MovieCreate validates the request body (Pydantic)
    2. Movie(table=True) becomes the database record
    3. session.add() stages it for insertion
    4. session.commit() writes to database (INSERT SQL)
    5. session.refresh() reloads to get auto-generated id
    """
    now = datetime.now(timezone.utc).isoformat()

    # Create the table model from the request model
    movie = Movie(
        **movie_data.model_dump(),
        is_active=True,
        created_at=now,
        updated_at=now,
    )

    session.add(movie)       # Stage for insertion
    session.commit()         # Execute INSERT
    session.refresh(movie)   # Reload with auto-generated id

    return movie


@app.post("/shows", response_model=ShowRead, status_code=201)
def create_show(
    show_data: ShowCreate,
    session: Session = Depends(get_session),
):
    """Create a show. Validates that the movie exists first."""
    # Check if movie exists
    movie = session.get(Movie, show_data.movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    now = datetime.now(timezone.utc).isoformat()
    show = Show(
        **show_data.model_dump(),
        available_seats=show_data.total_seats,  # initially all seats available
        is_active=True,
        created_at=now,
    )

    session.add(show)
    session.commit()
    session.refresh(show)
    return show


# ════════════════════════════════════════════════════════════
# SECTION 6 — READ: Querying the Database
# ════════════════════════════════════════════════════════════

# WHY: SELECT queries are the most common database operation.
# SQLModel uses the select() function for type-safe queries.

# --- Read all movies with pagination ---
@app.get("/movies", response_model=list[MovieRead])
def list_movies(
    offset: int = Query(ge=0, default=0, description="Skip N records"),
    limit: int = Query(ge=1, le=100, default=20, description="Max records"),
    language: Optional[str] = Query(default=None, description="Filter by language"),
    genre: Optional[str] = Query(default=None, description="Filter by genre"),
    session: Session = Depends(get_session),
):
    """
    List movies with pagination and optional filters.

    select(Movie) -> SELECT * FROM movie
    .offset(N)    -> OFFSET N (skip first N records)
    .limit(N)     -> LIMIT N (return at most N records)
    .where(...)   -> WHERE clause for filtering
    """
    statement = select(Movie).where(Movie.is_active == True)

    if language:
        statement = statement.where(Movie.language == language)
    if genre:
        statement = statement.where(Movie.genre == genre)

    statement = statement.offset(offset).limit(limit)
    movies = session.exec(statement).all()
    return movies


# --- Read single movie by ID ---
@app.get("/movies/{movie_id}", response_model=MovieRead)
def get_movie(
    movie_id: int,
    session: Session = Depends(get_session),
):
    """
    Get a single movie by ID.
    session.get(Model, id) is the simplest way to fetch by primary key.
    Returns None if not found.
    """
    movie = session.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie


# --- Read shows for a movie ---
@app.get("/movies/{movie_id}/shows", response_model=list[ShowRead])
def list_shows_for_movie(
    movie_id: int,
    city: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
):
    """List all active shows for a specific movie, optionally filtered by city."""
    # First verify movie exists
    movie = session.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    statement = select(Show).where(
        Show.movie_id == movie_id,
        Show.is_active == True,
    )
    if city:
        statement = statement.where(Show.city == city)

    shows = session.exec(statement).all()
    return shows


# ════════════════════════════════════════════════════════════
# SECTION 7 — UPDATE: Modifying Database Records
# ════════════════════════════════════════════════════════════

# WHY: Updates are where bugs hide. You must fetch, modify, save,
# and handle not-found — all atomically within a session.

@app.patch("/movies/{movie_id}", response_model=MovieRead)
def update_movie(
    movie_id: int,
    movie_data: MovieUpdate,
    session: Session = Depends(get_session),
):
    """
    Partial update (PATCH) for a movie.

    1. Fetch the record from DB
    2. Get only the fields that were actually sent (exclude_unset=True)
    3. Apply those fields to the DB record
    4. Commit the changes
    """
    movie = session.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    # Only get fields the client explicitly sent
    update_data = movie_data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Apply updates to the database record
    for field, value in update_data.items():
        setattr(movie, field, value)

    movie.updated_at = datetime.now(timezone.utc).isoformat()

    session.add(movie)       # Mark as modified
    session.commit()         # Execute UPDATE
    session.refresh(movie)   # Reload updated record
    return movie


# --- Book seats (reduce available count) ---
@app.post("/shows/{show_id}/book")
def book_seats(
    show_id: int,
    num_seats: int = Query(ge=1, le=10, description="Number of seats to book"),
    session: Session = Depends(get_session),
):
    """
    Book seats for a show — the core BookMyShow operation.
    This demonstrates updating a numeric field atomically.
    """
    show = session.get(Show, show_id)
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    if not show.is_active:
        raise HTTPException(status_code=400, detail="Show is no longer active")

    if show.available_seats < num_seats:
        raise HTTPException(
            status_code=400,
            detail=f"Only {show.available_seats} seats available, requested {num_seats}",
        )

    show.available_seats -= num_seats

    session.add(show)
    session.commit()
    session.refresh(show)

    total_price = show.price * num_seats

    return {
        "message": f"Successfully booked {num_seats} seat(s)",
        "show_id": show.id,
        "seats_booked": num_seats,
        "remaining_seats": show.available_seats,
        "total_price": total_price,
        "price_per_seat": show.price,
    }


# ════════════════════════════════════════════════════════════
# SECTION 8 — DELETE: Removing Database Records
# ════════════════════════════════════════════════════════════

# WHY: Deletion needs careful handling. Prefer soft deletes (set
# is_active=False) over hard deletes (physically remove the row).

# --- Soft delete (preferred in production) ---
@app.delete("/movies/{movie_id}")
def delete_movie(
    movie_id: int,
    session: Session = Depends(get_session),
):
    """
    Soft delete — sets is_active=False instead of removing the row.
    The record stays in the DB for auditing and can be recovered.
    """
    movie = session.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    movie.is_active = False
    movie.updated_at = datetime.now(timezone.utc).isoformat()

    session.add(movie)
    session.commit()

    return {"message": f"Movie '{movie.title}' deactivated (soft delete)"}


# --- Hard delete (use with caution) ---
@app.delete("/shows/{show_id}/permanent")
def hard_delete_show(
    show_id: int,
    session: Session = Depends(get_session),
):
    """
    Hard delete — physically removes the row from the database.
    Use only when you genuinely need to remove data (GDPR, etc.).
    """
    show = session.get(Show, show_id)
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    session.delete(show)   # Mark for deletion
    session.commit()       # Execute DELETE

    return {"message": f"Show {show_id} permanently deleted"}


# ════════════════════════════════════════════════════════════
# SECTION 9 — Complete Example: Seed Data and Search
# ════════════════════════════════════════════════════════════

# WHY: A complete working example ties everything together and gives
# you seed data to test with immediately.

@app.post("/seed", status_code=201)
def seed_database(session: Session = Depends(get_session)):
    """Populate the database with sample BookMyShow data."""
    now = datetime.now(timezone.utc).isoformat()

    # --- Seed movies ---
    movies_data = [
        MovieCreate(
            title="Pushpa 2: The Rule",
            language="Telugu",
            genre="Action",
            duration_minutes=180,
            rating=7.8,
            release_date="2024-12-05",
        ),
        MovieCreate(
            title="Stree 2",
            language="Hindi",
            genre="Horror Comedy",
            duration_minutes=152,
            rating=7.5,
            release_date="2024-08-15",
        ),
        MovieCreate(
            title="Amaran",
            language="Tamil",
            genre="War Drama",
            duration_minutes=169,
            rating=8.1,
            release_date="2024-10-31",
        ),
        MovieCreate(
            title="Singham Again",
            language="Hindi",
            genre="Action",
            duration_minutes=144,
            rating=6.5,
            release_date="2024-11-01",
        ),
        MovieCreate(
            title="Lucky Bhaskar",
            language="Telugu",
            genre="Crime Drama",
            duration_minutes=149,
            rating=8.0,
            release_date="2024-10-31",
        ),
    ]

    created_movies = []
    for movie_data in movies_data:
        movie = Movie(**movie_data.model_dump(), is_active=True, created_at=now, updated_at=now)
        session.add(movie)
        session.commit()
        session.refresh(movie)
        created_movies.append(movie)

    # --- Seed shows for first two movies ---
    shows_data = [
        # Pushpa 2 shows
        ShowCreate(movie_id=created_movies[0].id, venue_name="PVR Orion Mall", city="Bangalore", show_date="2025-03-15", show_time="10:00", total_seats=200, price=350.0),
        ShowCreate(movie_id=created_movies[0].id, venue_name="PVR Orion Mall", city="Bangalore", show_date="2025-03-15", show_time="14:00", total_seats=200, price=400.0),
        ShowCreate(movie_id=created_movies[0].id, venue_name="INOX GVK One", city="Hyderabad", show_date="2025-03-15", show_time="11:00", total_seats=300, price=300.0),
        # Stree 2 shows
        ShowCreate(movie_id=created_movies[1].id, venue_name="PVR Juhu", city="Mumbai", show_date="2025-03-15", show_time="18:00", total_seats=250, price=450.0),
        ShowCreate(movie_id=created_movies[1].id, venue_name="Cinepolis DLF", city="Delhi", show_date="2025-03-15", show_time="20:00", total_seats=180, price=500.0),
    ]

    created_shows = []
    for show_data in shows_data:
        show = Show(
            **show_data.model_dump(),
            available_seats=show_data.total_seats,
            is_active=True,
            created_at=now,
        )
        session.add(show)
        session.commit()
        session.refresh(show)
        created_shows.append(show)

    return {
        "message": f"Seeded {len(created_movies)} movies and {len(created_shows)} shows",
        "movies": [{"id": m.id, "title": m.title} for m in created_movies],
        "shows": [{"id": s.id, "venue": s.venue_name, "city": s.city} for s in created_shows],
    }


# --- Search movies ---
@app.get("/movies/search/query", response_model=list[MovieRead])
def search_movies(
    q: str = Query(min_length=1, max_length=100, description="Search term"),
    session: Session = Depends(get_session),
):
    """
    Search movies by title (case-insensitive partial match).
    SQLite supports LIKE for pattern matching.
    """
    # SQLModel/SQLAlchemy .contains() generates LIKE '%term%'
    statement = select(Movie).where(
        Movie.is_active == True,
        Movie.title.contains(q),
    )
    movies = session.exec(statement).all()
    return movies


# --- Dashboard/stats endpoint ---
@app.get("/dashboard")
def get_dashboard(session: Session = Depends(get_session)):
    """Get an overview of the BookMyShow catalog."""
    total_movies = len(session.exec(select(Movie).where(Movie.is_active == True)).all())
    total_shows = len(session.exec(select(Show).where(Show.is_active == True)).all())
    all_shows = session.exec(select(Show).where(Show.is_active == True)).all()

    total_seats = sum(s.total_seats for s in all_shows)
    booked_seats = sum(s.total_seats - s.available_seats for s in all_shows)
    total_revenue_potential = sum(s.price * s.total_seats for s in all_shows)

    cities = list(set(s.city for s in all_shows))

    return {
        "total_active_movies": total_movies,
        "total_active_shows": total_shows,
        "cities": sorted(cities),
        "total_seats": total_seats,
        "booked_seats": booked_seats,
        "available_seats": total_seats - booked_seats,
        "occupancy_rate": f"{(booked_seats / total_seats * 100):.1f}%" if total_seats > 0 else "0%",
        "total_revenue_potential": total_revenue_potential,
    }


# ════════════════════════════════════════════════════════════
# KEY TAKEAWAYS
# ════════════════════════════════════════════════════════════
# 1. SQLModel = SQLAlchemy + Pydantic in one class. Add table=True
#    to make it a database table; omit it for plain validation models.
# 2. Use separate models: MovieBase (shared), MovieCreate (input),
#    MovieRead (output), Movie(table=True) (database). This prevents
#    clients from setting id or created_at.
# 3. create_engine() connects to the database. For SQLite, use
#    connect_args={"check_same_thread": False} for multi-thread safety.
# 4. Lifespan function replaces @app.on_event. Put table creation
#    (SQLModel.metadata.create_all) in the startup phase.
# 5. Depends(get_session) injects a database session into every route.
#    The 'yield' pattern ensures the session is always closed properly.
# 6. CRUD pattern: session.add() + commit() + refresh() for create/update.
#    session.get(Model, id) for read-by-ID. session.delete() for removal.
# 7. Prefer soft deletes (is_active=False) over hard deletes in production.
#    This preserves audit trails and allows data recovery.
# 8. Pagination at DB level (offset/limit) is critical. Never load all
#    records into Python and slice — that defeats the purpose of a database.
# "At BookMyShow, the database is the single source of truth.
#  Every seat, every show, every rupee flows through it." — BMS Engineering
