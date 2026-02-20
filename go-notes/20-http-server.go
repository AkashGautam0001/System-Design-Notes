// ============================================================
//  FILE 20 : HTTP Server
// ============================================================
//  Topic  : http.HandleFunc, http.ListenAndServe, http.Handler,
//           http.HandlerFunc, http.ServeMux, request/response,
//           JSON responses, middleware pattern, graceful shutdown
//
//  WHY THIS MATTERS:
//  Building HTTP servers is one of Go's killer features. The
//  standard library includes a production-grade HTTP server —
//  no framework required. Understanding handlers, muxes, and
//  middleware gives you the foundation for any web service, API,
//  or microservice you'll ever build in Go.
// ============================================================

// ============================================================
// STORY: India Post Office
// Postmaster Lakshmi builds a system to receive and route dak.
// Each clerk (handler) sits at a service counter and handles a
// specific type of request — speed post, registered mail, money
// order. The sorting room (ServeMux) routes dak to the right
// clerk. Middleware is the security checkpoint every parcel
// passes through before reaching a clerk. When the day ends,
// Lakshmi shuts down gracefully — finishing every dak in
// progress before closing the doors.
// ============================================================

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"time"
)

// ──────────────────────────────────────────────────────────────
// Types used across multiple blocks
// ──────────────────────────────────────────────────────────────

// dakItem represents a piece of dak in Lakshmi's post office.
type dakItem struct {
	ID      int    `json:"id"`
	From    string `json:"from"`
	To      string `json:"to"`
	Subject string `json:"subject"`
}

// footfallCounter tracks customer visits — implements http.Handler.
type footfallCounter struct {
	mu    sync.Mutex
	count int
}

// ServeHTTP satisfies the http.Handler interface.
func (fc *footfallCounter) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	fc.mu.Lock()
	fc.count++
	current := fc.count
	fc.mu.Unlock()
	fmt.Fprintf(w, "Footfall count: %d", current)
}

