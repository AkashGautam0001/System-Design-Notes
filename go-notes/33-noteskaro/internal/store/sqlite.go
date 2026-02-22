// ============================================================
//  Package store — SQLite Repository
// ============================================================
//  WHY REPOSITORY PATTERN:
//  The handler should never know it is talking to SQLite. It
//  calls store.Create() and gets back a model.Note. Tomorrow
//  we could swap SQLite for PostgreSQL and only this file
//  changes — the handlers remain untouched.
//
//  WHY modernc.org/sqlite:
//  Unlike mattn/go-sqlite3 (which needs CGO and a C compiler),
//  modernc.org/sqlite is a pure Go translation of SQLite.
//  This means:
//    • CGO_ENABLED=0 builds work perfectly
//    • Cross-compilation is trivial
//    • Docker scratch/alpine images need no gcc
//    • It is still real SQLite — same SQL, same ACID guarantees
//
//  SQL INJECTION PREVENTION:
//  Every query uses parameterized placeholders (?). We NEVER
//  concatenate user input into SQL strings. The database driver
//  handles escaping, making injection impossible.
// ============================================================

package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	// WHY blank import? The sqlite driver registers itself with
	// database/sql via an init() function. We never call it
	// directly — we use the standard database/sql interface.
	// This is Go's driver registration pattern, identical to
	// how you would use PostgreSQL or MySQL drivers.
	_ "modernc.org/sqlite"

	"noteskaro/internal/model"
)

// ──────────────────────────────────────────────────────────────
// SQLiteStore — The Data Access Layer
// ──────────────────────────────────────────────────────────────

// SQLiteStore wraps a sql.DB connection to SQLite and provides
// CRUD methods for notes. The sql.DB handle manages a connection
// pool internally — even for SQLite, it handles concurrent
// access safely.
type SQLiteStore struct {
	db *sql.DB
}

// NewSQLiteStore opens (or creates) the SQLite database file and
// runs the schema migration. If the database already exists, the
// CREATE TABLE IF NOT EXISTS is a no-op — safe to call on every
// startup.
func NewSQLiteStore(dbPath string) (*SQLiteStore, error) {
	// WHY "sqlite" as driver name? modernc.org/sqlite registers
	// itself under this name. Some older code uses "sqlite3" —
	// make sure to match what the driver registers.
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("store: open db: %w", err)
	}

	// Verify the connection is alive. sql.Open does not actually
	// connect — it just validates the DSN. Ping forces a real
	// connection attempt.
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("store: ping db: %w", err)
	}

	// ──────────────────────────────────────────────────────────
	// SQLite Pragmas for Performance
	// ──────────────────────────────────────────────────────────
	// WAL mode: Allows concurrent readers while a writer is
	// active. Without it, readers block writers and vice versa.
	// For a multi-user notes API, this is essential.
	//
	// Foreign keys: SQLite disables FK enforcement by default
	// (historical quirk). We enable it for data integrity.
	pragmas := []string{
		"PRAGMA journal_mode=WAL",
		"PRAGMA foreign_keys=ON",
		"PRAGMA busy_timeout=5000",
	}
	for _, p := range pragmas {
		if _, err := db.Exec(p); err != nil {
			return nil, fmt.Errorf("store: pragma %q: %w", p, err)
		}
	}

	// ──────────────────────────────────────────────────────────
	// Schema Migration
	// ──────────────────────────────────────────────────────────
	// WHY inline SQL? For a small project, embedding the schema
	// here keeps everything in one place. For larger projects,
	// use a migration tool (golang-migrate, goose, atlas).
	//
	// IF NOT EXISTS makes this idempotent — safe to run on
	// every application start. The Mysore training team can
	// restart the server without losing existing notes.
	migration := `
	CREATE TABLE IF NOT EXISTS notes (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		title      TEXT    NOT NULL,
		content    TEXT    NOT NULL DEFAULT '',
		category   TEXT    NOT NULL DEFAULT 'general',
		created_at TEXT    NOT NULL,
		updated_at TEXT    NOT NULL
	);

	CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
	`
	if _, err := db.Exec(migration); err != nil {
		return nil, fmt.Errorf("store: migration: %w", err)
	}

	return &SQLiteStore{db: db}, nil
}

// Close releases the database connection. Always defer this
// in main.go right after creating the store.
func (s *SQLiteStore) Close() error {
	return s.db.Close()
}

// ──────────────────────────────────────────────────────────────
// CRUD Operations
// ──────────────────────────────────────────────────────────────
// Every method takes context.Context as the first parameter.
// This is a Go convention that enables:
//   • Request cancellation (client disconnects → query stops)
//   • Timeouts (prevent runaway queries)
//   • Tracing (pass trace IDs through the call stack)

