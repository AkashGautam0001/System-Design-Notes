// ============================================================
//  PACKAGE config — Application Configuration
// ============================================================
//  WHY: Centralizing configuration in a single struct makes it
//  easy to manage environment-specific settings. During Flipkart's
//  Big Billion Days, the ops team tweaks timeouts, JWT expiry,
//  and database paths without touching code — just environment
//  variables.
// ============================================================

package config

import (
	"os"
	"strconv"
	"time"
)

// ──────────────────────────────────────────────────────────────
// Config holds all application settings.
// WHY a struct instead of scattered os.Getenv calls?
// 1. Single source of truth — every setting is documented here.
// 2. Type safety — durations and ints are parsed once at startup.
// 3. Testability — you can construct a Config in tests without env vars.
// ──────────────────────────────────────────────────────────────

// Config holds all application-level configuration values.
type Config struct {
	Port         string
	DBPath       string
	JWTSecret    string
	JWTExpiry    time.Duration
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
}

// Load reads environment variables and returns a Config with sensible defaults.
// WHY defaults? So that `go run main.go` works out of the box for new developers.
// In production, every value should be explicitly set via environment or .env file.
func Load() Config {
	return Config{
		Port:         envOrDefault("PORT", "8080"),
		DBPath:       envOrDefault("DB_PATH", "bazaarapi.db"),
		JWTSecret:    envOrDefault("JWT_SECRET", "flipkart-bigbillion-secret-change-me"),
		JWTExpiry:    envDurationOrDefault("JWT_EXPIRY_HOURS", 24),
		ReadTimeout:  envDurationSecsOrDefault("READ_TIMEOUT", 10),
		WriteTimeout: envDurationSecsOrDefault("WRITE_TIMEOUT", 10),
		IdleTimeout:  envDurationSecsOrDefault("IDLE_TIMEOUT", 120),
	}
}

// ──────────────────────────────────────────────────────────────
// Helper functions — keep config parsing DRY.
// ──────────────────────────────────────────────────────────────

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envDurationOrDefault(key string, fallbackHours int) time.Duration {
	if v := os.Getenv(key); v != "" {
		if hours, err := strconv.Atoi(v); err == nil {
			return time.Duration(hours) * time.Hour
		}
	}
	return time.Duration(fallbackHours) * time.Hour
}

func envDurationSecsOrDefault(key string, fallbackSecs int) time.Duration {
	if v := os.Getenv(key); v != "" {
		if secs, err := strconv.Atoi(v); err == nil {
			return time.Duration(secs) * time.Second
		}
	}
	return time.Duration(fallbackSecs) * time.Second
}
