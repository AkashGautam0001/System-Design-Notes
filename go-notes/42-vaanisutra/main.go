package main

// ============================================================
// Chapter 42: VaaniSutra — AI Processing Pipeline (CAPSTONE)
// ============================================================
// Jio's call center processes millions of customer calls daily.
// VaaniSutra (Vaani = speech/voice, Sutra = formula/system)
// is the AI pipeline that analyzes every transcript through
// multiple stages: sentiment analysis, entity extraction,
// summarization, and vector storage for semantic search.
//
// This is the CAPSTONE project of the Go course — it combines
// goroutines (ch15), channels (ch15), select (ch16), context
// (ch18), concurrency patterns (ch28), HTTP servers (ch32),
// and vector databases (ch40) into one production-grade system.
// ============================================================

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"vaanisutra/internal/ai"
	"vaanisutra/internal/config"
	"vaanisutra/internal/handler"
	"vaanisutra/internal/middleware"
	"vaanisutra/internal/pipeline"
	"vaanisutra/internal/vectordb"
)

func main() {
	// ──────────────────────────────────────────────────────────────
	// Step 1: Load configuration
	// WHY: Centralized config lets us change behaviour via env vars
	// without recompiling — essential for Docker/K8s deployments
	// at Jio's scale.
	// ──────────────────────────────────────────────────────────────
	cfg := config.Load()

	// ──────────────────────────────────────────────────────────────
	// Step 2: Initialize AI client
	// WHY: The AI client wraps Gemini API calls (or simulated
	// equivalents). By abstracting this, Jio engineers can swap
	// between providers without touching pipeline code.
	// ──────────────────────────────────────────────────────────────
	aiClient := ai.NewAIClient(cfg.GeminiAPIKey)
	log.Printf("[VaaniSutra] AI client initialized (simulated=%v)", cfg.GeminiAPIKey == "")

	// ──────────────────────────────────────────────────────────────
	// Step 3: Initialize vector store (Qdrant or in-memory fallback)
	// WHY: In-memory fallback means developers can run VaaniSutra
	// without Docker/Qdrant — lowering the barrier to entry.
	// ──────────────────────────────────────────────────────────────
	vectorStore := vectordb.NewVectorStore(cfg.QdrantURL, cfg.CollectionName, cfg.EmbeddingDim)

	// ──────────────────────────────────────────────────────────────
	// Step 4: Create and start the processing pipeline
	// WHY: The pipeline is the heart of VaaniSutra. It uses worker
	// pools (bounded concurrency) and fan-out/fan-in (parallel AI
	// stages) to process transcripts efficiently.
	// ──────────────────────────────────────────────────────────────
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pipe := pipeline.NewPipeline(aiClient, vectorStore, cfg.WorkerCount, cfg.QueueSize)
	pipe.Start(ctx)
	log.Printf("[VaaniSutra] Pipeline started with %d workers, queue size %d", cfg.WorkerCount, cfg.QueueSize)

	// ──────────────────────────────────────────────────────────────
	// Step 5: Set up HTTP handlers and routes
	// WHY: Chi router gives us middleware support, URL parameters,
	// and route grouping — everything Jio's API gateway expects.
	// ──────────────────────────────────────────────────────────────
	transcriptHandler := handler.NewTranscriptHandler(pipe)
	searchHandler := handler.NewSearchHandler(vectorStore, pipe)

	r := chi.NewRouter()

	// Global middleware
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.CORS)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(30 * time.Second))

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Transcript endpoints
		r.Post("/transcripts", transcriptHandler.HandleSubmit)
		r.Post("/transcripts/batch", transcriptHandler.HandleBatchSubmit)
		r.Get("/transcripts/{id}", transcriptHandler.HandleGetTranscript)
		r.Get("/transcripts", transcriptHandler.HandleListTranscripts)

		// Search endpoint
		r.Post("/search", searchHandler.HandleSearch)

		// Pipeline monitoring
		r.Get("/pipeline/status", transcriptHandler.HandlePipelineStatus)
	})

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy","service":"vaanisutra"}`))
	})

	// ──────────────────────────────────────────────────────────────
	// Step 6: Start HTTP server with graceful shutdown
	// WHY: Graceful shutdown ensures in-flight transcripts finish
	// processing before the server exits. At Jio's scale, an
	// ungraceful shutdown could lose thousands of transcripts
	// during a deployment.
	// ──────────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in background
	go func() {
		log.Printf("[VaaniSutra] Server starting on port %s", cfg.Port)
		log.Printf("[VaaniSutra] Endpoints:")
		log.Printf("  POST /api/transcripts         — submit transcript")
		log.Printf("  POST /api/transcripts/batch    — submit batch")
		log.Printf("  GET  /api/transcripts/{id}     — get result")
		log.Printf("  GET  /api/transcripts          — list results")
		log.Printf("  POST /api/search               — semantic search")
		log.Printf("  GET  /api/pipeline/status       — pipeline metrics")
		log.Printf("  GET  /health                   — health check")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[VaaniSutra] Server failed: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("[VaaniSutra] Shutting down gracefully...")

	// Step 1: Stop accepting new requests
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	// Step 2: Drain the pipeline (stop workers, wait for in-flight)
	cancel() // Cancel pipeline context
	pipe.Shutdown()
	log.Println("[VaaniSutra] Pipeline drained successfully")

	// Step 3: Shut down HTTP server
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("[VaaniSutra] Server shutdown error: %v", err)
	}

	log.Println("[VaaniSutra] Server stopped. Goodbye!")
}
