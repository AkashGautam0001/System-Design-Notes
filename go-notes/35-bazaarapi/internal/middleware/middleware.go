// ============================================================
//  PACKAGE middleware — Logger and CORS
// ============================================================
//  WHY: Every production API needs request logging (for debugging
//  and monitoring) and CORS headers (for browser-based clients).
//  During Big Billion Days, the Flipkart ops team watches request
//  logs in real-time to spot slow endpoints and error spikes.
//
//  CORS is needed because the Flipkart web app (flipkart.com)
//  makes API calls to the backend (api.flipkart.com). Browsers
//  block cross-origin requests unless the server explicitly allows
//  them with CORS headers.
// ============================================================

package middleware

import (
	"log"
	"net/http"
	"time"
)

// ──────────────────────────────────────────────────────────────
// Logger logs each request's method, path, status, and duration.
// WHY wrap ResponseWriter? Because http.ResponseWriter does not
// expose the status code after WriteHeader is called. We wrap it
// in a responseRecorder that captures the status code so we can
// log it after the handler completes.
// ──────────────────────────────────────────────────────────────

// responseRecorder wraps http.ResponseWriter to capture the status code.
type responseRecorder struct {
	http.ResponseWriter
	statusCode int
}

// WriteHeader captures the status code before delegating to the underlying writer.
func (rr *responseRecorder) WriteHeader(code int) {
	rr.statusCode = code
	rr.ResponseWriter.WriteHeader(code)
}

// Logger returns middleware that logs each request.
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap the ResponseWriter to capture the status code.
		recorder := &responseRecorder{
			ResponseWriter: w,
			statusCode:     http.StatusOK, // Default if WriteHeader is never called.
		}

		next.ServeHTTP(recorder, r)

		log.Printf("%s %s %d %s",
			r.Method,
			r.URL.Path,
			recorder.statusCode,
			time.Since(start).Round(time.Millisecond),
		)
	})
}

// ──────────────────────────────────────────────────────────────
// CORS adds Cross-Origin Resource Sharing headers.
// WHY allow all origins with "*"? For development simplicity.
// In production, you would restrict Access-Control-Allow-Origin
// to your specific frontend domain (e.g., https://www.flipkart.com).
// ──────────────────────────────────────────────────────────────

// CORS returns middleware that adds CORS headers for browser clients.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// WHY handle OPTIONS separately? Browsers send a "preflight" OPTIONS
		// request before the actual request to check if CORS is allowed. We
		// respond with 200 and the CORS headers — no need to hit the handler.
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
