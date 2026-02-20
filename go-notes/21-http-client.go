// ============================================================
//  FILE 21 : HTTP Client
// ============================================================
//  Topic  : http.Get, http.Post, http.Client, http.NewRequest,
//           response body handling, custom headers, query params,
//           timeouts, error handling patterns
//
//  WHY THIS MATTERS:
//  Almost every Go program talks to other services over HTTP —
//  calling APIs, fetching data, sending webhooks. The standard
//  library's http.Client is production-ready with timeouts,
//  redirects, and connection pooling built in. Knowing how to
//  craft requests and handle responses correctly prevents
//  resource leaks and flaky integrations.
// ============================================================

// ============================================================
// STORY: India Post Client
// Now Lakshmi sends dak OUT to other post offices. Each outgoing
// parcel needs an address (URL), contents (body), and sometimes
// special stamps and seals (headers). Lakshmi learns that every
// dak sent must eventually get a receipt — and she must always
// close the receipt envelope (response body) to avoid piling up
// on her desk.
// ============================================================

package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"time"
)

func main() {
	// ============================================================
	// Setup: Create a temporary test server to make requests against
	// ============================================================
	// WHY: We spin up a local server so this file is self-contained
	// and exits cleanly — no external dependencies needed.

	mux := http.NewServeMux()

	// Simple text endpoint
	mux.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Namaste from the remote post office!"))
	})

	// Echo endpoint — returns request details as JSON
	mux.HandleFunc("/echo", func(w http.ResponseWriter, r *http.Request) {
		bodyBytes, _ := io.ReadAll(r.Body)
		defer r.Body.Close()

		response := map[string]any{
			"method":       r.Method,
			"path":         r.URL.Path,
			"query":        r.URL.RawQuery,
			"content_type": r.Header.Get("Content-Type"),
			"user_agent":   r.Header.Get("User-Agent"),
			"x_postal_seal": r.Header.Get("X-Postal-Seal"),
			"body":         string(bodyBytes),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	// JSON data endpoint
	mux.HandleFunc("/parcels", func(w http.ResponseWriter, r *http.Request) {
		parcels := []map[string]any{
			{"id": 1, "destination": "Chennai", "weight_kg": 2.5},
			{"id": 2, "destination": "Kolkata", "weight_kg": 1.2},
			{"id": 3, "destination": "Jaipur", "weight_kg": 4.0},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(parcels)
	})

	// Slow endpoint — for timeout testing
	mux.HandleFunc("/slow", func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.Write([]byte("Finally delivered!"))
	})

	// Status code endpoint
	mux.HandleFunc("/not-found", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("Dak not found"))
	})

	ts := httptest.NewServer(mux)
	defer ts.Close()

	fmt.Println("Test server running at", ts.URL)

	// ============================================================
	// EXAMPLE BLOCK 1 — Basic GET/POST, Response Body, Client
	// ============================================================

	fmt.Println("\n--- BLOCK 1: Basic GET/POST, http.Client ---")

	// ──────────────────────────────────────────────────────────────
	// SECTION 1 — http.Get (the simplest request)
	// ──────────────────────────────────────────────────────────────
	// WHY: http.Get is a convenience function for simple GET
	// requests. It uses the default client with no timeout —
	// fine for quick scripts, but not for production.

	resp, err := http.Get(ts.URL + "/hello")
	if err != nil {
		fmt.Println("GET error:", err)
		return
	}
	// WHY: ALWAYS close the response body to free the connection.
	// defer resp.Body.Close() is the idiomatic pattern.
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	fmt.Println("GET /hello status:", resp.StatusCode)
	// Output: GET /hello status: 200
	fmt.Println("GET /hello body:", string(body))
	// Output: GET /hello body: Namaste from the remote post office!

	// ──────────────────────────────────────────────────────────────
	// SECTION 2 — http.Post (sending data)
	// ──────────────────────────────────────────────────────────────
	// WHY: http.Post sends a POST request with a body. You must
	// specify the Content-Type. The body is an io.Reader.

	postBody := strings.NewReader(`{"from":"Lakshmi","message":"Speed post priority delivery"}`)
	resp, err = http.Post(ts.URL+"/echo", "application/json", postBody)
	if err != nil {
		fmt.Println("POST error:", err)
		return
	}
	defer resp.Body.Close()
	body, _ = io.ReadAll(resp.Body)

	fmt.Println("\nPOST /echo status:", resp.StatusCode)
	// Output: POST /echo status: 200

	var echoResult map[string]any
	json.Unmarshal(body, &echoResult)
	fmt.Println("  Method:", echoResult["method"])
	// Output:   Method: POST
	fmt.Println("  Content-Type:", echoResult["content_type"])
	// Output:   Content-Type: application/json
	fmt.Println("  Body:", echoResult["body"])
	// Output:   Body: {"from":"Lakshmi","message":"Speed post priority delivery"}

	// ──────────────────────────────────────────────────────────────
	// SECTION 3 — http.Client with custom timeout
	// ──────────────────────────────────────────────────────────────
	// WHY: The default http.Client has NO timeout — it will wait
	// forever. In production, ALWAYS create a client with a
	// timeout to prevent hung connections.

	client := &http.Client{
		Timeout: 100 * time.Millisecond, // short timeout for demo
	}

	fmt.Println("\n--- http.Client with timeout ---")

	// This request should succeed (fast endpoint)
	resp, err = client.Get(ts.URL + "/hello")
	if err != nil {
		fmt.Println("Fast request error:", err)
	} else {
		body, _ = io.ReadAll(resp.Body)
		resp.Body.Close()
		fmt.Println("Fast request:", string(body))
		// Output: Fast request: Namaste from the remote post office!
	}

	// This request should timeout (slow endpoint: 200ms > 100ms timeout)
	_, err = client.Get(ts.URL + "/slow")
	if err != nil {
		fmt.Println("Slow request timed out (expected):", true)
		// Output: Slow request timed out (expected): true
	}

	// ──────────────────────────────────────────────────────────────
	// SECTION 4 — Reading and parsing JSON responses
	// ──────────────────────────────────────────────────────────────
	// WHY: Most APIs return JSON. Use json.NewDecoder to stream
	// decode directly from the response body — no intermediate
	// byte slice needed.

	fmt.Println("\n--- Parsing JSON responses ---")

	type Parcel struct {
		ID          int     `json:"id"`
		Destination string  `json:"destination"`
		WeightKg    float64 `json:"weight_kg"`
	}

	resp, err = http.Get(ts.URL + "/parcels")
	if err != nil {
		fmt.Println("Request failed:", err)
		return
	}
	defer resp.Body.Close()

	var parcels []Parcel
	// WHY: json.NewDecoder reads directly from the response body stream
	err = json.NewDecoder(resp.Body).Decode(&parcels)
	if err != nil {
		fmt.Println("JSON decode error:", err)
		return
	}

	fmt.Printf("Received %d parcels:\n", len(parcels))
	// Output: Received 3 parcels:
	for _, p := range parcels {
		fmt.Printf("  Parcel %d -> %s (%.1f kg)\n", p.ID, p.Destination, p.WeightKg)
	}
	// Output:   Parcel 1 -> Chennai (2.5 kg)
	// Output:   Parcel 2 -> Kolkata (1.2 kg)
	// Output:   Parcel 3 -> Jaipur (4.0 kg)

	// ============================================================
	// EXAMPLE BLOCK 2 — Custom Requests, Headers, Error Handling
	// ============================================================

	fmt.Println("\n--- BLOCK 2: Custom Requests, Headers, Errors ---")

	// ──────────────────────────────────────────────────────────────
	// SECTION 5 — http.NewRequest for full control
	// ──────────────────────────────────────────────────────────────
	// WHY: NewRequest lets you set the method, headers, and body
	// before sending. Use it when you need PUT, PATCH, DELETE,
	// or custom headers.

	fmt.Println("\n--- http.NewRequest with headers ---")

	req, err := http.NewRequest("GET", ts.URL+"/echo", nil)
	if err != nil {
		fmt.Println("NewRequest error:", err)
		return
	}

	// Set custom headers (stamps and seals)
	req.Header.Set("X-Postal-Seal", "india-post-official")
	req.Header.Set("User-Agent", "IndiaPostClient/1.0")
	req.Header.Set("Accept", "application/json")

	// Use a proper client with timeout
	goodClient := &http.Client{Timeout: 5 * time.Second}
	resp, err = goodClient.Do(req)
	if err != nil {
		fmt.Println("Request error:", err)
		return
	}
	defer resp.Body.Close()
	body, _ = io.ReadAll(resp.Body)

	var headerResult map[string]any
	json.Unmarshal(body, &headerResult)
	fmt.Println("Custom User-Agent:", headerResult["user_agent"])
	// Output: Custom User-Agent: IndiaPostClient/1.0
	fmt.Println("Custom X-Postal-Seal:", headerResult["x_postal_seal"])
	// Output: Custom X-Postal-Seal: india-post-official

	// ──────────────────────────────────────────────────────────────
	// SECTION 6 — Adding query parameters
	// ──────────────────────────────────────────────────────────────
	// WHY: Building query strings by hand is error-prone. Use
	// url.Values to properly encode special characters.

	fmt.Println("\n--- Query parameters with url.Values ---")

	baseURL, _ := url.Parse(ts.URL + "/echo")
	params := url.Values{}
	params.Add("q", "speed post & registered mail")
	params.Add("page", "2")
	params.Add("sort", "date")
	baseURL.RawQuery = params.Encode()

	fmt.Println("Encoded URL:", baseURL.String())

	resp, err = http.Get(baseURL.String())
	if err != nil {
		fmt.Println("Request failed:", err)
		return
	}
	defer resp.Body.Close()
	body, _ = io.ReadAll(resp.Body)

	var queryResult map[string]any
	json.Unmarshal(body, &queryResult)
	fmt.Println("Server received query:", queryResult["query"])
	// Output: Server received query: page=2&q=speed+post+%26+registered+mail&sort=date

	// ──────────────────────────────────────────────────────────────
	// SECTION 7 — POST with JSON body using NewRequest
	// ──────────────────────────────────────────────────────────────
	// WHY: For POST/PUT with JSON, marshal your struct, wrap in
	// a reader, and set Content-Type. NewRequest gives full control.

	fmt.Println("\n--- POST with JSON body ---")

	type DakRequest struct {
		From    string `json:"from"`
		To      string `json:"to"`
		Message string `json:"message"`
	}

	dak := DakRequest{
		From:    "Lakshmi",
		To:      "Mehra",
		Message: "The rare manuscript has arrived from Lucknow!",
	}

	jsonBytes, _ := json.Marshal(dak)
	req, _ = http.NewRequest("POST", ts.URL+"/echo", strings.NewReader(string(jsonBytes)))
	req.Header.Set("Content-Type", "application/json")

	resp, err = goodClient.Do(req)
	if err != nil {
		fmt.Println("Request failed:", err)
		return
	}
	defer resp.Body.Close()
	body, _ = io.ReadAll(resp.Body)

	var postResult map[string]any
	json.Unmarshal(body, &postResult)
	fmt.Println("Posted body:", postResult["body"])
	// Output: Posted body: {"from":"Lakshmi","to":"Mehra","message":"The rare manuscript has arrived from Lucknow!"}

	// ──────────────────────────────────────────────────────────────
	// SECTION 8 — Error handling patterns
	// ──────────────────────────────────────────────────────────────
	// WHY: HTTP errors come in two forms:
	// 1. Network errors (err != nil) — server unreachable, timeout
	// 2. HTTP status errors (4xx, 5xx) — err is nil but status != 200
	// You must check BOTH.

	fmt.Println("\n--- Error handling patterns ---")

	// Pattern: check error, then check status code
	doRequest := func(urlStr string) {
		resp, err := goodClient.Get(urlStr)
		if err != nil {
			// Network error — server down, DNS failure, timeout
			fmt.Printf("  Network error for %s: %v\n", urlStr, err)
			return
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)

		if resp.StatusCode >= 400 {
			// HTTP error — server responded but with an error status
			fmt.Printf("  HTTP %d: %s\n", resp.StatusCode, string(body))
			return
		}

		fmt.Printf("  Success (%d): %s\n", resp.StatusCode, string(body))
	}

	doRequest(ts.URL + "/hello")
	// Output:   Success (200) for /hello: Namaste from the remote post office!
	doRequest(ts.URL + "/not-found")
	// Output:   HTTP 404 for /not-found: Dak not found
	doRequest("http://127.0.0.1:1/unreachable")
	// Output:   Network error for http://127.0.0.1:1/unreachable: ... (connection refused)

	// ──────────────────────────────────────────────────────────────
	// SECTION 9 — Response headers and status
	// ──────────────────────────────────────────────────────────────
	// WHY: Response headers carry metadata: content type, caching
	// directives, rate limit info, etc. Always check them when
	// debugging or implementing retry logic.

	fmt.Println("\n--- Response headers ---")

	resp, err = http.Get(ts.URL + "/parcels")
	if err != nil {
		fmt.Println("Request failed:", err)
		return
	}
	defer resp.Body.Close()

	fmt.Println("Status:", resp.Status)
	// Output: Status: 200 OK
	fmt.Println("Status Code:", resp.StatusCode)
	// Output: Status Code: 200
	fmt.Println("Content-Type:", resp.Header.Get("Content-Type"))
	// Output: Content-Type: application/json
	fmt.Println("Content-Length:", resp.Header.Get("Content-Length"))

	fmt.Println("\nLakshmi has sent and received all dak. The outgoing mail is done.")
	// Output: Lakshmi has sent and received all dak. The outgoing mail is done.
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. http.Get and http.Post are convenience functions for simple
//    requests. They use the default client (no timeout!).
//
// 2. ALWAYS close resp.Body — use defer resp.Body.Close() right
//    after checking for errors. Leaking bodies leaks connections.
//
// 3. Create an http.Client with a Timeout for production use:
//    client := &http.Client{Timeout: 10 * time.Second}
//
// 4. Use http.NewRequest for full control: custom method, headers,
//    body. Then call client.Do(req).
//
// 5. Build query strings with url.Values — it handles encoding
//    special characters like &, spaces, and unicode correctly.
//
// 6. json.NewDecoder(resp.Body).Decode(&v) streams JSON directly
//    from the response — more efficient than ReadAll + Unmarshal.
//
// 7. Check BOTH err (network failure) AND resp.StatusCode (HTTP
//    error). A 404 or 500 is not a Go error — err will be nil.
//
// 8. resp.Header gives you response metadata. Use it for
//    Content-Type checks, rate limit headers, and debugging.
//
// 9. httptest.NewServer is perfect for self-contained client
//    testing — spin up a server, test against it, tear it down.
//
// 10. Lakshmi's outgoing dak rule: "Always set a timeout, always
//     close the receipt envelope, and never trust that 200 means
//     the dak is what you expected — parse it carefully."
// ============================================================
