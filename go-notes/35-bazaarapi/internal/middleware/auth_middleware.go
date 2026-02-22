// ============================================================
//  PACKAGE middleware — JWT Authentication Middleware
// ============================================================
//  WHY: Authentication middleware is the gatekeeper for protected
//  routes. During Big Billion Days, every cart and order request
//  must carry a valid JWT. The middleware extracts the token from
//  the Authorization header, validates it, and injects the user's
//  identity into the request context. Downstream handlers simply
//  read from context — they never touch JWT parsing.
//
//  This is the same pattern from Ch 34 (Dwarpal), extended with
//  RequireRole for admin-only routes. The middleware chain:
//    RequireAuth → RequireRole("admin") → handler
// ============================================================

package middleware

import (
	"context"
	"net/http"
	"strings"

	"bazaarapi/internal/auth"
)

// ──────────────────────────────────────────────────────────────
// Context keys for user identity.
// WHY custom types for context keys? Because context.Value uses
// interface{} equality. If two packages both use the string
// "user_id" as a key, they collide. Using a custom unexported
// type prevents accidental collisions. However, for this
// educational project, we use string keys for clarity.
// ──────────────────────────────────────────────────────────────

// Context key constants for user identity.
// In production, use a custom unexported type to avoid key collisions.
const (
	ContextKeyUserID = "user_id"
	ContextKeyEmail  = "email"
	ContextKeyRole   = "role"
)

// ──────────────────────────────────────────────────────────────
// RequireAuth validates the JWT and injects claims into context.
// WHY return http.Handler? Because Chi middleware follows the
// pattern: func(next http.Handler) http.Handler. This lets us
// chain middleware declaratively: r.Use(RequireAuth(jwtService)).
// ──────────────────────────────────────────────────────────────

// RequireAuth returns middleware that validates JWT tokens and adds user claims to context.
func RequireAuth(jwtService *auth.JWTService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract the token from the Authorization header.
			// WHY "Bearer " prefix? Because RFC 6750 defines the Bearer
			// token scheme. The header format is: Authorization: Bearer <token>
			// Every HTTP client library and API tool (Postman, curl) follows this.
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"authorization header required"}`, http.StatusUnauthorized)
				return
			}

			// WHY check for "Bearer " prefix specifically? To reject malformed
			// headers like "Basic base64stuff" (which is a different auth scheme).
			if !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, `{"error":"authorization header must start with Bearer"}`, http.StatusUnauthorized)
				return
			}

			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			if tokenString == "" {
				http.Error(w, `{"error":"token is empty"}`, http.StatusUnauthorized)
				return
			}

			// Validate the token and extract claims.
			claims, err := jwtService.ValidateToken(tokenString)
			if err != nil {
				http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			// Inject user identity into the request context.
			// WHY context and not headers? Because context is the idiomatic Go
			// way to pass request-scoped values. It is type-safe (at runtime),
			// scoped to the request lifetime, and cannot be tampered with by
			// the client (unlike headers).
			ctx := context.WithValue(r.Context(), ContextKeyUserID, claims.UserID)
			ctx = context.WithValue(ctx, ContextKeyEmail, claims.Email)
			ctx = context.WithValue(ctx, ContextKeyRole, claims.Role)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ──────────────────────────────────────────────────────────────
// RequireRole checks that the authenticated user has a specific role.
// WHY a separate middleware? Because role checking is orthogonal to
// authentication. Some routes need auth but any role (cart, orders).
// Other routes need auth AND admin role (product management).
// Separating them lets us compose: Use(RequireAuth).Use(RequireRole("admin")).
// ──────────────────────────────────────────────────────────────

// RequireRole returns middleware that checks the user's role from context.
func RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userRole, ok := r.Context().Value(ContextKeyRole).(string)
			if !ok || userRole != role {
				http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
