// ============================================================
//  Package model — Data Structures for Image Analysis
// ============================================================
//  WHY SEPARATE MODELS?
//  Models are the "language" of ChitranScan. Handlers speak
//  HTTP, the AI client speaks Gemini, but both exchange these
//  structs. Decoupling models from logic means we can change
//  the AI provider (Gemini → GPT-4V → local model) without
//  touching handler code.
//
//  BigBasket analogy: The QC inspection form is standardised
//  across all 30 warehouses. Whether the inspector uses a
//  magnifying glass or an AI camera, the form has the same
//  fields: freshness, defects, grade.
// ============================================================

package model

import "time"

// ──────────────────────────────────────────────────────────────
// Analysis Types — the three kinds of inspection BigBasket runs
// ──────────────────────────────────────────────────────────────

const (
	AnalysisTypeQuality    = "quality"    // Produce freshness & defect check
	AnalysisTypeLabel      = "label"      // Package label text extraction
	AnalysisTypeCategorize = "categorize" // Product classification
)

// ──────────────────────────────────────────────────────────────
// Request Models
// ──────────────────────────────────────────────────────────────

// ImageInput represents a single uploaded image with metadata.
// WHY []byte for ImageData? Go's multipart parser gives us an
// io.Reader; we read it into bytes so we can pass it to the AI
// client (which needs the full payload for base64 encoding).
type ImageInput struct {
	ImageData []byte // Raw image bytes
	ImageName string // Original filename
	ImageType string // MIME type: image/jpeg, image/png, image/webp
}

// ──────────────────────────────────────────────────────────────
// Response Models
// ──────────────────────────────────────────────────────────────

// AnalysisResult is what ChitranScan returns for each image.
// WHY so many fields? Different analysis types populate different
// subsets. A quality check fills QualityReport; a label read fills
// Labels; categorization fills Category. The handler picks what
// the client asked for.
type AnalysisResult struct {
	ID            string         `json:"id"`
	ImageName     string         `json:"image_name"`
	AnalysisType  string         `json:"analysis_type"`
	Findings      string         `json:"findings"`
	QualityScore  float64        `json:"quality_score,omitempty"`
	Labels        []string       `json:"labels,omitempty"`
	Category      string         `json:"category,omitempty"`
	Quality       *QualityReport `json:"quality_report,omitempty"`
	RawResponse   string         `json:"raw_response,omitempty"`
	ProcessedAt   time.Time      `json:"processed_at"`
	DurationMs    int64          `json:"duration_ms"`
	Error         string         `json:"error,omitempty"`
}

// QualityReport is the detailed output of a produce quality check.
// WHY a sub-struct? Quality inspection has domain-specific fields
// that don't apply to label reading or categorization. Nesting
// keeps the top-level result clean.
//
// BigBasket grades:
//   A      → Premium quality, front-page display worthy
//   B      → Good quality, minor cosmetic issues
//   C      → Acceptable, may need quick sale / discount
//   Reject → Do not sell, return to supplier
type QualityReport struct {
	FreshnessScore   float64 `json:"freshness_score"`   // 0.0 to 1.0
	DefectDetected   bool    `json:"defect_detected"`
	DefectDescription string  `json:"defect_description,omitempty"`
	Grade            string  `json:"grade"` // A, B, C, Reject
}

// ──────────────────────────────────────────────────────────────
// Batch Models — for concurrent multi-image analysis
// ──────────────────────────────────────────────────────────────

// BatchAnalysisResponse aggregates results from concurrent analysis
// of multiple images. The warehouse supervisor sees this as a
// single report for an entire incoming crate.
type BatchAnalysisResponse struct {
	Results       []AnalysisResult `json:"results"`
	TotalDuration int64            `json:"total_duration_ms"`
	SuccessCount  int              `json:"success_count"`
	ErrorCount    int              `json:"error_count"`
}

// ──────────────────────────────────────────────────────────────
// Validation helpers
// ──────────────────────────────────────────────────────────────

// ValidAnalysisType checks if the given type is one we support.
func ValidAnalysisType(t string) bool {
	switch t {
	case AnalysisTypeQuality, AnalysisTypeLabel, AnalysisTypeCategorize:
		return true
	}
	return false
}

// ValidImageType checks if the MIME type is an image we accept.
// WHY only these three? JPEG is universal for photos, PNG for
// screenshots/labels with transparency, WebP for modern efficient
// encoding. BigBasket's warehouse cameras shoot JPEG; their label
// scanners produce PNG.
func ValidImageType(mimeType string) bool {
	switch mimeType {
	case "image/jpeg", "image/png", "image/webp":
		return true
	}
	return false
}
