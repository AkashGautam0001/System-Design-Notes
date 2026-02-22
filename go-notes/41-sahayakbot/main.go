// ============================================================
//  Chapter 41 — SahayakBot: AI Conversational Agent
// ============================================================
//  SahayakBot (सहायकबॉट) means "helper bot" in Hindi.
//
//  STORY: Swiggy — India's largest food delivery platform —
//  handles 10,000+ customer support queries every minute.
//  "Where is my biryani?", "Refund my cold paneer tikka",
//  "Find me good dosa places near Koramangala."
//
//  SahayakBot is the AI agent that powers this:
//  - Understands user intent from natural language
//  - Calls internal tools (order lookup, refund, restaurant search)
//  - Maintains conversation memory so users never repeat themselves
//  - Communicates via WebSocket for real-time chat
//
//  Think of it as giving every Swiggy user their own personal
//  support executive — one who never sleeps, never forgets,
//  and resolves queries in under 3 seconds.
//
//  TECH: Chi router, WebSocket (gorilla), Gemini (simulated),
//        session memory, tool registry
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

	"sahayakbot/internal/ai"
	"sahayakbot/internal/config"
	"sahayakbot/internal/handler"
	"sahayakbot/internal/middleware"
	"sahayakbot/internal/session"
	"sahayakbot/internal/tools"
)

func main() {
	// ──────────────────────────────────────────────────────────────
	// STEP 1 — Load configuration
	// ──────────────────────────────────────────────────────────────
	// WHY: Centralising config means the same binary works in dev
	// (no API key, simulated mode) and production (real Gemini key).
	// Swiggy's platform team in Bangalore uses env vars so the same
	// Docker image deploys to staging and prod without rebuilds.
	cfg := config.Load()

	// ──────────────────────────────────────────────────────────────
	// STEP 2 — Initialise the AI client
	// ──────────────────────────────────────────────────────────────
	// WHY: If GEMINI_API_KEY is empty, the client runs in simulated
	// mode — analysing intent with keyword matching and returning
	// realistic responses. This lets the team build the full chat
	// pipeline without spending API credits during development.
	geminiClient := ai.NewGeminiClient(cfg.GeminiAPIKey, ai.SystemPrompt)
	log.Printf("[INIT] Gemini client ready (simulated=%v)", cfg.GeminiAPIKey == "")

	// ──────────────────────────────────────────────────────────────
	// STEP 3 — Register tools (the agent's capabilities)
	// ──────────────────────────────────────────────────────────────
	// WHY: Tools are plugins — each one teaches the AI a new skill.
	// Adding a "cancel order" feature is just one Register() call.
	// Swiggy's bot team adds new tools every sprint without touching
	// the core AI logic. This is the plugin architecture pattern.
	registry := tools.NewRegistry()
	tools.RegisterSwiggyTools(registry)
	log.Printf("[INIT] Tool registry ready (%d tools registered)", len(registry.ListTools()))

	// ──────────────────────────────────────────────────────────────
	// STEP 4 — Initialise the session manager
	// ──────────────────────────────────────────────────────────────
	// WHY: Without session memory, every message is a blank slate.
	// The user says "check order #12345", then "cancel it" — the
	// bot needs to remember what "it" refers to. Sessions store
	// conversation history and trim old messages to stay within
	// the AI's context window.
	sessionMgr := session.NewManager(cfg.MaxSessionHistory, cfg.SessionTimeout)
	log.Printf("[INIT] Session manager ready (maxHistory=%d, timeout=%v)",
		cfg.MaxSessionHistory, cfg.SessionTimeout)

	// Start the background cleanup goroutine for expired sessions.
	// WHY: Swiggy handles millions of sessions daily. Without cleanup,
	// memory grows unbounded. This goroutine runs every minute and
	// removes sessions that haven't been active within the timeout.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go sessionMgr.CleanupLoop(ctx, 1*time.Minute)

	// ──────────────────────────────────────────────────────────────
	// STEP 5 — Build the Chi router
	// ──────────────────────────────────────────────────────────────
	// WHY: Chi gives us net/http compatibility with clean routing.
	// Swiggy's microservices standardise on Chi because middleware
	// composes naturally and it has zero external dependencies.
	chatHandler := handler.NewChatHandler(geminiClient, registry, sessionMgr, cfg.MaxToolCalls)

	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.RequestLogger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.CORS)

	// Health check — load balancer hits this every 10 seconds
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy","service":"sahayakbot"}`))
	})

	// API routes
	r.Route("/api", func(r chi.Router) {
		r.Post("/chat", chatHandler.HandleChat)
		r.Post("/sessions", chatHandler.HandleCreateSession)
		r.Get("/sessions/{id}", chatHandler.HandleGetSession)
		r.Delete("/sessions/{id}", chatHandler.HandleDeleteSession)
		r.Get("/tools", chatHandler.HandleListTools)
	})

	// WebSocket route — the star feature for real-time chat
	r.Get("/ws/chat", chatHandler.HandleWebSocket)

	// ──────────────────────────────────────────────────────────────
	// STEP 6 — Start server with graceful shutdown
	// ──────────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine so shutdown logic can run on main
	go func() {
		log.Printf("[SERVER] SahayakBot listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[SERVER] Fatal: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("[SERVER] Shutting down gracefully...")
	cancel() // Stop the cleanup goroutine

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("[SERVER] Forced shutdown: %v", err)
	}

	log.Println("[SERVER] SahayakBot stopped. Alvida! (Goodbye!)")
}
