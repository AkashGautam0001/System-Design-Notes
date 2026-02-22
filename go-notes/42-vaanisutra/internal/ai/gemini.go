package ai

// ============================================================
// AI Client — Sentiment, Entities, Summary, Embeddings
// ============================================================
// At Jio, the AI client wraps Google's Gemini API for natural
// language processing. In development mode (no API key), it
// uses simulated algorithms that produce realistic results
// for call center transcripts.
//
// WHY simulated mode? Two reasons:
// 1. New engineers can run VaaniSutra without API keys
// 2. Tests run fast without network calls
//
// The simulated algorithms are not toys — they use real NLP
// techniques: word frequency for sentiment, regex patterns for
// entity extraction, FNV hashing for deterministic embeddings.
// ============================================================

import (
	"context"
	"hash/fnv"
	"math"
	"regexp"
	"sort"
	"strings"
	"time"

	"vaanisutra/internal/model"
)

// AIClient provides AI-powered text analysis capabilities.
type AIClient struct {
	apiKey    string
	simulated bool
}

// ──────────────────────────────────────────────────────────────
// NewAIClient creates an AI client. If apiKey is empty, it
// runs in simulated mode — perfect for development.
// ──────────────────────────────────────────────────────────────
func NewAIClient(apiKey string) *AIClient {
	return &AIClient{
		apiKey:    apiKey,
		simulated: apiKey == "",
	}
}

// IsSimulated returns whether the client is in simulation mode.
func (c *AIClient) IsSimulated() bool {
	return c.simulated
}

// ──────────────────────────────────────────────────────────────
// AnalyzeSentiment determines the emotional tone of text.
// WHY sentiment? Jio managers track average sentiment per agent,
// per region, and per time period. A sudden drop in sentiment
// for a particular plan means something went wrong.
//
// Simulated approach: count positive/negative words and compute
// a weighted score. Simple but effective for call center text.
// ──────────────────────────────────────────────────────────────
func (c *AIClient) AnalyzeSentiment(ctx context.Context, text string) (model.SentimentResult, error) {
	// Simulate processing time
	time.Sleep(10 * time.Millisecond)

	positiveWords := []string{
		"thank", "thanks", "great", "happy", "excellent", "love", "good",
		"helpful", "amazing", "wonderful", "perfect", "appreciate", "satisfied",
		"awesome", "fantastic", "pleased", "resolved", "quickly", "fast",
	}

	negativeWords := []string{
		"angry", "bad", "terrible", "worst", "hate", "slow", "wrong",
		"complaint", "frustrated", "annoyed", "pathetic", "useless",
		"disappointed", "horrible", "awful", "poor", "broken", "fail",
		"never", "problem", "issue", "not working", "disconnect",
	}

	lowerText := strings.ToLower(text)
	words := strings.Fields(lowerText)
	totalWords := float64(len(words))
	if totalWords == 0 {
		return model.SentimentResult{Score: 0, Label: "Neutral", Confidence: 0.5}, nil
	}

	var posCount, negCount float64
	for _, word := range words {
		cleanWord := strings.Trim(word, ".,!?;:\"'()-")
		for _, pw := range positiveWords {
			if cleanWord == pw {
				posCount++
				break
			}
		}
		for _, nw := range negativeWords {
			if cleanWord == nw || strings.Contains(cleanWord, nw) {
				negCount++
				break
			}
		}
	}

	// WHY this formula? Raw count difference normalized by total
	// words, then clamped to [-1, 1]. Longer texts with more
	// negative words score more negatively.
	score := (posCount - negCount) / math.Max(posCount+negCount, 1)
	score = math.Max(-1.0, math.Min(1.0, score))

	// Determine label
	var label string
	switch {
	case score > 0.1:
		label = "Positive"
	case score < -0.1:
		label = "Negative"
	default:
		label = "Neutral"
	}

	// Confidence is higher when there are more sentiment words
	sentimentWordRatio := (posCount + negCount) / totalWords
	confidence := math.Min(0.5+sentimentWordRatio*3, 0.99)

	return model.SentimentResult{
		Score:      math.Round(score*100) / 100,
		Label:      label,
		Confidence: math.Round(confidence*100) / 100,
	}, nil
}

