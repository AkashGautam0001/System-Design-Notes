// ============================================================
//  NotesKaro — CRUD Notes API (Chapter 33)
// ============================================================
//  A lightweight REST API for managing learning notes, built
//  with Chi router and SQLite (pure Go, no CGO).
//
//  WHY THIS PROJECT:
//  Chapters 1-32 taught Go fundamentals in single files.
//  Now we graduate to multi-package projects — the way real
//  Go services are structured. This project introduces:
//    • Chi router (lightweight, net/http-compatible)
//    • SQLite via modernc.org (pure Go, CGO_ENABLED=0)
//    • internal/ package layout
//    • Repository pattern
//    • Middleware chains
//    • Graceful shutdown
// ============================================================

// ============================================================
// STORY: Infosys Mysore Training Campus
// Thousands of trainees arrive at the Mysore campus each
// quarter. During their intensive training, they need a
// simple API to save learning notes — categorized by topic,
// searchable by category, editable when understanding deepens.
// NotesKaro is that API: lightweight enough to run on a
// trainee's laptop, robust enough to serve a batch of 200.
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

	"noteskaro/internal/config"
	"noteskaro/internal/handler"
	"noteskaro/internal/middleware"
	"noteskaro/internal/store"
)

func main() {
	// ──────────────────────────────────────────────────────────────
	// Step 1: Load Configuration
	// ──────────────────────────────────────────────────────────────
	// WHY: Externalized config lets us change behavior (port, DB path)
	// without recompiling. The twelve-factor app methodology mandates
	// storing config in environment variables.
	cfg := config.Load()
	log.Printf("NotesKaro starting with config: port=%s, db=%s", cfg.Port, cfg.DBPath)

	// ──────────────────────────────────────────────────────────────
	// Step 2: Initialize the SQLite Store
	// ──────────────────────────────────────────────────────────────
	// WHY: The store is created first because handlers depend on it.
	// Dependencies flow inward: main → handler → store → model.
	// If the database cannot be opened, we fail fast — no point
	// starting a server that cannot persist data.
	noteStore, err := store.NewSQLiteStore(cfg.DBPath)
	if err != nil {
		log.Fatalf("Failed to initialize store: %v", err)
	}
	defer noteStore.Close()
	log.Println("SQLite store initialized successfully")

	// ──────────────────────────────────────────────────────────────
	// Step 3: Create Handler (Constructor Injection)
	// ──────────────────────────────────────────────────────────────
	// WHY: The handler receives its dependencies (the store) via the
	// constructor — not through globals or init(). This makes testing
	// trivial: pass a mock store in tests, real store in production.
	noteHandler := handler.NewNoteHandler(noteStore)

	// ──────────────────────────────────────────────────────────────
	// Step 4: Set Up Chi Router + Middleware Stack
	// ──────────────────────────────────────────────────────────────
	// WHY Chi? It is a lightweight router that implements http.Handler.
	// Unlike heavy frameworks (Gin, Echo), Chi does not impose its own
	// context or response types. Your handlers remain plain
	// http.HandlerFunc — you can eject Chi and keep all your code.
	r := chi.NewRouter()

	// Middleware order matters! Think of it as layers of an onion:
	//   Recovery (outermost) → RequestID → Logger → ContentType → Handler
	//
	// Recovery MUST be outermost so it catches panics from any layer.
	// RequestID should be early so the Logger can include it.
	// ContentType is innermost because it only affects the response.
	r.Use(middleware.Recovery)
	r.Use(middleware.RequestID)
	r.Use(middleware.RequestLogger)
	r.Use(middleware.ContentType)

	// ──────────────────────────────────────────────────────────────
	// Step 5: Register Routes
	// ──────────────────────────────────────────────────────────────
	// WHY subrouter? Grouping under /api/notes keeps the URL namespace
	// clean and lets us apply route-specific middleware later (e.g.,
	// authentication in Chapter 34).
	r.Get("/health", noteHandler.HandleHealth)

	r.Route("/api/notes", func(sub chi.Router) {
		noteHandler.Routes(sub)
	})

	// ──────────────────────────────────────────────────────────────
	// Step 6: Create HTTP Server with Timeouts
	// ──────────────────────────────────────────────────────────────
	// WHY timeouts? Without them, a slow client can hold a connection
	// open forever, exhausting server resources. ReadTimeout limits
	// how long we wait for the request body. WriteTimeout limits how
	// long we spend sending the response. IdleTimeout covers
	// keep-alive connections sitting idle.
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}

	// ──────────────────────────────────────────────────────────────
	// Step 7: Graceful Shutdown
	// ──────────────────────────────────────────────────────────────
	// WHY: When the training session ends (or during deployment),
	// we want in-flight requests to complete rather than getting
	// abruptly killed. Go's http.Server.Shutdown() does exactly this:
	// it stops accepting new connections but lets active ones finish
	// within the given context deadline.
	//
	// Signal flow:
	//   SIGINT/SIGTERM → quit channel → Shutdown(ctx) → done channel
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Start server in a goroutine so we can listen for signals.
	go func() {
		log.Printf("NotesKaro server listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Block until we receive a shutdown signal.
	sig := <-quit
	fmt.Println() // newline after ^C
	log.Printf("Received signal %v, shutting down gracefully...", sig)

	// Give in-flight requests 30 seconds to complete.
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Forced shutdown: %v", err)
	}

	log.Println("NotesKaro stopped cleanly. Alag se milte hain!")
}
