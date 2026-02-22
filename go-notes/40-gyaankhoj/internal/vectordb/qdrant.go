// ============================================================
//  PACKAGE vectordb — Qdrant Vector Database Client
// ============================================================
//  WHY: Vector databases are the backbone of RAG systems. Unlike
//  traditional databases that search by exact keywords, vector DBs
//  search by *meaning* — finding documents that are semantically
//  similar to a query even when they share no common words.
//
//  At TCS, the AI platform team evaluated Pinecone, Weaviate,
//  Milvus, and Qdrant. They chose Qdrant for its Rust performance,
//  simple REST API, and Docker-friendly deployment.
//
//  FALLBACK STRATEGY: Not every developer has Docker/Qdrant running.
//  The InMemoryVectorStore provides the same interface using
//  brute-force cosine similarity — perfect for development and
//  testing. In production, Qdrant handles millions of vectors
//  efficiently using HNSW indexing.
// ============================================================

package vectordb

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"sort"
	"sync"
	"time"
)

// ──────────────────────────────────────────────────────────────
// VectorStore — the interface both Qdrant and InMemory implement.
// WHY an interface? So that main.go can call NewVectorStore()
// and get whichever backend is available. The handler code never
// knows (or cares) which implementation is running.
// ──────────────────────────────────────────────────────────────

// VectorStore defines the operations for storing and searching vectors.
type VectorStore interface {
	Upsert(ctx context.Context, points []Point) error
	Search(ctx context.Context, vector []float32, topK int, minScore float64) ([]ScoredPoint, error)
	Delete(ctx context.Context, ids []string) error
}

// Point represents a vector with metadata payload.
type Point struct {
	ID      string                 `json:"id"`
	Vector  []float32              `json:"vector"`
	Payload map[string]interface{} `json:"payload"`
}

// ScoredPoint is a Point with a similarity score from search.
type ScoredPoint struct {
	Point
	Score float64 `json:"score"`
}

// ──────────────────────────────────────────────────────────────
// NewVectorStore — factory that tries Qdrant first, falls back
// to in-memory.
// WHY this pattern? At TCS, production always has Qdrant running.
// But during development or CI/CD, Qdrant might not be available.
// The fallback ensures the app ALWAYS starts — no excuses.
// ──────────────────────────────────────────────────────────────

// NewVectorStore creates a VectorStore. Tries Qdrant first, falls
// back to InMemoryVectorStore if Qdrant is unreachable.
func NewVectorStore(qdrantURL, collection string, dim int) VectorStore {
	// Try Qdrant first.
	qdrant, err := NewQdrantClient(qdrantURL, collection, dim)
	if err == nil {
		fmt.Printf("[VectorDB] Connected to Qdrant at %s\n", qdrantURL)
		fmt.Printf("[VectorDB] Collection: %s (dim=%d)\n", collection, dim)
		return qdrant
	}

	// Fallback to in-memory.
	fmt.Println("[VectorDB] ⚠ Qdrant unavailable — using in-memory vector store")
	fmt.Printf("[VectorDB] Reason: %v\n", err)
	fmt.Println("[VectorDB] In-memory store is great for development but NOT for production")
	fmt.Println("[VectorDB] Start Qdrant: docker run -p 6333:6333 qdrant/qdrant")
	return NewInMemoryVectorStore()
}

// ──────────────────────────────────────────────────────────────
// QdrantClient — REST client for Qdrant vector database.
//
// Qdrant API overview:
//   PUT    /collections/{name}         — create collection
//   PUT    /collections/{name}/points  — upsert vectors
//   POST   /collections/{name}/points/search — similarity search
//   POST   /collections/{name}/points/delete — delete vectors
//
// WHY REST instead of gRPC? REST is simpler to debug (curl),
// has no code generation step, and Qdrant's REST performance
// is excellent for typical workloads (< 10K QPS).
// ──────────────────────────────────────────────────────────────

