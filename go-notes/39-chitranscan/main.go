// ============================================================
//  Chapter 39 — ChitranScan: AI Image Analyzer
// ============================================================
//  ChitranScan (चित्रणस्कैन) means "image scan" in Hindi.
//
//  STORY: BigBasket — India's leading online grocery platform —
//  operates 30+ warehouses processing 100,000+ items daily.
//  When a truck arrives with 500 crates of produce, each must
//  be inspected for freshness, defects, and correct labelling.
//
//  ChitranScan is the AI-powered quality inspector:
//  - Photograph a crate of mangoes → get a freshness score
//  - Snap a packaged goods label → extract expiry date
//  - Batch-analyze 10 items at once → concurrent goroutines
//
//  Think of it as giving every warehouse worker a genius food
//  scientist's eye — except it never gets tired, never plays
//  favourites, and processes a crate in under 2 seconds.
//
//  TECH: Chi router, Gemini multimodal (simulated), goroutines
// ============================================================

package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"

	"chitranscan/internal/ai"
	"chitranscan/internal/config"
	"chitranscan/internal/handler"
	"chitranscan/internal/middleware"
)

func main() {
	// ──────────────────────────────────────────────────────────────
	// STEP 1 — Load configuration
	// ──────────────────────────────────────────────────────────────
	// WHY: Centralising config means the same binary works in dev
	// (no API key, simulated responses) and production (real Gemini
	// key, strict limits). Twelve-Factor App methodology.
	cfg := config.Load()

	// ──────────────────────────────────────────────────────────────
	// STEP 2 — Initialise the Gemini AI client
	// ──────────────────────────────────────────────────────────────
	// WHY: If GEMINI_API_KEY is empty, the client runs in simulated
	// mode — returning realistic fake analyses. This lets developers
	// build and test the full pipeline without spending API credits.
	// BigBasket's dev team in Bangalore uses this during sprints.
	geminiClient := ai.NewGeminiClient(cfg.GeminiAPIKey, cfg.AnalysisTimeout)
	log.Printf("[INIT] Gemini client ready (simulated=%v)", cfg.GeminiAPIKey == "")

	// ──────────────────────────────────────────────────────────────
	// STEP 3 — Create handler with dependencies
	// ──────────────────────────────────────────────────────────────
	analysisHandler := handler.NewAnalysisHandler(geminiClient, cfg)

	// ──────────────────────────────────────────────────────────────
	// STEP 4 — Build Chi router with middleware
	// ──────────────────────────────────────────────────────────────
	// WHY Chi: It's the most popular Go router that stays compatible
	// with net/http. Middleware chains, URL params, subrouters — all
	// without magic or heavy frameworks.
	r := chi.NewRouter()

	// Global middleware — applied to every request
	r.Use(middleware.RequestLogger)
	r.Use(middleware.Recovery)
	r.Use(middleware.CORS)
	r.Use(middleware.MaxBodySize(cfg.MaxFileSize))

	// ──────────────────────────────────────────────────────────────
	// STEP 5 — Register routes
	// ──────────────────────────────────────────────────────────────
	r.Get("/health", analysisHandler.HandleHealth)
	r.Post("/api/analyze", analysisHandler.HandleAnalyze)
	r.Post("/api/analyze/batch", analysisHandler.HandleBatchAnalyze)
	r.Get("/api/analysis/{id}", analysisHandler.HandleGetAnalysis)

	// ──────────────────────────────────────────────────────────────
	// STEP 6 — Start server with graceful shutdown
	// ──────────────────────────────────────────────────────────────
	// WHY graceful shutdown: BigBasket's warehouse runs 24/7. When
	// we deploy a new version, in-flight image analyses must finish
	// before the old process exits — otherwise a batch of 10 images
	// might lose results for 3 of them.
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	go func() {
		log.Printf("[SERVER] ChitranScan listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[FATAL] server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[SHUTDOWN] signal received, draining connections...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("[FATAL] forced shutdown: %v", err)
	}
	log.Println("[SHUTDOWN] ChitranScan stopped gracefully")
}
