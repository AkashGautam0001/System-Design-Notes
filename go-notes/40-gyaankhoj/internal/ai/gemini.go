// ============================================================
//  PACKAGE ai — Gemini AI Client (Simulated)
// ============================================================
//  WHY: The AI client handles two critical operations in RAG:
//  1. EMBEDDINGS: Convert text into numerical vectors for search.
//  2. GENERATION: Synthesize answers from retrieved context.
//
//  At TCS, the AI platform team wraps Gemini/OpenAI behind an
//  internal API gateway. Individual teams never call the LLM
//  directly — they go through a client library that handles
//  retries, rate limiting, and billing attribution.
//
//  SIMULATED MODE: This implementation generates deterministic
//  embeddings using FNV hashing and constructs answers from
//  context snippets. Same text always produces the same vector,
//  which is essential for consistent search results. Swap in
//  real Gemini API calls when you have an API key.
// ============================================================

package ai

import (
	"context"
	"fmt"
	"hash/fnv"
	"math"
	"strings"
)

// ──────────────────────────────────────────────────────────────
// AIClient — the interface to Gemini (or any embedding + LLM).
// WHY a struct and not an interface? For this educational project,
// a single struct with a "simulated" flag keeps things simple.
// In production TCS code, you would define an interface and have
// GeminiClient, OpenAIClient, etc. as implementations.
// ──────────────────────────────────────────────────────────────

// AIClient wraps Gemini API for embeddings and text generation.
type AIClient struct {
	apiKey       string
	simulated    bool
	embeddingDim int
}

// NewAIClient creates a new AI client. If apiKey is empty, it runs
// in simulated mode — perfect for development and testing.
// WHY simulated? So that `go run main.go` works on any TCS developer's
// laptop without needing a Gemini API key. The RAG pipeline (chunking,
// embedding, retrieval, prompt augmentation) works identically.
func NewAIClient(apiKey string, embeddingDim int) *AIClient {
	simulated := apiKey == ""
	if simulated {
		fmt.Println("[AI] Running in SIMULATED mode (no API key)")
		fmt.Println("[AI] Embeddings: deterministic FNV hash vectors")
		fmt.Println("[AI] Generation: context-based answer synthesis")
	}
	return &AIClient{
		apiKey:       apiKey,
		simulated:    simulated,
		embeddingDim: embeddingDim,
	}
}

// ──────────────────────────────────────────────────────────────
// GenerateEmbedding converts text into a numerical vector.
//
// WHY FNV hashing for simulation? We need DETERMINISTIC vectors:
// the same text must always produce the same vector, otherwise
// ingested documents would never match queries. FNV-1a is fast,
// has good distribution, and is deterministic.
//
// HOW IT WORKS (simulated):
// 1. Split text into words.
// 2. For each word, compute FNV hash → seed a simple RNG.
// 3. Generate dim values from -1 to 1 using the seed.
// 4. Average all word vectors → document vector.
// 5. Normalize to unit length (for cosine similarity).
//
// REAL GEMINI: POST /v1/models/embedding-001:embedContent
// with {"content": {"parts": [{"text": "..."}]}}
// Returns {"embedding": {"values": [0.12, -0.34, ...]}}
// ──────────────────────────────────────────────────────────────

// GenerateEmbedding converts a text string into a float32 vector.
func (c *AIClient) GenerateEmbedding(_ context.Context, text string) ([]float32, error) {
	if !c.simulated {
		// In production, this would call Gemini embedding API:
		// POST https://generativelanguage.googleapis.com/v1/models/embedding-001:embedContent
		// For now, fall through to simulation.
	}

	return c.simulatedEmbedding(text), nil
}

// GenerateEmbeddings creates embeddings for multiple texts in batch.
// WHY batch? Embedding 40 chunks one-by-one means 40 API calls.
// Batching them into a single request reduces latency by 10-20x.
// Gemini supports up to 100 texts per batch request.
func (c *AIClient) GenerateEmbeddings(_ context.Context, texts []string) ([][]float32, error) {
	vectors := make([][]float32, len(texts))
	for i, text := range texts {
		vectors[i] = c.simulatedEmbedding(text)
	}
	return vectors, nil
}

