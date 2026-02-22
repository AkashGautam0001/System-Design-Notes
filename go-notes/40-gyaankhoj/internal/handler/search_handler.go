// ============================================================
//  Search Handlers — Semantic Search & RAG Query
// ============================================================
//  WHY: These are the two flagship endpoints of GyaanKhoj.
//  /api/search returns ranked document chunks (like Google results).
//  /api/ask goes further — it feeds those chunks to an LLM and
//  returns a synthesized answer with citations (like ChatGPT
//  with your own data).
//
//  At TCS, 80% of queries use /api/ask (employees want answers,
//  not links). The remaining 20% use /api/search when they need
//  to browse related documents for research.
// ============================================================

package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"gyaankhoj/internal/model"
)

// ──────────────────────────────────────────────────────────────
// SearchHandler manages search and RAG endpoints.
// ──────────────────────────────────────────────────────────────

// SearchHandler handles semantic search and RAG queries.
type SearchHandler struct {
	ragService *RAGService
}

// NewSearchHandler creates a new SearchHandler.
func NewSearchHandler(rag *RAGService) *SearchHandler {
	return &SearchHandler{ragService: rag}
}

// ──────────────────────────────────────────────────────────────
// HandleSearch — POST /api/search
// Performs semantic similarity search.
// INPUT: { "query": "deployment best practices", "top_k": 5 }
// OUTPUT: Ranked list of document chunks with similarity scores.
//
// FLOW:
//   1. Parse search request from JSON body
//   2. Call RAGService.Search (embed → vector search → rank)
//   3. Return results sorted by relevance score
//
// WHY POST instead of GET? The request body can be complex (query
// text, filters, parameters). GET has URL length limits and cannot
// carry a JSON body reliably across all proxies.
// ──────────────────────────────────────────────────────────────

// HandleSearch processes a semantic search request.
func (h *SearchHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	var req model.SearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	if req.Query == "" {
		respondError(w, http.StatusBadRequest, "query is required")
		return
	}

	results, err := h.ragService.Search(r.Context(), req.Query, req.TopK, req.MinScore)
	if err != nil {
		log.Printf("[ERROR] search failed: %v", err)
		respondError(w, http.StatusInternalServerError, "search failed")
		return
	}

	log.Printf("[SEARCH] query=%q results=%d", req.Query, len(results))

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"query":   req.Query,
		"results": results,
		"total":   len(results),
	})
}

// ──────────────────────────────────────────────────────────────
// HandleAsk — POST /api/ask
// Full RAG pipeline: question → retrieve → augment → generate.
// INPUT: { "question": "What is the code review policy?", "top_k": 5 }
// OUTPUT: Generated answer with citations and confidence score.
//
// This is the endpoint that makes GyaanKhoj magical — type a
// natural language question, get a concise answer with links
// to the source documents. No more searching through 50 wiki
// pages to find one paragraph.
//
// LATENCY BREAKDOWN (production):
//   - Embed query:    ~50ms  (Gemini API call)
//   - Vector search:  ~10ms  (Qdrant HNSW)
//   - LLM generation: ~500ms (Gemini API call)
//   - Total:          ~560ms (sub-second!)
//
// WHY track processing time? TCS SRE dashboards monitor P50/P99
// latencies. If RAG queries suddenly take 5 seconds, something
// is wrong — maybe the vector index needs rebuilding or the LLM
// is rate-limited.
// ──────────────────────────────────────────────────────────────

// HandleAsk processes a RAG question and returns an answer with citations.
func (h *SearchHandler) HandleAsk(w http.ResponseWriter, r *http.Request) {
	var req model.AskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	if req.Question == "" {
		respondError(w, http.StatusBadRequest, "question is required")
		return
	}

	response, err := h.ragService.Ask(r.Context(), req.Question, req.TopK)
	if err != nil {
		log.Printf("[ERROR] ask failed: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to generate answer")
		return
	}

	log.Printf("[ASK] question=%q citations=%d confidence=%.2f time=%s",
		req.Question, len(response.Citations), response.Confidence, response.ProcessingTime)

	respondJSON(w, http.StatusOK, response)
}

// ──────────────────────────────────────────────────────────────
// JSON response helpers.
// WHY centralize? Consistent response format across all endpoints.
// Every error includes a JSON body (not plain text) so that the
// TCS frontend team can always parse the response.
// ──────────────────────────────────────────────────────────────

// respondJSON writes a JSON response with the given status code.
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("[ERROR] encoding JSON response: %v", err)
	}
}

// respondError writes a JSON error response.
func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}
