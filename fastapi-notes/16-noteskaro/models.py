"""
NotesKaro — SQLModel models for the Notes CRUD API.

Three separate models follow the Create/Read/Update pattern:
- NoteCreate: Fields the client sends when creating a note
- NoteRead: Fields the server returns (includes id, timestamps)
- NoteUpdate: All optional fields for partial updates (PATCH)
"""

from datetime import datetime

from sqlmodel import Field, SQLModel


# ---------------------------------------------------------------------------
# Database model — this is the actual table in SQLite
# ---------------------------------------------------------------------------
class Note(SQLModel, table=True):
    """Represents a single note stored in the database."""

    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(index=True, min_length=1, max_length=200)
    content: str = Field(min_length=1)
    subject: str = Field(index=True, max_length=100)
    topic: str | None = Field(default=None, max_length=100)
    is_important: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Request model — what the client sends to create a note
# ---------------------------------------------------------------------------
class NoteCreate(SQLModel):
    """Schema for creating a new note. No id or timestamps — the server sets those."""

    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    subject: str = Field(max_length=100)
    topic: str | None = Field(default=None, max_length=100)
    is_important: bool = Field(default=False)


# ---------------------------------------------------------------------------
# Response model — what the server returns to the client
# ---------------------------------------------------------------------------
class NoteRead(SQLModel):
    """Schema for returning a note. Includes id and timestamps."""

    id: int
    title: str
    content: str
    subject: str
    topic: str | None
    is_important: bool
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Update model — all fields optional for partial updates (PATCH)
# ---------------------------------------------------------------------------
class NoteUpdate(SQLModel):
    """Schema for updating a note. All fields are optional."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1)
    subject: str | None = Field(default=None, max_length=100)
    topic: str | None = None
    is_important: bool | None = None
