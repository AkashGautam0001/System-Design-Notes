// ============================================================
//  PACKAGE model — Document Data Structures
// ============================================================
//  WHY: The document is the atomic unit of knowledge in GyaanKhoj.
//  At TCS, documents range from 1-page runbooks to 50-page
//  architecture decision records. Each document is chunked into
//  smaller pieces for embedding and vector storage — because
//  embedding models have token limits, and smaller chunks give
//  more precise search results.
//
//  CHUNKING INSIGHT: A 10-page TCS security policy might become
//  40 chunks of ~500 characters each. When someone asks "What is
//  the password rotation policy?", we find the 3 most relevant
//  chunks — not the entire 10-page document. This precision is
//  what makes RAG powerful.
// ============================================================

package model

import "time"

// ──────────────────────────────────────────────────────────────
// Document — a single knowledge article in the TCS knowledge base.
// WHY separate ID from database auto-increment? We use UUIDs so
// that documents can be ingested from multiple sources (Confluence,
// SharePoint, Git wikis) without ID collisions.
// ──────────────────────────────────────────────────────────────

// Document represents a knowledge base article.
type Document struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Source    string    `json:"source"`
	Category  string    `json:"category"`
	Tags      []string  `json:"tags"`
	CreatedAt time.Time `json:"created_at"`
}

// ──────────────────────────────────────────────────────────────
// Chunk — a piece of a document after text splitting.
// WHY track StartIndex and EndIndex? So we can highlight the
// exact passage in the original document when showing citations.
// The TCS legal team needs to verify that AI answers come from
// approved policy documents — character offsets make this possible.
// ──────────────────────────────────────────────────────────────

// Chunk represents a piece of a document with its embedding vector.
type Chunk struct {
	ID         string    `json:"id"`
	DocumentID string    `json:"document_id"`
	Text       string    `json:"text"`
	StartIndex int       `json:"start_index"`
	EndIndex   int       `json:"end_index"`
	Vector     []float32 `json:"vector,omitempty"`
}

// ──────────────────────────────────────────────────────────────
// Request/Response DTOs for document ingestion.
// WHY separate IngestRequest from Document? The client should not
// set ID or CreatedAt — those are server-generated. Clean API
// boundaries prevent accidental data corruption.
// ──────────────────────────────────────────────────────────────

// IngestRequest is the JSON body for ingesting a new document.
type IngestRequest struct {
	Title    string   `json:"title"`
	Content  string   `json:"content"`
	Source   string   `json:"source"`
	Category string   `json:"category"`
	Tags     []string `json:"tags"`
}

// BulkIngestRequest holds multiple documents for batch ingestion.
type BulkIngestRequest struct {
	Documents []IngestRequest `json:"documents"`
}

// IngestResponse reports the result of a document ingestion.
type IngestResponse struct {
	DocumentID    string `json:"document_id"`
	ChunksCreated int    `json:"chunks_created"`
	Duration      string `json:"duration"`
}
