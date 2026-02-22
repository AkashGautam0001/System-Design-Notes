package model

// ============================================================
// Data Models — Transcript & Processing Results
// ============================================================
// These models represent the data flowing through VaaniSutra's
// pipeline. A raw Transcript enters, gets processed through
// multiple AI stages, and emerges as a ProcessedTranscript
// with sentiment, entities, summary, keywords, and a vector
// embedding for semantic search.
//
// At Jio's scale, these models are serialized millions of
// times per day — keeping them lean matters.
// ============================================================

import (
	"time"
)

// ──────────────────────────────────────────────────────────────
// Transcript represents a raw call center transcript.
// WHY separate from ProcessedTranscript? The raw transcript is
// immutable — it's the ground truth. Processing results are
// derived data that can be re-generated if the AI model improves.
// ──────────────────────────────────────────────────────────────
type Transcript struct {
	ID        string    `json:"id"`
	CallerID  string    `json:"caller_id"`
	AgentID   string    `json:"agent_id"`
	Content   string    `json:"content"`
	Duration  int       `json:"duration"`   // Duration in seconds
	Timestamp time.Time `json:"timestamp"`
	Language  string    `json:"language"`
}

// ──────────────────────────────────────────────────────────────
// ProcessedTranscript holds the AI analysis results.
// WHY store all results together? When a Jio manager searches
// for "angry customers about billing", they want the sentiment,
// entities, AND summary in one response — not three separate
// database queries.
// ──────────────────────────────────────────────────────────────
type ProcessedTranscript struct {
	ID                 string          `json:"id"`
	TranscriptID       string          `json:"transcript_id"`
	Sentiment          SentimentResult `json:"sentiment"`
	Entities           []Entity        `json:"entities"`
	Summary            string          `json:"summary"`
	Keywords           []string        `json:"keywords"`
	Vector             []float32       `json:"vector,omitempty"`
	ProcessedAt        time.Time       `json:"processed_at"`
	ProcessingDuration time.Duration   `json:"processing_duration_ms"`

	// Original transcript fields for convenience
	CallerID  string    `json:"caller_id"`
	AgentID   string    `json:"agent_id"`
	Content   string    `json:"content"`
	Duration  int       `json:"duration"`
	Timestamp time.Time `json:"timestamp"`
	Language  string    `json:"language"`
}

// ──────────────────────────────────────────────────────────────
// SentimentResult captures the emotional tone of a transcript.
// WHY Score AND Label? The score (-1 to 1) enables analytics
// (average sentiment per agent), while the label (Positive/
// Negative/Neutral) enables filtering and quick scanning.
// ──────────────────────────────────────────────────────────────
type SentimentResult struct {
	Score      float64 `json:"score"`      // -1.0 (very negative) to 1.0 (very positive)
	Label      string  `json:"label"`      // "Positive", "Negative", or "Neutral"
	Confidence float64 `json:"confidence"` // 0.0 to 1.0
}

// ──────────────────────────────────────────────────────────────
// Entity represents a named entity extracted from the transcript.
// WHY track positions? So the Jio dashboard can highlight
// entities in the original transcript text — like how Google
// bolds search terms in results.
// ──────────────────────────────────────────────────────────────
type Entity struct {
	Text     string `json:"text"`
	Type     string `json:"type"`      // Person, Location, Product, Issue, Plan
	StartPos int    `json:"start_pos"`
	EndPos   int    `json:"end_pos"`
}

// ──────────────────────────────────────────────────────────────
// API Request / Response Models
// ──────────────────────────────────────────────────────────────

// SubmitRequest is the payload for submitting a transcript.
type SubmitRequest struct {
	CallerID string `json:"caller_id"`
	AgentID  string `json:"agent_id"`
	Content  string `json:"content"`
	Duration int    `json:"duration"`
	Language string `json:"language"`
}

// BatchSubmitRequest allows submitting multiple transcripts at once.
// WHY batch? Jio's systems generate transcripts in bursts (shift
// changes, call spikes during cricket matches). Batch submission
// reduces HTTP overhead.
type BatchSubmitRequest struct {
	Transcripts []SubmitRequest `json:"transcripts"`
}

// SubmitResponse tells the caller what happened to their submission.
type SubmitResponse struct {
	TranscriptID string `json:"transcript_id"`
	Status       string `json:"status"` // "queued", "processing", "completed", "queue_full"
}

// PipelineStatus provides real-time pipeline health metrics.
// WHY expose this? Jio's ops team uses these metrics in Grafana
// dashboards to monitor pipeline health and trigger alerts when
// the failed count spikes.
type PipelineStatus struct {
	Queued      int64         `json:"queued"`
	Processing  int64         `json:"processing"`
	Completed   int64         `json:"completed"`
	Failed      int64         `json:"failed"`
	WorkerCount int           `json:"worker_count"`
	Uptime      time.Duration `json:"uptime_seconds"`
}
