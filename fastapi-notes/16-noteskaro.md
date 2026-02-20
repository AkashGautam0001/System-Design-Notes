# ============================================================
# FILE 16: NOTESKARO — A SIMPLE NOTES CRUD API
# ============================================================
# Topics: Project setup, CRUD, SQLModel, response models, pagination
#
# WHY THIS MATTERS:
# Your first real project wires together everything from chapters 1-10.
# Build confidence by seeing all pieces connected in a working app.
# ============================================================

## STORY: The JEE Aspirant in Kota

Rahul, a JEE aspirant in Kota, has notebooks scattered everywhere — Physics
formulas on loose sheets, Chemistry notes in three different registers, and
Maths problems solved on random pages. He needs a digital system to organize
notes by subject and topic, search through them instantly, and never lose
a formula again. NotesKaro is his solution — a simple but powerful notes API.

Imagine Rahul sitting in his hostel room at 11 PM, frantically searching for
that one integration formula he wrote down "somewhere." With NotesKaro, he
opens his browser, hits `/notes?subject=Maths&topic=Integration`, and boom —
every integration formula he ever saved appears in milliseconds. No more lost
pages. No more panic before exams.

This chapter takes every concept from chapters 1-15 — path parameters, query
parameters, request bodies, response models, database operations, error
handling — and connects them into one cohesive, working application.

---

## SECTION 1 — Project Setup and Requirements

### WHY: A real project starts with planning

Before writing a single line of code, you need to know what you are building.
A clear requirements table prevents scope creep and keeps you focused. Think
of it like Rahul's study plan — without one, he would study random topics and
waste time.

### Requirements Table

| Requirement         | Description                                      |
|---------------------|--------------------------------------------------|
| Create a note       | Save a new note with title, content, subject     |
| List all notes      | Retrieve all notes with pagination               |
| Get a single note   | Retrieve one note by its ID                      |
| Update a note       | Modify title, content, subject, topic, etc.      |
| Delete a note       | Remove a note permanently                        |
| Filter notes        | Filter by subject, topic, or importance          |
| Search notes        | Case-insensitive search in title and content     |

### API Endpoints Table

| Method | Endpoint         | Description              |
|--------|------------------|--------------------------|
| POST   | `/notes`         | Create a new note        |
| GET    | `/notes`         | List all notes (paginated)|
| GET    | `/notes/{id}`    | Get a single note        |
| PATCH  | `/notes/{id}`    | Update a note            |
| DELETE | `/notes/{id}`    | Delete a note            |

### Tech Stack

| Component   | Technology       |
|-------------|------------------|
| Framework   | FastAPI          |
| ORM         | SQLModel         |
| Database    | SQLite           |
| Server      | Uvicorn          |
| Validation  | Pydantic (via SQLModel) |

### Project Structure

```
16-noteskaro/
  main.py           # FastAPI app, lifespan event, router inclusion
  database.py        # Engine, session, table creation
  models.py          # SQLModel models (Note, NoteCreate, NoteRead, NoteUpdate)
  routes/
    __init__.py      # Empty — makes routes a package
    notes.py         # All CRUD endpoints for notes
  requirements.txt   # Dependencies
```

**INSIGHT:** Notice how the project is split into separate files. This is not
just "good practice" — it is essential for maintainability. When Rahul's app
grows to 50 endpoints, he will thank himself for this structure.

---

## SECTION 2 — Database Models

### WHY: Models are the contract between your app and the database

SQLModel combines SQLAlchemy (database ORM) and Pydantic (data validation)
into a single class. This means one model definition gives you both database
table creation AND request/response validation. Two birds, one stone.

### The Note Model

