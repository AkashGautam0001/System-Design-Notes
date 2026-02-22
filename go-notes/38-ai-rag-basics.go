// ============================================================
//  FILE 38 : AI — RAG (Retrieval-Augmented Generation)
// ============================================================
//  Topic  : RAG pipeline, document chunking (fixed-size,
//           sentence-based, overlap), knowledge base building,
//           retrieval via similarity search, prompt augmentation,
//           grounded generation, citations, end-to-end demo
//
//  WHY THIS MATTERS:
//  LLMs hallucinate. Ask Gemini about a specific ISRO mission
//  date and it might confidently give the wrong answer. RAG
//  solves this by RETRIEVING relevant documents first, then
//  AUGMENTING the prompt with real context, so the model
//  GENERATES answers grounded in actual data. RAG is the #1
//  pattern for building trustworthy AI applications — from
//  academic search to enterprise knowledge bases.
// ============================================================

// ============================================================
// STORY: NDLI — National Digital Library of India
// IIT Kharagpur's National Digital Library (NDLI) hosts 90
// million+ academic resources — research papers, theses, books,
// patents, and lectures from institutions across India. A
// researcher searching for "ISRO's Mars Orbiter Mission fuel
// efficiency" shouldn't just get keyword matches — they need an
// intelligent answer synthesized from multiple papers, with
// citations pointing to the exact paragraphs.
//
// The NDLI engineering team builds a RAG system:
//   1. CHUNK: Split documents into digestible pieces
//   2. EMBED: Convert each chunk to a vector (Chapter 37)
//   3. STORE: Index chunks in a vector store
//   4. RETRIEVE: Find chunks relevant to the user's question
//   5. AUGMENT: Build a prompt with retrieved context
//   6. GENERATE: LLM answers using ONLY the provided context
//   7. CITE: Track which chunks contributed to the answer
//
// The result: grounded, hallucination-resistant answers with
// proper academic citations. No more making up facts.
// ============================================================

package main

import (
	"fmt"
	"math"
	"os"
	"sort"
	"strings"
)

// ============================================================
// SIMULATED MODE SETUP
// ============================================================

var geminiAPIKey38 = os.Getenv("GEMINI_API_KEY")
var simulatedMode38 = geminiAPIKey38 == ""

func init() {
	if simulatedMode38 {
		fmt.Println("==========================================================")
		fmt.Println("  SIMULATED MODE — GEMINI_API_KEY not set")
		fmt.Println("  All LLM responses are pre-written demo data.")
		fmt.Println("  Set GEMINI_API_KEY=your-key to use real Gemini API.")
		fmt.Println("==========================================================")
		fmt.Println()
	}
}

// ============================================================
// SECTION 1 — What Is RAG?
// ============================================================
// WHY: RAG addresses the fundamental limitation of LLMs: their
// knowledge is frozen at training time and they can hallucinate.
//
// WITHOUT RAG:
//   User: "When did Chandrayaan-3 land on the Moon?"
//   LLM:  "August 23, 2023" (might be right, might hallucinate)
//
// WITH RAG:
//   1. Retrieve NDLI documents about Chandrayaan-3
//   2. Feed relevant paragraphs to the LLM
//   3. LLM answers based on the documents: "According to the
//      ISRO press release (NDLI-DOC-4471), Chandrayaan-3's
//      Vikram lander touched down on August 23, 2023."
//
// The key insight: the LLM becomes a REASONING engine over YOUR
// data, not a memorization engine from its training data.

// ──────────────────────────────────────────────────────────────
// EXAMPLE BLOCK 1 — RAG Concept Demonstration
// ──────────────────────────────────────────────────────────────

func demoRAGConcept() {
	fmt.Println("============================================================")
	fmt.Println("DEMO 1: What Is RAG? (Retrieval-Augmented Generation)")
	fmt.Println("============================================================")
	fmt.Println()
	fmt.Println("  Traditional LLM (without RAG):")
	fmt.Println("  +--------+     +-------+     +----------+")
	fmt.Println("  | Question| --> | LLM   | --> | Answer   |")
	fmt.Println("  | (user) |     | (mem)  |     | (maybe?) |")
	fmt.Println("  +--------+     +-------+     +----------+")
	fmt.Println("  Problem: LLM relies on training data. May hallucinate.")
	fmt.Println()
	fmt.Println("  RAG Pipeline:")
	fmt.Println("  +--------+     +-----------+     +----------+     +-------+     +-----------+")
	fmt.Println("  | Question| --> | Retriever | --> | Context  | --> | LLM   | --> | Grounded  |")
	fmt.Println("  | (user) |     | (search)  |     | (chunks) |     | +ctx   |     | Answer    |")
	fmt.Println("  +--------+     +-----------+     +----------+     +-------+     +-----------+")
	fmt.Println("                        |")
	fmt.Println("                  +------------+")
	fmt.Println("                  | Knowledge  |")
	fmt.Println("                  | Base (NDLI)|")
	fmt.Println("                  +------------+")
	fmt.Println()
	fmt.Println("  Key benefit: Answer is GROUNDED in retrieved documents.")
	fmt.Println("  The LLM can say 'According to [source]...' with citations.")
	fmt.Println()
}

