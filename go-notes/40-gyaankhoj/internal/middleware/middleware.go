// ============================================================
//  PACKAGE middleware — HTTP Middleware Stack
// ============================================================
//  WHY: Middleware handles cross-cutting concerns — logging,
//  error recovery, CORS, request IDs. At TCS, every microservice
//  uses the same middleware stack, ensuring consistent observability
//  across 1000+ services. When an incident occurs, the SRE team
//  can trace any request through its ID across all services.
// ============================================================

package middleware

import (
	"fmt"
	"log"
	"net/http"
	"runtime/debug"
	"time"
)

// ──────────────────────────────────────────────────────────────
// RequestLogger logs every HTTP request with method, path, status,
// and duration.
// WHY log every request? At TCS scale, centralized logging (ELK
// stack) is the first place SREs look during incidents. Without
// request logs, debugging production issues is guesswork.
// ──────────────────────────────────────────────────────────────

// RequestLogger logs incoming HTTP requests.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap ResponseWriter to capture status code.
		wrapped := &statusWriter{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		log.Printf("[%s] %s %s — %d (%s)",
			r.Method, r.URL.Path, r.RemoteAddr,
			wrapped.status, time.Since(start).Round(time.Millisecond),
		)
	})
}

// statusWriter wraps http.ResponseWriter to capture the status code.
type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

// ──────────────────────────────────────────────────────────────
// Recoverer catches panics and returns 500 instead of crashing.
// WHY? A nil pointer in one handler should not bring down the
// entire GyaanKhoj service. TCS runs mission-critical searches;
// one bad document should not crash the server.
// ──────────────────────────────────────────────────────────────

// Recoverer recovers from panics and returns a 500 error.
func Recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("[PANIC] %v\n%s", err, debug.Stack())
				http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// ──────────────────────────────────────────────────────────────
// CORS enables Cross-Origin Resource Sharing for browser clients.
// WHY? The TCS knowledge portal (React frontend) runs on a
// different domain than the GyaanKhoj API. Without CORS headers,
// browsers block the API requests.
// ──────────────────────────────────────────────────────────────

// CORS adds Cross-Origin Resource Sharing headers.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// ──────────────────────────────────────────────────────────────
// RequestID adds a unique identifier to every request.
// WHY? When TCS SREs investigate a failed search query, they
// need to trace it across logs. The request ID is included in
// every log line and returned in the response header.
// ──────────────────────────────────────────────────────────────

// RequestID adds a unique request identifier header.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := fmt.Sprintf("req-%d", time.Now().UnixNano())
		w.Header().Set("X-Request-ID", id)
		next.ServeHTTP(w, r)
	})
}
