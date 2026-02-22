// ============================================================
//  GyaanKhoj — RAG Search Engine for TCS Knowledge Base
// ============================================================
//  WHY: TCS (Tata Consultancy Services) has 600,000+ employees
//  generating thousands of documents weekly. GyaanKhoj lets
//  employees search this knowledge base using natural language,
//  powered by RAG (Retrieval-Augmented Generation).
//
//  Gyaan (ज्ञान) = Knowledge  |  Khoj (खोज) = Search
//
//  ARCHITECTURE:
//    Client → Chi Router → Handlers → RAG Service → AI + VectorDB
//
//  The RAG pipeline:
//    INGEST:  Document → Chunk → Embed → Store in Qdrant
//    SEARCH:  Query → Embed → Vector Search → Ranked Results
//    ASK:     Query → Search → Augment Prompt → Generate Answer
//
//  FALLBACK: Works without Qdrant (in-memory vector store) and
//  without Gemini API key (simulated embeddings + generation).
//  Run `go run main.go` and it just works.
// ============================================================

package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"

	"gyaankhoj/internal/ai"
	"gyaankhoj/internal/config"
	"gyaankhoj/internal/handler"
	"gyaankhoj/internal/middleware"
	"gyaankhoj/internal/vectordb"
)

func main() {
	// ──────────────────────────────────────────────────────────
	// Step 1: Load configuration from environment variables.
	// WHY environment variables? The twelve-factor app methodology
	// mandates config in the environment — same binary runs in
	// dev, staging, and production with different env vars.
	// ──────────────────────────────────────────────────────────
	cfg := config.Load()

	fmt.Println("============================================================")
	fmt.Println("  GyaanKhoj (ज्ञान खोज) — RAG Search Engine")
	fmt.Println("  Knowledge Search for TCS Internal Documentation")
	fmt.Println("============================================================")
	fmt.Printf("  Port:           %s\n", cfg.Port)
	fmt.Printf("  Qdrant URL:     %s\n", cfg.QdrantURL)
	fmt.Printf("  Collection:     %s\n", cfg.CollectionName)
	fmt.Printf("  Embedding Dim:  %d\n", cfg.EmbeddingDim)
	fmt.Printf("  Chunk Size:     %d (overlap: %d)\n", cfg.ChunkSize, cfg.ChunkOverlap)
	fmt.Printf("  Top-K:          %d (min score: %.2f)\n", cfg.TopK, cfg.SimilarityThreshold)
	fmt.Println("============================================================")

	// ──────────────────────────────────────────────────────────
	// Step 2: Initialize the AI client.
	// If GEMINI_API_KEY is empty, it runs in simulated mode.
	// Simulated mode generates deterministic embeddings using FNV
	// hashing — same text always produces the same vector.
	// ──────────────────────────────────────────────────────────
	aiClient := ai.NewAIClient(cfg.GeminiAPIKey, cfg.EmbeddingDim)

	// ──────────────────────────────────────────────────────────
	// Step 3: Initialize the vector store.
	// Tries Qdrant first. If Qdrant is unavailable (no Docker,
	// no network), falls back to an in-memory store.
	// WHY fallback? So that `go run main.go` works on any laptop.
	// ──────────────────────────────────────────────────────────
	vectorStore := vectordb.NewVectorStore(cfg.QdrantURL, cfg.CollectionName, cfg.EmbeddingDim)

	// ──────────────────────────────────────────────────────────
	// Step 4: Initialize the RAG service.
	// This is the orchestrator that ties AI + VectorDB together.
	// All handlers delegate to RAGService — they never call AI
	// or VectorDB directly.
	// ──────────────────────────────────────────────────────────
	ragService := handler.NewRAGService(
		aiClient, vectorStore,
		cfg.ChunkSize, cfg.ChunkOverlap,
		cfg.TopK, cfg.SimilarityThreshold,
	)

	// ──────────────────────────────────────────────────────────
	// Step 5: Seed sample TCS documents on startup.
	// WHY seed? So that search and ask work immediately after
	// starting the server. Developers can test the full RAG
	// pipeline without manually creating documents first.
	// ──────────────────────────────────────────────────────────
	seedDocs := handler.SeedDocuments()
	fmt.Printf("\n[SEED] Ingesting %d sample TCS documents...\n", len(seedDocs))

	for _, doc := range seedDocs {
		resp, err := ragService.IngestDocument(context.Background(), doc)
		if err != nil {
			log.Printf("[SEED] Failed to ingest '%s': %v", doc.Title, err)
			continue
		}
		fmt.Printf("[SEED] '%s' → %d chunks (%s)\n", doc.Title, resp.ChunksCreated, resp.Duration)
	}
	fmt.Println()

	// ──────────────────────────────────────────────────────────
	// Step 6: Set up Chi router with middleware and routes.
	// WHY Chi? Lightweight, net/http compatible, great middleware
	// support. At TCS, Chi is the standard router for Go services.
	// ──────────────────────────────────────────────────────────
	r := chi.NewRouter()

	// Middleware stack — order matters!
	// RequestID first (so all subsequent middleware can use it),
	// then Recoverer (catch panics), Logger (log requests), CORS.
	r.Use(middleware.RequestID)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestLogger)
	r.Use(middleware.CORS)

	// Initialize handlers.
	docHandler := handler.NewDocumentHandler(ragService)
	searchHandler := handler.NewSearchHandler(ragService)

	// ── Document routes ──────────────────────────────────────
	r.Post("/api/documents", docHandler.HandleIngest)
	r.Post("/api/documents/bulk", docHandler.HandleBulkIngest)
	r.Get("/api/documents", docHandler.HandleListDocuments)
	r.Get("/api/documents/{id}", docHandler.HandleGetDocument)
	r.Delete("/api/documents/{id}", docHandler.HandleDeleteDocument)

	// ── Search & RAG routes ──────────────────────────────────
	r.Post("/api/search", searchHandler.HandleSearch)
	r.Post("/api/ask", searchHandler.HandleAsk)

	// ── Health check ─────────────────────────────────────────
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy","service":"gyaankhoj"}`))
	})

	// ──────────────────────────────────────────────────────────
	// Step 7: Start HTTP server with graceful shutdown.
	// WHY graceful shutdown? When Kubernetes sends SIGTERM during
	// a rolling update, in-flight requests must complete before
	// the pod terminates. Without graceful shutdown, users see
	// connection resets.
	// ──────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine.
	go func() {
		fmt.Printf("GyaanKhoj server listening on http://localhost:%s\n", cfg.Port)
		fmt.Println("Try: curl -X POST http://localhost:" + cfg.Port + "/api/ask -H 'Content-Type: application/json' -d '{\"question\":\"What are the code review guidelines?\"}'")
		fmt.Println()
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[FATAL] server error: %v", err)
		}
	}()

	// Wait for interrupt signal.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	fmt.Println("\n[SHUTDOWN] Received signal, shutting down gracefully...")

	// Give in-flight requests 10 seconds to complete.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("[FATAL] forced shutdown: %v", err)
	}

	fmt.Println("[SHUTDOWN] GyaanKhoj stopped. Dhanyavaad! (Thank you!)")
}