// ============================================================
// SECTION 2 — Document Chunking
// ============================================================
// WHY: Documents can be thousands of words long, but LLMs have
// limited context windows and embeddings work best on focused
// passages. Chunking splits a document into smaller pieces that
// are individually embeddable and retrievable.
//
// Three strategies:
//   - Fixed-size: split every N characters (simple, fast)
//   - Sentence-based: split at sentence boundaries (preserves meaning)
//   - Overlap: chunks share text at boundaries (prevents losing context)

// ──────────────────────────────────────────────────────────────
// EXAMPLE BLOCK 2 — Chunking Strategies
// ──────────────────────────────────────────────────────────────

// Document represents an academic document in NDLI.
type Document struct {
	ID      string
	Title   string
	Content string
	Source  string // e.g., "IIT Kharagpur Library, 2023"
}

// Chunk represents a piece of a document, ready for embedding.
type Chunk struct {
	ID       string
	DocID    string
	DocTitle string
	Text     string
	StartIdx int // character offset in original document
	EndIdx   int
	Vector   []float32
}

// chunkByFixedSize splits text into chunks of approximately `size`
// characters with `overlap` characters shared between consecutive chunks.
//
// WHY overlap? Consider a sentence split across two chunks:
//   Chunk 1: "...ISRO launched Chandrayaan-3 on July"
//   Chunk 2: "14, 2023, from Sriharikota..."
//   Without overlap, searching for "Chandrayaan-3 launch date" might
//   match neither chunk well. Overlap ensures key information appears
//   in at least one complete chunk.
func chunkByFixedSize(text string, size, overlap int) []string {
	if size <= 0 {
		return nil
	}
	if overlap >= size {
		overlap = size / 4 // safety: overlap should be < size
	}

	var chunks []string
	start := 0
	textLen := len(text)

	for start < textLen {
		end := start + size
		if end > textLen {
			end = textLen
		}

		chunk := text[start:end]
		chunks = append(chunks, strings.TrimSpace(chunk))

		// Move forward by (size - overlap) characters
		start += size - overlap
	}

	return chunks
}

// chunkBySentence splits text at sentence boundaries, grouping
// sentences until the chunk reaches maxChunkSize characters.
// This preserves complete sentences for better embedding quality.
//
// WHY: Fixed-size chunking can cut mid-sentence:
//   "ISRO's budget for 2023 was Rs 12,543 cro"  (cut!)
// Sentence-based chunking keeps: "ISRO's budget for 2023 was Rs 12,543 crore."
func chunkBySentence(text string, maxChunkSize int) []string {
	// Split by sentence-ending punctuation followed by space
	// Simple heuristic — production systems use NLP sentence tokenizers
	sentences := splitSentences(text)

	var chunks []string
	var current strings.Builder

	for _, sentence := range sentences {
		sentence = strings.TrimSpace(sentence)
		if sentence == "" {
			continue
		}

		// If adding this sentence would exceed max size, flush current chunk
		if current.Len() > 0 && current.Len()+len(sentence)+1 > maxChunkSize {
			chunks = append(chunks, strings.TrimSpace(current.String()))
			current.Reset()
		}

		if current.Len() > 0 {
			current.WriteString(" ")
		}
		current.WriteString(sentence)
	}

	// Don't forget the last chunk
	if current.Len() > 0 {
		chunks = append(chunks, strings.TrimSpace(current.String()))
	}

	return chunks
}

// splitSentences splits text on ". ", "! ", "? " boundaries.
// A production system would use proper NLP sentence tokenization.
func splitSentences(text string) []string {
	var sentences []string
	var current strings.Builder

	runes := []rune(text)
	for i := 0; i < len(runes); i++ {
		current.WriteRune(runes[i])

		// Check for sentence boundary: .!? followed by space or end
		if (runes[i] == '.' || runes[i] == '!' || runes[i] == '?') &&
			(i+1 >= len(runes) || runes[i+1] == ' ' || runes[i+1] == '\n') {
			sentences = append(sentences, current.String())
			current.Reset()
		}
	}

	// Remaining text (no sentence-ending punctuation)
	if current.Len() > 0 {
		sentences = append(sentences, current.String())
	}

	return sentences
}