// QdrantClient communicates with Qdrant via REST API.
type QdrantClient struct {
	baseURL        string
	httpClient     *http.Client
	collectionName string
}

// NewQdrantClient creates a client and ensures the collection exists.
func NewQdrantClient(baseURL, collection string, dim int) (*QdrantClient, error) {
	client := &QdrantClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		collectionName: collection,
	}

	// Health check — is Qdrant running?
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+"/collections", nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	resp, err := client.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("connecting to Qdrant at %s: %w", baseURL, err)
	}
	resp.Body.Close()

	// Create collection if it does not exist.
	if err := client.createCollection(dim); err != nil {
		return nil, fmt.Errorf("creating collection: %w", err)
	}

	return client, nil
}

// createCollection creates the vector collection with cosine distance.
// WHY cosine? For normalized vectors (unit length), cosine similarity
// equals the dot product. It measures the angle between vectors,
// making it independent of vector magnitude — ideal for text embeddings.
func (c *QdrantClient) createCollection(dim int) error {
	body := map[string]interface{}{
		"vectors": map[string]interface{}{
			"size":     dim,
			"distance": "Cosine",
		},
	}

	data, err := json.Marshal(body)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/collections/%s", c.baseURL, c.collectionName)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, url, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// 409 Conflict means collection already exists — that is fine.
	if resp.StatusCode == http.StatusConflict || resp.StatusCode == http.StatusOK {
		return nil
	}

	// Read error response for debugging.
	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("create collection returned %d: %s", resp.StatusCode, string(respBody))
}

