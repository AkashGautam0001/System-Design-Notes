// ============================================================
//  Package handler — HTTP Handlers for Image Analysis
// ============================================================
//  WHY SEPARATE HANDLERS?
//  Handlers are the "reception desk" of ChitranScan. They speak
//  HTTP (parse forms, validate input, write JSON) but know
//  nothing about AI internals. This separation means we can
//  swap Gemini for GPT-4V without touching a single handler.
//
//  BigBasket analogy: The warehouse reception accepts incoming
//  crates, checks they're properly labelled, and routes them
//  to the right QC station. Reception doesn't inspect produce
//  — they just make sure the paperwork is in order.
//
//  KEY PATTERN — Concurrent Batch Analysis:
//  When BigBasket receives a truck with 50 crates, they don't
//  inspect them one-by-one. They open 5 QC stations in parallel
//  (semaphore = 5), route crates to available stations, and
//  collect all results when done. That's exactly what
//  HandleBatchAnalyze does with goroutines.
// ============================================================

package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"chitranscan/internal/ai"
	"chitranscan/internal/config"
	"chitranscan/internal/model"
)

// maxConcurrentAnalyses limits how many AI calls run in parallel.
// WHY 5? Gemini's free tier has rate limits. Even with a paid
// plan, unbounded concurrency risks 429 (rate-limit) errors.
// The semaphore pattern (buffered channel) enforces this cap.
const maxConcurrentAnalyses = 5

// AnalysisHandler holds dependencies injected from main.go.
// WHY struct with methods (not bare functions)?
// Methods on a struct can access shared state (the AI client,
// the results store) without global variables. This is Go's
// version of dependency injection — simple and explicit.
type AnalysisHandler struct {
	gemini  *ai.GeminiClient
	cfg     *config.Config
	// ── In-memory results store (demo only) ──
	// WHY sync.RWMutex? Multiple goroutines may read results
	// concurrently (GET /analysis/{id}) while batch analysis
	// writes new ones. RWMutex allows concurrent reads but
	// exclusive writes — exactly what we need.
	mu      sync.RWMutex
	results map[string]*model.AnalysisResult
}

// NewAnalysisHandler creates a handler with all dependencies.
func NewAnalysisHandler(gemini *ai.GeminiClient, cfg *config.Config) *AnalysisHandler {
	return &AnalysisHandler{
		gemini:  gemini,
		cfg:     cfg,
		results: make(map[string]*model.AnalysisResult),
	}
}

// ──────────────────────────────────────────────────────────────
// Health Check
// ──────────────────────────────────────────────────────────────

// HandleHealth returns service status. Load balancers (like
// BigBasket's AWS ALB) ping this every 10 seconds.
func (h *AnalysisHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "healthy",
		"service":   "chitranscan",
		"simulated": h.gemini.IsSimulated(),
		"timestamp": time.Now().UTC(),
	})
}

// ──────────────────────────────────────────────────────────────
// Single Image Analysis
// ──────────────────────────────────────────────────────────────

// HandleAnalyze processes a single image upload and returns
// analysis results.
//
// Request: POST /api/analyze
//   Content-Type: multipart/form-data
//   Fields:
//     image         — the image file (required)
//     analysis_type — "quality", "label", or "categorize" (default: "quality")
//
// WHY multipart/form-data? It's the standard way to upload
// binary files over HTTP. JSON with base64 would work but
// wastes ~33% bandwidth (base64 encoding overhead).
func (h *AnalysisHandler) HandleAnalyze(w http.ResponseWriter, r *http.Request) {
	// ── Step 1: Parse the multipart form ──
	// WHY 10MB limit? Produce photos from warehouse cameras are
	// typically 2-5MB. 10MB gives headroom for high-res shots
	// while preventing accidental 100MB uploads.
	if err := r.ParseMultipartForm(h.cfg.MaxFileSize); err != nil {
		h.respondError(w, http.StatusBadRequest, "failed to parse form: %v", err)
		return
	}
	defer r.MultipartForm.RemoveAll() // Clean up temp files

	// ── Step 2: Extract the uploaded file ──
	// WHY FormFile returns three things? The file (io.ReadCloser),
	// the header (filename, size, MIME type), and an error. Go's
	// multipart handling is zero-copy until we call ReadAll.
	file, header, err := r.FormFile("image")
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "missing 'image' field: %v", err)
		return
	}
	defer file.Close()

	// ── Step 3: Validate file type ──
	contentType := header.Header.Get("Content-Type")
	if !model.ValidImageType(contentType) {
		h.respondError(w, http.StatusBadRequest,
			"unsupported image type: %s (accepted: image/jpeg, image/png, image/webp)", contentType)
		return
	}

	// ── Step 4: Read image bytes ──
	// WHY read all at once? The AI client needs the full image
	// for base64 encoding. For streaming scenarios (video frames),
	// you'd use a different pattern.
	imageData, err := io.ReadAll(file)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "failed to read image: %v", err)
		return
	}

	// ── Step 5: Determine analysis type ──
	analysisType := r.FormValue("analysis_type")
	if analysisType == "" {
		analysisType = model.AnalysisTypeQuality // Default to quality check
	}
	if !model.ValidAnalysisType(analysisType) {
		h.respondError(w, http.StatusBadRequest,
			"invalid analysis_type: %s (accepted: quality, label, categorize)", analysisType)
		return
	}

	// ── Step 6: Run AI analysis ──
	input := model.ImageInput{
		ImageData: imageData,
		ImageName: header.Filename,
		ImageType: contentType,
	}

	result, err := h.gemini.AnalyzeImage(r.Context(), input, analysisType)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "analysis failed: %v", err)
		return
	}

	// ── Step 7: Generate ID and store result ──
	result.ID = generateID()
	h.storeResult(result)

	log.Printf("[ANALYZE] image=%s type=%s duration=%dms id=%s",
		header.Filename, analysisType, result.DurationMs, result.ID)

	h.respondJSON(w, http.StatusOK, result)
}

