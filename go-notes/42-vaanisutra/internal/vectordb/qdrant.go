package vectordb

// ============================================================
// Vector Store — Qdrant Client with In-Memory Fallback
// ============================================================
// WHY two implementations? Production Jio runs Qdrant clusters
// for billion-scale vector search. But developers need to code
// and test without running Docker. The in-memory fallback gives
// them identical behaviour with zero setup.
//
// The factory function NewVectorStore tries Qdrant first and
// falls back to in-memory if it can't connect — no config
// changes needed.
// ============================================================

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"sort"
	"sync"
	"time"
)

// ──────────────────────────────────────────────────────────────
// VectorStore interface — both Qdrant and in-memory implement this.
// WHY an interface? It lets the pipeline code work identically
// regardless of which storage backend is active. Dependency
// inversion at its finest.
// ──────────────────────────────────────────────────────────────
type VectorStore interface {
	CreateCollection() error
	Upsert(id string, vector []float32, payload map[string]interface{}) error
	Search(vector []float32, topK int, minScore float64) ([]SearchHit, error)
	Delete(id string) error
}

// SearchHit represents a single search result from the vector store.
type SearchHit struct {
	ID      string                 `json:"id"`
	Score   float64                `json:"score"`
	Payload map[string]interface{} `json:"payload"`
}

// ============================================================
// Qdrant Client
// ============================================================

// QdrantClient communicates with a Qdrant vector database via REST API.
type QdrantClient struct {
	baseURL        string
	collectionName string
	embeddingDim   int
	httpClient     *http.Client
}

