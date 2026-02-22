// ============================================================
//  RAGService — The Orchestrator of the RAG Pipeline
// ============================================================
//  WHY: RAGService is the brain of GyaanKhoj. It ties together
//  the AI client (embeddings + generation), vector store (storage
//  + retrieval), and document processing (chunking). No handler
//  talks to AI or VectorDB directly — everything goes through
//  RAGService. This is the Facade pattern.
//
//  At TCS, the RAG pipeline processes 50,000+ queries per day
//  across 600,000 employees. The pipeline must be:
//  1. FAST — sub-second search results
//  2. ACCURATE — relevant chunks, not random noise
//  3. TRACEABLE — every answer citable to source documents
//
//  The three operations:
//  - IngestDocument: chunk → embed → store (offline, during upload)
//  - Search: embed query → vector search → rank (online, fast)
//  - Ask: Search + generate answer + citations (online, slower)
// ============================================================

package handler

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"gyaankhoj/internal/ai"
	"gyaankhoj/internal/model"
	"gyaankhoj/internal/vectordb"
)

// ──────────────────────────────────────────────────────────────
// RAGService ties AI, VectorDB, and document processing together.
// ──────────────────────────────────────────────────────────────

// RAGService orchestrates the complete RAG pipeline.
type RAGService struct {
	aiClient    *ai.AIClient
	vectorStore vectordb.VectorStore
	chunkSize   int
	chunkOverlap int
	topK        int
	minScore    float64

	// In-memory document metadata store.
	// WHY in-memory? For this educational project, we store document
	// metadata in a map. In production TCS, this would be PostgreSQL
	// or MongoDB — but the RAG concepts are identical.
	mu        sync.RWMutex
	documents map[string]model.Document
}

// NewRAGService creates a new RAG service.
func NewRAGService(aiClient *ai.AIClient, store vectordb.VectorStore, chunkSize, overlap, topK int, minScore float64) *RAGService {
	return &RAGService{
		aiClient:     aiClient,
		vectorStore:  store,
		chunkSize:    chunkSize,
		chunkOverlap: overlap,
		topK:         topK,
		minScore:     minScore,
		documents:    make(map[string]model.Document),
	}
}

// ──────────────────────────────────────────────────────────────
// IngestDocument — the offline pipeline.
// STEPS:
//   1. Create document record with unique ID
//   2. Split content into overlapping chunks
//   3. Generate embeddings for each chunk
//   4. Store vectors + metadata in vector DB
//
// WHY chunk before embedding? Embedding models have token limits
// (typically 512-8192 tokens). More importantly, smaller chunks
// give more precise retrieval — when someone asks about "password
// policy", we return the specific paragraph, not the entire 50-page
// security document.
// ──────────────────────────────────────────────────────────────

// IngestDocument processes a document through the RAG ingestion pipeline.
func (s *RAGService) IngestDocument(ctx context.Context, req model.IngestRequest) (*model.IngestResponse, error) {
	start := time.Now()

	// Step 1: Create document with unique ID.
	docID := fmt.Sprintf("doc-%d", time.Now().UnixNano())
	doc := model.Document{
		ID:        docID,
		Title:     req.Title,
		Content:   req.Content,
		Source:    req.Source,
		Category:  req.Category,
		Tags:      req.Tags,
		CreatedAt: time.Now(),
	}

	// Store document metadata.
	s.mu.Lock()
	s.documents[docID] = doc
	s.mu.Unlock()

	// Step 2: Chunk the document content.
	chunks := chunkText(req.Content, s.chunkSize, s.chunkOverlap)
	if len(chunks) == 0 {
		return &model.IngestResponse{
			DocumentID:    docID,
			ChunksCreated: 0,
			Duration:      time.Since(start).String(),
		}, nil
	}

	// Step 3: Generate embeddings for all chunks.
	// WHY batch embedding? One API call for 40 chunks is much faster
	// than 40 individual calls. Gemini supports batch embedding.
	chunkTexts := make([]string, len(chunks))
	for i, c := range chunks {
		chunkTexts[i] = c.Text
	}

	vectors, err := s.aiClient.GenerateEmbeddings(ctx, chunkTexts)
	if err != nil {
		return nil, fmt.Errorf("generating embeddings: %w", err)
	}

	// Step 4: Store in vector DB with metadata payload.
	// WHY store metadata in the vector payload? So that search results
	// include document title, source, etc. without a separate DB lookup.
	points := make([]vectordb.Point, len(chunks))
	for i, chunk := range chunks {
		chunkID := fmt.Sprintf("%s-chunk-%d", docID, i)
		points[i] = vectordb.Point{
			ID:     chunkID,
			Vector: vectors[i],
			Payload: map[string]interface{}{
				"document_id":    docID,
				"document_title": req.Title,
				"document_source": req.Source,
				"category":       req.Category,
				"chunk_text":     chunk.Text,
				"chunk_index":    i,
				"start_index":    chunk.StartIndex,
				"end_index":      chunk.EndIndex,
			},
		}
	}

	if err := s.vectorStore.Upsert(ctx, points); err != nil {
		return nil, fmt.Errorf("storing vectors: %w", err)
	}

	return &model.IngestResponse{
		DocumentID:    docID,
		ChunksCreated: len(chunks),
		Duration:      time.Since(start).String(),
	}, nil
}

