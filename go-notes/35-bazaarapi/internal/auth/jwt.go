// ============================================================
//  PACKAGE auth — JWT Service
// ============================================================
//  WHY: JSON Web Tokens let us authenticate users without server-
//  side sessions. During Big Billion Days, Flipkart serves millions
//  of concurrent users. Storing a session for each would require
//  a massive Redis cluster. JWTs are self-contained — the token
//  itself carries the user ID and role. The server just verifies
//  the signature.
//
//  This is the same pattern from Ch 34 (Dwarpal), streamlined for
//  BazaarAPI. The key difference: we include the Role claim so that
//  the middleware can enforce admin-only routes without a DB query.
// ============================================================

package auth

import (
	"fmt"
	"time"

	"bazaarapi/internal/model"

	"github.com/golang-jwt/jwt/v5"
)

// ──────────────────────────────────────────────────────────────
// JWTService handles token generation and validation.
// WHY a struct with fields? So that the secret and expiry can be
// configured via environment variables (injected through Config).
// No hardcoded secrets in source code — ever.
// ──────────────────────────────────────────────────────────────

// JWTService generates and validates JSON Web Tokens.
type JWTService struct {
	secret []byte
	expiry time.Duration
}

// NewJWTService creates a JWTService with the given secret and token expiry.
func NewJWTService(secret string, expiry time.Duration) *JWTService {
	return &JWTService{
		secret: []byte(secret),
		expiry: expiry,
	}
}

// ──────────────────────────────────────────────────────────────
// GenerateToken creates a signed JWT for the given user.
// WHY include UserID, Email, and Role in claims? So that:
// 1. Middleware can extract the user identity without a DB query.
// 2. Role-based access control works from the token alone.
// 3. The handler can greet the user by email in responses.
// ──────────────────────────────────────────────────────────────

// GenerateToken creates a signed JWT for the given user.
func (s *JWTService) GenerateToken(user *model.User) (string, error) {
	now := time.Now()

	claims := model.TokenClaims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.expiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			Subject:   fmt.Sprintf("%d", user.ID),
		},
	}

	// WHY HS256? It is the most common symmetric signing algorithm.
	// Symmetric means the same secret signs and verifies — suitable
	// for a single-service API like BazaarAPI. For microservices
	// (where multiple services verify tokens), you would use RS256
	// (asymmetric) so that only the auth service holds the private key.
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	signedToken, err := token.SignedString(s.secret)
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}

	return signedToken, nil
}

// ──────────────────────────────────────────────────────────────
// ValidateToken parses and validates a JWT string.
// WHY return *TokenClaims? So that the middleware can extract
// user_id and role from the token and inject them into the
// request context — available to every downstream handler.
// ──────────────────────────────────────────────────────────────

// ValidateToken parses a JWT string and returns the claims if valid.
func (s *JWTService) ValidateToken(tokenString string) (*model.TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &model.TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		// WHY check the signing method? To prevent the "alg: none" attack.
		// An attacker could craft a token with alg=none (no signature).
		// By explicitly checking for HS256, we reject such tokens.
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.secret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("parse token: %w", err)
	}

	claims, ok := token.Claims.(*model.TokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}
