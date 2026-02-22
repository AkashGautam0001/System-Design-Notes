// ============================================================
//  Chapter 34 — DwarPal: Auth Gateway
// ============================================================
//  DwarPal (द्वारपाल) means "doorkeeper" in Hindi.
//
//  STORY: Zerodha — India's largest stock broker — processes
//  millions of trades daily. Before any trader can place an
//  order, view their portfolio, or access any API, they must
//  pass through the dwar (gate). DwarPal is the gateway that
//  authenticates every request using JWT tokens.
//
//  Think of it as the security guard at the NSE trading floor:
//  - Show your ID (login) → get a visitor pass (access token)
//  - Pass expires in 15 minutes → get it renewed (refresh)
//  - Different badges for traders vs admins (RBAC)
//  - No pass? No entry. Wrong badge? Wrong floor.
//
//  TECH: Chi router, SQLite, JWT (HMAC-SHA256), bcrypt
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

	"dwarpal/internal/auth"
	"dwarpal/internal/config"
	"dwarpal/internal/handler"
	"dwarpal/internal/middleware"
	"dwarpal/internal/store"
)

func main() {
	// ──────────────────────────────────────────────────────────────
	// STEP 1 — Load configuration
	// ──────────────────────────────────────────────────────────────
	// WHY: Centralising config means we change behaviour via env
	// vars, not code changes. Twelve-Factor App methodology.
	cfg := config.Load()

	// ──────────────────────────────────────────────────────────────
	// STEP 2 — Initialise the SQLite store
	// ──────────────────────────────────────────────────────────────
	// WHY: We use modernc.org/sqlite — a pure-Go SQLite driver that
	// needs zero CGO. Perfect for containerised deployments.
	userStore, err := store.NewUserStore(cfg.DBPath)
	if err != nil {
		log.Fatalf("[FATAL] failed to initialise database: %v", err)
	}
	defer userStore.Close()

	// ──────────────────────────────────────────────────────────────
	// STEP 3 — Initialise the JWT auth service
	// ──────────────────────────────────────────────────────────────
	jwtService := auth.NewJWTService(cfg.JWTSecret, cfg.JWTExpiry, cfg.RefreshExpiry)

	// ──────────────────────────────────────────────────────────────
	// STEP 4 — Create handlers
	// ──────────────────────────────────────────────────────────────
	authHandler := handler.NewAuthHandler(userStore, jwtService, cfg.BcryptCost)

	// ──────────────────────────────────────────────────────────────
	// STEP 5 — Set up Chi router
	// ──────────────────────────────────────────────────────────────
	// WHY Chi? It's 100% compatible with net/http, supports
	// middleware groups, URL params, and is used by many Go shops.
	r := chi.NewRouter()

	// Global middleware — applied to every request
	r.Use(middleware.RequestLogger)
	r.Use(middleware.CORS)

	// Public routes — the dwar is open, no token needed
	// These are the "registration counter" and "login window"
	r.Post("/api/auth/register", authHandler.HandleRegister)
	r.Post("/api/auth/login", authHandler.HandleLogin)
	r.Post("/api/auth/refresh", authHandler.HandleRefresh)

	// Protected routes — must show a valid token to enter
	r.Group(func(r chi.Router) {
		r.Use(middleware.JWTAuth(jwtService))

		// Any authenticated user can view their own profile
		r.Get("/api/users/me", authHandler.HandleMe)

		// Admin-only routes — the "management floor"
		// WHY nested group? RequireRole checks happen AFTER JWTAuth,
		// so we know the user is authenticated before checking role.
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireRole("admin"))
			r.Get("/api/admin/users", authHandler.HandleListUsers)
		})
	})

	// ──────────────────────────────────────────────────────────────
	// STEP 6 — Start server with graceful shutdown
	// ──────────────────────────────────────────────────────────────
	// WHY graceful shutdown? In production, we want in-flight
	// requests (e.g., a trade being placed) to complete before
	// the server stops. Abrupt termination = lost trades.
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Channel to listen for OS signals (Ctrl+C, docker stop, etc.)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("[DwarPal] 🚪 Gateway open on port %s", cfg.Port)
		log.Printf("[DwarPal] The dwar is ready — traders may enter")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[FATAL] server error: %v", err)
		}
	}()

	// Block until we receive a shutdown signal
	<-quit
	log.Println("[DwarPal] Shutdown signal received — closing the dwar...")

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("[FATAL] forced shutdown: %v", err)
	}

	log.Println("[DwarPal] Gateway closed gracefully. Shubh ratri!")
}