// ──────────────────────────────────────────────────────────────
// Search — the online retrieval pipeline.
// STEPS:
//   1. Embed the search query
//   2. Find top-K similar vectors in the store
//   3. Return ranked results with metadata
//
// WHY embed the query? To search by meaning, the query must be
// in the same vector space as the documents. "How to deploy?" and
// "deployment steps" produce similar vectors, enabling semantic
// matching.
// ──────────────────────────────────────────────────────────────

// Search performs semantic similarity search across the knowledge base.
func (s *RAGService) Search(ctx context.Context, query string, topK int, minScore float64) ([]model.SearchResult, error) {
	if topK <= 0 {
		topK = s.topK
	}
	if minScore <= 0 {
		minScore = s.minScore
	}

	// Step 1: Embed the query.
	queryVector, err := s.aiClient.GenerateEmbedding(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("embedding query: %w", err)
	}

	// Step 2: Vector similarity search.
	scored, err := s.vectorStore.Search(ctx, queryVector, topK, minScore)
	if err != nil {
		return nil, fmt.Errorf("vector search: %w", err)
	}

	// Step 3: Convert to SearchResult with metadata.
	results := make([]model.SearchResult, len(scored))
	for i, sp := range scored {
		results[i] = model.SearchResult{
			ChunkText:      payloadString(sp.Payload, "chunk_text"),
			DocumentTitle:  payloadString(sp.Payload, "document_title"),
			DocumentSource: payloadString(sp.Payload, "document_source"),
			Score:          sp.Score,
			DocumentID:     payloadString(sp.Payload, "document_id"),
		}
	}

	return results, nil
}

// ──────────────────────────────────────────────────────────────
// Ask — the full RAG pipeline (Search + Generate).
// STEPS:
//   1. Search for relevant chunks (same as Search above)
//   2. Build a prompt with question + context passages
//   3. Send to LLM for answer generation
//   4. Package answer with citations
//
// WHY citations? At TCS, the compliance team requires every
// AI-generated answer to be traceable to an approved source
// document. Citations enable verification and build trust.
// ──────────────────────────────────────────────────────────────

// Ask performs the full RAG pipeline: search + generate answer with citations.
func (s *RAGService) Ask(ctx context.Context, question string, topK int) (*model.AskResponse, error) {
	start := time.Now()

	if topK <= 0 {
		topK = s.topK
	}

	// Step 1: Retrieve relevant chunks.
	results, err := s.Search(ctx, question, topK, s.minScore)
	if err != nil {
		return nil, fmt.Errorf("search step: %w", err)
	}

	if len(results) == 0 {
		return &model.AskResponse{
			Answer:         "I could not find any relevant documents to answer your question. Please try rephrasing or check if the topic has been documented.",
			Citations:      []model.Citation{},
			Confidence:     0,
			ProcessingTime: time.Since(start).String(),
		}, nil
	}

	// Step 2: Collect context passages for prompt augmentation.
	passages := make([]string, len(results))
	for i, r := range results {
		passages[i] = r.ChunkText
	}

	// Step 3: Generate answer using LLM with context.
	answer, err := s.aiClient.GenerateAnswer(ctx, question, passages)
	if err != nil {
		return nil, fmt.Errorf("generation step: %w", err)
	}

	// Step 4: Build citations.
	citations := make([]model.Citation, len(results))
	for i, r := range results {
		citations[i] = model.Citation{
			DocumentTitle: r.DocumentTitle,
			ChunkText:     r.ChunkText,
			Score:         r.Score,
			Source:        r.DocumentSource,
		}
	}

	// Calculate average confidence from scores.
	var totalScore float64
	for _, r := range results {
		totalScore += r.Score
	}
	confidence := totalScore / float64(len(results))

	return &model.AskResponse{
		Answer:         answer,
		Citations:      citations,
		Confidence:     confidence,
		ProcessingTime: time.Since(start).String(),
	}, nil
}