func demoChunking() {
	fmt.Println("============================================================")
	fmt.Println("DEMO 2: Document Chunking Strategies")
	fmt.Println("============================================================")

	sampleText := `The Indian Space Research Organisation (ISRO) was founded in 1969 by Dr. Vikram Sarabhai, who is regarded as the father of the Indian space programme. ISRO's first satellite, Aryabhata, was launched on April 19, 1975 by the Soviet Union. The satellite was named after the great Indian mathematician and astronomer. In 1980, India launched its first indigenous satellite launch vehicle SLV-3, making it the sixth nation to achieve orbital capability. ISRO went on to develop the Polar Satellite Launch Vehicle (PSLV) and the Geosynchronous Satellite Launch Vehicle (GSLV). The Mars Orbiter Mission (Mangalyaan) launched on November 5, 2013, made India the first Asian nation to reach Mars orbit. Chandrayaan-3 successfully landed near the Moon's south pole on August 23, 2023, making India the fourth country to achieve a soft lunar landing.`

	// Strategy 1: Fixed-size chunking
	fmt.Println("\n  --- Strategy 1: Fixed-Size Chunking (size=150, overlap=0) ---")
	fixedChunks := chunkByFixedSize(sampleText, 150, 0)
	for i, chunk := range fixedChunks {
		fmt.Printf("  Chunk %d (%3d chars): %q\n", i+1, len(chunk), truncate(chunk, 70))
	}

	// Strategy 2: Fixed-size with overlap
	fmt.Println("\n  --- Strategy 2: Fixed-Size with Overlap (size=150, overlap=30) ---")
	overlapChunks := chunkByFixedSize(sampleText, 150, 30)
	for i, chunk := range overlapChunks {
		fmt.Printf("  Chunk %d (%3d chars): %q\n", i+1, len(chunk), truncate(chunk, 70))
	}

	// Strategy 3: Sentence-based chunking
	fmt.Println("\n  --- Strategy 3: Sentence-Based Chunking (maxSize=200) ---")
	sentenceChunks := chunkBySentence(sampleText, 200)
	for i, chunk := range sentenceChunks {
		fmt.Printf("  Chunk %d (%3d chars): %q\n", i+1, len(chunk), truncate(chunk, 70))
	}

	fmt.Println("\n  --- Chunking Strategy Comparison ---")
	fmt.Println("  +------------------+-------+----------------------------------------+")
	fmt.Println("  | Strategy         | Pros  | Cons                                   |")
	fmt.Println("  +------------------+-------+----------------------------------------+")
	fmt.Println("  | Fixed-size       | Fast  | May cut mid-sentence                   |")
	fmt.Println("  | Fixed + overlap  | Safe  | More chunks, some redundancy           |")
	fmt.Println("  | Sentence-based   | Clean | Variable chunk sizes, slower            |")
	fmt.Println("  +------------------+-------+----------------------------------------+")
	fmt.Println("  NDLI recommendation: Sentence-based with ~200 char max for academic text.")
	fmt.Println()
}

// truncate shortens a string for display purposes.
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// ============================================================
// SECTION 3 — Building the Knowledge Base
// ============================================================
// WHY: The knowledge base is the CHUNK -> EMBED -> STORE
// pipeline. Every document in NDLI goes through this pipeline
// once (at ingest time), creating a searchable vector index.

// ──────────────────────────────────────────────────────────────
// EXAMPLE BLOCK 3 — Knowledge Base / Vector Store
// ──────────────────────────────────────────────────────────────

// RAGVectorEntry stores a chunk with its embedding.
type RAGVectorEntry struct {
	ChunkID  string
	DocID    string
	DocTitle string
	Text     string
	Vector   []float32
}

// RAGSearchResult is a chunk with its similarity score.
type RAGSearchResult struct {
	Entry      RAGVectorEntry
	Similarity float64
}

// KnowledgeBase holds the vector index for RAG retrieval.
type KnowledgeBase struct {
	entries      []RAGVectorEntry
	chunkCounter int
}

// NewKnowledgeBase creates an empty knowledge base.
func NewKnowledgeBase() *KnowledgeBase {
	return &KnowledgeBase{
		entries: make([]RAGVectorEntry, 0),
	}
}

// Ingest processes documents: chunk -> embed -> store.
// This is the "offline" phase of RAG — done once per document.
func (kb *KnowledgeBase) Ingest(docs []Document) {
	for _, doc := range docs {
		// Step 1: Chunk the document (sentence-based, 200 char max)
		chunks := chunkBySentence(doc.Content, 200)

		for _, chunkText := range chunks {
			kb.chunkCounter++
			chunkID := fmt.Sprintf("chunk-%04d", kb.chunkCounter)

			// Step 2: Embed the chunk
			// In production: vec = embeddingModel.EmbedContent(ctx, chunkText)
			vec := ragSimulateEmbedding(chunkText)

			// Step 3: Store in vector index
			kb.entries = append(kb.entries, RAGVectorEntry{
				ChunkID:  chunkID,
				DocID:    doc.ID,
				DocTitle: doc.Title,
				Text:     chunkText,
				Vector:   vec,
			})
		}
	}
}

// Retrieve finds the top-K most relevant chunks for a query.
func (kb *KnowledgeBase) Retrieve(query string, topK int) []RAGSearchResult {
	queryVec := ragSimulateEmbedding(query)

	results := make([]RAGSearchResult, 0, len(kb.entries))
	for _, entry := range kb.entries {
		sim := ragCosineSimilarity(queryVec, entry.Vector)
		results = append(results, RAGSearchResult{
			Entry:      entry,
			Similarity: sim,
		})
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].Similarity > results[j].Similarity
	})

	if topK > len(results) {
		topK = len(results)
	}
	return results[:topK]
}

