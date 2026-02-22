// ============================================================
//  PACKAGE model — Search & RAG Data Structures
// ============================================================
//  WHY: Search and Ask are the two core operations of GyaanKhoj.
//  Search returns relevant document chunks (like Google results).
//  Ask goes further — it feeds those chunks to an LLM and returns
//  a synthesized answer with citations.
//
//  At TCS, the difference matters: a junior developer might want
//  search results to browse. A project manager wants a direct
//  answer: "What is TCS's policy on open-source licenses?"
//  Both use the same retrieval pipeline; Ask adds generation.
// ============================================================

package model

// ──────────────────────────────────────────────────────────────
// Search — semantic similarity search across the knowledge base.
// ──────────────────────────────────────────────────────────────

// SearchRequest is the JSON body for a semantic search query.
type SearchRequest struct {
	Query    string  `json:"query"`
	TopK     int     `json:"top_k,omitempty"`
	MinScore float64 `json:"min_score,omitempty"`
	Category string  `json:"category,omitempty"`
}

// SearchResult represents a single search hit with relevance score.
type SearchResult struct {
	ChunkText      string  `json:"chunk_text"`
	DocumentTitle  string  `json:"document_title"`
	DocumentSource string  `json:"document_source"`
	Score          float64 `json:"score"`
	DocumentID     string  `json:"document_id"`
}

// ──────────────────────────────────────────────────────────────
// Ask — full RAG pipeline: question → answer with citations.
// WHY separate from Search? Ask is more expensive (requires LLM
// generation) and returns a different shape (prose answer vs list
// of results). At TCS scale, the billing team tracks LLM costs
// separately from vector search costs.
// ──────────────────────────────────────────────────────────────

// AskRequest is the JSON body for a RAG question.
type AskRequest struct {
	Question string `json:"question"`
	TopK     int    `json:"top_k,omitempty"`
}

// AskResponse contains the generated answer and its source citations.
type AskResponse struct {
	Answer         string    `json:"answer"`
	Citations      []Citation `json:"citations"`
	Confidence     float64   `json:"confidence"`
	ProcessingTime string    `json:"processing_time"`
}

// Citation traces an answer back to its source document.
// WHY citations? TCS compliance requires every AI-generated answer
// to be traceable to an approved source document. Without citations,
// the legal team will not approve deployment.
type Citation struct {
	DocumentTitle string  `json:"document_title"`
	ChunkText     string  `json:"chunk_text"`
	Score         float64 `json:"score"`
	Source        string  `json:"source"`
}
