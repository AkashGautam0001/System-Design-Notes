package model

// ============================================================
// Search Models — Semantic Search over Processed Transcripts
// ============================================================
// WHY semantic search? A Jio manager searching for "customer
// frustrated with data speed" should find transcripts about
// "slow internet", "buffering issues", "bandwidth complaints"
// — even if those exact words are not in the query. Vector
// similarity makes this possible.
// ============================================================

import "time"

// SearchRequest is the payload for semantic search.
type SearchRequest struct {
	Query           string  `json:"query"`
	TopK            int     `json:"top_k"`
	MinScore        float64 `json:"min_score"`
	SentimentFilter string  `json:"sentiment_filter"` // "Positive", "Negative", "Neutral", or "" for all
}

// SearchResult is a single matching transcript from the search.
type SearchResult struct {
	TranscriptID string    `json:"transcript_id"`
	Summary      string    `json:"summary"`
	Sentiment    string    `json:"sentiment"`
	Score        float64   `json:"score"` // Similarity score (0.0 to 1.0)
	CallerID     string    `json:"caller_id"`
	AgentID      string    `json:"agent_id"`
	Keywords     []string  `json:"keywords"`
	Timestamp    time.Time `json:"timestamp"`
}

// SearchResponse wraps the search results with metadata.
type SearchResponse struct {
	Query   string         `json:"query"`
	Results []SearchResult `json:"results"`
	Total   int            `json:"total"`
}
