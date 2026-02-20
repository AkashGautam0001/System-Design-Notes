// ============================================================
//  FILE 30 : Project — HTTP API ("PustakBhandar")
// ============================================================
//  Topic  : net/http, encoding/json, sync, fmt, strings,
//           strconv, time, context, middleware, REST design
//
//  WHY THIS MATTERS:
//  Every backend developer must build a REST API at some point.
//  Go's net/http package is powerful enough for production use
//  without any framework. This project proves it: routing,
//  middleware, JSON handling, thread safety, proper status codes,
//  and graceful shutdown — all from the standard library.
// ============================================================

// ============================================================
// STORY: PustakBhandar — The Sahitya Akademi Catalog
// The Sahitya Akademi needs a digital catalog for India's
// literary treasures. PustakBhandar is a REST API that lets
// anyone browse, add, update, and remove books — from
// Premchand's Godan to Tagore's Gitanjali. Middleware guards
// the door (logging every visitor, recovering from panics),
// and a mutex ensures two librarians never scribble on the
// same card at once.
// ============================================================

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// ============================================================
// SECTION 1 — Data Model
// ============================================================
// WHY: A clean model with JSON tags is the foundation of any
// API. The `json:"-"` or `omitempty` tags control exactly what
// clients see.

// Book represents a single book in the catalog.
type Book struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	Author    string    `json:"author"`
	Genre     string    `json:"genre"`
	Year      int       `json:"year"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// APIResponse wraps every JSON response for consistency.
type APIResponse struct {
	Status  string      `json:"status"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Count   int         `json:"count,omitempty"`
}

// ============================================================
// SECTION 2 — BookStore (Thread-Safe In-Memory Store)
// ============================================================
// WHY: sync.RWMutex lets multiple readers coexist but blocks
// writers, giving us safe concurrency without a database.

// BookStore holds the in-memory book collection.
type BookStore struct {
	mu     sync.RWMutex
	books  map[int]Book
	nextID int
}

// NewBookStore creates and seeds the store with sample data.
func NewBookStore() *BookStore {
	store := &BookStore{
		books:  make(map[int]Book),
		nextID: 1,
	}
	// Seed with Indian literary classics so GET /books isn't empty at start.
	seeds := []struct {
		title, author, genre string
		year                 int
	}{
		{"Godan", "Munshi Premchand", "Hindi Fiction", 1936},
		{"Gitanjali", "Rabindranath Tagore", "Poetry", 1910},
		{"Malgudi Days", "R.K. Narayan", "Fiction", 1943},
	}
	for _, s := range seeds {
		store.Create(s.title, s.author, s.genre, s.year)
	}
	return store
}

// Create adds a new book and returns it.
func (bs *BookStore) Create(title, author, genre string, year int) Book {
	bs.mu.Lock()
	defer bs.mu.Unlock()
	now := time.Now()
	book := Book{
		ID: bs.nextID, Title: title, Author: author,
		Genre: genre, Year: year, CreatedAt: now, UpdatedAt: now,
	}
	bs.books[bs.nextID] = book
	bs.nextID++
	return book
}

// GetAll returns all books, optionally filtered.
func (bs *BookStore) GetAll(author, genre string) []Book {
	bs.mu.RLock()
	defer bs.mu.RUnlock()
	var result []Book
	for _, b := range bs.books {
		if author != "" && !strings.EqualFold(b.Author, author) {
			continue
		}
		if genre != "" && !strings.EqualFold(b.Genre, genre) {
			continue
		}
		result = append(result, b)
	}
	return result
}

// GetByID returns a single book or false if not found.
func (bs *BookStore) GetByID(id int) (Book, bool) {
	bs.mu.RLock()
	defer bs.mu.RUnlock()
	b, ok := bs.books[id]
	return b, ok
}

