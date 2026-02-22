// ============================================================
//  PACKAGE handler — Shared Response Helpers
// ============================================================
//  WHY: Every handler needs to send JSON responses with proper
//  status codes and Content-Type headers. Centralizing this logic
//  in two functions (respondJSON and respondError) eliminates
//  duplication and ensures consistent API responses across all
//  endpoints — products, cart, orders, auth.
//
//  During Big Billion Days, consistent error responses help the
//  frontend team (and mobile app team) parse errors reliably.
//  A rogue 500 with plain text would crash the Flipkart app.
// ============================================================

package handler

import (
	"encoding/json"
	"net/http"
)

// ──────────────────────────────────────────────────────────────
// respondJSON writes a JSON response with the given status code.
// WHY set Content-Type explicitly? Because without it, Go's
// http.ResponseWriter defaults to text/plain based on content
// sniffing. API clients (and browsers) need application/json
// to parse the response correctly.
// ──────────────────────────────────────────────────────────────

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		if err := json.NewEncoder(w).Encode(data); err != nil {
			// WHY log here instead of returning? By this point, we have
			// already written the status code header. We cannot change it.
			// Logging the error is all we can do.
			http.Error(w, "failed to encode response", http.StatusInternalServerError)
		}
	}
}

// ──────────────────────────────────────────────────────────────
// respondError writes a JSON error response.
// WHY a map instead of a struct? For error responses, a simple
// {"error": "message"} is sufficient. No need for a dedicated
// ErrorResponse struct for such a small payload.
// ──────────────────────────────────────────────────────────────

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}