```python
class Note(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(index=True, min_length=1, max_length=200)
    content: str = Field(min_length=1)
    subject: str = Field(index=True, max_length=100)
    topic: str | None = Field(default=None, max_length=100)
    is_important: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

**Field-by-field breakdown:**

- `id` — Auto-generated primary key. `None` by default because the DB assigns it.
- `title` — Indexed for fast searches. Min 1 char (no empty titles).
- `content` — The actual note body. No max length — Rahul's Physics derivations
  can be long!
- `subject` — Indexed because filtering by subject is the most common query.
- `topic` — Optional sub-category. "Integration" under "Maths", for example.
- `is_important` — Boolean flag so Rahul can star important formulas.
- `created_at` / `updated_at` — Timestamps using `default_factory` so each note
  gets the current time automatically.

### Why Three Separate Models?

```python
class NoteCreate(SQLModel):    # What the client SENDS to create a note
class NoteRead(SQLModel):      # What the server RETURNS to the client
class NoteUpdate(SQLModel):    # What the client SENDS to update (all optional)
```

**ANALOGY:** Think of a restaurant. The menu (NoteCreate) shows what you can
order. The bill (NoteRead) shows what you got, including extras like timestamps.
The "modify order" slip (NoteUpdate) lets you change specific items without
rewriting the whole order.

This separation is critical for security — you never want the client to set
`id` or `created_at` directly. The Create model excludes those fields. The
Update model makes everything optional so you can update just one field.

---

## SECTION 3 — Database Setup

### WHY: The database layer should be independent and reusable

Separating database logic into `database.py` means you can swap SQLite for
PostgreSQL later by changing ONE file. The rest of your app does not care
which database engine is underneath.

### Engine and Session

```python
DATABASE_URL = "sqlite:///./noteskaro.db"
engine = create_engine(DATABASE_URL, echo=True)

def get_session():
    with Session(engine) as session:
        yield session
```

**Key decisions:**

- `echo=True` — Prints SQL queries to console. Essential for learning what
  SQLModel actually does under the hood. Turn it off in production.
- `yield` in `get_session` — This is a generator-based dependency. FastAPI
  calls it, gets the session, runs the endpoint, then the `with` block
  closes the session automatically. No resource leaks.
- `sqlite:///./noteskaro.db` — Three slashes = relative path. The DB file
  sits next to your code. Simple for development.

### Table Creation with Lifespan

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)   # Create tables on startup
    yield                                   # App runs here
    # Cleanup code would go after yield
```

**WHY lifespan instead of `on_event("startup")`?** FastAPI recommends the
lifespan pattern because it is more Pythonic and handles both startup AND
shutdown in one place. The old `@app.on_event` decorator is deprecated.

---

## SECTION 4 — CRUD Endpoints

### WHY: CRUD is the backbone of 90% of backend applications

Almost every web application boils down to Create, Read, Update, Delete.
Master CRUD once, and you can build almost anything — from a notes app to
an e-commerce platform.

### CREATE — `POST /notes`

```python
@router.post("/", response_model=NoteRead, status_code=201)
def create_note(note: NoteCreate, session: Session = Depends(get_session)):
    db_note = Note.model_validate(note)
    session.add(db_note)
    session.commit()
    session.refresh(db_note)
    return db_note