// Update modifies an existing book or returns false.
func (bs *BookStore) Update(id int, title, author, genre string, year int) (Book, bool) {
	bs.mu.Lock()
	defer bs.mu.Unlock()
	b, ok := bs.books[id]
	if !ok {
		return Book{}, false
	}
	if title != "" {
		b.Title = title
	}
	if author != "" {
		b.Author = author
	}
	if genre != "" {
		b.Genre = genre
	}
	if year != 0 {
		b.Year = year
	}
	b.UpdatedAt = time.Now()
	bs.books[id] = b
	return b, true
}

// Delete removes a book by ID, returning true if it existed.
func (bs *BookStore) Delete(id int) bool {
	bs.mu.Lock()
	defer bs.mu.Unlock()
	if _, ok := bs.books[id]; !ok {
		return false
	}
	delete(bs.books, id)
	return true
}

// ============================================================
// SECTION 3 — Middleware
// ============================================================
// WHY: Middleware is the idiomatic Go pattern for cross-cutting
// concerns. Each middleware wraps an http.Handler, forming a
// chain. No framework needed.

var requestCounter atomic.Int64

// loggingMiddleware logs method, path, status, and duration.
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		// Wrap ResponseWriter to capture status code.
		lrw := &loggingResponseWriter{ResponseWriter: w, statusCode: 200}
		next.ServeHTTP(lrw, r)
		fmt.Printf("    [LOG] %s %s -> %d (%s)\n",
			r.Method, r.URL.String(), lrw.statusCode, time.Since(start).Round(time.Microsecond))
	})
}

type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

// requestIDMiddleware injects a unique request ID header.
func requestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := requestCounter.Add(1)
		w.Header().Set("X-Request-ID", fmt.Sprintf("req-%d", id))
		next.ServeHTTP(w, r)
	})
}

// recoveryMiddleware catches panics and returns a 500 response.
func recoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				fmt.Printf("    [PANIC] Recovered: %v\n", err)
				writeJSON(w, http.StatusInternalServerError, APIResponse{
					Status:  "error",
					Message: "Internal server error",
				})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// ============================================================
// SECTION 4 — Handlers
// ============================================================
// WHY: Each handler is a method on a server struct that holds
// the store. This avoids globals and makes testing easy.

// Server holds dependencies for HTTP handlers.
type Server struct {
	store *BookStore
}

// writeJSON is a helper to send JSON responses.
func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

// handleHealth responds to GET /health.
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Status: "error", Message: "Method not allowed",
		})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Status: "ok",
		Data: map[string]string{
			"service": "PustakBhandar",
			"time":    time.Now().Format(time.RFC3339),
		},
	})
}

// handleBooks routes /books requests.
func (s *Server) handleBooks(w http.ResponseWriter, r *http.Request) {
	// WHY: Go 1.22+ has better routing, but for broad compatibility
	// we do manual path parsing — a skill every Go dev needs.
	path := strings.TrimPrefix(r.URL.Path, "/books")
	path = strings.TrimPrefix(path, "/")

	if path == "" {
		// /books — collection operations
		switch r.Method {
		case http.MethodGet:
			s.listBooks(w, r)
		case http.MethodPost:
			s.createBook(w, r)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
				Status: "error", Message: "Method not allowed",
			})
		}
		return
	}

	// /books/{id} — single-resource operations
	id, err := strconv.Atoi(path)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Status: "error", Message: "Invalid book ID",
		})
		return
	}

	switch r.Method {
	case http.MethodGet:
		s.getBook(w, r, id)
	case http.MethodPut:
		s.updateBook(w, r, id)
	case http.MethodDelete:
		s.deleteBook(w, r, id)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{
			Status: "error", Message: "Method not allowed",
		})
	}
}

func (s *Server) listBooks(w http.ResponseWriter, r *http.Request) {
	author := r.URL.Query().Get("author")
	genre := r.URL.Query().Get("genre")
	books := s.store.GetAll(author, genre)
	if books == nil {
		books = []Book{} // ensure JSON array, not null
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Status: "ok", Data: books, Count: len(books),
	})
}

