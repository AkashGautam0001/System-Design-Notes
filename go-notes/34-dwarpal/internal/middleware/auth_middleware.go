// ============================================================
//  Middleware — JWT Authentication & Role Authorization
// ============================================================
//  Middleware in Go follows a simple pattern:
//    func(next http.Handler) http.Handler
//
//  Each middleware wraps the next handler. The request flows
//  through a chain: Logger → CORS → JWTAuth → RequireRole → Handler
//
//  ZERODHA ANALOGY:
//  JWTAuth is the security guard at the gate checking day-passes.
//  RequireRole is the elevator access control — traders can go to
//  the trading floor, but only admins can access the server room.
//
//  WHY CONTEXT FOR USER DATA?
//  Go's context.Context is designed for request-scoped values.
//  The JWT middleware validates the token and stores the claims
//  in the context. Downstream handlers retrieve them with
//  UserFromContext(ctx). This avoids:
//  - Global variables (not request-scoped, race conditions)
//  - Extra function parameters (couples handler signatures to auth)
//  - Thread-local storage (Go doesn't have this concept)
// ============================================================

package middleware

import (
	"context"
	"net/http"
	"strings"

	"dwarpal/internal/auth"
	"dwarpal/internal/model"
)

// ──────────────────────────────────────────────────────────────
// Context key type — prevents collisions between packages
// ──────────────────────────────────────────────────────────────
// WHY a custom type and not just a string?
// If two packages both use context.WithValue with the string key
// "user", they'll overwrite each other. By using an unexported
// type, only THIS package can set and get this context value.
// This is a Go best practice for context keys.

type contextKey string

const userClaimsKey contextKey = "user_claims"

// UserFromContext retrieves the authenticated user's claims
// from the request context. Returns nil if no user is set
// (i.e., the request didn't pass through JWTAuth middleware).
func UserFromContext(ctx context.Context) *model.TokenClaims {
	claims, ok := ctx.Value(userClaimsKey).(*model.TokenClaims)
	if !ok {
		return nil
	}
	return claims
}

// ──────────────────────────────────────────────────────────────
// JWTAuth — Token Validation Middleware
// ──────────────────────────────────────────────────────────────
// This middleware:
// 1. Extracts the Bearer token from the Authorization header
// 2. Validates the token signature and expiry
// 3. Stores the claims in the request context
// 4. Calls the next handler — or rejects with 401
//
// WHY return a closure?
// JWTAuth needs the JWTService to validate tokens, but
// middleware must have the signature func(http.Handler) http.Handler.
// The closure captures the JWTService while satisfying the
// middleware interface. This is a common Go pattern.

func JWTAuth(jwtService *auth.JWTService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// ── Extract the Authorization header ──────────────
			// Format: "Bearer <token>"
			// WHY "Bearer"? It's the OAuth 2.0 standard prefix.
			// The token "bears" (carries) the authentication.
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"authorization header required"}`, http.StatusUnauthorized)
				return
			}

			// Split "Bearer <token>" into parts
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				http.Error(w, `{"error":"authorization header must be: Bearer <token>"}`, http.StatusUnauthorized)
				return
			}

			tokenStr := parts[1]

			// ── Validate the token ───────────────────────────
			// This checks signature, expiry, and structure.
			// If any validation fails, the trader is turned away.
			claims, err := jwtService.ValidateAccessToken(tokenStr)
			if err != nil {
				// SECURITY: Don't expose internal error details
				// to the client. Log them server-side for debugging.
				http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			// ── Store claims in context ──────────────────────
			// Now every downstream handler can call
			// UserFromContext(r.Context()) to know who's making
			// the request, what their role is, etc.
			ctx := context.WithValue(r.Context(), userClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ──────────────────────────────────────────────────────────────
// RequireRole — Role-Based Access Control Middleware
// ──────────────────────────────────────────────────────────────
// Checks if the authenticated user has one of the allowed roles.
// This middleware MUST run AFTER JWTAuth — it assumes the user
// claims are already in the context.
//
// Usage:
//   r.Use(middleware.JWTAuth(jwtService))    // first: who are you?
//   r.Use(middleware.RequireRole("admin"))    // then: are you allowed?
//
// WHY variadic roles?
// Some endpoints might be accessible to multiple roles:
//   RequireRole("admin", "manager")
// This is more flexible than a single role parameter.

func RequireRole(roles ...string) func(http.Handler) http.Handler {
	// Build a set for O(1) lookup
	allowed := make(map[string]bool, len(roles))
	for _, role := range roles {
		allowed[role] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := UserFromContext(r.Context())
			if claims == nil {
				// This shouldn't happen if JWTAuth runs first,
				// but defensive programming never hurts.
				http.Error(w, `{"error":"authentication required"}`, http.StatusUnauthorized)
				return
			}

			if !allowed[claims.Role] {
				// 403 Forbidden — you're authenticated but not
				// authorized. Like a trader trying to access the
				// admin panel: "I know who you are, but you can't
				// come in here."
				http.Error(w, `{"error":"insufficient permissions"}`, http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
