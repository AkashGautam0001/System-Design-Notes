package handler

// ============================================================
// Transcript Handler — HTTP Endpoints for Pipeline Interaction
// ============================================================
// These handlers are the REST API surface of VaaniSutra. They
// convert HTTP requests into pipeline operations and return
// appropriate responses.
//
// KEY DESIGN DECISION: HandleSubmit returns 202 Accepted, not
// 200 OK. WHY? Because the transcript is queued for async
// processing, not processed immediately. The caller should
// poll /api/transcripts/{id} or check /api/pipeline/status
// to know when processing is complete.
//
// At Jio, this async pattern is critical. Synchronous processing
// would mean the caller waits 200ms+ per transcript, and during
// peak hours (cricket match intermissions!), the API would be
// overwhelmed.
// ============================================================

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"vaanisutra/internal/model"
	"vaanisutra/internal/pipeline"
)

// TranscriptHandler handles transcript-related HTTP endpoints.
type TranscriptHandler struct {
	pipeline *pipeline.Pipeline
}

// NewTranscriptHandler creates a new handler with a pipeline reference.
func NewTranscriptHandler(p *pipeline.Pipeline) *TranscriptHandler {
	return &TranscriptHandler{pipeline: p}
}

// ──────────────────────────────────────────────────────────────
// HandleSubmit processes a single transcript submission.
// Returns 202 Accepted with the transcript ID.
//
// WHY 202? HTTP 202 means "I received your request and will
// process it later." This is the correct status for async
// operations. 200 would imply the processing is already done.
// ──────────────────────────────────────────────────────────────
func (h *TranscriptHandler) HandleSubmit(w http.ResponseWriter, r *http.Request) {
	var req model.SubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid request body: " + err.Error(),
		})
		return
	}

	// Validate required fields
	if req.Content == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Content is required",
		})
		return
	}

	// Create transcript with generated ID
	transcript := &model.Transcript{
		ID:        generateID(),
		CallerID:  req.CallerID,
		AgentID:   req.AgentID,
		Content:   req.Content,
		Duration:  req.Duration,
		Timestamp: time.Now(),
		Language:  defaultIfEmpty(req.Language, "en"),
	}

	// Submit to pipeline
	if err := h.pipeline.Submit(transcript); err != nil {
		// Pipeline queue is full — backpressure!
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"error":  "Pipeline queue is full, try again later",
			"detail": err.Error(),
		})
		return
	}

	log.Printf("[Handler] Submitted transcript %s for processing", transcript.ID)

	writeJSON(w, http.StatusAccepted, model.SubmitResponse{
		TranscriptID: transcript.ID,
		Status:       "queued",
	})
}

// ──────────────────────────────────────────────────────────────
// HandleBatchSubmit processes multiple transcripts at once.
// WHY batch endpoint? Jio's systems generate transcripts in
// bursts. Submitting 100 transcripts in one HTTP call instead
// of 100 separate calls reduces network overhead by ~99%.
// ──────────────────────────────────────────────────────────────
func (h *TranscriptHandler) HandleBatchSubmit(w http.ResponseWriter, r *http.Request) {
	var req model.BatchSubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid request body: " + err.Error(),
		})
		return
	}

	if len(req.Transcripts) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "At least one transcript is required",
		})
		return
	}

	// Submit each transcript
	var responses []model.SubmitResponse
	for _, sub := range req.Transcripts {
		transcript := &model.Transcript{
			ID:        generateID(),
			CallerID:  sub.CallerID,
			AgentID:   sub.AgentID,
			Content:   sub.Content,
			Duration:  sub.Duration,
			Timestamp: time.Now(),
			Language:  defaultIfEmpty(sub.Language, "en"),
		}

		status := "queued"
		if err := h.pipeline.Submit(transcript); err != nil {
			status = "queue_full"
		}

		responses = append(responses, model.SubmitResponse{
			TranscriptID: transcript.ID,
			Status:       status,
		})
	}

	log.Printf("[Handler] Batch submitted %d transcripts", len(req.Transcripts))

	writeJSON(w, http.StatusAccepted, map[string]interface{}{
		"submitted": len(responses),
		"results":   responses,
	})
}

// ──────────────────────────────────────────────────────────────
// HandleGetTranscript retrieves a processed transcript by ID.
// ──────────────────────────────────────────────────────────────
func (h *TranscriptHandler) HandleGetTranscript(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Transcript ID is required",
		})
		return
	}

	result, found := h.pipeline.GetResult(id)
	if !found {
		// Could be still processing or never submitted
		writeJSON(w, http.StatusNotFound, map[string]string{
			"error":  "Transcript not found",
			"detail": "It may still be processing. Check /api/pipeline/status",
			"id":     id,
		})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

// ──────────────────────────────────────────────────────────────
// HandleListTranscripts returns all processed transcripts.
// Supports optional sentiment_filter query parameter.
// ──────────────────────────────────────────────────────────────
func (h *TranscriptHandler) HandleListTranscripts(w http.ResponseWriter, r *http.Request) {
	sentimentFilter := r.URL.Query().Get("sentiment")
	allResults := h.pipeline.GetAllResults()

	// Apply sentiment filter if provided
	var filtered []*model.ProcessedTranscript
	for _, result := range allResults {
		if sentimentFilter == "" || result.Sentiment.Label == sentimentFilter {
			filtered = append(filtered, result)
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"total":       len(filtered),
		"transcripts": filtered,
		"filter":      sentimentFilter,
	})
}

// ──────────────────────────────────────────────────────────────
// HandlePipelineStatus returns real-time pipeline metrics.
// WHY expose metrics? Jio's ops team monitors these in Grafana.
// If queued keeps growing but completed stays flat, something
// is wrong (workers crashed, AI service down, etc.).
// ──────────────────────────────────────────────────────────────
func (h *TranscriptHandler) HandlePipelineStatus(w http.ResponseWriter, r *http.Request) {
	status := h.pipeline.Status()
	writeJSON(w, http.StatusOK, status)
}

// ──────────────────────────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────────────────────────

// writeJSON sends a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("[Handler] Error encoding response: %v", err)
	}
}

// generateID creates a unique transcript ID using timestamp + random suffix.
func generateID() string {
	return time.Now().Format("20060102150405") + "-" + randomHex(6)
}

// randomHex generates a random hex string of the given length.
func randomHex(n int) string {
	// Use time-based approach for simplicity (no crypto/rand import needed)
	const chars = "0123456789abcdef"
	now := time.Now().UnixNano()
	result := make([]byte, n)
	for i := range result {
		result[i] = chars[(now>>(i*4))&0xf]
		now = now*6364136223846793005 + 1442695040888963407 // LCG
	}
	return string(result)
}

// defaultIfEmpty returns the default value if s is empty.
func defaultIfEmpty(s, def string) string {
	if s == "" {
		return def
	}
	return s
}
