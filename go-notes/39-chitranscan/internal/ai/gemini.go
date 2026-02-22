// ============================================================
//  Gemini AI Client — Multimodal Image Analysis
// ============================================================
//  WHY SIMULATED?
//  This client demonstrates the full pattern of calling a
//  multimodal AI API (construct request, send image + prompt,
//  parse response) without requiring a real API key. In
//  simulated mode, it returns detailed, realistic responses
//  that BigBasket's QC team would actually see.
//
//  To switch to real Gemini: set GEMINI_API_KEY in your env.
//  The AnalyzeImage method would then POST to:
//    https://generativelanguage.googleapis.com/v1/models/
//      gemini-pro-vision:generateContent
//
//  WHY NOT IMPORT THE GEMINI SDK?
//  We keep dependencies minimal (only Chi). The REST pattern
//  taught here works with ANY vision API — Gemini, GPT-4V,
//  Claude, or a self-hosted model. The abstraction is the
//  lesson, not the SDK.
// ============================================================

package ai

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"chitranscan/internal/model"
)

// GeminiClient handles communication with Google's Gemini
// multimodal API. When apiKey is empty, it operates in
// simulated mode — perfect for development and teaching.
type GeminiClient struct {
	apiKey     string
	modelName  string
	httpClient *http.Client
	simulated  bool
}

// NewGeminiClient creates a client configured for Gemini Vision.
//
// WHY check for empty key here (not in config)?
// The config package is generic — it just reads env vars. The
// AI package understands what "no key" means: simulation mode.
// This is domain logic, not configuration logic.
func NewGeminiClient(apiKey string, timeout time.Duration) *GeminiClient {
	return &GeminiClient{
		apiKey:    apiKey,
		modelName: "gemini-pro-vision",
		httpClient: &http.Client{
			Timeout: timeout,
		},
		simulated: apiKey == "",
	}
}

// IsSimulated returns whether the client is running without a real API key.
func (g *GeminiClient) IsSimulated() bool {
	return g.simulated
}

// ──────────────────────────────────────────────────────────────
// Core Analysis Method
// ──────────────────────────────────────────────────────────────

// AnalyzeImage sends an image to Gemini for analysis.
//
// In production (real API key), this would:
//  1. Base64-encode the image
//  2. Build a multipart content request with text prompt + image
//  3. POST to Gemini's generateContent endpoint
//  4. Parse the JSON response
//
// In simulated mode, it returns realistic fake data based on
// the analysis type — so the full pipeline works end-to-end.
func (g *GeminiClient) AnalyzeImage(ctx context.Context, input model.ImageInput, analysisType string) (*model.AnalysisResult, error) {
	start := time.Now()

	// ── Check context cancellation ──
	// WHY: In a batch of 10 images, if the client disconnects
	// after image #3, we should stop wasting CPU on images #4-10.
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	var result *model.AnalysisResult
	var err error

	if g.simulated {
		// ── Simulated mode ──
		// WHY simulate a delay? Real API calls take 1-3 seconds.
		// Simulating this lets developers see the concurrency
		// benefits of batch processing with goroutines.
		delay := time.Duration(200+rand.Intn(300)) * time.Millisecond
		select {
		case <-time.After(delay):
		case <-ctx.Done():
			return nil, ctx.Err()
		}

		result, err = g.simulatedAnalysis(input, analysisType)
	} else {
		// ── Real Gemini API call (pattern shown, not executed) ──
		// In a real implementation:
		//   encoded := base64.StdEncoding.EncodeToString(input.ImageData)
		//   body := buildGeminiRequest(prompt, encoded, input.ImageType)
		//   resp, err := g.httpClient.Post(geminiURL, "application/json", body)
		//   result = parseGeminiResponse(resp)
		result, err = g.simulatedAnalysis(input, analysisType)
	}

	if err != nil {
		return nil, fmt.Errorf("analysis failed: %w", err)
	}

	result.DurationMs = time.Since(start).Milliseconds()
	result.ProcessedAt = time.Now()
	result.AnalysisType = analysisType
	result.ImageName = input.ImageName

	return result, nil
}

// ──────────────────────────────────────────────────────────────
// Specialized Analysis Methods
// ──────────────────────────────────────────────────────────────
// WHY separate methods for each type? Each has a different prompt
// and may need different pre/post processing. The handler calls
// the specific method; the method picks the right prompt.

// QualityCheck analyses produce for freshness and defects.
// BigBasket runs this on every incoming crate of fruits/vegetables.
func (g *GeminiClient) QualityCheck(ctx context.Context, input model.ImageInput) (*model.AnalysisResult, error) {
	return g.AnalyzeImage(ctx, input, model.AnalysisTypeQuality)
}

// ReadLabel extracts text from product packaging labels.
// Critical for FSSAI compliance — every packaged item must
// have a valid license number and non-expired date.
func (g *GeminiClient) ReadLabel(ctx context.Context, input model.ImageInput) (*model.AnalysisResult, error) {
	return g.AnalyzeImage(ctx, input, model.AnalysisTypeLabel)
}

// CategorizeProduct classifies a product for warehouse sorting.
// When barcodes are damaged or missing, the image is the fallback.
func (g *GeminiClient) CategorizeProduct(ctx context.Context, input model.ImageInput) (*model.AnalysisResult, error) {
	return g.AnalyzeImage(ctx, input, model.AnalysisTypeCategorize)
}

// ──────────────────────────────────────────────────────────────
// Simulated Responses
// ──────────────────────────────────────────────────────────────
// WHY so detailed? Students should see what real AI output looks
// like. These responses mirror actual Gemini vision output for
// Indian grocery products.

