package handler

// ============================================================
// Search Handler — Semantic Search over Processed Transcripts
// ============================================================
// WHY semantic search? At Jio, managers do not always know the
// exact words customers used. A manager searching for "customer
// upset about internet charges" should find transcripts about
// "billing complaint for data usage" — even though they share
// no exact words. Vector similarity makes this possible.
//
// The search flow:
// 1. Convert query text to embedding vector
// 2. Search vector store for similar vectors
// 3. Enrich results with processed transcript data
// 4. Return ranked results
// ============================================================

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"vaanisutra/internal/ai"
	"vaanisutra/internal/model"
	"vaanisutra/internal/pipeline"
	"vaanisutra/internal/vectordb"
)

// SearchHandler handles semantic search endpoints.
type SearchHandler struct {
	vectorStore vectordb.VectorStore
	aiClient    *ai.AIClient
	pipeline    *pipeline.Pipeline
}

// NewSearchHandler creates a search handler.
func NewSearchHandler(vs vectordb.VectorStore, p *pipeline.Pipeline) *SearchHandler {
	return &SearchHandler{
		vectorStore: vs,
		aiClient:    ai.NewAIClient(""), // Always simulated for search embeddings
		pipeline:    p,
	}
}

// ──────────────────────────────────────────────────────────────
// HandleSearch performs semantic search over processed transcripts.
//
// WHY convert query to embedding? The query "angry about billing"
// becomes a vector in the same space as transcript embeddings.
// Cosine similarity between the query vector and each stored
// vector tells us how semantically similar they are.
//
// The TopK parameter limits results (default 5). MinScore filters
// out low-relevance matches (default 0.0). SentimentFilter lets
// managers search only Negative or Positive transcripts.
// ──────────────────────────────────────────────────────────────
func (h *SearchHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	var req model.SearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid request body: " + err.Error(),
		})
		return
	}

	if req.Query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Query is required",
		})
		return
	}

	// Defaults
	if req.TopK <= 0 {
		req.TopK = 5
	}
	if req.MinScore < 0 {
		req.MinScore = 0.0
	}

	// Generate embedding for the search query
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	queryVector, err := h.aiClient.GenerateEmbedding(ctx, req.Query, 256)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "Failed to generate query embedding: " + err.Error(),
		})
		return
	}

	// Search the vector store
	hits, err := h.vectorStore.Search(queryVector, req.TopK, req.MinScore)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "Vector search failed: " + err.Error(),
		})
		return
	}

	// Convert hits to search results with enriched data
	var results []model.SearchResult
	for _, hit := range hits {
		result := model.SearchResult{
			TranscriptID: getString(hit.Payload, "transcript_id"),
			Summary:      getString(hit.Payload, "summary"),
			Sentiment:    getString(hit.Payload, "sentiment"),
			Score:        hit.Score,
			CallerID:     getString(hit.Payload, "caller_id"),
			AgentID:      getString(hit.Payload, "agent_id"),
		}

		// Parse keywords from payload
		if kw, ok := hit.Payload["keywords"]; ok {
			if kwSlice, ok := kw.([]interface{}); ok {
				for _, k := range kwSlice {
					if s, ok := k.(string); ok {
						result.Keywords = append(result.Keywords, s)
					}
				}
			}
		}

		// Parse timestamp from payload
		if ts, ok := hit.Payload["timestamp"]; ok {
			if tsStr, ok := ts.(string); ok {
				if t, err := time.Parse(time.RFC3339, tsStr); err == nil {
					result.Timestamp = t
				}
			}
		}

		// Apply sentiment filter if specified
		if req.SentimentFilter != "" && result.Sentiment != req.SentimentFilter {
			continue
		}

		results = append(results, result)
	}

	log.Printf("[Search] Query: %q, Results: %d", req.Query, len(results))

	writeJSON(w, http.StatusOK, model.SearchResponse{
		Query:   req.Query,
		Results: results,
		Total:   len(results),
	})
}

// getString safely extracts a string from a payload map.
func getString(payload map[string]interface{}, key string) string {
	if val, ok := payload[key]; ok {
		if s, ok := val.(string); ok {
			return s
		}
	}
	return ""
}