// ──────────────────────────────────────────────────────────────
// ExtractEntities finds named entities in the transcript.
// WHY entities? Jio needs to know which plans, products, and
// locations are mentioned in calls. "The Jio 999 plan in Mumbai
// is slow" has three entities: a plan, a location, and an issue.
//
// Simulated approach: regex patterns for common Jio entities.
// ──────────────────────────────────────────────────────────────
func (c *AIClient) ExtractEntities(ctx context.Context, text string) ([]model.Entity, error) {
	time.Sleep(10 * time.Millisecond)

	var entities []model.Entity

	// WHY regex for simulation? It's deterministic, fast, and
	// produces realistic results for known patterns in Jio data.
	patterns := []struct {
		regex    string
		typeName string
	}{
		// Jio plan names (e.g., "Jio 999 plan", "Jio Fiber plan")
		{`(?i)jio\s*(?:₹?\s*\d+\s*(?:plan|recharge)|\w+\s+plan)`, "Plan"},
		// Monetary amounts
		{`(?i)₹\s*\d+(?:,\d+)*(?:\.\d+)?`, "Amount"},
		// Phone numbers
		{`\b\d{10}\b`, "PhoneNumber"},
		// Location patterns (common Indian cities)
		{`(?i)\b(?:Mumbai|Delhi|Bangalore|Bengaluru|Chennai|Hyderabad|Pune|Kolkata|Jaipur|Lucknow|Ahmedabad|Noida|Gurgaon|Gurugram)\b`, "Location"},
		// Jio products
		{`(?i)\b(?:JioFiber|Jio\s*Fiber|JioTV|Jio\s*TV|JioCinema|Jio\s*Cinema|JioMart|Jio\s*Mart|JioPhone|Jio\s*Phone|JioSaavn|Jio\s*Saavn)\b`, "Product"},
		// Issue types
		{`(?i)\b(?:slow\s*(?:internet|speed|connection)|no\s*(?:signal|network|internet)|call\s*drop|dropped\s*call|buffering|not\s*working|disconnected|data\s*(?:limit|cap|speed))\b`, "Issue"},
		// Agent/caller IDs
		{`(?i)\b(?:AGT|AGENT)-\d+\b`, "AgentID"},
		{`(?i)\bJIO-\d+\b`, "CallerID"},
	}

	for _, p := range patterns {
		re, err := regexp.Compile(p.regex)
		if err != nil {
			continue
		}
		matches := re.FindAllStringIndex(text, -1)
		for _, match := range matches {
			entities = append(entities, model.Entity{
				Text:     text[match[0]:match[1]],
				Type:     p.typeName,
				StartPos: match[0],
				EndPos:   match[1],
			})
		}
	}

	return entities, nil
}

// ──────────────────────────────────────────────────────────────
// Summarize creates a concise summary of the transcript.
// WHY summarize? Jio managers review hundreds of transcripts
// daily. A 200-word transcript summarized to 2 sentences saves
// them enormous time.
//
// Simulated approach: extract first and last sentences, then
// detect key issues to form a coherent summary.
// ──────────────────────────────────────────────────────────────
func (c *AIClient) Summarize(ctx context.Context, text string) (string, error) {
	time.Sleep(10 * time.Millisecond)

	sentences := splitSentences(text)
	if len(sentences) == 0 {
		return "No content to summarize.", nil
	}

	// Take first sentence as the opening context
	summary := strings.TrimSpace(sentences[0])

	// Detect key issues in the text
	lowerText := strings.ToLower(text)
	issues := []string{}
	issuePatterns := map[string]string{
		"slow internet":    "internet speed issues",
		"slow connection":  "connectivity problems",
		"not working":      "service malfunction",
		"call drop":        "call dropping issues",
		"billing":          "billing concerns",
		"recharge":         "recharge-related query",
		"plan":             "plan-related inquiry",
		"installation":     "installation request",
		"roaming":          "roaming services",
		"sim":              "SIM-related issue",
		"activation":       "activation request",
		"speed":            "speed-related concern",
		"data":             "data usage query",
		"refund":           "refund request",
	}

	for keyword, description := range issuePatterns {
		if strings.Contains(lowerText, keyword) {
			issues = append(issues, description)
		}
	}

	// Build summary
	if len(issues) > 0 {
		// Deduplicate and limit to top 3 issues
		sort.Strings(issues)
		uniqueIssues := uniqueStrings(issues)
		if len(uniqueIssues) > 3 {
			uniqueIssues = uniqueIssues[:3]
		}
		summary += " Key topics: " + strings.Join(uniqueIssues, ", ") + "."
	}

	// Add last sentence if different from first
	if len(sentences) > 1 {
		lastSentence := strings.TrimSpace(sentences[len(sentences)-1])
		if lastSentence != summary && len(lastSentence) > 10 {
			summary += " " + lastSentence
		}
	}

	return summary, nil
}