func main() {
	// ============================================================
	// EXAMPLE BLOCK 1 — Basic Handlers, ServeMux, JSON Responses
	// ============================================================

	// ──────────────────────────────────────────────────────────────
	// SECTION 1 — http.HandleFunc & basic handlers
	// ──────────────────────────────────────────────────────────────
	// WHY: A handler is any function with the signature
	// func(w http.ResponseWriter, r *http.Request). HandleFunc
	// registers it on a ServeMux. Each handler is a "clerk"
	// at a counter in Lakshmi's India Post office.

	fmt.Println("--- BLOCK 1: Basic Handlers, ServeMux, JSON ---")

	// WHY: We use httptest.NewServer so the file runs and exits cleanly.
	// In production you would use http.ListenAndServe(":8080", mux).

	mux := http.NewServeMux()

	// Basic text handler
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// WHY: w.Write sends raw bytes to the client
		w.Write([]byte("Welcome to India Post, Lakshmi's branch!"))
	})

	// Handler that reads the request method and path
	mux.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		// WHY: r.Method and r.URL give you request details
		fmt.Fprintf(w, "Method: %s, Path: %s", r.Method, r.URL.Path)
	})

	// ──────────────────────────────────────────────────────────────
	// SECTION 2 — JSON responses
	// ──────────────────────────────────────────────────────────────
	// WHY: Most APIs return JSON. Set Content-Type header and
	// use json.NewEncoder to stream the response directly.

	mux.HandleFunc("/dak", func(w http.ResponseWriter, r *http.Request) {
		items := []dakItem{
			{ID: 1, From: "Ramesh", To: "Suresh", Subject: "Speed Post"},
			{ID: 2, From: "Anita", To: "Kavita", Subject: "Money Order"},
		}
		// WHY: Set Content-Type BEFORE writing the body
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(items)
	})

	// ──────────────────────────────────────────────────────────────
	// SECTION 3 — Custom http.Handler interface
	// ──────────────────────────────────────────────────────────────
	// WHY: The Handler interface has one method: ServeHTTP.
	// Implementing it on a struct lets you attach state (like
	// a counter) to your handler.

	counter := &footfallCounter{}
	mux.Handle("/footfall", counter)

	// Start test server for Block 1
	server1 := httptest.NewServer(mux)
	defer server1.Close()

	fmt.Println("India Post server started at", server1.URL)

	// Test the root handler
	resp, _ := http.Get(server1.URL + "/")
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	fmt.Println("GET /:", string(body))
	// Output: GET /: Welcome to India Post, Lakshmi's branch!

	// Test the status handler
	resp, _ = http.Get(server1.URL + "/status")
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	fmt.Println("GET /status:", string(body))
	// Output: GET /status: Method: GET, Path: /status

	// Test JSON response
	resp, _ = http.Get(server1.URL + "/dak")
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	fmt.Println("GET /dak:", strings.TrimSpace(string(body)))
	// Output: GET /dak: [{"id":1,"from":"Ramesh","to":"Suresh","subject":"Speed Post"},{"id":2,"from":"Anita","to":"Kavita","subject":"Money Order"}]
	fmt.Println("Content-Type:", resp.Header.Get("Content-Type"))
	// Output: Content-Type: application/json

	// Test counter handler (implements http.Handler)
	http.Get(server1.URL + "/footfall")
	http.Get(server1.URL + "/footfall")
	resp, _ = http.Get(server1.URL + "/footfall")
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	fmt.Println("GET /footfall:", string(body))
	// Output: GET /footfall: Footfall count: 3

	// ============================================================
	// EXAMPLE BLOCK 2 — Request Parsing, Headers, Middleware
	// ============================================================

	fmt.Println("\n--- BLOCK 2: Request Parsing, Middleware ---")

	// ──────────────────────────────────────────────────────────────
	// SECTION 4 — Request parsing: query params, body, headers
	// ──────────────────────────────────────────────────────────────
	// WHY: Real APIs need to parse query strings, read POST bodies,
	// and inspect headers. Go makes all of these straightforward.

	mux2 := http.NewServeMux()

	// Query parameters
	mux2.HandleFunc("/track", func(w http.ResponseWriter, r *http.Request) {
		// WHY: r.URL.Query() parses ?key=value pairs
		query := r.URL.Query()
		trackingID := query.Get("id")
		serviceType := query.Get("type")
		if serviceType == "" {
			serviceType = "speed-post"
		}
		fmt.Fprintf(w, "Tracking %q via %s", trackingID, serviceType)
	})

	// POST body parsing
	mux2.HandleFunc("/send", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			// WHY: WriteHeader sets the HTTP status code
			w.WriteHeader(http.StatusMethodNotAllowed)
			w.Write([]byte("Only POST allowed"))
			return
		}
		// WHY: r.Body is an io.ReadCloser — always read and close it
		bodyBytes, err := io.ReadAll(r.Body)
		defer r.Body.Close()
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		var item dakItem
		if err := json.Unmarshal(bodyBytes, &item); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("Invalid JSON"))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "dispatched",
			"from":    item.From,
			"to":      item.To,
			"subject": item.Subject,
		})
	})

	// Header inspection
	mux2.HandleFunc("/headers", func(w http.ResponseWriter, r *http.Request) {
		// WHY: r.Header gives access to all request headers
		agent := r.Header.Get("User-Agent")
		custom := r.Header.Get("X-Sender")
		fmt.Fprintf(w, "User-Agent: %s | X-Sender: %s", agent, custom)
	})

	// ──────────────────────────────────────────────────────────────
	// SECTION 5 — Middleware pattern
	// ──────────────────────────────────────────────────────────────
	// WHY: Middleware wraps a handler to add cross-cutting concerns
	// like logging, auth, CORS, or timing. It is just a function
	// that takes a handler and returns a handler.

	// Logging middleware — logs every request
	loggingMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			// WHY: call the next handler in the chain
			next.ServeHTTP(w, r)
			elapsed := time.Since(start)
			fmt.Printf("  [LOG] %s %s — %v\n", r.Method, r.URL.Path, elapsed.Round(time.Microsecond))
		})
	}

	// Auth middleware — checks for a postal seal header
	authMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := r.Header.Get("X-Postal-Seal")
			if key != "india-post-123" {
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte("Unauthorized: invalid postal seal"))
				return
			}
			next.ServeHTTP(w, r)
		})
	}

	// Protected endpoint — wrapped with both middleware
	protectedHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Welcome to the restricted sorting room!"))
	})
	mux2.Handle("/protected", loggingMiddleware(authMiddleware(protectedHandler)))

	server2 := httptest.NewServer(loggingMiddleware(mux2))
	defer server2.Close()

	// Test query params
	resp, _ = http.Get(server2.URL + "/track?id=EM123456789IN&type=registered")
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	fmt.Println("GET /track:", string(body))
	// Output: GET /track: Tracking "EM123456789IN" via registered

	// Test POST body
	dakJSON := `{"from":"Lakshmi","to":"Mehra","subject":"Registered parcel from Delhi"}`
	resp, _ = http.Post(server2.URL+"/send", "application/json", strings.NewReader(dakJSON))
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	fmt.Println("POST /send:", strings.TrimSpace(string(body)))
	// Output: POST /send: {"from":"Lakshmi","status":"dispatched","subject":"Registered parcel from Delhi","to":"Mehra"}

	// Test headers
	req, _ := http.NewRequest("GET", server2.URL+"/headers", nil)
	req.Header.Set("X-Sender", "Postmaster-Lakshmi")
	resp, _ = http.DefaultClient.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	fmt.Println("GET /headers:", string(body))
	// Output: GET /headers: User-Agent: Go-http-client/1.1 | X-Sender: Postmaster-Lakshmi

	// Test auth middleware — without seal
	resp, _ = http.Get(server2.URL + "/protected")
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	fmt.Printf("GET /protected (no seal): %d %s\n", resp.StatusCode, string(body))
	// Output: GET /protected (no seal): 401 Unauthorized: invalid postal seal

	// Test auth middleware — with seal
	req, _ = http.NewRequest("GET", server2.URL+"/protected", nil)
	req.Header.Set("X-Postal-Seal", "india-post-123")
	resp, _ = http.DefaultClient.Do(req)
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	fmt.Printf("GET /protected (with seal): %d %s\n", resp.StatusCode, string(body))
	// Output: GET /protected (with seal): 200 Welcome to the restricted sorting room!

	// ============================================================
	// EXAMPLE BLOCK 3 — Graceful Shutdown, Programmatic Testing
	// ============================================================

	fmt.Println("\n--- BLOCK 3: Graceful Shutdown ---")

	// ──────────────────────────────────────────────────────────────
	// SECTION 6 — Graceful shutdown with context
	// ──────────────────────────────────────────────────────────────
	// WHY: A real server must finish in-flight requests before
	// stopping. http.Server.Shutdown(ctx) does this gracefully.
	// In production, you'd listen for OS signals (SIGINT, SIGTERM).

	mux3 := http.NewServeMux()
	mux3.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Namaste from India Post!"))
	})
	mux3.HandleFunc("/slow", func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(50 * time.Millisecond)
		w.Write([]byte("Slow dak processing completed"))
	})

	// Use httptest.NewUnstartedServer for manual lifecycle control
	ts := httptest.NewUnstartedServer(mux3)
	ts.Start()
	baseURL := ts.URL

	fmt.Println("Graceful server started at", baseURL)

	// Make a request while server is running
	resp, _ = http.Get(baseURL + "/hello")
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	fmt.Println("GET /hello:", string(body))
	// Output: GET /hello: Namaste from India Post!

	// ──────────────────────────────────────────────────────────────
	// SECTION 7 — Programmatic testing pattern
	// ──────────────────────────────────────────────────────────────
	// WHY: httptest.NewServer gives you a real HTTP server on a
	// random port — perfect for integration tests. You can make
	// real HTTP requests against it.

	// Start a slow request in a goroutine
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		resp, err := http.Get(baseURL + "/slow")
		if err != nil {
			fmt.Println("Slow request error:", err)
			return
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		fmt.Println("GET /slow:", string(body))
	}()

	// Wait for the goroutine to complete, then shut down
	wg.Wait()
	// Output: GET /slow: Slow dak processing completed

	// Graceful close — finishes in-flight requests
	ts.Close()
	fmt.Println("Server shut down gracefully — all dak processed.")
	// Output: Server shut down gracefully — all dak processed.

	// ──────────────────────────────────────────────────────────────
	// SECTION 8 — Real http.Server graceful shutdown demo
	// ──────────────────────────────────────────────────────────────
	// WHY: This shows the actual production pattern using a real
	// http.Server and its Shutdown method with a context deadline.

	fmt.Println("\n--- Real http.Server shutdown demo ---")

	mux4 := http.NewServeMux()
	mux4.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("pong"))
	})

	// Create a real http.Server on a random port
	srv := &http.Server{
		Addr:    "127.0.0.1:0",
		Handler: mux4,
	}

	// Use httptest to get a listener on a random port
	ts2 := httptest.NewServer(mux4)
	srvURL := ts2.URL

	// Make a request to confirm it works
	resp, _ = http.Get(srvURL + "/ping")
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	fmt.Println("GET /ping:", string(body))
	// Output: GET /ping: pong

	// Demonstrate the shutdown context pattern
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// In production you would call srv.Shutdown(shutdownCtx) here.
	// With httptest we use ts2.Close() which is equivalent.
	ts2.Close()
	_ = shutdownCtx // used in production: srv.Shutdown(shutdownCtx)
	_ = srv         // used in production with ListenAndServe

	fmt.Println("Real server shut down with context timeout.")
	// Output: Real server shut down with context timeout.

	// ──────────────────────────────────────────────────────────────
	// SECTION 9 — Production shutdown pattern (code reference)
	// ──────────────────────────────────────────────────────────────
	// WHY: This is the full production pattern. It is shown as a
	// reference since it would block waiting for OS signals.

	fmt.Println("\n--- Production shutdown pattern (reference) ---")
	fmt.Println("See the commented gracefulServerExample() below:")
	fmt.Println("  1. Create http.Server with timeouts")
	fmt.Println("  2. Start ListenAndServe in a goroutine")
	fmt.Println("  3. Wait for OS signal (SIGINT/SIGTERM)")
	fmt.Println("  4. Call srv.Shutdown(ctx) with a deadline")

	fmt.Println("\nLakshmi's India Post is closed for the day. All dak delivered.")
	// Output: Lakshmi's India Post is closed for the day. All dak delivered.
}

