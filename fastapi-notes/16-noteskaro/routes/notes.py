"""
NotesKaro — CRUD routes for the /notes endpoints.

Endpoints:
  POST   /notes/          — Create a new note
  GET    /notes/          — List notes (paginated, filterable, searchable)
  GET    /notes/{note_id} — Get a single note by ID
  PATCH  /notes/{note_id} — Partially update a note
  DELETE /notes/{note_id} — Delete a note
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, col, func, or_, select

from database import get_session
from models import Note, NoteCreate, NoteRead, NoteUpdate

router = APIRouter(prefix="/notes", tags=["Notes"])


# ---------------------------------------------------------------------------
# CREATE — POST /notes/
# ---------------------------------------------------------------------------
@router.post("/", response_model=NoteRead, status_code=201)
def create_note(
    note: NoteCreate,
    session: Session = Depends(get_session),
) -> Note:
    """Create a new note and return it with generated id and timestamps."""
    db_note = Note.model_validate(note)
    session.add(db_note)
    session.commit()
    session.refresh(db_note)
    return db_note


# ---------------------------------------------------------------------------
# READ ALL — GET /notes/   (with pagination, filters, search)
# ---------------------------------------------------------------------------
@router.get("/")
def list_notes(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Max records to return"),
    subject: str | None = Query(None, description="Filter by subject"),
    topic: str | None = Query(None, description="Filter by topic"),
    is_important: bool | None = Query(None, description="Filter by importance"),
    search: str | None = Query(None, description="Search in title and content"),
    session: Session = Depends(get_session),
) -> dict:
    """Return a paginated list of notes with optional filters and search.

    Response includes total count so clients can build pagination controls.
    """
    # Base query
    statement = select(Note)

    # --- Apply filters ---
    if subject is not None:
        statement = statement.where(Note.subject == subject)
    if topic is not None:
        statement = statement.where(Note.topic == topic)
    if is_important is not None:
        statement = statement.where(Note.is_important == is_important)

    # --- Case-insensitive search across title and content ---
    if search:
        search_term = f"%{search}%"
        statement = statement.where(
            or_(
                col(Note.title).ilike(search_term),
                col(Note.content).ilike(search_term),
            )
        )

    # --- Total count (before pagination) ---
    count_statement = select(func.count()).select_from(statement.subquery())
    total = session.exec(count_statement).one()

    # --- Apply pagination ---
    statement = statement.offset(skip).limit(limit).order_by(col(Note.created_at).desc())
    notes = session.exec(statement).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "notes": [NoteRead.model_validate(n) for n in notes],
    }


# ---------------------------------------------------------------------------
# READ ONE — GET /notes/{note_id}
# ---------------------------------------------------------------------------
@router.get("/{note_id}", response_model=NoteRead)
def get_note(
    note_id: int,
    session: Session = Depends(get_session),
) -> Note:
    """Retrieve a single note by its ID. Returns 404 if not found."""
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


# ---------------------------------------------------------------------------
# UPDATE — PATCH /notes/{note_id}
# ---------------------------------------------------------------------------
@router.patch("/{note_id}", response_model=NoteRead)
def update_note(
    note_id: int,
    note_data: NoteUpdate,
    session: Session = Depends(get_session),
) -> Note:
    """Partially update a note. Only provided fields are changed.

    Uses `exclude_unset=True` to distinguish between "field not sent"
    and "field explicitly set to None."
    """
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    update_dict = note_data.model_dump(exclude_unset=True)
    note.sqlmodel_update(update_dict)
    note.updated_at = datetime.utcnow()

    session.add(note)
    session.commit()
    session.refresh(note)
    return note


# ---------------------------------------------------------------------------
# DELETE — DELETE /notes/{note_id}
# ---------------------------------------------------------------------------
@router.delete("/{note_id}", status_code=204)
def delete_note(
    note_id: int,
    session: Session = Depends(get_session),
) -> None:
    """Delete a note by ID. Returns 204 No Content on success."""
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    session.delete(note)
    session.commit()
    return None
