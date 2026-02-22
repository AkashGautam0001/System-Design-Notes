// ============================================================
//  PACKAGE handler — Auth Handlers (Register + Login)
// ============================================================
//  WHY: Authentication is the gateway to BazaarAPI. Before a user
//  can add items to their cart or place an order during Big Billion
//  Days, they must register and login. These handlers validate
//  input, hash passwords, create users, and issue JWTs.
//
//  The pattern is identical to Ch 34 (Dwarpal), proving that auth
//  is a reusable building block. Once you learn it, you can drop
//  it into any project.
// ============================================================

package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"bazaarapi/internal/auth"
	"bazaarapi/internal/model"
	"bazaarapi/internal/store"
)

// ──────────────────────────────────────────────────────────────
// AuthHandler holds dependencies for authentication endpoints.
// WHY struct with fields? Constructor injection. The handler does
// not create its own store or JWT service — they are provided by
// main.go. This makes testing easy: inject a mock store.
// ──────────────────────────────────────────────────────────────

// AuthHandler handles user registration and login.
type AuthHandler struct {
	userStore  *store.UserStore
	jwtService *auth.JWTService
}

// NewAuthHandler creates an AuthHandler with the given dependencies.
func NewAuthHandler(userStore *store.UserStore, jwtService *auth.JWTService) *AuthHandler {
	return &AuthHandler{
		userStore:  userStore,
		jwtService: jwtService,
	}
}

// ──────────────────────────────────────────────────────────────
// HandleRegister — POST /api/auth/register
// Creates a new user account and returns a JWT.
// WHY return a token on registration? So the user is immediately
// logged in after signing up. No extra step. During Big Billion
// Days, every extra click is a lost customer.
// ──────────────────────────────────────────────────────────────

// HandleRegister creates a new user and returns an auth token.
func (h *AuthHandler) HandleRegister(w http.ResponseWriter, r *http.Request) {
	var req model.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate required fields.
	// WHY trim spaces? Because " rahul@flipkart.com " and "rahul@flipkart.com"
	// should be treated as the same email. Whitespace-only names are also rejected.
	req.Email = strings.TrimSpace(req.Email)
	req.Name = strings.TrimSpace(req.Name)

	if req.Email == "" || req.Password == "" || req.Name == "" {
		respondError(w, http.StatusBadRequest, "email, password, and name are required")
		return
	}

	if len(req.Password) < 6 {
		respondError(w, http.StatusBadRequest, "password must be at least 6 characters")
		return
	}

	// Check if email already exists.
	existing, err := h.userStore.GetByEmail(r.Context(), req.Email)
	if err != nil {
		log.Printf("ERROR: check existing user: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if existing != nil {
		respondError(w, http.StatusConflict, "email already registered")
		return
	}

	// Hash the password before storing.
	// WHY hash here and not in the store? Because password hashing is an
	// authentication concern, not a storage concern. The store just saves bytes.
	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		log.Printf("ERROR: hash password: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// Create the user.
	user, err := h.userStore.Create(r.Context(), req.Email, passwordHash, req.Name)
	if err != nil {
		log.Printf("ERROR: create user: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// Generate JWT.
	token, err := h.jwtService.GenerateToken(user)
	if err != nil {
		log.Printf("ERROR: generate token: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusCreated, model.AuthResponse{
		Token: token,
		User:  *user,
	})
}

// ──────────────────────────────────────────────────────────────
// HandleLogin — POST /api/auth/login
// Verifies credentials and returns a JWT.
// WHY generic error messages? "Invalid email or password" instead
// of "email not found" or "wrong password". Specific messages let
// attackers enumerate valid emails — a security risk, especially
// during high-traffic events like Big Billion Days.
// ──────────────────────────────────────────────────────────────

// HandleLogin verifies credentials and returns an auth token.
func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Email = strings.TrimSpace(req.Email)

	if req.Email == "" || req.Password == "" {
		respondError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	// Look up the user by email.
	user, err := h.userStore.GetByEmail(r.Context(), req.Email)
	if err != nil {
		log.Printf("ERROR: get user by email: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if user == nil {
		respondError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	// Verify the password against the stored hash.
	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		respondError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	// Generate JWT.
	token, err := h.jwtService.GenerateToken(user)
	if err != nil {
		log.Printf("ERROR: generate token: %v", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusOK, model.AuthResponse{
		Token: token,
		User:  *user,
	})
}
