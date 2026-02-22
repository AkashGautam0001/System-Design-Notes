// ============================================================
//  Package config — Application Configuration
// ============================================================
//  WHY A SEPARATE PACKAGE:
//  Configuration is a cross-cutting concern. By isolating it
//  into its own package, we ensure that main.go is not cluttered
//  with os.Getenv calls, and any package that needs config can
//  receive the Config struct via dependency injection.
//
//  WHY ENVIRONMENT VARIABLES (not a config file):
//  The Twelve-Factor App methodology says: "Store config in the
//  environment." Environment variables work everywhere — local
//  development, Docker, Kubernetes, CI/CD — without mounting
//  files or changing paths. For the Infosys training campus,
//  each batch can simply set DB_PATH=batch42.db to get their
//  own isolated database.
// ============================================================

package config

import (
	"os"
	"time"
)

// Config holds all application settings.
// Every field has a sensible default so the app runs with zero
// configuration — just `go run main.go`.
type Config struct {
	Port         string        // HTTP listen port (default: "8080")
	DBPath       string        // SQLite database file (default: "noteskaro.db")
	ReadTimeout  time.Duration // Max time to read request (default: 10s)
	WriteTimeout time.Duration // Max time to write response (default: 10s)
	IdleTimeout  time.Duration // Max idle keep-alive time (default: 120s)
}

// Load reads configuration from environment variables, falling
// back to sensible defaults. No external libraries needed — Go's
// os.Getenv + time.ParseDuration cover everything.
func Load() Config {
	return Config{
		Port:         envOrDefault("PORT", "8080"),
		DBPath:       envOrDefault("DB_PATH", "noteskaro.db"),
		ReadTimeout:  durationOrDefault("READ_TIMEOUT", 10*time.Second),
		WriteTimeout: durationOrDefault("WRITE_TIMEOUT", 10*time.Second),
		IdleTimeout:  durationOrDefault("IDLE_TIMEOUT", 120*time.Second),
	}
}

// envOrDefault returns the environment variable value if set,
// otherwise returns the provided default. Simple, explicit, no magic.
func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// durationOrDefault parses a duration string from an environment
// variable (e.g., "10s", "2m"). If the variable is unset or
// invalid, it returns the fallback duration.
func durationOrDefault(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
}
