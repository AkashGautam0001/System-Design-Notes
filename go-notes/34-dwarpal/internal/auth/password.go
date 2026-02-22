// ============================================================
//  Password Hashing with bcrypt
// ============================================================
//  WHY BCRYPT?
//  bcrypt is purpose-built for password hashing. Unlike SHA-256
//  (which is designed to be fast), bcrypt is intentionally slow.
//
//  "But slow is bad!" — Not for password hashing. An attacker
//  trying to brute-force passwords needs to compute millions of
//  hashes. If each hash takes 300ms instead of 1μs, the attack
//  becomes computationally infeasible.
//
//  KEY PROPERTIES:
//  1. Adaptive cost factor: cost=12 means 2^12 = 4096 iterations.
//     As hardware gets faster, increase the cost.
//  2. Built-in salt: Each hash includes a random salt, so two
//     users with password "TradeSafe123" get different hashes.
//     This defeats rainbow table attacks.
//  3. Timing-safe comparison: bcrypt.CompareHashAndPassword takes
//     the same amount of time whether the password fails at byte
//     1 or byte 30. This prevents timing attacks where an
//     attacker measures response time to guess characters.
// ============================================================

package auth

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword generates a bcrypt hash from a plain-text password.
//
// The cost parameter controls how many rounds of hashing are performed:
//   - cost 10 → ~100ms  (fast, for testing)
//   - cost 12 → ~300ms  (good for production)
//   - cost 14 → ~1s     (high security, slower logins)
//
// NEVER log or print the password parameter. This function is the
// last place the plain-text password should exist before it
// becomes a one-way hash.
func HashPassword(password string, cost int) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), cost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(hash), nil
}

// CheckPassword compares a plain-text password against a bcrypt hash.
//
// WHY NOT just compare strings?
// bcrypt hashes include a random salt, so the same password produces
// different hashes each time. CompareHashAndPassword extracts the
// salt from the stored hash, re-hashes the input with that salt,
// and compares the results in constant time.
//
// Returns nil on success, or an error if passwords don't match.
// IMPORTANT: Do NOT distinguish between "wrong password" and other
// errors in user-facing messages — always say "invalid credentials"
// to avoid leaking information about which accounts exist.
func CheckPassword(password, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
