// ============================================================
//  Package middleware — HTTP Middleware for ChitranScan
// ============================================================
//  WHY MIDDLEWARE?
//  Middleware handles cross-cutting concerns — logging, panic
//  recovery, CORS, body limits — so that handlers focus purely
//  on business logic. Each middleware is a function that wraps
//  an http.Handler and returns a new http.Handler.
//
//  BigBasket analogy: Before a truck enters the warehouse:
//    1. Security logs the truck number and time (RequestLogger)
//    2. Safety net catches any truck that tips over (Recovery)
//    3. Gate limit prevents oversize trucks (MaxBodySize)
//    4. Visitor pass allows delivery from any depot (CORS)
//  None of these are the warehouse's job — they happen at the
//  gate, before the truck reaches the loading dock.
// ============================================================

package middleware

import (
	"log"
	"net/http"
	"runtime/debug"
	"time"
)

// ──────────────────────────────────────────────────────────────
// Request Logger
// ──────────────────────────────────────────────────────────────

// RequestLogger logs every incoming request with method, path,
// status code, and duration. Essential for debugging in production.
//
// WHY wrap ResponseWriter? Go's http.ResponseWriter doesn't
// expose the status code after WriteHeader is called. We wrap
// it to capture the code for logging.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap the ResponseWriter to capture the status code
		ww := &statusWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(ww, r)

		log.Printf("[HTTP] %s %s → %d (%s)",
			r.Method, r.URL.Path, ww.statusCode, time.Since(start))
	})
}

// statusWriter wraps http.ResponseWriter to capture the status code.
type statusWriter struct {
	http.ResponseWriter
	statusCode int
}

func (sw *statusWriter) WriteHeader(code int) {
	sw.statusCode = code
	sw.ResponseWriter.WriteHeader(code)
}

// ──────────────────────────────────────────────────────────────
// Panic Recovery
// ──────────────────────────────────────────────────────────────

// Recovery catches panics in downstream handlers and converts
// them to 500 responses. Without this, a panic crashes the
// entire server — one bad image analysis shouldn't bring down
// the whole warehouse inspection system.
//
// WHY log the stack trace? In production, the panic message
// alone is rarely enough. The stack trace shows exactly which
// goroutine and line panicked — invaluable at 3 AM.
func Recovery(next http.Handler) http.Handler {
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
// Max Body Size
// ──────────────────────────────────────────────────────────────

// MaxBodySize limits the request body to prevent memory exhaustion.
//
// WHY is this critical for image uploads?
// Without a limit, a malicious client can send a 10GB "image"
// and exhaust server memory. BigBasket's warehouse API is
// internet-facing (mobile app uploads) — we MUST enforce limits.
//
// WHY a closure returning middleware? This lets us parameterise
// the limit from config: middleware.MaxBodySize(cfg.MaxFileSize)
func MaxBodySize(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// WHY MaxBytesReader instead of just checking Content-Length?
			// Content-Length can be spoofed or omitted. MaxBytesReader
			// actually stops reading after maxBytes, returning an error.
			// It's the seatbelt, not the speed limit sign.
			r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			next.ServeHTTP(w, r)
		})
	}
}

// ──────────────────────────────────────────────────────────────
// CORS (Cross-Origin Resource Sharing)
// ──────────────────────────────────────────────────────────────

// CORS enables cross-origin requests for image upload endpoints.
//
// WHY needed? BigBasket's React dashboard (running on
// dashboard.bigbasket.com) sends image uploads to the
// ChitranScan API (running on api.bigbasket.com). Without
// CORS headers, the browser blocks these cross-origin requests.
//
// WHY handle OPTIONS? Browsers send a "preflight" OPTIONS
// request before POST with file uploads. If we don't respond
// with the right headers, the actual POST never happens.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Max-Age", "86400") // Cache preflight for 24h

		// Handle preflight
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
