// ============================================================
//  FILE main.go — BazaarAPI Entry Point
// ============================================================
//  Topic  : Multi-resource E-Commerce API
//           Chi router, SQLite, JWT, bcrypt, transactions
//
//  WHY THIS MATTERS:
//  Real-world APIs are not single-table CRUD apps. They have
//  multiple resources with relationships, role-based access,
//  database transactions, and pagination. BazaarAPI brings all
//  of this together — the culmination of Ch 33 (NotesKaro CRUD)
//  and Ch 34 (Dwarpal Auth).
// ============================================================

// ============================================================
// STORY: BazaarAPI — Flipkart Big Billion Days
// It is October in Bangalore. The Flipkart engineering war room
// is buzzing. Big Billion Days — India's largest online sale —
// goes live in 48 hours. Millions of users will flood the
// platform: browsing products, racing for flash deals, filling
// carts, and hammering the checkout button. BazaarAPI powers
// it all: products, carts, orders, and users — with database
// transactions ensuring no two users can buy the last item.
// ============================================================

package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"bazaarapi/internal/auth"
	"bazaarapi/internal/config"
	"bazaarapi/internal/handler"
	"bazaarapi/internal/middleware"
	"bazaarapi/internal/store"

	"github.com/go-chi/chi/v5"
	_ "modernc.org/sqlite"
)