// Size returns the number of chunks in the knowledge base.
func (kb *KnowledgeBase) Size() int {
	return len(kb.entries)
}

// ============================================================
// SECTION 4 — Retrieval (Similarity Search)
// ============================================================
// WHY: Given a user's question, we embed it and find the nearest
// chunks. These chunks become the "evidence" for the LLM.

// ──────────────────────────────────────────────────────────────
// EXAMPLE BLOCK 4 — Embedding and Similarity (RAG-specific)
// ──────────────────────────────────────────────────────────────

// ragSimulateEmbedding generates deterministic fake embeddings
// for the RAG demo. Uses keyword hashing to produce meaningful
// similarity results for academic/Indian-context texts.
const ragEmbeddingDim = 64

func ragSimulateEmbedding(text string) []float32 {
	vec := make([]float32, ragEmbeddingDim)
	text = strings.ToLower(text)
	words := strings.Fields(text)

	keywordGroups := map[string][]int{
		// Space & ISRO
		"isro":         {0, 1, 2},
		"space":        {0, 1, 3},
		"satellite":    {1, 4, 5},
		"launch":       {2, 5, 6},
		"rocket":       {2, 6, 7},
		"orbit":        {3, 7, 8},
		"mars":         {9, 10, 11},
		"mangalyaan":   {9, 10, 12},
		"moon":         {13, 14, 15},
		"chandrayaan":  {13, 14, 16},
		"lunar":        {13, 15, 17},
		"vikram":       {14, 16, 18},
		"mission":      {5, 8, 19},
		"pslv":         {6, 20, 21},
		"gslv":         {6, 20, 22},
		"sarabhai":     {0, 18, 23},
		// IIT & Education
		"iit":          {24, 25, 26},
		"kharagpur":    {24, 25, 27},
		"research":     {26, 28, 29},
		"university":   {25, 29, 30},
		"engineering":  {26, 30, 31},
		"technology":   {28, 31, 32},
		"founded":      {23, 33},
		"established":  {23, 33},
		"campus":       {27, 34},
		"student":      {29, 35},
		// Ayurveda & Medicine
		"ayurveda":    {36, 37, 38},
		"medicine":    {37, 38, 39},
		"traditional": {36, 39, 40},
		"herbal":      {37, 40, 41},
		"treatment":   {38, 41, 42},
		"health":      {39, 42, 43},
		"plant":       {40, 43, 44},
		"turmeric":    {41, 44, 45},
		"neem":        {41, 44, 46},
		// General academic
		"india":       {47, 48},
		"indian":      {47, 48},
		"first":       {49, 50},
		"programme":   {19, 50},
		"program":     {19, 50},
		"development": {28, 51},
		"national":    {48, 52},
		"science":     {28, 53},
		"fuel":        {10, 54},
		"efficiency":  {11, 54},
		"cost":        {11, 55},
		"budget":      {55, 56},
	}

	for _, word := range words {
		if dims, ok := keywordGroups[word]; ok {
			for _, d := range dims {
				vec[d] += 1.0
			}
		}
		hash := uint32(0)
		for _, ch := range word {
			hash = hash*31 + uint32(ch)
		}
		idx := int(hash % uint32(ragEmbeddingDim))
		vec[idx] += 0.3
	}

	// L2 normalize
	var magnitude float64
	for _, v := range vec {
		magnitude += float64(v) * float64(v)
	}
	magnitude = math.Sqrt(magnitude)
	if magnitude > 0 {
		for i := range vec {
			vec[i] = float32(float64(vec[i]) / magnitude)
		}
	}

	return vec
}

// ragCosineSimilarity computes cosine similarity for RAG vectors.
//
//	cos(theta) = (A . B) / (||A|| * ||B||)
func ragCosineSimilarity(a, b []float32) float64 {
	if len(a) != len(b) {
		return 0.0
	}

	var dot, magA, magB float64
	for i := 0; i < len(a); i++ {
		ai, bi := float64(a[i]), float64(b[i])
		dot += ai * bi
		magA += ai * ai
		magB += bi * bi
	}

	magA = math.Sqrt(magA)
	magB = math.Sqrt(magB)

	if magA == 0 || magB == 0 {
		return 0.0
	}
	return dot / (magA * magB)
}

// ============================================================
// SECTION 5 — Prompt Augmentation
// ============================================================
// WHY: The "augmented prompt" is what makes RAG work. Instead of
// asking the LLM a bare question, we inject retrieved context:
//
//   BARE:      "When did Chandrayaan-3 land?"
//   AUGMENTED: "Based on the following documents:
//               [Doc1: Chandrayaan-3 landed on Aug 23, 2023...]
//               [Doc2: The Vikram lander touched down at...]
//               Answer: When did Chandrayaan-3 land?"
//
// The LLM now answers from the documents, not from memory.

// ──────────────────────────────────────────────────────────────
// EXAMPLE BLOCK 5 — Prompt Augmentation Construction
// ──────────────────────────────────────────────────────────────