// ──────────────────────────────────────────────────────────────
// Reference: Production graceful shutdown pattern
// ──────────────────────────────────────────────────────────────
// This function is NOT called in main() because it would block.
// It demonstrates the real pattern you would use in production.
//
// func gracefulServerExample() {
//     mux := http.NewServeMux()
//     mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
//         w.Write([]byte("Namaste"))
//     })
//
//     srv := &http.Server{
//         Addr:         ":8080",
//         Handler:      mux,
//         ReadTimeout:  5 * time.Second,
//         WriteTimeout: 10 * time.Second,
//         IdleTimeout:  120 * time.Second,
//     }
//
//     // Start server in a goroutine
//     go func() {
//         if err := srv.ListenAndServe(); err != http.ErrServerClosed {
//             log.Fatalf("Server error: %v", err)
//         }
//     }()
//
//     // Wait for interrupt signal
//     ctx, stop := signal.NotifyContext(context.Background(),
//         os.Interrupt, syscall.SIGTERM)
//     defer stop()
//     <-ctx.Done()
//
//     // Shutdown with a timeout
//     shutdownCtx, cancel := context.WithTimeout(
//         context.Background(), 10*time.Second)
//     defer cancel()
//     if err := srv.Shutdown(shutdownCtx); err != nil {
//         log.Fatalf("Shutdown error: %v", err)
//     }
//     fmt.Println("Server shut down gracefully")
// }

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. A handler is func(w http.ResponseWriter, r *http.Request).
//    Register with HandleFunc on a ServeMux for routing.
//
// 2. http.ServeMux routes requests by URL pattern. The default
//    mux is shared globally — prefer creating your own.
//
// 3. Set w.Header() BEFORE calling w.Write() or w.WriteHeader().
//    Order matters: headers, status code, then body.
//
// 4. json.NewEncoder(w).Encode(data) streams JSON directly to
//    the response — no intermediate buffer needed.
//
// 5. The http.Handler interface has one method: ServeHTTP.
//    Implement it on a struct for stateful handlers.
//
// 6. Middleware is a function that wraps a handler: it takes
//    http.Handler and returns http.Handler. Chain them for
//    logging, auth, CORS, rate limiting, etc.
//
// 7. httptest.NewServer creates a real server for testing —
//    no port conflicts, automatic cleanup.
//
// 8. For graceful shutdown: use http.Server with Shutdown(ctx).
//    In production, catch OS signals with signal.NotifyContext.
//
// 9. Always close r.Body and resp.Body (defer is idiomatic).
//
// 10. Lakshmi's India Post rule: "Route every dak through the
//     sorting room, stamp it at the security counter, and never
//     close the doors while a parcel is in transit."
// ============================================================
