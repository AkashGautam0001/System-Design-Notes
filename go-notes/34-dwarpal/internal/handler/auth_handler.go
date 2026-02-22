// ============================================================
//  Package handler — HTTP Request Handlers
// ============================================================
//  Handlers are the "tellers at the bank window" — they receive
//  requests from clients, validate input, call the appropriate
//  service, and send back responses.
//
//  ZERODHA ANALOGY:
//  - HandleRegister: A new trader walks up to the KYC counter,
//    fills out the form, and gets their trading account created.
//  - HandleLogin: A trader shows their PAN card and password at
//    the login window, receives their access pass and membership
//    card.
//  - HandleRefresh: A trader's day-pass expired, so they show
//    their membership card to get a new day-pass.
//  - HandleMe: "Show me my account details" — requires a valid
//    day-pass.
//  - HandleListUsers: The compliance officer (admin) reviews
//    all registered traders.
// ============================================================

package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"dwarpal/internal/auth"
	"dwarpal/internal/middleware"
	"dwarpal/internal/model"
	"dwarpal/internal/store"
)

// AuthHandler holds dependencies for all auth-related endpoints.
// WHY dependency injection? By passing in the store and JWT
// service, we can swap implementations for testing (e.g., use
// an in-memory store instead of SQLite).
type AuthHandler struct {
	userStore  *store.UserStore
	jwtService *auth.JWTService
	bcryptCost int
}

// NewAuthHandler creates a handler with all required dependencies.
func NewAuthHandler(userStore *store.UserStore, jwtService *auth.JWTService, bcryptCost int) *AuthHandler {
	return &AuthHandler{
		userStore:  userStore,
		jwtService: jwtService,
		bcryptCost: bcryptCost,
	}
}

// ──────────────────────────────────────────────────────────────
// HandleRegister — POST /api/auth/register
// ──────────────────────────────────────────────────────────────
// Creates a new user account. The flow:
// 1. Parse and validate the JSON request
// 2. Check if email is already registered
// 3. Hash the password with bcrypt
// 4. Store the user in the database
// 5. Generate a token pair and return it
//
// WHY return tokens on registration?
// Better UX: the trader can start using the API immediately
// after signing up, without a separate login step.

