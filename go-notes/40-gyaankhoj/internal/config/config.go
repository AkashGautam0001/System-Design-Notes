// ============================================================
//  PACKAGE config — Application Configuration
// ============================================================
//  WHY: Centralizing configuration in a single struct makes it
//  easy to manage environment-specific settings. At TCS, the
//  DevOps team manages 1000+ microservices — each one reads its
//  config from environment variables so that the same binary
//  runs in dev, staging, and production without code changes.
// ============================================================

package config

import (
	"os"
	"strconv"
)

// ──────────────────────────────────────────────────────────────
// Config holds all application settings for GyaanKhoj.
// WHY a struct instead of scattered os.Getenv calls?
// 1. Single source of truth — every setting is documented here.
// 2. Type safety — ints and floats are parsed once at startup.
// 3. Testability — construct Config in tests without env vars.
// ──────────────────────────────────────────────────────────────

// Config holds all application-level configuration values.
type Config struct {
	Port                string
	GeminiAPIKey        string
	QdrantURL           string
	CollectionName      string
	EmbeddingDim        int
	ChunkSize           int
	ChunkOverlap        int
	TopK                int
	SimilarityThreshold float64
}

// Load reads environment variables and returns a Config with sensible defaults.
// WHY defaults? So that `go run main.go` works out of the box for new TCS
// developers on day one — no Docker, no Qdrant, no API keys needed.
func Load() Config {
	return Config{
		Port:                envOrDefault("PORT", "8084"),
		GeminiAPIKey:        envOrDefault("GEMINI_API_KEY", ""),
		QdrantURL:           envOrDefault("QDRANT_URL", "http://localhost:6333"),
		CollectionName:      envOrDefault("COLLECTION_NAME", "tcs_knowledge"),
		EmbeddingDim:        envIntOrDefault("EMBEDDING_DIM", 256),
		ChunkSize:           envIntOrDefault("CHUNK_SIZE", 500),
		ChunkOverlap:        envIntOrDefault("CHUNK_OVERLAP", 50),
		TopK:                envIntOrDefault("TOP_K", 5),
		SimilarityThreshold: envFloatOrDefault("SIMILARITY_THRESHOLD", 0.7),
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

func envIntOrDefault(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func envFloatOrDefault(key string, fallback float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return fallback
}