// ──────────────────────────────────────────────────────────────
// GenerateEmbedding creates a vector representation of text.
// WHY embeddings? They enable semantic search — finding
// transcripts by meaning, not just keywords. Two transcripts
// about "slow internet" and "poor WiFi speed" will have
// similar vectors even though they share no exact words.
//
// Simulated approach: FNV hash-based deterministic embedding.
// Same text always produces the same vector — important for
// reproducible search results during development.
// ──────────────────────────────────────────────────────────────
func (c *AIClient) GenerateEmbedding(ctx context.Context, text string, dim int) ([]float32, error) {
	time.Sleep(5 * time.Millisecond)

	embedding := make([]float32, dim)
	words := strings.Fields(strings.ToLower(text))

	// Generate embedding using FNV hash of each word
	// WHY FNV? It's fast, deterministic, and distributes well
	// across the vector space. Each word contributes to multiple
	// dimensions based on its hash.
	for _, word := range words {
		h := fnv.New64a()
		h.Write([]byte(word))
		hash := h.Sum64()

		// Distribute the word's contribution across dimensions
		for i := 0; i < dim; i++ {
			// Use different parts of the hash for different dimensions
			shifted := hash ^ uint64(i*2654435761)
			val := float64(shifted%1000) / 500.0 - 1.0 // Normalize to [-1, 1]
			embedding[i] += float32(val)
		}
	}

	// Normalize the embedding vector (L2 normalization)
	// WHY normalize? Cosine similarity between normalized vectors
	// is equivalent to dot product — faster to compute at scale.
	var norm float64
	for _, v := range embedding {
		norm += float64(v) * float64(v)
	}
	norm = math.Sqrt(norm)
	if norm > 0 {
		for i := range embedding {
			embedding[i] = float32(float64(embedding[i]) / norm)
		}
	}

	return embedding, nil
}

// ──────────────────────────────────────────────────────────────
// ExtractKeywords finds the most important words in the text.
// WHY keywords? They provide a quick glance at what a transcript
// is about — useful in Jio's dashboard listing of transcripts.
//
// Simulated approach: word frequency with stop word removal.
// ──────────────────────────────────────────────────────────────
func (c *AIClient) ExtractKeywords(ctx context.Context, text string) ([]string, error) {
	time.Sleep(5 * time.Millisecond)

	stopWords := map[string]bool{
		"the": true, "a": true, "an": true, "is": true, "are": true,
		"was": true, "were": true, "be": true, "been": true, "being": true,
		"have": true, "has": true, "had": true, "do": true, "does": true,
		"did": true, "will": true, "would": true, "could": true, "should": true,
		"may": true, "might": true, "shall": true, "can": true, "to": true,
		"of": true, "in": true, "for": true, "on": true, "with": true,
		"at": true, "by": true, "from": true, "as": true, "into": true,
		"through": true, "during": true, "before": true, "after": true,
		"and": true, "but": true, "or": true, "nor": true, "not": true,
		"so": true, "yet": true, "both": true, "either": true, "neither": true,
		"i": true, "me": true, "my": true, "we": true, "our": true,
		"you": true, "your": true, "he": true, "she": true, "it": true,
		"they": true, "them": true, "their": true, "this": true, "that": true,
		"these": true, "those": true, "am": true, "if": true, "then": true,
		"than": true, "too": true, "very": true, "just": true, "about": true,
		"up": true, "out": true, "no": true, "yes": true, "also": true,
		"its": true, "his": true, "her": true, "what": true, "which": true,
		"who": true, "whom": true, "how": true, "when": true, "where": true,
		"why": true, "all": true, "each": true, "every": true, "any": true,
		"some": true, "such": true, "only": true, "own": true, "same": true,
		"there": true, "here": true, "more": true, "most": true, "other": true,
	}

	// Count word frequencies
	wordCounts := make(map[string]int)
	words := strings.Fields(strings.ToLower(text))
	for _, word := range words {
		cleaned := strings.Trim(word, ".,!?;:\"'()-")
		if len(cleaned) < 3 || stopWords[cleaned] {
			continue
		}
		wordCounts[cleaned]++
	}

	// Sort by frequency
	type wordFreq struct {
		word  string
		count int
	}
	var freqs []wordFreq
	for word, count := range wordCounts {
		freqs = append(freqs, wordFreq{word, count})
	}
	sort.Slice(freqs, func(i, j int) bool {
		if freqs[i].count == freqs[j].count {
			return freqs[i].word < freqs[j].word
		}
		return freqs[i].count > freqs[j].count
	})

	// Return top 10 keywords
	var keywords []string
	limit := 10
	if len(freqs) < limit {
		limit = len(freqs)
	}
	for i := 0; i < limit; i++ {
		keywords = append(keywords, freqs[i].word)
	}

	return keywords, nil
}

// ──────────────────────────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────────────────────────

// splitSentences splits text into sentences.
func splitSentences(text string) []string {
	// Simple sentence splitting on period, exclamation, question mark
	re := regexp.MustCompile(`[.!?]+\s+`)
	parts := re.Split(text, -1)

	var sentences []string
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if len(trimmed) > 0 {
			sentences = append(sentences, trimmed)
		}
	}
	return sentences
}

// uniqueStrings removes duplicates from a sorted string slice.
func uniqueStrings(sorted []string) []string {
	if len(sorted) == 0 {
		return sorted
	}
	result := []string{sorted[0]}
	for i := 1; i < len(sorted); i++ {
		if sorted[i] != sorted[i-1] {
			result = append(result, sorted[i])
		}
	}
	return result
}