// ──────────────────────────────────────────────────────────────
// Batch Image Analysis (Star Feature)
// ──────────────────────────────────────────────────────────────

// HandleBatchAnalyze processes multiple images concurrently.
//
// Request: POST /api/analyze/batch
//   Content-Type: multipart/form-data
//   Fields:
//     images        — multiple image files (required, max 10)
//     analysis_type — applied to ALL images in the batch
//
// CONCURRENCY PATTERN:
//   1. Parse all uploaded files
//   2. Create a semaphore (buffered channel) of size 5
//   3. Launch one goroutine per image
//   4. Each goroutine acquires a semaphore slot before calling AI
//   5. Results are sent to a collector channel
//   6. WaitGroup ensures we wait for all goroutines
//   7. Aggregate and return
//
// WHY this pattern? BigBasket's warehouse receives crates of 10+
// items. Sequential analysis takes 10 × 2s = 20s. With 5-way
// concurrency, it takes ~4s. The semaphore prevents overwhelming
// the Gemini API with all 10 at once (which would trigger rate
// limiting and make ALL of them fail).
func (h *AnalysisHandler) HandleBatchAnalyze(w http.ResponseWriter, r *http.Request) {
	// ── Step 1: Parse multipart form ──
	if err := r.ParseMultipartForm(h.cfg.MaxFileSize * int64(h.cfg.MaxBatchSize)); err != nil {
		h.respondError(w, http.StatusBadRequest, "failed to parse form: %v", err)
		return
	}
	defer r.MultipartForm.RemoveAll()

	// ── Step 2: Extract all uploaded files ──
	// WHY "images" (plural)? Convention for multi-file upload.
	// curl uses: -F "images=@file1.jpg" -F "images=@file2.jpg"
	files := r.MultipartForm.File["images"]
	if len(files) == 0 {
		h.respondError(w, http.StatusBadRequest, "no images uploaded — use field name 'images'")
		return
	}
	if len(files) > h.cfg.MaxBatchSize {
		h.respondError(w, http.StatusBadRequest,
			"too many images: %d (max %d)", len(files), h.cfg.MaxBatchSize)
		return
	}

	analysisType := r.FormValue("analysis_type")
	if analysisType == "" {
		analysisType = model.AnalysisTypeQuality
	}
	if !model.ValidAnalysisType(analysisType) {
		h.respondError(w, http.StatusBadRequest,
			"invalid analysis_type: %s", analysisType)
		return
	}

	// ── Step 3: Read all images into memory ──
	// WHY read first, analyze second? We want to fail fast on
	// bad uploads before launching expensive AI goroutines.
	var inputs []model.ImageInput
	for _, fh := range files {
		contentType := fh.Header.Get("Content-Type")
		if !model.ValidImageType(contentType) {
			h.respondError(w, http.StatusBadRequest,
				"unsupported type for %s: %s", fh.Filename, contentType)
			return
		}

		f, err := fh.Open()
		if err != nil {
			h.respondError(w, http.StatusInternalServerError,
				"failed to open %s: %v", fh.Filename, err)
			return
		}

		data, err := io.ReadAll(f)
		f.Close()
		if err != nil {
			h.respondError(w, http.StatusInternalServerError,
				"failed to read %s: %v", fh.Filename, err)
			return
		}

		inputs = append(inputs, model.ImageInput{
			ImageData: data,
			ImageName: fh.Filename,
			ImageType: contentType,
		})
	}

	// ── Step 4: Concurrent analysis with semaphore ──
	batchStart := time.Now()

	// WHY buffered channel as semaphore?
	// An unbuffered channel blocks on send. A buffered channel
	// blocks ONLY when full. So a channel of capacity 5 lets
	// exactly 5 goroutines "through" at a time. This is the
	// simplest, most idiomatic concurrency limiter in Go.
	sem := make(chan struct{}, maxConcurrentAnalyses)
	resultsCh := make(chan *model.AnalysisResult, len(inputs))

	var wg sync.WaitGroup

	for _, input := range inputs {
		wg.Add(1)
		go func(inp model.ImageInput) {
			defer wg.Done()

			// Acquire semaphore slot — blocks if 5 already running
			sem <- struct{}{}
			defer func() { <-sem }() // Release slot when done

			result, err := h.gemini.AnalyzeImage(r.Context(), inp, analysisType)
			if err != nil {
				resultsCh <- &model.AnalysisResult{
					ImageName:    inp.ImageName,
					AnalysisType: analysisType,
					Error:        err.Error(),
					ProcessedAt:  time.Now(),
				}
				return
			}

			result.ID = generateID()
			h.storeResult(result)
			resultsCh <- result
		}(input)
	}

	// ── Step 5: Wait for all goroutines, then close channel ──
	// WHY close in a separate goroutine? If we call wg.Wait()
	// on the main goroutine before reading from resultsCh, and
	// resultsCh fills up (buffer full), the writing goroutines
	// block, wg.Wait() never returns — deadlock! By closing in
	// a goroutine, we can range over resultsCh on the main one.
	go func() {
		wg.Wait()
		close(resultsCh)
	}()

	// ── Step 6: Collect results ──
	var results []model.AnalysisResult
	successCount := 0
	errorCount := 0

	for result := range resultsCh {
		results = append(results, *result)
		if result.Error != "" {
			errorCount++
		} else {
			successCount++
		}
	}

	totalDuration := time.Since(batchStart).Milliseconds()

	log.Printf("[BATCH] images=%d success=%d errors=%d duration=%dms",
		len(inputs), successCount, errorCount, totalDuration)

	h.respondJSON(w, http.StatusOK, model.BatchAnalysisResponse{
		Results:       results,
		TotalDuration: totalDuration,
		SuccessCount:  successCount,
		ErrorCount:    errorCount,
	})
}