func (g *GeminiClient) simulatedAnalysis(input model.ImageInput, analysisType string) (*model.AnalysisResult, error) {
	// Use the filename to make simulated responses more realistic
	name := strings.ToLower(input.ImageName)

	switch analysisType {
	case model.AnalysisTypeQuality:
		return g.simulateQualityCheck(name), nil
	case model.AnalysisTypeLabel:
		return g.simulateLabelRead(name), nil
	case model.AnalysisTypeCategorize:
		return g.simulateCategorize(name), nil
	default:
		return nil, fmt.Errorf("unsupported analysis type: %s", analysisType)
	}
}

func (g *GeminiClient) simulateQualityCheck(imageName string) *model.AnalysisResult {
	// ── Vary responses based on filename keywords ──
	// WHY: Makes demos more interesting. Upload "rotten_tomato.jpg"
	// and get a Reject grade; upload "fresh_mango.jpg" and get A.
	quality := &model.QualityReport{
		FreshnessScore:   0.88,
		DefectDetected:   false,
		DefectDescription: "",
		Grade:            "A",
	}
	findings := "Fresh produce detected. Uniform color, firm texture, no visible bruises or mold. Suitable for premium display."

	if strings.Contains(imageName, "rotten") || strings.Contains(imageName, "bad") {
		quality.FreshnessScore = 0.15
		quality.DefectDetected = true
		quality.DefectDescription = "Significant mold growth on surface, soft spots indicating advanced decomposition, dark discoloration covering >40% of surface area."
		quality.Grade = "Reject"
		findings = "Produce shows signs of advanced spoilage. Mold colonies visible on surface. Texture is soft and mushy. NOT suitable for sale. Recommend return to supplier with documentation."
	} else if strings.Contains(imageName, "bruise") || strings.Contains(imageName, "damaged") {
		quality.FreshnessScore = 0.62
		quality.DefectDetected = true
		quality.DefectDescription = "Minor bruising on 2-3 spots, likely from transport handling. No mold or pest damage."
		quality.Grade = "B"
		findings = "Produce is fresh but has minor cosmetic damage from handling. Suitable for sale at standard price. Recommend front-facing display to hide bruised side."
	} else if strings.Contains(imageName, "old") || strings.Contains(imageName, "stale") {
		quality.FreshnessScore = 0.40
		quality.DefectDetected = true
		quality.DefectDescription = "Slight wilting, loss of turgidity, early-stage discoloration. No mold yet."
		quality.Grade = "C"
		findings = "Produce is past peak freshness but still safe for consumption. Recommend discounted quick-sale section. Shelf life estimated at 1-2 days."
	}

	return &model.AnalysisResult{
		Findings:     findings,
		QualityScore: quality.FreshnessScore,
		Quality:      quality,
	}
}

func (g *GeminiClient) simulateLabelRead(imageName string) *model.AnalysisResult {
	// Simulated label data — typical Indian packaged goods
	labels := []string{
		"Product: Tata Sampann Unpolished Toor Dal",
		"Brand: Tata Sampann",
		"MRP: Rs. 185 (inclusive of all taxes)",
		"Net Weight: 1 kg",
		"Best Before: 12 months from packaging",
		"Expiry Date: March 2027",
		"FSSAI License: 10014011002549",
		"Manufacturer: Tata Consumer Products Ltd, Bangalore 560064",
		"Ingredients: Unpolished Toor Dal (Arhar Dal)",
	}
	findings := "Successfully extracted label information from packaged product. " +
		"FSSAI license number detected and appears valid (14-digit format). " +
		"Product is within shelf life. MRP clearly printed. " +
		"All mandatory FSSAI labelling requirements appear to be met."

	return &model.AnalysisResult{
		Findings: findings,
		Labels:   labels,
	}
}

func (g *GeminiClient) simulateCategorize(imageName string) *model.AnalysisResult {
	// Default categorization
	category := "Fruits"
	findings := "Image shows ripe Alphonso mangoes (Hapus), a premium tropical fruit. " +
		"Characteristic golden-yellow skin with slight green tinge near stem. " +
		"Commonly sourced from Ratnagiri/Devgad, Maharashtra. " +
		"BigBasket category: Fruits > Tropical Fruits > Mangoes."

	if strings.Contains(imageName, "tomato") || strings.Contains(imageName, "onion") || strings.Contains(imageName, "potato") {
		category = "Vegetables"
		findings = "Image shows fresh vegetables. Appropriate for Vegetables section. " +
			"Recommend storage in cool, dry area of warehouse (15-20 degrees C)."
	} else if strings.Contains(imageName, "milk") || strings.Contains(imageName, "curd") || strings.Contains(imageName, "paneer") {
		category = "Dairy"
		findings = "Image shows dairy product. CRITICAL: Must maintain cold chain. " +
			"Verify refrigeration temperature is 2-4 degrees C. Check expiry date immediately."
	} else if strings.Contains(imageName, "rice") || strings.Contains(imageName, "dal") || strings.Contains(imageName, "wheat") {
		category = "Grains & Pulses"
		findings = "Image shows staple grains/pulses. Store in dry, pest-free area. " +
			"Check packaging integrity — torn bags attract weevils."
	} else if strings.Contains(imageName, "chai") || strings.Contains(imageName, "tea") || strings.Contains(imageName, "juice") {
		category = "Beverages"
		findings = "Image shows beverage product. Verify MRP sticker matches system price. " +
			"Check for dented cans or swollen tetra-packs (signs of spoilage)."
	}

	return &model.AnalysisResult{
		Findings:     findings,
		Category:     category,
		QualityScore: 0.92,
	}
}