```

**Line-by-line:**

1. `response_model=NoteRead` — Even though we return a `Note` object, FastAPI
   serializes it using `NoteRead`. This strips internal fields if needed.
2. `status_code=201` — HTTP 201 means "Created." The default 200 means "OK"
   which is less precise.
3. `Note.model_validate(note)` — Converts the `NoteCreate` Pydantic model into
   a full `Note` database model. This is safer than `Note(**note.dict())`.
4. `session.add(db_note)` — Stages the note for insertion (like `git add`).
5. `session.commit()` — Actually writes to the database (like `git commit`).
6. `session.refresh(db_note)` — Reloads the object from DB so `id`, `created_at`
   etc. are populated.

### READ ALL — `GET /notes` with Pagination and Filters

```python
@router.get("/", response_model=dict)
def list_notes(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    subject: str | None = None,
    topic: str | None = None,
    is_important: bool | None = None,
    search: str | None = None,
    session: Session = Depends(get_session),
):
```

**WHY pagination?** Imagine Rahul has 5000 notes after two years of JEE prep.
Loading all of them in one request would be slow and wasteful. Pagination
returns a small "page" at a time — like reading a book chapter by chapter
instead of swallowing the whole book.

**Filter logic:** Each optional query parameter adds a condition to the SQL
query. If `subject="Physics"`, only Physics notes are returned. If `search`
is provided, we do a case-insensitive search on both `title` and `content`
using SQL `LIKE` with wildcards.

### READ ONE — `GET /notes/{id}`

```python
@router.get("/{note_id}", response_model=NoteRead)
def get_note(note_id: int, session: Session = Depends(get_session)):
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note
```

**The 404 pattern:** This is the most fundamental error handling pattern in
REST APIs. If the resource does not exist, return HTTP 404. Always. Never
return 200 with an empty body — that confuses clients.

### UPDATE — `PATCH /notes/{id}`

```python
@router.patch("/{note_id}", response_model=NoteRead)
def update_note(note_id: int, note_data: NoteUpdate, ...):
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
```

**WHY PATCH instead of PUT?**
- `PUT` means "replace the entire resource." Client must send ALL fields.
- `PATCH` means "update specific fields." Client sends only what changed.

For a notes app, PATCH makes more sense. Rahul might want to just toggle
`is_important` without resending the entire note content.

**`exclude_unset=True`** is crucial — it only includes fields the client
actually sent. Without this, all unset fields would become `None` and
overwrite existing data.

### DELETE — `DELETE /notes/{id}`

```python
@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: int, session: Session = Depends(get_session)):
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    session.delete(note)
    session.commit()
    return None
```

**HTTP 204 No Content** — The delete was successful but there is nothing to
return. This is the standard REST response for successful deletions.

---

## SECTION 5 — Pagination Response Structure

### WHY: Clients need metadata alongside data

Returning just a list of notes is not enough. The client needs to know: How
many total notes exist? Am I on the last page? Can I fetch more?

Our response structure:

```json
{
    "total": 150,
    "skip": 0,
    "limit": 10,
    "notes": [ ... ]
}
```

This lets any frontend build pagination controls — "Page 1 of 15", next/prev
buttons, etc. Without `total`, the frontend would have no idea how many pages
exist.

---

## SECTION 6 — Search Implementation

### WHY: Users think in keywords, not database IDs

Rahul will never remember that his integration-by-parts formula is note #247.
He will search "integration by parts" and expect to find it. Search is not a
luxury feature — it is table stakes for any content app.

### Case-Insensitive Search with SQL LIKE

```python
if search:
    search_term = f"%{search}%"
    statement = statement.where(
        or_(
            col(Note.title).ilike(search_term),
            col(Note.content).ilike(search_term),
        )
    )
```

**How `ilike` works:** The `i` stands for "insensitive" (case-insensitive).
`%` is a SQL wildcard meaning "any characters." So `%integration%` matches
"Integration by Parts", "INTEGRATION FORMULA", and "basic integration."

**LIMITATION:** SQLite's `LIKE` is case-insensitive by default for ASCII
characters, but `ilike` makes the intent explicit and works correctly across
databases if you ever migrate to PostgreSQL.

---

## SECTION 7 — Running and Testing

### WHY: Code that is not tested is code that does not work

Start the server:

```bash
cd 16-noteskaro/
pip install -r requirements.txt
uvicorn main:app --reload
```

Open `http://127.0.0.1:8000/docs` for the interactive Swagger UI.

### Manual Testing Flow

1. **Create a note:**
   ```bash
   curl -X POST http://127.0.0.1:8000/notes/ \
     -H "Content-Type: application/json" \
     -d '{"title": "Integration by Parts", "content": "integral of u dv = uv - integral of v du", "subject": "Maths", "topic": "Integration", "is_important": true}'
   ```