func main() {
	// ──────────────────────────────────────────────────────────────
	// Step 1: Load configuration from environment variables.
	// WHY load config first? Because every other component depends
	// on it — DB path, JWT secret, server timeouts. Fail fast if
	// configuration is invalid.
	// ──────────────────────────────────────────────────────────────
	cfg := config.Load()
	log.Printf("BazaarAPI starting on port %s", cfg.Port)

	// ──────────────────────────────────────────────────────────────
	// Step 2: Open the SQLite database.
	// WHY PRAGMA foreign_keys = ON? SQLite disables foreign key
	// enforcement by default (for backwards compatibility). Without
	// this pragma, a cart item could reference a non-existent product
	// — silent data corruption. We enable it to catch integrity
	// violations immediately.
	// WHY _journal_mode=WAL? Write-Ahead Logging allows concurrent
	// readers even while a write is in progress. Critical for Big
	// Billion Days traffic where reads vastly outnumber writes.
	// ──────────────────────────────────────────────────────────────
	db, err := sql.Open("sqlite", cfg.DBPath+"?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)")
	if err != nil {
		log.Fatalf("FATAL: open database: %v", err)
	}
	defer db.Close()

	// Verify the database connection.
	if err := db.Ping(); err != nil {
		log.Fatalf("FATAL: ping database: %v", err)
	}
	log.Println("Database connected:", cfg.DBPath)

	// ──────────────────────────────────────────────────────────────
	// Step 3: Initialize stores (repositories).
	// WHY this order? Because of foreign key dependencies:
	// - UserStore must exist before ProductStore (seller_id → users)
	// - ProductStore must exist before CartStore (product_id → products)
	// - ProductStore + CartStore before OrderStore (it depends on both)
	// ──────────────────────────────────────────────────────────────
	userStore, err := store.NewUserStore(db)
	if err != nil {
		log.Fatalf("FATAL: init user store: %v", err)
	}

	productStore, err := store.NewProductStore(db)
	if err != nil {
		log.Fatalf("FATAL: init product store: %v", err)
	}

	cartStore, err := store.NewCartStore(db)
	if err != nil {
		log.Fatalf("FATAL: init cart store: %v", err)
	}

	orderStore, err := store.NewOrderStore(db, productStore, cartStore)
	if err != nil {
		log.Fatalf("FATAL: init order store: %v", err)
	}

	log.Println("All stores initialized — tables created")

	// ──────────────────────────────────────────────────────────────
	// Step 4: Initialize auth service.
	// ──────────────────────────────────────────────────────────────
	jwtService := auth.NewJWTService(cfg.JWTSecret, cfg.JWTExpiry)

	// ──────────────────────────────────────────────────────────────
	// Step 5: Initialize handlers with dependency injection.
	// WHY inject dependencies? So that handlers are decoupled from
	// the specific store implementation. In tests, you could inject
	// mock stores. In production, real SQLite stores.
	// ──────────────────────────────────────────────────────────────
	authHandler := handler.NewAuthHandler(userStore, jwtService)
	productHandler := handler.NewProductHandler(productStore)
	cartHandler := handler.NewCartHandler(cartStore, productStore)
	orderHandler := handler.NewOrderHandler(orderStore)

	// ──────────────────────────────────────────────────────────────
	// Step 6: Build the router with Chi.
	// WHY Chi? It is a lightweight router that is 100% compatible
	// with net/http. Handlers are plain http.HandlerFunc — no
	// framework lock-in. Subrouters (r.Route) and groups (r.Group)
	// make organizing middleware per route group clean and readable.
	// ──────────────────────────────────────────────────────────────
	r := chi.NewRouter()

	// Global middleware — applied to every request.
	r.Use(middleware.CORS)
	r.Use(middleware.Logger)

	// Health check — useful for Docker health probes and load balancers.
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"bazaarapi"}`))
	})

	// ──────────────────────────────────────────────────────────────
	// Public routes — no authentication required.
	// WHY public? Product browsing must be accessible to everyone.
	// Making users register before they can even see products would
	// kill conversion rates during Big Billion Days.
	// ──────────────────────────────────────────────────────────────
	r.Route("/api", func(r chi.Router) {
		// Auth endpoints — register and login.
		r.Post("/auth/register", authHandler.HandleRegister)
		r.Post("/auth/login", authHandler.HandleLogin)

		// Public product endpoints — browse the catalog.
		r.Get("/products", productHandler.HandleList)
		r.Get("/products/{id}", productHandler.HandleGetByID)

		// ──────────────────────────────────────────────────────────
		// Protected routes — require a valid JWT.
		// WHY a Group instead of Route? Because Group inherits the
		// parent path (/api) and lets us layer middleware without
		// creating a new URL prefix. Everything below requires auth.
		// ──────────────────────────────────────────────────────────
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireAuth(jwtService))

			// User profile
			r.Get("/profile", func(w http.ResponseWriter, r *http.Request) {
				userID, ok := r.Context().Value("user_id").(int64)
				if !ok {
					http.Error(w, `{"error":"user not authenticated"}`, http.StatusUnauthorized)
					return
				}
				user, err := userStore.GetByID(r.Context(), userID)
				if err != nil || user == nil {
					http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				fmt.Fprintf(w, `{"id":%d,"email":"%s","name":"%s","role":"%s"}`,
					user.ID, user.Email, user.Name, user.Role)
			})

			// Cart endpoints — all require auth.
			r.Get("/cart", cartHandler.HandleGetCart)
			r.Post("/cart", cartHandler.HandleAddItem)
			r.Put("/cart/{productId}", cartHandler.HandleUpdateItem)
			r.Delete("/cart/{productId}", cartHandler.HandleRemoveItem)

			// Order endpoints — all require auth.
			r.Post("/orders", orderHandler.HandleCreateOrder)
			r.Get("/orders", orderHandler.HandleGetOrders)
			r.Get("/orders/{id}", orderHandler.HandleGetOrder)
		})

		// ──────────────────────────────────────────────────────────
		// Admin routes — require JWT + "admin" role.
		// WHY a separate group? Because admin routes need two layers
		// of middleware: RequireAuth (is the user logged in?) and
		// RequireRole("admin") (is the user an admin?). Regular users
		// get a 403 Forbidden on these endpoints.
		// ──────────────────────────────────────────────────────────
		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.RequireAuth(jwtService))
			r.Use(middleware.RequireRole("admin"))

			// Product management
			r.Post("/products", productHandler.HandleCreate)
			r.Put("/products/{id}", productHandler.HandleUpdate)
			r.Delete("/products/{id}", productHandler.HandleDelete)

			// Order management
			r.Put("/orders/{id}/status", orderHandler.HandleUpdateStatus)
		})
	})

	// ──────────────────────────────────────────────────────────────
	// Step 7: Configure and start the HTTP server.
	// WHY explicit timeouts? Without them, a slow client could hold
	// a connection open forever, exhausting server resources. During
	// Big Billion Days, with millions of connections, even one slow
	// client matters. ReadTimeout, WriteTimeout, and IdleTimeout
	// protect against resource exhaustion.
	// ──────────────────────────────────────────────────────────────
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}

	// ──────────────────────────────────────────────────────────────
	// Step 8: Graceful shutdown.
	// WHY graceful shutdown? Because during Big Billion Days, the ops
	// team deploys updates without downtime. When a new version starts,
	// the old server receives SIGTERM. Without graceful shutdown, all
	// in-flight requests (including checkout transactions!) would be
	// killed mid-stream. With it, the server stops accepting new
	// connections but lets existing requests finish within a deadline.
	// ──────────────────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("Server listening on http://localhost:%s", cfg.Port)
		log.Println("Routes: /health, /api/auth/*, /api/products/*, /api/cart/*, /api/orders/*, /api/admin/*")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("FATAL: server error: %v", err)
		}
	}()

	// Block until we receive a signal.
	sig := <-quit
	log.Printf("Received signal %v — initiating graceful shutdown", sig)

	// Give in-flight requests up to 30 seconds to complete.
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("FATAL: server shutdown: %v", err)
	}

	log.Println("Server stopped gracefully. Shukriya for using BazaarAPI!")
}
