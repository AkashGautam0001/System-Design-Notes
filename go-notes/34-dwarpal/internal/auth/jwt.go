// ============================================================
//  Package auth — JWT Token Service
// ============================================================
//  This file handles all JWT operations: creating tokens,
//  validating tokens, and generating refresh tokens.
//
//  ZERODHA ANALOGY:
//  When a trader logs in at the Zerodha Kite terminal, they
//  receive two things:
//  1. An ACCESS TOKEN (like a day-pass for the trading floor)
//     — short-lived (15 min), carried with every API call
//  2. A REFRESH TOKEN (like a membership card stored in wallet)
//     — long-lived (7 days), used only to get a new day-pass
//
//  WHY HMAC-SHA256 (HS256)?
//  - Symmetric signing: same secret signs and verifies
//  - Fast: important when validating tokens on every request
//  - Simple: one secret to manage (vs RSA key pairs)
//  - For a single-service auth gateway, HS256 is ideal.
//    Use RS256 when multiple services need to verify tokens
//    but only one service should sign them.
// ============================================================

package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"dwarpal/internal/model"
)

// JWTService encapsulates all token generation and validation.
// The secret and expiry durations are injected at construction
// time, making it easy to test with different configurations.
type JWTService struct {
	secret        []byte
	accessExpiry  time.Duration
	refreshExpiry time.Duration
}

// NewJWTService creates a configured JWT service.
func NewJWTService(secret string, accessExpiry, refreshExpiry time.Duration) *JWTService {
	return &JWTService{
		secret:        []byte(secret),
		accessExpiry:  accessExpiry,
		refreshExpiry: refreshExpiry,
	}
}

// ──────────────────────────────────────────────────────────────
// GenerateAccessToken creates a signed JWT for the given user.
// ──────────────────────────────────────────────────────────────
// WHY short-lived (15 min)?
// If an access token is stolen (e.g., from a compromised log),
// the attacker has at most 15 minutes to use it. After that,
// they'd need the refresh token — which is stored more securely
// and is single-use.
//
// The claims include UserID, Email, and Role so that downstream
// middleware can make authorization decisions WITHOUT hitting
// the database. This is the core benefit of JWT: stateless auth.

func (s *JWTService) GenerateAccessToken(user *model.User) (string, time.Time, error) {
	expiresAt := time.Now().Add(s.accessExpiry)

	claims := &model.TokenClaims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprintf("%d", user.ID),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "dwarpal",
		},
	}

	// jwt.NewWithClaims creates an unsigned token with the header
	// (algorithm) and payload (claims). SignedString signs it
	// using HMAC-SHA256 with our secret key.
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString(s.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign access token: %w", err)
	}

	return tokenStr, expiresAt, nil
}

// ──────────────────────────────────────────────────────────────
// GenerateRefreshToken creates a cryptographically random token.
// ──────────────────────────────────────────────────────────────
// WHY NOT a JWT for refresh tokens?
// Refresh tokens are opaque — the server looks them up in the
// database. They don't need to carry claims because we fetch
// the user data fresh from the DB during refresh. Using a random
// string avoids the overhead of JWT parsing and keeps the token
// shorter.
//
// CRITICAL: We use crypto/rand, NOT math/rand.
// math/rand is pseudo-random and predictable if you know the
// seed. crypto/rand reads from /dev/urandom (Linux) or the OS
// CSPRNG — suitable for security-sensitive operations.

func (s *JWTService) GenerateRefreshToken() (string, error) {
	bytes := make([]byte, 32) // 256 bits of randomness
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("generate random bytes: %w", err)
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// RefreshExpiry returns the configured refresh token lifetime.
// Used by handlers to calculate the expiry time when storing.
func (s *JWTService) RefreshExpiry() time.Duration {
	return s.refreshExpiry
}

// ──────────────────────────────────────────────────────────────
// ValidateAccessToken parses and validates a JWT string.
// ──────────────────────────────────────────────────────────────
// The jwt.Parse function does several things:
// 1. Decodes the base64 header and payload
// 2. Verifies the signature using our secret
// 3. Checks the "exp" claim — rejects expired tokens
// 4. Returns the parsed claims if everything checks out
//
// If validation fails (expired, tampered, wrong signature),
// the error tells us exactly what went wrong.

func (s *JWTService) ValidateAccessToken(tokenStr string) (*model.TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &model.TokenClaims{}, func(t *jwt.Token) (interface{}, error) {
		// ──────────────────────────────────────────────────────────
		// WHY check the signing method?
		// An attacker could send a token with "alg": "none" or
		// switch to RS256 with a crafted key. By explicitly
		// checking for HS256, we prevent algorithm confusion attacks.
		// ──────────────────────────────────────────────────────────
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
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

// ──────────────────────────────────────────────────────────────
// GenerateTokenPair creates both access and refresh tokens.
// ──────────────────────────────────────────────────────────────
// This is the main entry point used by login and refresh handlers.
// Returns an AuthResponse ready to be sent back to the client.

func (s *JWTService) GenerateTokenPair(user *model.User) (*model.AuthResponse, error) {
	accessToken, expiresAt, err := s.GenerateAccessToken(user)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresAt,
	}, nil
}

// ──────────────────────────────────────────────────────────────
// HashToken creates a SHA-256 hash of a token for storage.
// ──────────────────────────────────────────────────────────────
// WHY hash refresh tokens before storing?
// If an attacker gains read access to the database (SQL injection,
// backup leak, etc.), they see only hashes — not usable tokens.
// SHA-256 is fine here (vs bcrypt) because refresh tokens are
// high-entropy random strings, not low-entropy passwords.

func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
