// ============================================================
//  Package config — Application Configuration
// ============================================================
//  WHY A SEPARATE CONFIG PACKAGE?
//  Configuration is the "control panel" of DwarPal. By reading
//  all settings from environment variables, we follow the
//  Twelve-Factor App methodology: the same binary runs in dev,
//  staging, and production — only the env vars change.
//
//  Zerodha analogy: This is the "settings board" in the server
//  room — port numbers, secret keys, token lifetimes. You don't
//  hardcode these any more than you'd paint the WiFi password
//  on the office wall.
// ============================================================

package config

import (
	"log"
	"os"
	"strconv"
	"time"
)

// Config holds all application settings. Each field maps to an
// environment variable with a sensible default for development.
type Config struct {
	Port          string        // HTTP port (default: "8081")
	DBPath        string        // SQLite file path (default: "dwarpal.db")
	JWTSecret     string        // HMAC signing key — MUST be set in production
	JWTExpiry     time.Duration // Access token lifetime (default: 15m)
	RefreshExpiry time.Duration // Refresh token lifetime (default: 168h = 7 days)
	BcryptCost    int           // bcrypt cost factor (default: 12)
}

// Load reads configuration from environment variables, falling
// back to safe defaults where appropriate.
func Load() *Config {
	cfg := &Config{
		Port:          getEnv("PORT", "8081"),
		DBPath:        getEnv("DB_PATH", "dwarpal.db"),
		JWTSecret:     getEnv("JWT_SECRET", ""),
		JWTExpiry:     getDurationEnv("JWT_EXPIRY", 15*time.Minute),
		RefreshExpiry: getDurationEnv("REFRESH_EXPIRY", 168*time.Hour),
		BcryptCost:    getIntEnv("BCRYPT_COST", 12),
	}

	// ──────────────────────────────────────────────────────────────
	// WHY we require JWT_SECRET: A predictable secret means anyone
	// can forge tokens. In production, generate with:
	//   openssl rand -hex 32
	// ──────────────────────────────────────────────────────────────
	if cfg.JWTSecret == "" {
		log.Println("[WARN] JWT_SECRET not set — using insecure default for development")
		cfg.JWTSecret = "dev-insecure-secret-do-not-use-in-production"
	}

	return cfg
}

// ──────────────────────────────────────────────────────────────
// Helper functions for reading typed env vars
// ──────────────────────────────────────────────────────────────

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil {
			log.Printf("[WARN] invalid duration for %s=%q, using default %v", key, v, fallback)
			return fallback
		}
		return d
	}
	return fallback
}

func getIntEnv(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			log.Printf("[WARN] invalid int for %s=%q, using default %d", key, v, fallback)
			return fallback
		}
		return n
	}
	return fallback
}