2. **List all notes:**
   ```bash
   curl http://127.0.0.1:8000/notes/
   ```

3. **Search:**
   ```bash
   curl "http://127.0.0.1:8000/notes/?search=integration"
   ```

4. **Filter by subject:**
   ```bash
   curl "http://127.0.0.1:8000/notes/?subject=Maths"
   ```

5. **Update a note:**
   ```bash
   curl -X PATCH http://127.0.0.1:8000/notes/1 \
     -H "Content-Type: application/json" \
     -d '{"is_important": false}'
   ```

6. **Delete a note:**
   ```bash
   curl -X DELETE http://127.0.0.1:8000/notes/1
   ```

---

## SECTION 8 — Code Architecture Review

### WHY: Understanding architecture makes debugging 10x easier

**Request flow for `POST /notes`:**

```
Client sends JSON body
    -> FastAPI validates with NoteCreate model
    -> Route function receives validated data
    -> SQLModel converts to Note (database model)
    -> Session adds, commits, refreshes
    -> FastAPI serializes response using NoteRead
    -> Client receives JSON with id, timestamps, etc.
```

**Dependency injection flow:**

```
get_session() creates a Session
    -> FastAPI injects it into the route function
    -> Route function uses session for DB operations
    -> After route returns, the `with` block closes the session
    -> Connection is returned to the pool
```

This architecture ensures that every request gets a fresh database session,
and that session is always properly closed — even if an error occurs.

---

## SECTION 9 — Common Mistakes and How to Avoid Them

### WHY: Learning from mistakes is faster than making them yourself

| Mistake                             | Fix                                          |
|-------------------------------------|----------------------------------------------|
| Forgetting `session.commit()`       | Data is never saved. Always commit after add. |
| Not using `session.refresh()`       | Returned object has `id=None`.               |
| Using `PUT` for partial updates     | Use `PATCH` with `exclude_unset=True`.       |
| Returning 200 for created resources | Use `status_code=201` for POST.              |
| No pagination on list endpoints     | Always add `skip` and `limit` parameters.    |
| Hardcoding database URL             | Use environment variables in production.     |
| Missing `table=True`                | SQLModel creates Pydantic model, not a table.|

---

## SECTION 10 — What We Built and What Comes Next

### Project Summary

NotesKaro is a fully functional CRUD API with:
- SQLite database with SQLModel ORM
- Create, Read (list + single), Update, Delete operations
- Pagination with total count
- Filtering by subject, topic, and importance
- Case-insensitive search across title and content
- Proper HTTP status codes (201, 204, 404)
- Clean project structure with separate files

### What Rahul Learned

1. How to structure a FastAPI project with multiple files
2. How SQLModel bridges Pydantic validation and SQLAlchemy ORM
3. Why separate Create/Read/Update models matter for security
4. How pagination prevents performance disasters
5. How search and filter make APIs actually usable
6. The lifespan pattern for startup/shutdown events

---

## KEY TAKEAWAYS

1. **Separate your models**: NoteCreate (input), NoteRead (output), NoteUpdate
   (partial input) — three models for three different purposes.
2. **Always paginate list endpoints**: No exceptions. Even if you have 5 records
   today, you might have 50,000 tomorrow.
3. **Use `exclude_unset=True` for PATCH**: This is the difference between
   "set this field to None" and "I did not send this field."
4. **HTTP status codes matter**: 201 for created, 204 for deleted, 404 for not
   found. Clients depend on these codes for logic.
5. **Lifespan over `on_event`**: The modern FastAPI way to handle startup and
   shutdown logic.
6. **`session.refresh()` after `commit()`**: Without this, auto-generated fields
   like `id` and timestamps will not be populated in the returned object.
7. **Project structure is not optional**: Separate files for models, database,
   routes, and main app. Your future self will thank you.