// ──────────────────────────────────────────────────────────────
// Retrieve Previous Analysis
// ──────────────────────────────────────────────────────────────

// HandleGetAnalysis retrieves a stored analysis result by ID.
// WHY store results? BigBasket's QC supervisor might review
// results hours later. In production, this would be a database;
// here we use an in-memory map for simplicity.
func (h *AnalysisHandler) HandleGetAnalysis(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		h.respondError(w, http.StatusBadRequest, "missing analysis ID")
		return
	}

	h.mu.RLock()
	result, exists := h.results[id]
	h.mu.RUnlock()

	if !exists {
		h.respondError(w, http.StatusNotFound, "analysis %s not found", id)
		return
	}

	h.respondJSON(w, http.StatusOK, result)
}

// ──────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────

// storeResult saves an analysis result to the in-memory store.
func (h *AnalysisHandler) storeResult(result *model.AnalysisResult) {
	h.mu.Lock()
	h.results[result.ID] = result
	h.mu.Unlock()
}

// generateID creates a simple unique ID for demo purposes.
// WHY not UUID? We'd need another dependency. For teaching,
// a timestamp-based ID is perfectly fine.
func generateID() string {
	return fmt.Sprintf("cs-%d", time.Now().UnixNano())
}

// respondJSON writes a JSON response with the given status code.
// WHY a helper? Every handler needs this, and getting the
// Content-Type header wrong causes subtle bugs in frontends.
func (h *AnalysisHandler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("[ERROR] failed to encode response: %v", err)
	}
}

// respondError writes an error response. Using fmt.Sprintf
// for the message lets callers include dynamic details.
func (h *AnalysisHandler) respondError(w http.ResponseWriter, status int, format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	log.Printf("[ERROR] %d: %s", status, msg)
	h.respondJSON(w, status, map[string]string{"error": msg})
}
