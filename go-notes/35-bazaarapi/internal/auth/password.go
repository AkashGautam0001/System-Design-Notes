// ============================================================
//  PACKAGE auth — Password Hashing
// ============================================================
//  WHY: Never store plaintext passwords. During Big Billion Days,
//  if Flipkart's database were compromised, bcrypt-hashed passwords
//  protect millions of user accounts. bcrypt is intentionally slow
//  (configurable cost factor) — brute-forcing even one password
//  takes years.
//
//  Same pattern as Ch 34 (Dwarpal). Two functions: hash and verify.
//  Simple, stateless, and correct.
// ============================================================

package auth

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// ──────────────────────────────────────────────────────────────
// HashPassword generates a bcrypt hash from a plaintext password.
// WHY bcrypt.DefaultCost (10)? Each increment doubles the time.
// Cost 10 takes ~100ms per hash — fast enough for user registration,
// slow enough to make brute-force attacks impractical.
// At Flipkart scale, even a leaked database would be useless to
// attackers trying to reverse the hashes.
// ──────────────────────────────────────────────────────────────

// HashPassword generates a bcrypt hash from a plaintext password.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(bytes), nil
}

// ──────────────────────────────────────────────────────────────
// CheckPassword compares a plaintext password with a bcrypt hash.
// WHY does bcrypt.CompareHashAndPassword handle timing attacks?
// It uses constant-time comparison internally, so an attacker
// cannot determine how many bytes of the hash matched based on
// response time. Security by design.
// ──────────────────────────────────────────────────────────────

// CheckPassword verifies a plaintext password against a bcrypt hash.
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
