// ============================================================
//  Middleware — Cross-Cutting Concerns for SahayakBot
// ============================================================
//  WHY middleware?
//  Every HTTP request to SahayakBot needs logging, panic recovery,
//  and CORS headers. Instead of adding this logic to every handler,
//  middleware wraps the entire router. Chi's middleware model is
//  the same as net/http — composable functions that call next.
//
//  Swiggy's platform team provides a standard middleware package
//  that all microservices use. This ensures consistent logging
//  format, error recovery, and security headers across 200+ services.
// ============================================================

package middleware

import (
	"log"
	"net/http"
	"runtime/debug"
	"time"
)

// ──────────────────────────────────────────────────────────────
// RequestLogger — logs every HTTP request
// ──────────────────────────────────────────────────────────────
// WHY log everything? In production, Swiggy's SRE team uses these
// logs for:
//   - Latency monitoring (p99 response times)
//   - Traffic analysis (which endpoints are hot)
//   - Debugging (trace a specific request through the system)
//   - Alerting (sudden spike in 5xx responses)

func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap ResponseWriter to capture status code
		wrapped := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(wrapped, r)

		log.Printf("[HTTP] %s %s → %d (%v)",
			r.Method, r.URL.Path, wrapped.status, time.Since(start))
	})
}

// statusWriter wraps http.ResponseWriter to capture the status code.
// WHY? The default ResponseWriter doesn't expose the status code
// after WriteHeader is called. We need it for logging.
type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

// ──────────────────────────────────────────────────────────────
// Recoverer — catches panics and returns 500 instead of crashing
// ──────────────────────────────────────────────────────────────
// WHY recover from panics? A panic in one goroutine (one request)
// would crash the entire server, taking down ALL active WebSocket
// connections. Recovery isolates the failure to a single request.
// Swiggy's post-mortem from 2022: a nil pointer panic in the
// restaurant search tool crashed the entire bot service for 3
// minutes, affecting 50,000+ active chats.

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
// CORS — Cross-Origin Resource Sharing headers
// ──────────────────────────────────────────────────────────────
// WHY CORS? The chat frontend (React/Vue) runs on a different
// origin than the API. Without CORS headers, the browser blocks
// all API calls. We also need to allow the Upgrade header for
// WebSocket connections.
//
// NOTE: In production, Swiggy's Nginx reverse proxy handles CORS.
// This middleware is for local development and direct deployments.

func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		// WHY? Browsers send an OPTIONS request before POST/DELETE to
		// check if the server allows the actual request. Without this,
		// the browser never sends the real request.
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
