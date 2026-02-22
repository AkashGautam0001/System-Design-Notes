// ============================================================
//  Package handler — HTTP Request Handlers
// ============================================================
//  WHY HANDLERS IN THEIR OWN PACKAGE:
//  Handlers translate between HTTP (requests, responses, status
//  codes) and the domain (store operations, model structs). By
//  isolating them, we keep HTTP concerns out of the store and
//  domain logic out of main.go.
//
//  PATTERN: Every handler method has the signature
//    func(w http.ResponseWriter, r *http.Request)
//  This is Go's standard handler signature. Chi does not impose
//  its own types — your handlers are pure net/http.
//
//  DEPENDENCY: NoteHandler receives the store via constructor
//  injection. No globals, no init(), no service locator.
// ============================================================

package handler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"noteskaro/internal/model"
	"noteskaro/internal/store"
)

// ──────────────────────────────────────────────────────────────
// NoteHandler — The HTTP ↔ Domain Bridge
// ──────────────────────────────────────────────────────────────

// NoteHandler handles all HTTP requests related to notes.
// It depends on a *store.SQLiteStore for data access.
type NoteHandler struct {
	store *store.SQLiteStore
}

// NewNoteHandler creates a handler with the given store.
// This is constructor injection — the handler declares what it
// needs, and the caller (main.go) provides it.
func NewNoteHandler(s *store.SQLiteStore) *NoteHandler {
	return &NoteHandler{store: s}
}

// Routes registers all note-related routes on the given Chi
// router. This method is called from main.go inside a
// r.Route("/api/notes", ...) block, so all paths here are
// relative to /api/notes.
//
// WHY a Routes method instead of registering in main.go?
// It keeps route definitions close to their handlers. When
// this file grows, you immediately see which handler serves
// which path — no jumping between files.
func (h *NoteHandler) Routes(r chi.Router) {
	r.Post("/", h.HandleCreate)     // POST   /api/notes
	r.Get("/", h.HandleGetAll)      // GET    /api/notes
	r.Get("/{id}", h.HandleGetByID) // GET    /api/notes/{id}
	r.Put("/{id}", h.HandleUpdate)  // PUT    /api/notes/{id}
	r.Delete("/{id}", h.HandleDelete) // DELETE /api/notes/{id}
}

// ──────────────────────────────────────────────────────────────
// Handler: Health Check
// ──────────────────────────────────────────────────────────────
// WHY a health endpoint? Load balancers, container orchestrators
// (Kubernetes), and monitoring systems probe /health to decide
// if the service is alive. A 200 response means "ready to serve."

// HandleHealth responds with a simple status message.
func (h *NoteHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{
		"status":  "healthy",
		"service": "noteskaro",
	})
}

// ──────────────────────────────────────────────────────────────
// Handler: Create Note
// ──────────────────────────────────────────────────────────────
// POST /api/notes
// Expects JSON body: {"title": "...", "content": "...", "category": "..."}
// Returns 201 Created with the full note (including generated ID).

// HandleCreate decodes the JSON request, validates it, creates
// the note in the store, and returns the created note.
func (h *NoteHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	var req model.CreateNoteRequest

	// Decode the JSON body. If the body is malformed or missing,
	// json.Decoder returns a descriptive error.
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid JSON: "+err.Error())
		return
	}

	// Validate required fields. Title is mandatory — you cannot
	// save a note without knowing what it is about.
	if strings.TrimSpace(req.Title) == "" {
		respondError(w, http.StatusBadRequest, "Title is required")
		return
	}

	// WHY r.Context()? If the client disconnects mid-request, the
	// context is cancelled, and the store can abort the database
	// operation. This prevents wasted work on abandoned requests.
	note, err := h.store.Create(r.Context(), req)
	if err != nil {
		log.Printf("Error creating note: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to create note")
		return
	}

	// 201 Created — not 200 OK. HTTP status codes carry meaning.
	// 201 tells the client "a new resource was created."
	respondJSON(w, http.StatusCreated, note)
}

// ──────────────────────────────────────────────────────────────
// Handler: Get All Notes
// ──────────────────────────────────────────────────────────────
// GET /api/notes
// GET /api/notes?category=golang  (optional filter)

