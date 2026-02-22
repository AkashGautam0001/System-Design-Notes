// ============================================================
//  PACKAGE model — User Data Structures
// ============================================================
//  WHY: Models are the lingua franca of the application. Every
//  layer — store, handler, auth — speaks in terms of these
//  structs. By keeping them in a separate package, we avoid
//  circular imports and make the data contract explicit.
//
//  During Big Billion Days, millions of users register and log
//  in. Each user has a role: "user" for shoppers, "admin" for
//  Flipkart's catalog team managing products and orders.
// ============================================================

package model

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ──────────────────────────────────────────────────────────────
// User — the core identity in BazaarAPI.
// ──────────────────────────────────────────────────────────────

// User represents a registered user in the marketplace.
// WHY PasswordHash and not Password? We never store plaintext passwords.
// The json:"-" tag ensures the hash is never leaked in API responses.
type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

// ──────────────────────────────────────────────────────────────
// Request / Response DTOs
// WHY separate structs for requests? So that clients cannot set
// fields like ID, Role, or CreatedAt — those are server-controlled.
// ──────────────────────────────────────────────────────────────

// RegisterRequest is the JSON body for user registration.
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

// LoginRequest is the JSON body for user login.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthResponse is returned after successful login or registration.
type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// ──────────────────────────────────────────────────────────────
// JWT Claims
// WHY embed RegisteredClaims? The jwt/v5 library needs standard
// fields (exp, iat, sub). We add UserID and Role as custom claims
// so the middleware can authorize requests without a database hit.
// ──────────────────────────────────────────────────────────────

// TokenClaims holds the JWT payload for BazaarAPI.
type TokenClaims struct {
	UserID int64  `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}