// Upsert inserts or updates vectors in the collection.
// WHY "upsert"? If a document is re-indexed (content changed), we want
// to update existing vectors, not create duplicates. Upsert = update
// if exists, insert if new.
func (c *QdrantClient) Upsert(ctx context.Context, points []Point) error {
	// Convert to Qdrant format.
	qdrantPoints := make([]map[string]interface{}, len(points))
	for i, p := range points {
		qdrantPoints[i] = map[string]interface{}{
			"id":      p.ID,
			"vector":  p.Vector,
			"payload": p.Payload,
		}
	}

	body := map[string]interface{}{
		"points": qdrantPoints,
	}

	data, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshaling points: %w", err)
	}

	url := fmt.Sprintf("%s/collections/%s/points", c.baseURL, c.collectionName)
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, url, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("upserting to Qdrant: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("upsert returned %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// Search finds the most similar vectors to the query vector.
// WHY top-K + minScore? Top-K limits the number of results. MinScore
// filters out low-quality matches. Together, they ensure we only
// return relevant, high-confidence results.
func (c *QdrantClient) Search(ctx context.Context, vector []float32, topK int, minScore float64) ([]ScoredPoint, error) {
	body := map[string]interface{}{
		"vector":         vector,
		"limit":          topK,
		"with_payload":   true,
		"score_threshold": minScore,
	}

	data, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshaling search request: %w", err)
	}

	url := fmt.Sprintf("%s/collections/%s/points/search", c.baseURL, c.collectionName)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("searching Qdrant: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("search returned %d: %s", resp.StatusCode, string(respBody))
	}

	// Parse Qdrant search response.
	var result struct {
		Result []struct {
			ID      interface{}            `json:"id"`
			Score   float64                `json:"score"`
			Payload map[string]interface{} `json:"payload"`
			Vector  []float32              `json:"vector"`
		} `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding search response: %w", err)
	}

	scored := make([]ScoredPoint, len(result.Result))
	for i, r := range result.Result {
		scored[i] = ScoredPoint{
			Point: Point{
				ID:      fmt.Sprintf("%v", r.ID),
				Vector:  r.Vector,
				Payload: r.Payload,
			},
			Score: r.Score,
		}
	}

	return scored, nil
}

// Delete removes vectors by their IDs.
// WHY delete? When a TCS document is updated or retired, its old
// vectors must be removed to prevent stale search results.
func (c *QdrantClient) Delete(ctx context.Context, ids []string) error {
	body := map[string]interface{}{
		"points": ids,
	}

	data, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshaling delete request: %w", err)
	}

	url := fmt.Sprintf("%s/collections/%s/points/delete", c.baseURL, c.collectionName)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("deleting from Qdrant: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete returned %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// ──────────────────────────────────────────────────────────────
// InMemoryVectorStore — brute-force fallback when Qdrant is
// unavailable.
//
// WHY brute-force? For small datasets (< 10K vectors), scanning
// every vector and computing cosine similarity is fast enough.
// TCS developers can run GyaanKhoj on their laptops without
// Docker. The same interface (VectorStore) means zero code
// changes when switching to Qdrant in production.
//
// LIMITATION: O(n) search. With 1 million vectors, each search
// scans all of them. Qdrant's HNSW index makes this O(log n).
// ──────────────────────────────────────────────────────────────

// InMemoryVectorStore stores vectors in a slice and uses brute-force search.
type InMemoryVectorStore struct {
	mu     sync.RWMutex
	points []Point
}

// NewInMemoryVectorStore creates an empty in-memory vector store.
func NewInMemoryVectorStore() *InMemoryVectorStore {
	return &InMemoryVectorStore{
		points: make([]Point, 0, 1000),
	}
}

// Upsert adds or updates points in the in-memory store.
func (s *InMemoryVectorStore) Upsert(_ context.Context, points []Point) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, newPoint := range points {
		found := false
		for i, existing := range s.points {
			if existing.ID == newPoint.ID {
				s.points[i] = newPoint
				found = true
				break
			}
		}
		if !found {
			s.points = append(s.points, newPoint)
		}
	}

	return nil
}

// Search performs brute-force cosine similarity search.
// WHY cosine similarity? It measures the angle between two vectors,
// not their magnitude. Two documents about "Go microservices" will
// have similar angles regardless of document length.
//
// Formula: cos(A, B) = (A · B) / (||A|| * ||B||)
// Range: -1 (opposite) to +1 (identical direction)
func (s *InMemoryVectorStore) Search(_ context.Context, vector []float32, topK int, minScore float64) ([]ScoredPoint, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if len(s.points) == 0 {
		return nil, nil
	}

	// Compute cosine similarity for every stored point.
	scored := make([]ScoredPoint, 0, len(s.points))
	for _, p := range s.points {
		score := cosineSimilarity(vector, p.Vector)
		if score >= minScore {
			scored = append(scored, ScoredPoint{
				Point: p,
				Score: score,
			})
		}
	}

	// Sort by score descending — most relevant first.
	sort.Slice(scored, func(i, j int) bool {
		return scored[i].Score > scored[j].Score
	})

	// Limit to top-K results.
	if len(scored) > topK {
		scored = scored[:topK]
	}

	return scored, nil
}

// Delete removes points by ID from the in-memory store.
func (s *InMemoryVectorStore) Delete(_ context.Context, ids []string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Build a set of IDs to delete for O(1) lookup.
	deleteSet := make(map[string]bool, len(ids))
	for _, id := range ids {
		deleteSet[id] = true
	}

	// Filter out deleted points — rebuild the slice.
	// WHY rebuild instead of in-place delete? Avoids index shifting
	// bugs and is cleaner. For < 10K points, the allocation is trivial.
	filtered := make([]Point, 0, len(s.points))
	for _, p := range s.points {
		if !deleteSet[p.ID] {
			filtered = append(filtered, p)
		}
	}
	s.points = filtered

	return nil
}

// ──────────────────────────────────────────────────────────────
// cosineSimilarity computes the cosine of the angle between
// two vectors.
//
// MATH REFRESHER:
//   cos(A, B) = sum(Ai * Bi) / (sqrt(sum(Ai^2)) * sqrt(sum(Bi^2)))
//
// For unit vectors (already normalized), this simplifies to just
// the dot product: cos(A, B) = sum(Ai * Bi)
// Our embeddings are normalized, but we compute the full formula
// for safety — defensive coding.
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