// HandleGetAll returns all notes, optionally filtered by category.
// The category filter lets trainees focus: "Show me only my
// golang notes from today's session."
func (h *NoteHandler) HandleGetAll(w http.ResponseWriter, r *http.Request) {
	// Query parameters are accessed via r.URL.Query(). This is
	// standard net/http — no Chi-specific API needed.
	category := r.URL.Query().Get("category")

	notes, err := h.store.GetAll(r.Context(), category)
	if err != nil {
		log.Printf("Error listing notes: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to list notes")
		return
	}

	// WHY wrap in a response object? Consistent response shapes
	// make life easier for frontend developers. They always know
	// to look for "data" and "count" fields.
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"data":  notes,
		"count": len(notes),
	})
}

// ──────────────────────────────────────────────────────────────
// Handler: Get Note by ID
// ──────────────────────────────────────────────────────────────
// GET /api/notes/{id}

// HandleGetByID retrieves a single note by its ID.
func (h *NoteHandler) HandleGetByID(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid note ID")
		return
	}

	note, err := h.store.GetByID(r.Context(), id)
	if err != nil {
		// WHY check for sql.ErrNoRows? The store wraps this error
		// when the note does not exist. errors.Is unwraps the chain
		// to find the root cause — even through fmt.Errorf wrapping.
		if errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusNotFound, "Note not found")
			return
		}
		log.Printf("Error getting note %d: %v", id, err)
		respondError(w, http.StatusInternalServerError, "Failed to get note")
		return
	}

	respondJSON(w, http.StatusOK, note)
}

// ──────────────────────────────────────────────────────────────
// Handler: Update Note
// ──────────────────────────────────────────────────────────────
// PUT /api/notes/{id}
// Supports partial updates — only sent fields are modified.

// HandleUpdate decodes the JSON body and applies changes to an
// existing note. Uses pointer fields in UpdateNoteRequest to
// distinguish "not sent" from "sent as empty."
func (h *NoteHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid note ID")
		return
	}

	var req model.UpdateNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid JSON: "+err.Error())
		return
	}

	// Validate: at least one field must be provided. A PUT with
	// an empty body is not useful and likely a client bug.
	if req.Title == nil && req.Content == nil && req.Category == nil {
		respondError(w, http.StatusBadRequest, "At least one field (title, content, category) is required")
		return
	}

	// Validate that if title is sent, it is not blank.
	if req.Title != nil && strings.TrimSpace(*req.Title) == "" {
		respondError(w, http.StatusBadRequest, "Title cannot be empty")
		return
	}

	note, err := h.store.Update(r.Context(), id, req)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusNotFound, "Note not found")
			return
		}
		log.Printf("Error updating note %d: %v", id, err)
		respondError(w, http.StatusInternalServerError, "Failed to update note")
		return
	}

	respondJSON(w, http.StatusOK, note)
}

// ──────────────────────────────────────────────────────────────
// Handler: Delete Note
// ──────────────────────────────────────────────────────────────
// DELETE /api/notes/{id}
// Returns 204 No Content on success (no body needed).

// HandleDelete removes a note by its ID.
func (h *NoteHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid note ID")
		return
	}

	if err := h.store.Delete(r.Context(), id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusNotFound, "Note not found")
			return
		}
		log.Printf("Error deleting note %d: %v", id, err)
		respondError(w, http.StatusInternalServerError, "Failed to delete note")
		return
	}

	// 204 No Content — the standard response for successful
	// deletions. No body is sent because the resource no longer
	// exists. The status code alone confirms success.
	w.WriteHeader(http.StatusNoContent)
}

// ──────────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────────
// WHY helpers? DRY (Don't Repeat Yourself). Every handler needs
// to parse IDs, send JSON, or send errors. Centralizing these
// ensures consistent response format across all endpoints.

// parseID extracts and converts the {id} URL parameter to int64.
// Chi captures URL parameters during routing and stores them in
// the request context. chi.URLParam retrieves them by name.
func parseID(r *http.Request) (int64, error) {
	idStr := chi.URLParam(r, "id")
	return strconv.ParseInt(idStr, 10, 64)
}

// respondJSON marshals the given payload to JSON and writes it
// to the response with the specified status code.
func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(payload); err != nil {
		// If encoding fails (extremely rare — usually means the
		// writer is broken), log it. The status header is already
		// sent, so we cannot change the response.
		log.Printf("Error encoding JSON response: %v", err)
	}
}

// respondError sends a JSON error response. All error responses
// follow the same shape: {"error": "message"}. This consistency
// helps frontend developers handle errors uniformly.
func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}