// Create inserts a new note and returns it with the generated ID
// and timestamps. The trainee provides title, content, and
// category; the system assigns everything else.
func (s *SQLiteStore) Create(ctx context.Context, req model.CreateNoteRequest) (model.Note, error) {
	now := time.Now().UTC()
	nowStr := now.Format(time.RFC3339)

	// Default category if not provided — trainees often forget
	// to categorize their first few notes.
	category := req.Category
	if category == "" {
		category = "general"
	}

	// WHY parameterized query? The ? placeholders prevent SQL
	// injection. Even if req.Title contains "'; DROP TABLE notes;--",
	// it is treated as a literal string value, not SQL code.
	result, err := s.db.ExecContext(ctx,
		`INSERT INTO notes (title, content, category, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?)`,
		req.Title, req.Content, category, nowStr, nowStr,
	)
	if err != nil {
		return model.Note{}, fmt.Errorf("store: create note: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return model.Note{}, fmt.Errorf("store: last insert id: %w", err)
	}

	return model.Note{
		ID:        id,
		Title:     req.Title,
		Content:   req.Content,
		Category:  category,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// GetByID retrieves a single note by its ID. Returns sql.ErrNoRows
// (wrapped) if the note does not exist — the handler translates
// this into HTTP 404.
func (s *SQLiteStore) GetByID(ctx context.Context, id int64) (model.Note, error) {
	var note model.Note
	var createdStr, updatedStr string

	err := s.db.QueryRowContext(ctx,
		`SELECT id, title, content, category, created_at, updated_at
		 FROM notes WHERE id = ?`, id,
	).Scan(&note.ID, &note.Title, &note.Content, &note.Category,
		&createdStr, &updatedStr)

	if err != nil {
		return model.Note{}, fmt.Errorf("store: get note %d: %w", id, err)
	}

	// Parse timestamps from stored RFC3339 strings back into time.Time.
	note.CreatedAt, _ = time.Parse(time.RFC3339, createdStr)
	note.UpdatedAt, _ = time.Parse(time.RFC3339, updatedStr)

	return note, nil
}

// GetAll retrieves all notes, optionally filtered by category.
// If category is empty, all notes are returned. The Mysore
// trainee can ask: "Show me only my golang notes."
func (s *SQLiteStore) GetAll(ctx context.Context, category string) ([]model.Note, error) {
	var rows *sql.Rows
	var err error

	// WHY conditional query? We build the query based on whether
	// a category filter was provided. Both paths use parameterized
	// queries — no string concatenation of user input.
	if category != "" {
		rows, err = s.db.QueryContext(ctx,
			`SELECT id, title, content, category, created_at, updated_at
			 FROM notes WHERE category = ? ORDER BY created_at DESC`, category)
	} else {
		rows, err = s.db.QueryContext(ctx,
			`SELECT id, title, content, category, created_at, updated_at
			 FROM notes ORDER BY created_at DESC`)
	}
	if err != nil {
		return nil, fmt.Errorf("store: get all notes: %w", err)
	}
	defer rows.Close()

	// WHY pre-allocate with make? If we know the rough size, we
	// avoid repeated slice growth. For an unknown result set, we
	// start with an empty slice — append handles growth.
	var notes []model.Note

	for rows.Next() {
		var note model.Note
		var createdStr, updatedStr string

		if err := rows.Scan(&note.ID, &note.Title, &note.Content,
			&note.Category, &createdStr, &updatedStr); err != nil {
			return nil, fmt.Errorf("store: scan note: %w", err)
		}

		note.CreatedAt, _ = time.Parse(time.RFC3339, createdStr)
		note.UpdatedAt, _ = time.Parse(time.RFC3339, updatedStr)
		notes = append(notes, note)
	}

	// WHY check rows.Err()? The for-rows.Next() loop can exit
	// early due to an error (network issue, corrupt data). This
	// final check catches those cases.
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: rows iteration: %w", err)
	}

	// Return empty slice instead of nil for consistent JSON output.
	// nil marshals to "null"; empty slice marshals to "[]".
	if notes == nil {
		notes = []model.Note{}
	}

	return notes, nil
}

// Update modifies an existing note. Only fields present in the
// UpdateNoteRequest (non-nil pointers) are changed — this enables
// true partial updates without overwriting untouched fields.
func (s *SQLiteStore) Update(ctx context.Context, id int64, req model.UpdateNoteRequest) (model.Note, error) {
	// First, fetch the current note to apply partial updates on top.
	existing, err := s.GetByID(ctx, id)
	if err != nil {
		return model.Note{}, err
	}

	// Apply only the fields that were sent in the request.
	// nil means "not sent" — we keep the existing value.
	if req.Title != nil {
		existing.Title = *req.Title
	}
	if req.Content != nil {
		existing.Content = *req.Content
	}
	if req.Category != nil {
		existing.Category = *req.Category
	}

	now := time.Now().UTC()
	nowStr := now.Format(time.RFC3339)

	_, err = s.db.ExecContext(ctx,
		`UPDATE notes SET title = ?, content = ?, category = ?, updated_at = ?
		 WHERE id = ?`,
		existing.Title, existing.Content, existing.Category, nowStr, id,
	)
	if err != nil {
		return model.Note{}, fmt.Errorf("store: update note %d: %w", id, err)
	}

	existing.UpdatedAt = now
	return existing, nil
}

// Delete removes a note by its ID. Returns an error wrapping
// sql.ErrNoRows if the note was not found (RowsAffected == 0).
func (s *SQLiteStore) Delete(ctx context.Context, id int64) error {
	result, err := s.db.ExecContext(ctx,
		`DELETE FROM notes WHERE id = ?`, id,
	)
	if err != nil {
		return fmt.Errorf("store: delete note %d: %w", id, err)
	}

	// WHY check RowsAffected? DELETE does not error when the row
	// does not exist — it just deletes zero rows. We need to
	// explicitly check so the handler can return 404.
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("store: rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("store: delete note %d: %w", id, sql.ErrNoRows)
	}

	return nil
}