// NewQdrantClient creates a Qdrant REST API client.
func NewQdrantClient(baseURL, collectionName string, embeddingDim int) *QdrantClient {
	return &QdrantClient{
		baseURL:        baseURL,
		collectionName: collectionName,
		embeddingDim:   embeddingDim,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// CreateCollection creates the Qdrant collection if it does not exist.
func (q *QdrantClient) CreateCollection() error {
	url := fmt.Sprintf("%s/collections/%s", q.baseURL, q.collectionName)

	body := map[string]interface{}{
		"vectors": map[string]interface{}{
			"size":     q.embeddingDim,
			"distance": "Cosine",
		},
	}
	data, _ := json.Marshal(body)

	req, err := http.NewRequest("PUT", url, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("create collection request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := q.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("create collection: %w", err)
	}
	defer resp.Body.Close()

	// 409 means collection already exists — that is fine
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusConflict {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("create collection failed (%d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// Upsert inserts or updates a vector with its payload.
func (q *QdrantClient) Upsert(id string, vector []float32, payload map[string]interface{}) error {
	url := fmt.Sprintf("%s/collections/%s/points", q.baseURL, q.collectionName)

	body := map[string]interface{}{
		"points": []map[string]interface{}{
			{
				"id":      id,
				"vector":  vector,
				"payload": payload,
			},
		},
	}
	data, _ := json.Marshal(body)

	req, err := http.NewRequest("PUT", url, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("upsert request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := q.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("upsert: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("upsert failed (%d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// Search finds the most similar vectors.
func (q *QdrantClient) Search(vector []float32, topK int, minScore float64) ([]SearchHit, error) {
	url := fmt.Sprintf("%s/collections/%s/points/search", q.baseURL, q.collectionName)

	body := map[string]interface{}{
		"vector":         vector,
		"limit":          topK,
		"with_payload":   true,
		"score_threshold": minScore,
	}
	data, _ := json.Marshal(body)

	req, err := http.NewRequest("POST", url, bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("search request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := q.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("search: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("search failed (%d): %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Result []struct {
			ID      interface{}            `json:"id"`
			Score   float64                `json:"score"`
			Payload map[string]interface{} `json:"payload"`
		} `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode search response: %w", err)
	}

	var hits []SearchHit
	for _, r := range result.Result {
		idStr := fmt.Sprintf("%v", r.ID)
		hits = append(hits, SearchHit{
			ID:      idStr,
			Score:   r.Score,
			Payload: r.Payload,
		})
	}

	return hits, nil
}

// Delete removes a vector by ID.
func (q *QdrantClient) Delete(id string) error {
	url := fmt.Sprintf("%s/collections/%s/points/delete", q.baseURL, q.collectionName)

	body := map[string]interface{}{
		"points": []string{id},
	}
	data, _ := json.Marshal(body)

	req, err := http.NewRequest("POST", url, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("delete request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := q.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("delete: %w", err)
	}
	defer resp.Body.Close()

	return nil
}

// ============================================================
// In-Memory Vector Store (Fallback)
// ============================================================

// vectorEntry stores a single vector with its payload.
type vectorEntry struct {
	ID      string
	Vector  []float32
	Payload map[string]interface{}
}

// InMemoryVectorStore provides vector search without external dependencies.
// WHY in-memory? For development and testing, running a full Qdrant
// instance is overkill. This gives identical API behavior with
// brute-force cosine similarity search. At Jio's production scale
// (millions of vectors), you would always use Qdrant — but for
// development with hundreds of transcripts, in-memory is perfect.
type InMemoryVectorStore struct {
	mu      sync.RWMutex
	vectors map[string]vectorEntry
}

// NewInMemoryVectorStore creates an in-memory vector store.
func NewInMemoryVectorStore() *InMemoryVectorStore {
	return &InMemoryVectorStore{
		vectors: make(map[string]vectorEntry),
	}
}

// CreateCollection is a no-op for in-memory store.
func (m *InMemoryVectorStore) CreateCollection() error {
	return nil
}

// Upsert adds or updates a vector.
func (m *InMemoryVectorStore) Upsert(id string, vector []float32, payload map[string]interface{}) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.vectors[id] = vectorEntry{
		ID:      id,
		Vector:  vector,
		Payload: payload,
	}
	return nil
}

// Search finds the most similar vectors using brute-force cosine similarity.
// WHY brute-force? With fewer than 10,000 vectors in development,
// linear scan with cosine similarity takes microseconds. Qdrant
// uses HNSW index for billions — but brute-force is simpler to
// understand and debug.
func (m *InMemoryVectorStore) Search(vector []float32, topK int, minScore float64) ([]SearchHit, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var hits []SearchHit
	for _, entry := range m.vectors {
		score := cosineSimilarity(vector, entry.Vector)
		if score >= minScore {
			hits = append(hits, SearchHit{
				ID:      entry.ID,
				Score:   score,
				Payload: entry.Payload,
			})
		}
	}

	// Sort by score descending
	sort.Slice(hits, func(i, j int) bool {
		return hits[i].Score > hits[j].Score
	})

	if len(hits) > topK {
		hits = hits[:topK]
	}

	return hits, nil
}

// Delete removes a vector by ID.
func (m *InMemoryVectorStore) Delete(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.vectors, id)
	return nil
}

// ──────────────────────────────────────────────────────────────
// cosineSimilarity computes the cosine similarity between two vectors.
// WHY cosine? It measures the angle between vectors, not magnitude.
// A long complaint and a short complaint about the same topic
// will have high cosine similarity despite different lengths.
// ──────────────────────────────────────────────────────────────
func cosineSimilarity(a, b []float32) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 0
	}

	var dotProduct, normA, normB float64
	for i := range a {
		dotProduct += float64(a[i]) * float64(b[i])
		normA += float64(a[i]) * float64(a[i])
		normB += float64(b[i]) * float64(b[i])
	}

	denominator := math.Sqrt(normA) * math.Sqrt(normB)
	if denominator == 0 {
		return 0
	}

	return dotProduct / denominator
}

// ============================================================
// Factory Function
// ============================================================

// ──────────────────────────────────────────────────────────────
// NewVectorStore creates the appropriate vector store.
// WHY a factory? It tries Qdrant first, and if the connection
// fails, silently falls back to in-memory. This means a developer
// can run `go run main.go` without Docker and everything works.
// ──────────────────────────────────────────────────────────────
func NewVectorStore(qdrantURL, collectionName string, embeddingDim int) VectorStore {
	// Try connecting to Qdrant
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(qdrantURL + "/collections")
	if err == nil {
		resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			log.Printf("[VectorStore] Connected to Qdrant at %s", qdrantURL)
			qdrant := NewQdrantClient(qdrantURL, collectionName, embeddingDim)
			if err := qdrant.CreateCollection(); err != nil {
				log.Printf("[VectorStore] Warning: could not create collection: %v", err)
			}
			return qdrant
		}
	}

	// Fallback to in-memory
	log.Printf("[VectorStore] Qdrant not available at %s, using in-memory fallback", qdrantURL)
	return NewInMemoryVectorStore()
}
