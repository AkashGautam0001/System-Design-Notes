// ============================================================
//  Middleware — Common HTTP Middleware
// ============================================================
//  These are general-purpose middleware functions shared across
//  the application. They handle cross-cutting concerns like
//  logging and CORS that apply to every request, regardless
//  of whether it's authenticated or not.
//
//  MIDDLEWARE ORDERING MATTERS:
//  The order in which middleware is applied creates a chain:
//
//    Request → Logger → CORS → [JWTAuth] → [RequireRole] → Handler
//    Response ←───────←──────←───────────←────────────────←────────
//
//  Logger wraps everything, so it sees the final status code.
//  CORS runs early so preflight OPTIONS requests are handled
//  before auth checks (browsers send OPTIONS without tokens).
// ============================================================

package middleware

import (
	"log"
	"net/http"
	"time"
)

// ──────────────────────────────────────────────────────────────
// RequestLogger — Logs every HTTP request
// ──────────────────────────────────────────────────────────────
// WHY log requests?
// In production, request logs are your primary debugging tool.
// When a trader reports "my order failed at 2:30 PM", you
// search the logs for their request. Without logging, you're
// flying blind.
//
// We wrap the ResponseWriter to capture the status code, since
// Go's default ResponseWriter doesn't expose it after writing.

func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap the ResponseWriter to capture the status code
		wrapped := &statusResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		// Log after the request completes — we now know the
		// status code and how long it took
		log.Printf("[%s] %s %s → %d (%v)",
			r.Method,
			r.URL.Path,
			r.RemoteAddr,
			wrapped.statusCode,
			time.Since(start).Round(time.Millisecond),
		)
	})
}

// statusResponseWriter wraps http.ResponseWriter to capture
// the status code. This is a common Go pattern because the
// standard ResponseWriter interface doesn't provide a way to
// read back the status code after WriteHeader is called.
type statusResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (w *statusResponseWriter) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}

// ──────────────────────────────────────────────────────────────
// CORS — Cross-Origin Resource Sharing
// ──────────────────────────────────────────────────────────────
// WHY CORS?
// Browsers enforce the Same-Origin Policy: JavaScript on
// kite.zerodha.com cannot call api.zerodha.com unless the API
// explicitly allows it via CORS headers.
//
// For development, we allow all origins (*). In production,
// you'd restrict this to your specific frontend domains:
//   w.Header().Set("Access-Control-Allow-Origin", "https://kite.zerodha.com")
//
// The OPTIONS preflight request is handled here too — browsers
// send it before any cross-origin POST/PUT/DELETE to check if
// the server allows the actual request.

func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type")
		w.Header().Set("Access-Control-Max-Age", "3600")

		// Handle preflight OPTIONS request
		// WHY return 204 (No Content)? The browser only cares
		// about the headers, not the body. 204 is semantically
		// correct for "here are your headers, no body follows."
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