// ──────────────────────────────────────────────────────────────
// Document metadata accessors.
// ──────────────────────────────────────────────────────────────

// GetDocument retrieves a document by ID.
func (s *RAGService) GetDocument(id string) (model.Document, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	doc, ok := s.documents[id]
	return doc, ok
}

// ListDocuments returns all documents.
func (s *RAGService) ListDocuments() []model.Document {
	s.mu.RLock()
	defer s.mu.RUnlock()

	docs := make([]model.Document, 0, len(s.documents))
	for _, doc := range s.documents {
		docs = append(docs, doc)
	}
	return docs
}

// DeleteDocument removes a document and its vectors.
func (s *RAGService) DeleteDocument(ctx context.Context, id string) error {
	s.mu.Lock()
	doc, ok := s.documents[id]
	if !ok {
		s.mu.Unlock()
		return fmt.Errorf("document %s not found", id)
	}
	delete(s.documents, id)
	s.mu.Unlock()

	// Calculate how many chunks this document had and delete them.
	chunkCount := len(chunkText(doc.Content, s.chunkSize, s.chunkOverlap))
	chunkIDs := make([]string, chunkCount)
	for i := 0; i < chunkCount; i++ {
		chunkIDs[i] = fmt.Sprintf("%s-chunk-%d", id, i)
	}

	if len(chunkIDs) > 0 {
		if err := s.vectorStore.Delete(ctx, chunkIDs); err != nil {
			return fmt.Errorf("deleting vectors: %w", err)
		}
	}

	return nil
}

// ──────────────────────────────────────────────────────────────
// chunkText splits text into overlapping chunks.
//
// WHY overlapping? Without overlap, context at chunk boundaries
// is lost. Consider a sentence that spans two chunks:
//
//   "...TCS requires two approvals. | All PRs must include tests..."
//   ← chunk 1 ends here            → chunk 2 starts here
//
// With 50-char overlap, chunk 2 also includes "two approvals."
// This redundancy improves retrieval quality at chunk boundaries.
//
// CHUNKING ALGORITHM:
//   1. Start at position 0.
//   2. Take `size` characters.
//   3. Try to break at a sentence boundary (. ! ? newline).
//   4. If no boundary found, break at last space.
//   5. Advance by (actual_chunk_length - overlap).
//   6. Repeat until end of text.
// ──────────────────────────────────────────────────────────────

func chunkText(text string, size, overlap int) []model.Chunk {
	if len(text) == 0 {
		return nil
	}

	// Sensible defaults.
	if size <= 0 {
		size = 500
	}
	if overlap < 0 {
		overlap = 0
	}
	if overlap >= size {
		overlap = size / 5
	}

	var chunks []model.Chunk
	start := 0

	for start < len(text) {
		end := start + size
		if end > len(text) {
			end = len(text)
		}

		// Try to find a natural break point (sentence end or newline).
		if end < len(text) {
			breakPoint := end
			// Look backwards for a sentence boundary.
			for bp := end; bp > start+size/2; bp-- {
				if text[bp] == '.' || text[bp] == '!' || text[bp] == '?' || text[bp] == '\n' {
					breakPoint = bp + 1
					break
				}
			}
			// If no sentence boundary, try a space.
			if breakPoint == end {
				for bp := end; bp > start+size/2; bp-- {
					if text[bp] == ' ' {
						breakPoint = bp + 1
						break
					}
				}
			}
			end = breakPoint
		}

		chunkContent := strings.TrimSpace(text[start:end])
		if len(chunkContent) > 0 {
			chunks = append(chunks, model.Chunk{
				Text:       chunkContent,
				StartIndex: start,
				EndIndex:   end,
			})
		}

		// Advance position: move forward by chunk length minus overlap.
		advance := end - start - overlap
		if advance <= 0 {
			advance = 1 // Prevent infinite loop.
		}
		start += advance
	}

	return chunks
}

// payloadString safely extracts a string from the payload map.
func payloadString(payload map[string]interface{}, key string) string {
	if v, ok := payload[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