// buildAugmentedPrompt constructs the RAG prompt with retrieved context.
func buildAugmentedPrompt(question string, retrievedChunks []RAGSearchResult) string {
	var b strings.Builder

	// System-level instruction for grounded generation
	b.WriteString("You are an academic research assistant for NDLI (National Digital Library of India).\n")
	b.WriteString("Answer the user's question based ONLY on the provided context documents.\n")
	b.WriteString("If the context does not contain enough information, say 'The provided documents do not contain sufficient information to answer this question.'\n")
	b.WriteString("Always cite your sources using [Source: DocTitle] format.\n\n")

	// Inject retrieved context
	b.WriteString("=== CONTEXT DOCUMENTS ===\n\n")
	for i, result := range retrievedChunks {
		b.WriteString(fmt.Sprintf("[Document %d: %s (Relevance: %.2f)]\n",
			i+1, result.Entry.DocTitle, result.Similarity))
		b.WriteString(result.Entry.Text)
		b.WriteString("\n\n")
	}

	// User's question
	b.WriteString("=== USER QUESTION ===\n")
	b.WriteString(question)
	b.WriteString("\n\n")
	b.WriteString("=== YOUR ANSWER (with citations) ===\n")

	return b.String()
}

func demoPromptAugmentation() {
	fmt.Println("============================================================")
	fmt.Println("DEMO 3: Prompt Augmentation")
	fmt.Println("============================================================")

	question := "When did ISRO's Mars mission launch and what made it special?"

	// Simulated retrieved chunks
	fakeResults := []RAGSearchResult{
		{
			Entry: RAGVectorEntry{
				DocTitle: "ISRO Mars Orbiter Mission",
				Text:     "The Mars Orbiter Mission (Mangalyaan) launched on November 5, 2013, from the Satish Dhawan Space Centre, Sriharikota. India became the first Asian nation to reach Mars orbit and the first nation to do so on its maiden attempt.",
			},
			Similarity: 0.94,
		},
		{
			Entry: RAGVectorEntry{
				DocTitle: "ISRO Budget and Cost Efficiency",
				Text:     "The Mars Orbiter Mission cost approximately Rs 450 crore ($74 million), making it the least expensive Mars mission ever. For comparison, the Hollywood movie 'Gravity' cost $100 million — more than India's actual mission to Mars.",
			},
			Similarity: 0.87,
		},
	}

	augmented := buildAugmentedPrompt(question, fakeResults)

	fmt.Printf("  Original question: %q\n\n", question)
	fmt.Println("  Augmented prompt (what the LLM actually receives):")
	fmt.Println("  ............................................................")
	for _, line := range strings.Split(augmented, "\n") {
		fmt.Printf("  | %s\n", line)
	}
	fmt.Println("  ............................................................")
	fmt.Println()
	fmt.Println("  Key structure:")
	fmt.Println("    1. System instruction (grounding rules)")
	fmt.Println("    2. Retrieved context (with doc titles + relevance)")
	fmt.Println("    3. User question")
	fmt.Println("    4. Answer prompt (with citation instruction)")
	fmt.Println()
}

// ============================================================
// SECTION 6 — Grounded Generation
// ============================================================
// WHY: Grounded generation is when the LLM answers using ONLY
// the provided context. The key word is "grounded" — the answer
// is anchored to real documents, not the LLM's training data.

// ──────────────────────────────────────────────────────────────
// EXAMPLE BLOCK 6 — Citation Tracking
// ──────────────────────────────────────────────────────────────

// Citation tracks which document chunk contributed to an answer.
type Citation struct {
	DocTitle  string
	ChunkText string
	Relevance float64
}

// RAGResponse is the complete output of a RAG query.
type RAGResponse struct {
	Question string
	Answer   string
	Sources  []Citation
}

// ============================================================
// SECTION 7 — The Complete RAG Pipeline
// ============================================================
// WHY: This ties everything together: ingest -> retrieve ->
// augment -> generate -> cite. The RAGPipeline struct is the
// single entry point that handles the full workflow.

// ──────────────────────────────────────────────────────────────
// EXAMPLE BLOCK 7 — RAG Pipeline Implementation
// ──────────────────────────────────────────────────────────────

// RAGPipeline combines a knowledge base with a simulated LLM
// to provide grounded, cited answers.
type RAGPipeline struct {
	KB        *KnowledgeBase
	ModelName string
}

// NewRAGPipeline creates a ready-to-use RAG pipeline.
func NewRAGPipeline(modelName string) *RAGPipeline {
	return &RAGPipeline{
		KB:        NewKnowledgeBase(),
		ModelName: modelName,
	}
}

// Ingest adds documents to the knowledge base.
func (rp *RAGPipeline) Ingest(docs []Document) {
	rp.KB.Ingest(docs)
}