func (h *AuthHandler) HandleRegister(w http.ResponseWriter, r *http.Request) {
	var req model.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// ── Input validation ──────────────────────────────────────
	// WHY validate here and not in the store? The handler is the
	// "bouncer" — reject bad input before it reaches the DB.
	if req.Email == "" || req.Password == "" {
		respondError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	if !isValidEmail(req.Email) {
		respondError(w, http.StatusBadRequest, "invalid email format")
		return
	}

	if len(req.Password) < 8 {
		respondError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	// Only allow known roles
	if req.Role == "" {
		req.Role = "trader" // Default role
	}
	if req.Role != "trader" && req.Role != "admin" {
		respondError(w, http.StatusBadRequest, "role must be 'trader' or 'admin'")
		return
	}

	// ── Check for duplicate email ─────────────────────────────
	existing, err := h.userStore.GetByEmail(req.Email)
	if err != nil {
		log.Printf("[ERROR] check existing user: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if existing != nil {
		respondError(w, http.StatusConflict, "email already registered")
		return
	}

	// ── Hash the password ─────────────────────────────────────
	// SECURITY: After this point, the plain-text password should
	// never be logged, stored, or transmitted. Only the hash lives on.
	passwordHash, err := auth.HashPassword(req.Password, h.bcryptCost)
	if err != nil {
		log.Printf("[ERROR] hash password: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// ── Create the user ───────────────────────────────────────
	user, err := h.userStore.Create(req.Email, passwordHash, req.Role)
	if err != nil {
		log.Printf("[ERROR] create user: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// ── Generate tokens ───────────────────────────────────────
	tokenPair, err := h.jwtService.GenerateTokenPair(user)
	if err != nil {
		log.Printf("[ERROR] generate tokens: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// Store the refresh token hash in the database
	tokenHash := auth.HashToken(tokenPair.RefreshToken)
	expiresAt := time.Now().Add(h.jwtService.RefreshExpiry())
	if err := h.userStore.StoreRefreshToken(user.ID, tokenHash, expiresAt); err != nil {
		log.Printf("[ERROR] store refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusCreated, tokenPair)
}

// ──────────────────────────────────────────────────────────────
// HandleLogin — POST /api/auth/login
// ──────────────────────────────────────────────────────────────
// Authenticates an existing user. The flow:
// 1. Find user by email
// 2. Verify password against stored hash
// 3. Generate and return token pair
//
// SECURITY: Always return the same error message for "user not
// found" and "wrong password" — otherwise attackers can enumerate
// which emails are registered (user enumeration attack).

func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		respondError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	// ── Look up the user ──────────────────────────────────────
	user, err := h.userStore.GetByEmail(req.Email)
	if err != nil {
		log.Printf("[ERROR] get user by email: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if user == nil {
		// WHY NOT "user not found"? To prevent email enumeration.
		// An attacker testing emails would learn which ones exist.
		respondError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	// ── Verify password ───────────────────────────────────────
	// bcrypt.CompareHashAndPassword is timing-safe: it takes the
	// same time whether the password is wrong at byte 1 or byte 30.
	if err := auth.CheckPassword(req.Password, user.PasswordHash); err != nil {
		respondError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	// ── Generate tokens ───────────────────────────────────────
	tokenPair, err := h.jwtService.GenerateTokenPair(user)
	if err != nil {
		log.Printf("[ERROR] generate tokens: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	tokenHash := auth.HashToken(tokenPair.RefreshToken)
	expiresAt := time.Now().Add(h.jwtService.RefreshExpiry())
	if err := h.userStore.StoreRefreshToken(user.ID, tokenHash, expiresAt); err != nil {
		log.Printf("[ERROR] store refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusOK, tokenPair)
}

// ──────────────────────────────────────────────────────────────
// HandleRefresh — POST /api/auth/refresh
// ──────────────────────────────────────────────────────────────
// Exchanges a valid refresh token for a new token pair.
//
// TOKEN ROTATION:
// 1. Client sends refresh_token in the body
// 2. We hash it and look up in the database
// 3. If valid and not revoked → revoke old, issue new pair
// 4. If already revoked → possible token theft! Reject.
//
// WHY rotate? If an attacker steals a refresh token and uses it
// before the legitimate user, the legitimate user's next refresh
// attempt will fail (token already revoked). This alerts us to
// a compromise. Without rotation, a stolen token works forever.

func (h *AuthHandler) HandleRefresh(w http.ResponseWriter, r *http.Request) {
	var req model.RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.RefreshToken == "" {
		respondError(w, http.StatusBadRequest, "refresh_token is required")
		return
	}

	// ── Look up the hashed token ──────────────────────────────
	tokenHash := auth.HashToken(req.RefreshToken)
	userID, expiresAt, revoked, err := h.userStore.GetRefreshToken(tokenHash)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}

	// ── Check if already revoked ──────────────────────────────
	if revoked {
		// SECURITY: A revoked token being reused is suspicious.
		// In production, you might want to revoke ALL tokens for
		// this user and alert the security team.
		log.Printf("[WARN] revoked refresh token reuse attempt for user_id=%d", userID)
		respondError(w, http.StatusUnauthorized, "refresh token has been revoked")
		return
	}

	// ── Check expiry ──────────────────────────────────────────
	if time.Now().After(expiresAt) {
		respondError(w, http.StatusUnauthorized, "refresh token has expired")
		return
	}

	// ── Revoke the old token (rotation) ───────────────────────
	if err := h.userStore.RevokeRefreshToken(tokenHash); err != nil {
		log.Printf("[ERROR] revoke refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// ── Fetch the user and generate new tokens ────────────────
	user, err := h.userStore.GetByID(userID)
	if err != nil || user == nil {
		log.Printf("[ERROR] get user for refresh: %v", err)
		respondError(w, http.StatusUnauthorized, "user not found")
		return
	}

	tokenPair, err := h.jwtService.GenerateTokenPair(user)
	if err != nil {
		log.Printf("[ERROR] generate tokens: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	newTokenHash := auth.HashToken(tokenPair.RefreshToken)
	newExpiresAt := time.Now().Add(h.jwtService.RefreshExpiry())
	if err := h.userStore.StoreRefreshToken(user.ID, newTokenHash, newExpiresAt); err != nil {
		log.Printf("[ERROR] store new refresh token: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusOK, tokenPair)
}

// ──────────────────────────────────────────────────────────────
// HandleMe — GET /api/users/me
// ──────────────────────────────────────────────────────────────
// Returns the authenticated user's profile. The user info comes
// from the JWT claims stored in the request context by the
// JWTAuth middleware — no database call needed.
//
// For a richer profile (e.g., with additional fields not in the
// JWT), we fetch the full record from the database.

func (h *AuthHandler) HandleMe(w http.ResponseWriter, r *http.Request) {
	claims := middleware.UserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	// Fetch full user record from DB for complete profile
	user, err := h.userStore.GetByID(claims.UserID)
	if err != nil || user == nil {
		log.Printf("[ERROR] get user profile: %v", err)
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	// Return user without password hash (json:"-" tag handles this)
	respondJSON(w, http.StatusOK, user)
}

// ──────────────────────────────────────────────────────────────
// HandleListUsers — GET /api/admin/users
// ──────────────────────────────────────────────────────────────
// Admin-only endpoint that returns all registered users.
// The RequireRole("admin") middleware runs before this handler,
// so by the time we get here, we know the caller is an admin.

func (h *AuthHandler) HandleListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.userStore.GetAll()
	if err != nil {
		log.Printf("[ERROR] list users: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusOK, users)
}

// ──────────────────────────────────────────────────────────────
// Response helpers
// ──────────────────────────────────────────────────────────────
// WHY helper functions? They enforce consistent response format
// across all handlers. Every error is a JSON object with a
// "error" field. Every success is a JSON body with correct
// Content-Type and status code.

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("[ERROR] encode response: %v", err)
	}
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// ──────────────────────────────────────────────────────────────
// Input validation helpers
// ──────────────────────────────────────────────────────────────
// WHY basic validation here?
// In production, you'd use a validation library, but for learning
// purposes, simple checks teach the principle: never trust client
// input. Validate EVERYTHING before processing.

// isValidEmail performs a basic email format check.
// For production, use a proper email validation library or
// send a verification email.
func isValidEmail(email string) bool {
	// Basic check: contains @ and has parts on both sides
	parts := strings.SplitN(email, "@", 2)
	return len(parts) == 2 && len(parts[0]) > 0 && len(parts[1]) > 2
}
