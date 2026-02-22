// ============================================================
//  Package model — Domain Data Structures
// ============================================================
//  WHY A SEPARATE MODEL PACKAGE:
//  Models sit at the center of the dependency graph. The store
//  package uses them to map database rows. The handler package
//  uses them to parse JSON requests and build JSON responses.
//  By keeping models in their own package with zero imports
//  from other internal packages, we avoid circular dependencies.
//
//  DESIGN NOTE:
//  We define separate request structs (CreateNoteRequest,
//  UpdateNoteRequest) rather than reusing Note for input. This
//  lets us control exactly which fields a client can set — they
//  should never set ID, CreatedAt, or UpdatedAt directly.
// ============================================================

package model

import "time"

// ──────────────────────────────────────────────────────────────
// Note — The Core Domain Entity
// ──────────────────────────────────────────────────────────────
// Each trainee's note gets a unique ID assigned by SQLite's
// AUTOINCREMENT. Title and Content are the meat; Category lets
// trainees organize notes by topic (e.g., "golang", "java",
// "soft-skills"). Timestamps track creation and last edit.

// Note represents a single learning note stored in the database.
type Note struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Category  string    `json:"category"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ──────────────────────────────────────────────────────────────
// Request DTOs (Data Transfer Objects)
// ──────────────────────────────────────────────────────────────
// WHY separate request types?
// 1. Security: Clients cannot set ID or timestamps.
// 2. Validation: CreateNoteRequest requires Title; Update allows
//    partial updates via pointer fields.
// 3. Clarity: The handler knows exactly what shape to expect.

// CreateNoteRequest is the expected JSON body for POST /api/notes.
// Title is mandatory. Content and Category are optional but
// encouraged — a note without content is like chai without sugar.
type CreateNoteRequest struct {
	Title    string `json:"title"`
	Content  string `json:"content"`
	Category string `json:"category"`
}

// UpdateNoteRequest uses pointer fields to distinguish between
// "field not sent" (nil) and "field sent as empty string" ("").
// This enables true partial updates — a PUT that sends only
// {"title": "New Title"} will not wipe out the content.
//
// WHY pointers? Without them, Go's zero value for string is "",
// so we cannot tell if the client explicitly sent "" or simply
// omitted the field. Pointers solve this: nil means omitted.
type UpdateNoteRequest struct {
	Title    *string `json:"title"`
	Content  *string `json:"content"`
	Category *string `json:"category"`
}
