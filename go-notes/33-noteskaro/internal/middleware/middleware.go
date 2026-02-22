// ============================================================
//  Package middleware — HTTP Middleware Chain
// ============================================================
//  WHY CUSTOM MIDDLEWARE (instead of chi/middleware)?
//  Chi ships with excellent built-in middleware, but writing our
//  own teaches how middleware actually works. A middleware is
//  just a function that:
//    1. Takes an http.Handler (the next handler in the chain)
//    2. Returns an http.Handler (which wraps the next one)
//
//  The wrapping handler can do work BEFORE calling next (e.g.,
//  log the request start), and AFTER (e.g., log the duration).
//  This is the Decorator Pattern applied to HTTP.
//
//  MIDDLEWARE ORDER MATTERS:
//  In main.go, we register middleware in this order:
//    Recovery → RequestID → RequestLogger → ContentType
//
//  Execution flows like this for each request:
//    Recovery.Before → RequestID.Before → Logger.Before →
//    ContentType.Before → [Handler] → ContentType.After →
//    Logger.After → RequestID.After → Recovery.After
//
//  Recovery MUST be outermost so it catches panics from any
//  inner layer. RequestID should come before Logger so the
//  logger can include the request ID in its output.
// ============================================================

package middleware

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"runtime/debug"
	"time"
)

// ──────────────────────────────────────────────────────────────
// Context Keys
// ──────────────────────────────────────────────────────────────
// WHY custom type for context keys? If we used plain strings,
// any package could accidentally collide with our key (e.g.,
// two packages both using "request_id" as a key). A custom
// unexported type makes collisions impossible.

type contextKey string

const requestIDKey contextKey = "request_id"

// GetRequestID retrieves the request ID from the context.
// Exported so handlers can access it if needed (e.g., to
// include in error responses for debugging).
func GetRequestID(ctx context.Context) string {
	if id, ok := ctx.Value(requestIDKey).(string); ok {
		return id
	}
	return ""
}

// ──────────────────────────────────────────────────────────────
// responseWriter — Status Code Capture
// ──────────────────────────────────────────────────────────────
// WHY wrap http.ResponseWriter? The standard ResponseWriter does
// not expose the status code after WriteHeader is called. To log
// the response status, we need to capture it ourselves.

type responseWriter struct {
	http.ResponseWriter
	statusCode int
	written    bool
}

// WriteHeader captures the status code before delegating to the
// underlying ResponseWriter. The `written` flag prevents double
// writes — Go's http.ResponseWriter silently ignores subsequent
// WriteHeader calls, but we want our captured code to be accurate.
func (rw *responseWriter) WriteHeader(code int) {
	if !rw.written {
		rw.statusCode = code
		rw.written = true
	}
	rw.ResponseWriter.WriteHeader(code)
}

// Write ensures the status code is captured even when handlers
// call Write() without an explicit WriteHeader() — in that case,
// net/http implicitly sends 200 OK.
func (rw *responseWriter) Write(b []byte) (int, error) {
	if !rw.written {
		rw.statusCode = http.StatusOK
		rw.written = true
	}
	return rw.ResponseWriter.Write(b)
}

// ──────────────────────────────────────────────────────────────
// Middleware: RequestLogger
// ──────────────────────────────────────────────────────────────
// Logs every request with method, path, status code, and
// duration. This is the minimal observability every API needs.
// At Infosys Mysore, the training team uses these logs to see
// which endpoints trainees hit most often.

// RequestLogger logs incoming requests and their response status.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap the ResponseWriter to capture the status code.
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		// Call the next handler in the chain.
		next.ServeHTTP(wrapped, r)

		// Log after the handler completes — we now know the status
		// code and can calculate the duration.
		reqID := GetRequestID(r.Context())
		log.Printf("[%s] %s %s → %d (%s)",
			reqID, r.Method, r.URL.Path,
			wrapped.statusCode, time.Since(start).Round(time.Microsecond),
		)
	})
}

// ──────────────────────────────────────────────────────────────
// Middleware: RequestID
// ──────────────────────────────────────────────────────────────
// Assigns a unique ID to every request. This ID appears in logs
// and is returned in the X-Request-ID response header. When a
// trainee reports "my request failed," the training team can
// search logs by this ID to find exactly what happened.

// RequestID generates a simple timestamp-based ID and adds it
// to the request context and response headers.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// WHY timestamp-based and not UUID? For a training project,
		// simplicity wins. A timestamp with nanosecond precision is
		// unique enough for single-instance deployments. For
		// production multi-instance setups, use a proper UUID library.
		id := fmt.Sprintf("req-%d", time.Now().UnixNano())

		// Add the ID to the request context so downstream handlers
		// and the logger middleware can access it.
		ctx := context.WithValue(r.Context(), requestIDKey, id)

		// Add to response headers so the client can reference it.
		w.Header().Set("X-Request-ID", id)

		// Pass the modified request (with new context) downstream.
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// ──────────────────────────────────────────────────────────────
// Middleware: ContentType
// ──────────────────────────────────────────────────────────────
// Sets Content-Type: application/json on all responses. Since
// NotesKaro is a pure JSON API, every response should declare
// its content type. Individual handlers can override this if
// needed (e.g., the health endpoint could return plain text).

// ContentType sets the default Content-Type header for all responses.
func ContentType(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}

// ──────────────────────────────────────────────────────────────
// Middleware: Recovery
// ──────────────────────────────────────────────────────────────
// Catches panics from downstream handlers and returns a clean
// 500 Internal Server Error instead of crashing the entire
// server. Without this, a single nil pointer dereference in a
// handler would kill the process for ALL users.
//
// WHY log the stack trace? In development, the stack trace tells
// you exactly where the panic occurred. In production, you would
// send this to an error tracking service (Sentry, Honeybadger).

// Recovery recovers from panics, logs the stack trace, and
// returns a 500 error response.
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				// Capture the stack trace for debugging.
				stack := debug.Stack()
				log.Printf("PANIC recovered: %v\n%s", err, stack)

				// Send a clean error response to the client.
				// WHY not expose the panic message? It could contain
				// sensitive information (file paths, memory addresses).
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				fmt.Fprintf(w, `{"error":"Internal server error"}`)
			}
		}()

		next.ServeHTTP(w, r)
	})
}
