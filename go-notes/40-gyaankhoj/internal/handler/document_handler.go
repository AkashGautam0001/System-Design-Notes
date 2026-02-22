// ============================================================
//  Document Handlers — CRUD for Knowledge Base Documents
// ============================================================
//  WHY: These handlers manage the lifecycle of TCS knowledge
//  documents — from ingestion (upload + chunk + embed) to
//  retrieval and deletion. The ingest endpoint is the entry
//  point for the RAG pipeline: raw text goes in, indexed
//  vectors come out.
//
//  At TCS, documents flow in from multiple sources: Confluence
//  wikis, Git READMEs, SharePoint policies, Slack digests.
//  Each source calls the ingest API to add its content to
//  GyaanKhoj's searchable knowledge base.
// ============================================================

package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"

	"gyaankhoj/internal/model"
)

// ──────────────────────────────────────────────────────────────
// DocumentHandler manages document CRUD operations.
// WHY a struct with ragService? Dependency injection — the handler
// does not create its own RAGService. It receives one from main.go.
// This makes testing easy: inject a mock RAGService in tests.
// ──────────────────────────────────────────────────────────────

// DocumentHandler handles document ingestion and retrieval.
type DocumentHandler struct {
	ragService *RAGService
}

// NewDocumentHandler creates a new DocumentHandler.
func NewDocumentHandler(rag *RAGService) *DocumentHandler {
	return &DocumentHandler{ragService: rag}
}

// ──────────────────────────────────────────────────────────────
// HandleIngest — POST /api/documents
// Accepts a document, chunks it, embeds the chunks, and stores
// them in the vector database.
//
// WHY synchronous? For single documents, the latency is acceptable
// (< 1 second with simulated embeddings). For bulk ingestion,
// TCS would use a message queue (Kafka) for async processing.
// ──────────────────────────────────────────────────────────────

// HandleIngest processes a single document through the RAG pipeline.
func (h *DocumentHandler) HandleIngest(w http.ResponseWriter, r *http.Request) {
	var req model.IngestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	// Validate required fields.
	if req.Title == "" {
		respondError(w, http.StatusBadRequest, "title is required")
		return
	}
	if req.Content == "" {
		respondError(w, http.StatusBadRequest, "content is required")
		return
	}

	resp, err := h.ragService.IngestDocument(r.Context(), req)
	if err != nil {
		log.Printf("[ERROR] ingesting document: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to ingest document")
		return
	}

	log.Printf("[INGEST] Document '%s' → %d chunks (ID: %s)", req.Title, resp.ChunksCreated, resp.DocumentID)
	respondJSON(w, http.StatusCreated, resp)
}

// ──────────────────────────────────────────────────────────────
// HandleBulkIngest — POST /api/documents/bulk
// Processes multiple documents in a single request.
//
// WHY bulk? When TCS migrates a Confluence space (100+ pages)
// to GyaanKhoj, sending one request per page is slow. Bulk
// ingest processes them all in one HTTP round-trip.
// ──────────────────────────────────────────────────────────────

// HandleBulkIngest processes multiple documents in one request.
func (h *DocumentHandler) HandleBulkIngest(w http.ResponseWriter, r *http.Request) {
	var req model.BulkIngestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	if len(req.Documents) == 0 {
		respondError(w, http.StatusBadRequest, "no documents provided")
		return
	}

	results := make([]model.IngestResponse, 0, len(req.Documents))
	var failedCount int

	for _, doc := range req.Documents {
		if doc.Title == "" || doc.Content == "" {
			failedCount++
			continue
		}

		resp, err := h.ragService.IngestDocument(r.Context(), doc)
		if err != nil {
			log.Printf("[ERROR] bulk ingest document '%s': %v", doc.Title, err)
			failedCount++
			continue
		}

		results = append(results, *resp)
	}

	log.Printf("[BULK INGEST] %d succeeded, %d failed out of %d documents",
		len(results), failedCount, len(req.Documents))

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"ingested": results,
		"total":    len(req.Documents),
		"success":  len(results),
		"failed":   failedCount,
	})
}

// ──────────────────────────────────────────────────────────────
// HandleListDocuments — GET /api/documents
// Returns all documents in the knowledge base.
// ──────────────────────────────────────────────────────────────

// HandleListDocuments returns all documents.
func (h *DocumentHandler) HandleListDocuments(w http.ResponseWriter, r *http.Request) {
	docs := h.ragService.ListDocuments()
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"documents": docs,
		"total":     len(docs),
	})
}

// ──────────────────────────────────────────────────────────────
// HandleGetDocument — GET /api/documents/{id}
// Returns a single document by ID.
// ──────────────────────────────────────────────────────────────

// HandleGetDocument returns a single document by ID.
func (h *DocumentHandler) HandleGetDocument(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respondError(w, http.StatusBadRequest, "document ID is required")
		return
	}

	doc, ok := h.ragService.GetDocument(id)
	if !ok {
		respondError(w, http.StatusNotFound, "document not found")
		return
	}

	respondJSON(w, http.StatusOK, doc)
}

// ──────────────────────────────────────────────────────────────
// HandleDeleteDocument — DELETE /api/documents/{id}
// Removes a document and all its vectors from the store.
//
// WHY delete vectors too? Orphaned vectors would pollute search
// results — returning chunks from a document that no longer exists.
// The RAGService handles cascading deletion.
// ──────────────────────────────────────────────────────────────

// HandleDeleteDocument removes a document and its vectors.
func (h *DocumentHandler) HandleDeleteDocument(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respondError(w, http.StatusBadRequest, "document ID is required")
		return
	}

	if err := h.ragService.DeleteDocument(r.Context(), id); err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	log.Printf("[DELETE] Document %s removed with vectors", id)
	respondJSON(w, http.StatusOK, map[string]string{
		"message": "document and vectors deleted",
		"id":      id,
	})
}