// Query performs the full RAG pipeline:
//   query -> retrieve -> augment -> generate -> cite
func (rp *RAGPipeline) Query(question string, topK int) RAGResponse {
	// Step 1: RETRIEVE — find relevant chunks
	retrieved := rp.KB.Retrieve(question, topK)

	// Step 2: AUGMENT — build the augmented prompt
	augmentedPrompt := buildAugmentedPrompt(question, retrieved)
	_ = augmentedPrompt // In production, send to LLM

	// Step 3: GENERATE — get LLM response (simulated)
	answer := rp.simulateGeneration(question, retrieved)

	// Step 4: CITE — build citation list
	citations := make([]Citation, 0, len(retrieved))
	for _, r := range retrieved {
		citations = append(citations, Citation{
			DocTitle:  r.Entry.DocTitle,
			ChunkText: r.Entry.Text,
			Relevance: r.Similarity,
		})
	}

	return RAGResponse{
		Question: question,
		Answer:   answer,
		Sources:  citations,
	}
}

// simulateGeneration produces a grounded answer based on retrieved chunks.
// In production, this sends the augmented prompt to Gemini and returns
// the model's response.
func (rp *RAGPipeline) simulateGeneration(question string, retrieved []RAGSearchResult) string {
	q := strings.ToLower(question)

	switch {
	case strings.Contains(q, "mars") && (strings.Contains(q, "launch") || strings.Contains(q, "mission")):
		return `ISRO's Mars Orbiter Mission (Mangalyaan) was launched on November 5, 2013, from the Satish Dhawan Space Centre in Sriharikota [Source: ISRO Mars Orbiter Mission]. What made it particularly remarkable was its unprecedented cost efficiency — the entire mission cost approximately Rs 450 crore ($74 million), making it the least expensive Mars mission ever undertaken [Source: ISRO Budget and Cost Efficiency]. India became the first Asian nation to reach Mars orbit and notably achieved this on its very first attempt [Source: ISRO Mars Orbiter Mission].`

	case strings.Contains(q, "chandrayaan") || (strings.Contains(q, "moon") && strings.Contains(q, "land")):
		return `Chandrayaan-3 successfully achieved a soft landing near the Moon's south pole on August 23, 2023 [Source: ISRO Chandrayaan Programme]. The Vikram lander, named after ISRO founder Dr. Vikram Sarabhai, touched down in a region never before explored by any spacecraft [Source: ISRO Chandrayaan Programme]. This achievement made India the fourth country to successfully land on the Moon and the first to land near the south polar region [Source: ISRO History and Milestones].`

	case strings.Contains(q, "iit") && strings.Contains(q, "kharagpur"):
		return `IIT Kharagpur was established in 1951 as the first Indian Institute of Technology, located in Kharagpur, West Bengal [Source: IIT Kharagpur History]. The institute was founded on the site of the Hijli Detention Camp, a former political prison during British rule, symbolizing India's transition from colonial subjugation to scientific advancement [Source: IIT Kharagpur History]. It has since grown into one of India's premier engineering and research institutions [Source: IIT System Overview].`

	case strings.Contains(q, "ayurveda") || strings.Contains(q, "turmeric"):
		return `Recent research has validated several traditional Ayurvedic practices using modern scientific methods [Source: Ayurveda Research in Modern India]. Curcumin, the active compound in turmeric (haldi), has shown significant anti-inflammatory and antioxidant properties in clinical trials [Source: Ayurveda Research in Modern India]. Studies at AIIMS and IIT Delhi have demonstrated that standardized turmeric extracts can be effective as complementary treatment for various inflammatory conditions [Source: Clinical Studies on Indian Medicinal Plants].`

	default:
		// Construct answer from retrieved chunks if available
		if len(retrieved) > 0 {
			return fmt.Sprintf("Based on the available documents, here is what I found relevant to your question:\n\n%s\n\n[Source: %s]",
				truncate(retrieved[0].Entry.Text, 200),
				retrieved[0].Entry.DocTitle)
		}
		return "The provided documents do not contain sufficient information to answer this question. Please try a more specific query or check if the relevant documents have been ingested into the knowledge base."
	}
}

// ============================================================
// SECTION 8 — End-to-End RAG Demo
// ============================================================
// WHY: This brings everything together with realistic NDLI
// academic documents. The full pipeline: load documents -> chunk
// -> embed -> store -> query -> retrieve -> augment -> generate
// -> cite -> display.

// ──────────────────────────────────────────────────────────────
// EXAMPLE BLOCK 8 — Complete NDLI RAG Demo
// ──────────────────────────────────────────────────────────────