func (s *Server) getBook(w http.ResponseWriter, _ *http.Request, id int) {
	book, ok := s.store.GetByID(id)
	if !ok {
		writeJSON(w, http.StatusNotFound, APIResponse{
			Status: "error", Message: fmt.Sprintf("Book #%d not found", id),
		})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Status: "ok", Data: book})
}

func (s *Server) createBook(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Title  string `json:"title"`
		Author string `json:"author"`
		Genre  string `json:"genre"`
		Year   int    `json:"year"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Status: "error", Message: "Invalid JSON body",
		})
		return
	}
	if input.Title == "" || input.Author == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Status: "error", Message: "Title and author are required",
		})
		return
	}
	book := s.store.Create(input.Title, input.Author, input.Genre, input.Year)
	writeJSON(w, http.StatusCreated, APIResponse{
		Status: "ok", Message: "Book created", Data: book,
	})
}

func (s *Server) updateBook(w http.ResponseWriter, r *http.Request, id int) {
	var input struct {
		Title  string `json:"title"`
		Author string `json:"author"`
		Genre  string `json:"genre"`
		Year   int    `json:"year"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{
			Status: "error", Message: "Invalid JSON body",
		})
		return
	}
	book, ok := s.store.Update(id, input.Title, input.Author, input.Genre, input.Year)
	if !ok {
		writeJSON(w, http.StatusNotFound, APIResponse{
			Status: "error", Message: fmt.Sprintf("Book #%d not found", id),
		})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Status: "ok", Message: "Book updated", Data: book,
	})
}

