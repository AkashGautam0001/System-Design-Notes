package config

// ============================================================
// Configuration — VaaniSutra Pipeline Settings
// ============================================================
// WHY centralized config? At Jio, the same VaaniSutra binary
// runs in dev (2 workers, in-memory store) and production
// (32 workers, Qdrant cluster). Environment variables let ops
// teams tune the pipeline without recompiling.
// ============================================================

import (
	"os"
	"strconv"
	"time"
)

// Config holds all application configuration.
type Config struct {
	// Server
	Port string

	// AI / Gemini
	GeminiAPIKey string

	// Vector Database
	QdrantURL      string
	CollectionName string
	EmbeddingDim   int

	// Pipeline
	WorkerCount  int
	QueueSize    int
	BatchTimeout time.Duration
}

// ──────────────────────────────────────────────────────────────
// Load reads configuration from environment variables with
// sensible defaults for local development.
// WHY defaults? A new Jio intern should be able to run
// `go run main.go` without setting up anything.
// ──────────────────────────────────────────────────────────────
func Load() *Config {
	return &Config{
		Port:           getEnv("PORT", "8086"),
		GeminiAPIKey:   getEnv("GEMINI_API_KEY", ""),
		QdrantURL:      getEnv("QDRANT_URL", "http://localhost:6333"),
		CollectionName: getEnv("COLLECTION_NAME", "jio_transcripts"),
		EmbeddingDim:   getEnvInt("EMBEDDING_DIM", 256),
		WorkerCount:    getEnvInt("WORKER_COUNT", 4),
		QueueSize:      getEnvInt("QUEUE_SIZE", 100),
		BatchTimeout:   getEnvDuration("BATCH_TIMEOUT", 5*time.Second),
	}
}

// getEnv returns an environment variable or a default value.
func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}

// getEnvInt returns an environment variable as int or a default.
func getEnvInt(key string, fallback int) int {
	if val, ok := os.LookupEnv(key); ok {
		if n, err := strconv.Atoi(val); err == nil {
			return n
		}
	}
	return fallback
}

// getEnvDuration returns an environment variable as Duration or a default.
func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if val, ok := os.LookupEnv(key); ok {
		if d, err := time.ParseDuration(val); err == nil {
			return d
		}
	}
	return fallback
}