// getNDLIDocuments returns sample academic documents for the demo.
func getNDLIDocuments() []Document {
	return []Document{
		{
			ID:     "NDLI-001",
			Title:  "ISRO History and Milestones",
			Source: "ISRO Publication, 2024",
			Content: `The Indian Space Research Organisation (ISRO) was founded on August 15, 1969 by Dr. Vikram Sarabhai. Headquartered in Bengaluru, ISRO is the space agency of the Government of India. ISRO's first satellite, Aryabhata, was launched on April 19, 1975 using a Soviet Kosmos-3M rocket. The satellite was named after the 5th century Indian mathematician. In 1980, India launched Rohini satellite using the indigenous SLV-3 launch vehicle, making India the sixth nation with orbital launch capability. ISRO developed the Polar Satellite Launch Vehicle (PSLV), which became one of the most reliable rockets in the world with over 50 successful missions. The Geosynchronous Satellite Launch Vehicle (GSLV) was developed for heavier payloads to higher orbits. Chandrayaan-1 in 2008 discovered water molecules on the Moon. Chandrayaan-3 successfully landed near the Moon's south pole on August 23, 2023, making India the fourth country to achieve a soft lunar landing and the first to land near the south pole.`,
		},
		{
			ID:     "NDLI-002",
			Title:  "ISRO Mars Orbiter Mission",
			Source: "Journal of Spacecraft Technology, 2014",
			Content: `The Mars Orbiter Mission (MOM), also called Mangalyaan, was India's first interplanetary mission. It was launched on November 5, 2013, from the Satish Dhawan Space Centre in Sriharikota using a PSLV-C25 rocket. The spacecraft entered Mars orbit on September 24, 2014. India became the first Asian nation to reach Mars orbit and the first nation in the world to do so in its maiden attempt. The mission was designed to develop the technologies required for designing, planning, management and operations of an interplanetary mission. The spacecraft carried five scientific instruments including a methane sensor and a colour camera. The mission far exceeded its planned six-month duration and operated for over eight years until it lost contact in 2022.`,
		},
		{
			ID:     "NDLI-003",
			Title:  "ISRO Budget and Cost Efficiency",
			Source: "Economic Analysis of Indian Space Programme, 2023",
			Content: `ISRO is renowned globally for its cost-effective space missions. The Mars Orbiter Mission cost approximately Rs 450 crore ($74 million), making it the least expensive Mars mission in history. For perspective, the Hollywood movie Gravity (2013) had a production budget of $100 million, more than India's actual mission to Mars. ISRO's Chandrayaan-3 Moon mission cost approximately Rs 615 crore ($75 million), while NASA's Artemis programme costs billions of dollars per mission. The cost efficiency comes from frugal engineering practices, use of indigenous components, lean team structures, and innovative mission design that uses gravity-assist maneuvers to save fuel. ISRO's annual budget for 2023-24 was Rs 12,543 crore ($1.5 billion), a fraction of NASA's $25.4 billion budget.`,
		},
		{
			ID:     "NDLI-004",
			Title:  "IIT Kharagpur History",
			Source: "IIT Kharagpur Golden Jubilee Publication",
			Content: `The Indian Institute of Technology Kharagpur was established on August 18, 1951, as the first of the IITs in India. It is located in Kharagpur, West Bengal. The institute was founded on the site of the Hijli Detention Camp, where political prisoners were held during the British colonial period. This location was chosen deliberately to symbolize India's transformation from colonial subjugation to a modern nation investing in science and technology. The first batch had 224 students across 10 departments. The campus spans over 2,100 acres, making it one of the largest university campuses in the world. Notable alumni include Sundar Pichai (CEO of Google/Alphabet), Arvind Krishna (CEO of IBM), and former RBI Governor Raghuram Rajan. The Vinod Gupta School of Management was established in 1993 as the first management school within an IIT.`,
		},
		{
			ID:     "NDLI-005",
			Title:  "Ayurveda Research in Modern India",
			Source: "Indian Journal of Traditional Knowledge, 2023",
			Content: `Ayurveda, the ancient Indian system of medicine dating back over 3,000 years, is experiencing a renaissance through modern scientific validation. Research institutions across India, including AIIMS, IIT Delhi, and CSIR labs, are conducting rigorous clinical trials on traditional formulations. Curcumin, the active compound in turmeric (haldi), has been the subject of over 12,000 published studies worldwide. It demonstrates significant anti-inflammatory, antioxidant, and antimicrobial properties. Neem (Azadirachta indica) extracts have shown efficacy against over 200 species of insects and have potential applications in agriculture and medicine. Ashwagandha (Withania somnifera) has shown adaptogenic properties in randomized controlled trials, helping reduce stress and cortisol levels. The Ministry of AYUSH, established in 2014, promotes research and standardization of traditional medicine systems.`,
		},
	}
}

