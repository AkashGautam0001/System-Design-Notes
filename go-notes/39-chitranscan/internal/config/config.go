// ============================================================
//  Package config — Application Configuration
// ============================================================
//  WHY A SEPARATE CONFIG PACKAGE?
//  Configuration is the "control panel" of ChitranScan. By
//  reading all settings from environment variables, we follow
//  the Twelve-Factor App methodology: the same binary runs in
//  dev (simulated AI, generous limits) and production (real
//  Gemini key, strict file-size caps).
//
//  BigBasket analogy: This is the settings board in the
//  warehouse office — maximum crate weight, inspection timeout,
//  how many QC stations run in parallel. The supervisor tweaks
//  dials without rewiring the conveyor belt.
// ============================================================

package config

import (
	"log"
	"os"
	"strconv"
	"time"
)

// Config holds all application settings. Each field maps to
// an environment variable with a sensible default for development.
type Config struct {
	Port            string        // HTTP port (default: "8083")
	GeminiAPIKey    string        // Gemini API key — empty means simulated mode
	MaxFileSize     int64         // Max upload size in bytes (default: 10MB)
	MaxBatchSize    int           // Max images per batch request (default: 10)
	AnalysisTimeout time.Duration // Per-image analysis timeout (default: 30s)
}

// Load reads configuration from environment variables, falling
// back to safe defaults where appropriate.
func Load() *Config {
	return &Config{
		Port:            getEnv("PORT", "8083"),
		GeminiAPIKey:    getEnv("GEMINI_API_KEY", ""),
		MaxFileSize:     getInt64Env("MAX_FILE_SIZE", 10<<20), // 10MB
		MaxBatchSize:    getIntEnv("MAX_BATCH_SIZE", 10),
		AnalysisTimeout: getDurationEnv("ANALYSIS_TIMEOUT", 30*time.Second),
	}
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

func getInt64Env(key string, fallback int64) int64 {
	if v := os.Getenv(key); v != "" {
		n, err := strconv.ParseInt(v, 10, 64)
		if err != nil {
			log.Printf("[WARN] invalid int64 for %s=%q, using default %d", key, v, fallback)
			return fallback
		}
		return n
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
