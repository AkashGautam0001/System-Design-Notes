package middleware

// ============================================================
// Middleware — Request Logging, CORS, and Request Tracking
// ============================================================
// WHY custom middleware? At Jio's scale, every HTTP request
// needs logging (for debugging), CORS headers (for the
// dashboard frontend), and timing (for performance monitoring).
//
// Chi's middleware stack runs in order: each request passes
// through Logger -> CORS -> Recoverer -> Handler. If any
// middleware short-circuits (like CORS preflight), the handler
// never runs — saving processing time.
// ============================================================

import (
	"log"
	"net/http"
	"time"
)

// ──────────────────────────────────────────────────────────────
// Logger logs every HTTP request with method, path, status,
// and duration. At Jio, these logs feed into ELK stack for
// centralized monitoring and alerting.
// ──────────────────────────────────────────────────────────────
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap ResponseWriter to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		log.Printf("[HTTP] %s %s %d %v",
			r.Method,
			r.URL.Path,
			wrapped.statusCode,
			time.Since(start).Round(time.Millisecond),
		)
	})
}

// responseWriter wraps http.ResponseWriter to capture the status code.
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// ──────────────────────────────────────────────────────────────
// CORS enables Cross-Origin Resource Sharing for the frontend.
// WHY CORS? Jio's dashboard runs on a different domain than
// the VaaniSutra API. Without CORS headers, browsers would
// block the dashboard's API requests.
// ──────────────────────────────────────────────────────────────
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID")
		w.Header().Set("Access-Control-Max-Age", "86400")

		// Handle preflight OPTIONS request
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