func demoEndToEnd() {
	fmt.Println("============================================================")
	fmt.Println("DEMO 4: End-to-End RAG Pipeline (NDLI Academic Search)")
	fmt.Println("============================================================")

	// Step 1: Create RAG pipeline
	rag := NewRAGPipeline("gemini-1.5-pro")
	fmt.Printf("  RAG Pipeline created with model: %s\n\n", rag.ModelName)

	// Step 2: Ingest documents
	docs := getNDLIDocuments()
	fmt.Printf("  Ingesting %d NDLI documents...\n", len(docs))
	rag.Ingest(docs)
	fmt.Printf("  Knowledge base built: %d chunks indexed\n\n", rag.KB.Size())

	// Show what was ingested
	fmt.Println("  Documents ingested:")
	for _, doc := range docs {
		fmt.Printf("    - [%s] %s (%s)\n", doc.ID, doc.Title, doc.Source)
	}
	fmt.Println()

	// Step 3: Query the system
	queries := []struct {
		question string
		topK     int
	}{
		{"When did ISRO's Mars mission launch and what made it special?", 3},
		{"Tell me about Chandrayaan-3 Moon landing", 3},
		{"What is the history of IIT Kharagpur?", 3},
		{"What does modern research say about turmeric and Ayurveda?", 3},
	}

	for qNum, q := range queries {
		fmt.Println("  ============================================================")
		fmt.Printf("  QUERY %d: %q\n", qNum+1, q.question)
		fmt.Println("  ============================================================")

		// Run RAG pipeline
		response := rag.Query(q.question, q.topK)

		// Display answer
		fmt.Println("\n  ANSWER:")
		// Word-wrap the answer at ~70 chars for readability
		answerLines := wordWrap(response.Answer, 68)
		for _, line := range answerLines {
			fmt.Printf("    %s\n", line)
		}

		// Display citations
		fmt.Println("\n  CITATIONS:")
		for i, citation := range response.Sources {
			chunkPreview := citation.ChunkText
			if len(chunkPreview) > 80 {
				chunkPreview = chunkPreview[:80] + "..."
			}
			fmt.Printf("    [%d] %s (relevance: %.4f)\n", i+1, citation.DocTitle, citation.Relevance)
			fmt.Printf("        %q\n", chunkPreview)
		}
		fmt.Println()
	}
}

// wordWrap splits text into lines of maxWidth characters at word boundaries.
func wordWrap(text string, maxWidth int) []string {
	if maxWidth <= 0 {
		return []string{text}
	}

	words := strings.Fields(text)
	var lines []string
	var currentLine strings.Builder

	for _, word := range words {
		if currentLine.Len() > 0 && currentLine.Len()+1+len(word) > maxWidth {
			lines = append(lines, currentLine.String())
			currentLine.Reset()
		}
		if currentLine.Len() > 0 {
			currentLine.WriteString(" ")
		}
		currentLine.WriteString(word)
	}

	if currentLine.Len() > 0 {
		lines = append(lines, currentLine.String())
	}

	return lines
}

// ============================================================
// SECTION 9 — Key Takeaways
// ============================================================

func printRAGTakeaways() {
	fmt.Println("============================================================")
	fmt.Println("KEY TAKEAWAYS — RAG (Retrieval-Augmented Generation)")
	fmt.Println("============================================================")
	fmt.Println()
	fmt.Println("  1. RAG = RETRIEVE + AUGMENT + GENERATE")
	fmt.Println("     - Retrieve relevant documents from a vector store")
	fmt.Println("     - Augment the prompt with retrieved context")
	fmt.Println("     - Generate a grounded answer with citations")
	fmt.Println()
	fmt.Println("  2. CHUNKING STRATEGY MATTERS")
	fmt.Println("     - Fixed-size: simple but may cut mid-sentence")
	fmt.Println("     - Sentence-based: preserves meaning, variable size")
	fmt.Println("     - Overlap: prevents information loss at boundaries")
	fmt.Println("     - Choose based on document type and retrieval needs")
	fmt.Println()
	fmt.Println("  3. KNOWLEDGE BASE PIPELINE")
	fmt.Println("     - Document -> Chunk -> Embed -> Store (offline, done once)")
	fmt.Println("     - Query -> Embed -> Search -> Top-K chunks (online, per query)")
	fmt.Println()
	fmt.Println("  4. PROMPT AUGMENTATION IS KEY")
	fmt.Println("     - System instruction: 'Answer ONLY from context'")
	fmt.Println("     - Inject retrieved chunks with doc titles + relevance")
	fmt.Println("     - Ask for citations in the response format")
	fmt.Println()
	fmt.Println("  5. GROUNDING PREVENTS HALLUCINATION")
	fmt.Println("     - LLM answers from YOUR documents, not training memory")
	fmt.Println("     - If context is insufficient, model should say so")
	fmt.Println("     - Citations let users verify the answer")
	fmt.Println()
	fmt.Println("  6. PRODUCTION CONSIDERATIONS")
	fmt.Println("     - Vector DB: Pinecone, Weaviate, pgvector for scale")
	fmt.Println("     - Re-ranking: Use a cross-encoder to re-rank top-K results")
	fmt.Println("     - Evaluation: Measure retrieval recall + answer faithfulness")
	fmt.Println("     - Hybrid search: Combine keyword (BM25) + vector search")
	fmt.Println()
	fmt.Println("  NDLI IMPACT: Researchers get answers grounded in real academic")
	fmt.Println("  papers, with citations. No more hallucinated facts in research.")
	fmt.Println()
}

// ============================================================
// MAIN — Run all demos
// ============================================================

func main() {
	fmt.Println()
	fmt.Println("============================================================")
	fmt.Println("  FILE 38 : AI — RAG Basics (NDLI Academic Search)")
	fmt.Println("============================================================")
	fmt.Println()

	demoRAGConcept()
	demoChunking()
	demoPromptAugmentation()
	demoEndToEnd()
	printRAGTakeaways()
}