func (s *Server) deleteBook(w http.ResponseWriter, _ *http.Request, id int) {
	if !s.store.Delete(id) {
		writeJSON(w, http.StatusNotFound, APIResponse{
			Status: "error", Message: fmt.Sprintf("Book #%d not found", id),
		})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ============================================================
// SECTION 5 — Server Setup
// ============================================================
// WHY: Wiring middleware and routes into an http.Server with
// graceful shutdown is what separates a toy from production code.

func setupServer(store *BookStore) *http.ServeMux {
	srv := &Server{store: store}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", srv.handleHealth)
	mux.HandleFunc("/books", srv.handleBooks)
	mux.HandleFunc("/books/", srv.handleBooks)
	return mux
}

// applyMiddleware chains middleware in order (outermost first).
func applyMiddleware(handler http.Handler) http.Handler {
	handler = loggingMiddleware(handler)
	handler = requestIDMiddleware(handler)
	handler = recoveryMiddleware(handler)
	return handler
}

// ============================================================
// SECTION 6 — Self-Test Client
// ============================================================
// WHY: A self-testing server that makes its own HTTP requests
// proves the API works end-to-end without curl or Postman.

func runSelfTest(baseURL string) {
	client := &http.Client{Timeout: 5 * time.Second}

	printTestHeader := func(label string) {
		fmt.Printf("\n  --- TEST: %s ---\n", label)
	}

	doRequest := func(method, path string, body string) {
		url := baseURL + path
		var bodyReader io.Reader
		if body != "" {
			bodyReader = strings.NewReader(body)
		}
		req, err := http.NewRequest(method, url, bodyReader)
		if err != nil {
			fmt.Printf("    [ERROR] Creating request: %v\n", err)
			return
		}
		if body != "" {
			req.Header.Set("Content-Type", "application/json")
		}
		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("    [ERROR] %s %s: %v\n", method, path, err)
			return
		}
		defer resp.Body.Close()
		respBody, _ := io.ReadAll(resp.Body)
		reqID := resp.Header.Get("X-Request-ID")
		fmt.Printf("    %s %s -> %d (ReqID: %s)\n", method, path, resp.StatusCode, reqID)
		// Pretty print JSON response (if any body).
		if len(respBody) > 0 {
			var pretty map[string]interface{}
			if json.Unmarshal(respBody, &pretty) == nil {
				formatted, _ := json.MarshalIndent(pretty, "    ", "  ")
				fmt.Printf("    %s\n", formatted)
			}
		}
	}

	// --- Health check ---
	printTestHeader("GET /health")
	doRequest("GET", "/health", "")

	// --- List all books (seeded) ---
	printTestHeader("GET /books (seeded data)")
	doRequest("GET", "/books", "")

	// --- Create a new book ---
	printTestHeader("POST /books (create)")
	doRequest("POST", "/books", `{"title":"Sea of Poppies","author":"Amitav Ghosh","genre":"Historical Fiction","year":2008}`)

	// --- Get single book ---
	printTestHeader("GET /books/1")
	doRequest("GET", "/books/1", "")

	// --- Update a book ---
	printTestHeader("PUT /books/2 (update genre)")
	doRequest("PUT", "/books/2", `{"genre":"Nobel Prize Poetry"}`)

	// --- Filter by genre ---
	printTestHeader("GET /books?genre=Fiction")
	doRequest("GET", "/books?genre=Fiction", "")

	// --- Delete a book ---
	printTestHeader("DELETE /books/3")
	doRequest("DELETE", "/books/3", "")

	// --- Get deleted book (404) ---
	printTestHeader("GET /books/3 (should be 404)")
	doRequest("GET", "/books/3", "")

	// --- Bad request (missing title) ---
	printTestHeader("POST /books (bad request)")
	doRequest("POST", "/books", `{"author":"Nobody"}`)

	// --- Method not allowed ---
	printTestHeader("PATCH /books (method not allowed)")
	doRequest("PATCH", "/books", "")

	// --- Invalid ID ---
	printTestHeader("GET /books/abc (invalid ID)")
	doRequest("GET", "/books/abc", "")

	// --- Final list ---
	printTestHeader("GET /books (final state)")
	doRequest("GET", "/books", "")
}

// ============================================================
// SECTION 7 — Main (Self-Test Mode)
// ============================================================
// WHY: Binding to port :0 lets the OS assign a free port,
// avoiding "address already in use" errors in tests.

func main() {
	fmt.Println("============================================================")
	fmt.Println("  PustakBhandar — Sahitya Akademi HTTP REST API (Self-Test Demo)")
	fmt.Println("============================================================")

	store := NewBookStore()
	mux := setupServer(store)
	handler := applyMiddleware(mux)

	// Bind to :0 so the OS picks a free port.
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		fmt.Printf("  [FATAL] Cannot listen: %v\n", err)
		return
	}
	addr := listener.Addr().String()
	fmt.Printf("  Server listening on %s\n", addr)

	server := &http.Server{Handler: handler}

	// Start server in a goroutine.
	go func() {
		if err := server.Serve(listener); err != http.ErrServerClosed {
			fmt.Printf("  [ERROR] Server: %v\n", err)
		}
	}()

	// Give the server a moment to be ready.
	time.Sleep(50 * time.Millisecond)

	// Run self-tests.
	baseURL := "http://" + addr
	runSelfTest(baseURL)

	// Graceful shutdown.
	fmt.Println("\n  Shutting down server gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		fmt.Printf("  [ERROR] Shutdown: %v\n", err)
	}
	fmt.Println("  Server stopped.")

	fmt.Println("\n============================================================")
	fmt.Println("  PustakBhandar self-test complete.")
	fmt.Println("============================================================")
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. net/http is production-grade: routing, middleware, graceful
//    shutdown — all built in, no framework required.
// 2. sync.RWMutex gives concurrent read access while serializing
//    writes — essential for in-memory stores under load.
// 3. Middleware as func(http.Handler) http.Handler is the
//    idiomatic Go pattern; it composes cleanly without magic.
// 4. Binding to ":0" in tests lets the OS pick a free port,
//    avoiding flaky "address in use" failures.
// 5. context.WithTimeout for shutdown prevents hanging if
//    connections don't close promptly.
// 6. A loggingResponseWriter wrapper captures the status code
//    that http.ResponseWriter otherwise hides.
// 7. Always return JSON arrays (not null) for empty collections
//    — clients shouldn't have to nil-check list responses.
// 8. X-Request-ID headers make distributed debugging possible;
//    atomic.Int64 generates them without a mutex.
// ============================================================
