// ============================================================
//  Package model — Data Types for DwarPal
// ============================================================
//  These are the "blueprints" that every part of the system
//  agrees on. When a trader registers, the data flows:
//
//    HTTP JSON → RegisterRequest → User (stored in DB)
//    Login     → LoginRequest    → AuthResponse (tokens back)
//
//  Zerodha analogy: RegisterRequest is the KYC form a new
//  trader fills out. User is the permanent record in the
//  depository. AuthResponse is the trading terminal login
//  confirmation with session credentials.
// ============================================================

package model

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ──────────────────────────────────────────────────────────────
// User — the core entity stored in SQLite
// ──────────────────────────────────────────────────────────────
// WHY PasswordHash and not Password? We NEVER store plain-text
// passwords. The hash is a one-way transformation — even if the
// database leaks, attackers cannot reverse it to get passwords.

type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // "-" means NEVER include in JSON output
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// ──────────────────────────────────────────────────────────────
// Request types — what the client sends us
// ──────────────────────────────────────────────────────────────

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"` // "trader" or "admin"
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// ──────────────────────────────────────────────────────────────
// AuthResponse — what we send back after successful auth
// ──────────────────────────────────────────────────────────────

type AuthResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
}

// ──────────────────────────────────────────────────────────────
// TokenClaims — the payload embedded inside the JWT
// ──────────────────────────────────────────────────────────────
// WHY embed jwt.RegisteredClaims? It gives us standard fields
// like "exp" (expiry), "iat" (issued at), "sub" (subject) that
// JWT libraries and consumers universally understand. We add
// our custom fields (UserID, Email, Role) on top.

type TokenClaims struct {
	UserID int64  `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}