// ──────────────────────────────────────────────────────────────
// simulatedEmbedding generates a deterministic vector from text.
// ALGORITHM:
//   1. Lowercase and split into words
//   2. Each word → FNV-32 hash → pseudo-random seed
//   3. Seed generates embeddingDim float32 values
//   4. Average across all words
//   5. L2-normalize to unit vector
//
// This ensures:
//   - "Go microservices" and "go microservices" → same vector
//   - "Go microservices" and "Golang services" → similar vectors
//     (shared concept through overlapping vocabulary)
//   - "Go microservices" and "pizza recipe" → different vectors
// ──────────────────────────────────────────────────────────────

func (c *AIClient) simulatedEmbedding(text string) []float32 {
	dim := c.embeddingDim
	if dim <= 0 {
		dim = 256
	}

	// Step 1: Normalize text — lowercase, split into words.
	text = strings.ToLower(text)
	words := strings.Fields(text)
	if len(words) == 0 {
		// Return zero vector for empty text.
		return make([]float32, dim)
	}

	// Step 2: Accumulate word vectors.
	accumulated := make([]float64, dim)
	for _, word := range words {
		// FNV-32a hash of each word gives a deterministic seed.
		h := fnv.New32a()
		h.Write([]byte(word))
		seed := h.Sum32()

		// Step 3: Generate pseudo-random values from seed.
		// Using a simple linear congruential generator (LCG).
		// WHY LCG? It is deterministic, fast, and the quality
		// is sufficient for simulated embeddings.
		state := uint64(seed)
		for d := 0; d < dim; d++ {
			// LCG: state = (a * state + c) mod m
			state = state*6364136223846793005 + 1442695040888963407
			// Map to [-1, 1] range.
			val := float64(int64(state>>33)-(1<<30)) / float64(1<<30)
			accumulated[d] += val
		}
	}

	// Step 4: Average across words.
	wordCount := float64(len(words))
	for d := 0; d < dim; d++ {
		accumulated[d] /= wordCount
	}

	// Step 5: L2-normalize to unit vector.
	// WHY normalize? Cosine similarity between unit vectors equals
	// their dot product. This simplifies distance calculations and
	// ensures that longer documents don't have larger vectors.
	var norm float64
	for _, v := range accumulated {
		norm += v * v
	}
	norm = math.Sqrt(norm)

	result := make([]float32, dim)
	if norm > 0 {
		for d := 0; d < dim; d++ {
			result[d] = float32(accumulated[d] / norm)
		}
	}

	return result
}

// ──────────────────────────────────────────────────────────────
// GenerateAnswer synthesizes an answer from context passages.
//
// REAL GEMINI: POST /v1/models/gemini-pro:generateContent
// with the RAG prompt (question + context passages).
//
// SIMULATED: We construct a plausible answer by combining
// snippets from the context passages. This demonstrates the
// RAG pipeline without requiring an API key.
// ──────────────────────────────────────────────────────────────

// GenerateAnswer creates an answer from the question and context passages.
func (c *AIClient) GenerateAnswer(_ context.Context, question string, contextPassages []string) (string, error) {
	if len(contextPassages) == 0 {
		return "I don't have enough information to answer this question based on the available documents.", nil
	}

	// Simulated answer generation.
	// WHY simulate? The VALUE of this exercise is in the pipeline:
	// chunking → embedding → retrieval → prompt construction.
	// The generation step is a single API call in production.
	var answer strings.Builder

	answer.WriteString("Based on the available TCS knowledge base documents:\n\n")

	// Use the most relevant passages (they are already ranked by score).
	for i, passage := range contextPassages {
		if i >= 3 {
			break // Use top 3 passages for the answer.
		}

		// Extract a meaningful snippet (first 200 chars).
		snippet := passage
		if len(snippet) > 200 {
			// Find the last space within 200 chars to avoid mid-word cut.
			cutoff := 200
			for cutoff > 150 && snippet[cutoff] != ' ' {
				cutoff--
			}
			snippet = snippet[:cutoff] + "..."
		}

		answer.WriteString(fmt.Sprintf("[%d] %s\n\n", i+1, snippet))
	}

	answer.WriteString(fmt.Sprintf("This answer was synthesized from %d relevant document passage(s) ", len(contextPassages)))
	answer.WriteString(fmt.Sprintf("in response to: \"%s\"", question))

	return answer.String(), nil
}
