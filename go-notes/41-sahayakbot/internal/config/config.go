// ============================================================
//  Config — Application Configuration for SahayakBot
// ============================================================
//  WHY a dedicated config package?
//  Swiggy runs SahayakBot across dev, staging, and production.
//  Each environment has different API keys, timeouts, and limits.
//  By reading from environment variables (Twelve-Factor App style),
//  the same Docker image works everywhere — only the env changes.
// ============================================================

package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all application settings.
// WHY struct, not global vars? Struct is testable — you can create
// a Config with test values without touching os.Getenv.
type Config struct {
	Port              string        // HTTP server port
	GeminiAPIKey      string        // Empty = simulated mode
	MaxSessionHistory int           // Max messages kept per session
	SessionTimeout    time.Duration // Inactive session expiry
	MaxToolCalls      int           // Max tool call iterations per request
}

// Load reads configuration from environment variables with sensible defaults.
// WHY defaults? A new developer should be able to `go run main.go` without
// setting a single env var. Swiggy's onboarding docs say "clone and run" —
// config defaults make that possible.
func Load() *Config {
	return &Config{
		Port:              getEnv("PORT", "8085"),
		GeminiAPIKey:      getEnv("GEMINI_API_KEY", ""),
		MaxSessionHistory: getEnvInt("MAX_SESSION_HISTORY", 50),
		SessionTimeout:    getEnvDuration("SESSION_TIMEOUT", 30*time.Minute),
		MaxToolCalls:      getEnvInt("MAX_TOOL_CALLS", 5),
	}
}

// ──────────────────────────────────────────────────────────────
// Helper functions — DRY env parsing
// ──────────────────────────────────────────────────────────────

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}
