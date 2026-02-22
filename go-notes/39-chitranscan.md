# Chapter 39 — ChitranScan: AI Image Analyzer
## *The Quality Inspector of the Grocery Warehouse*

> **Chitran** (चित्रण) = Image/Picture &nbsp;|&nbsp; **Scan** = Analyze
>
> Every crate of mangoes entering BigBasket's warehouse must be inspected.
> ChitranScan photographs each batch, feeds the image to Gemini's multimodal
> AI, and gets back a quality report — freshness score, defect detection,
> label verification. No bruised tomatoes slip through. No expired labels
> go unnoticed.

---

## Why This Chapter?

Images are the fastest-growing data type in modern APIs. From e-commerce
product photos to warehouse quality control, the ability to **accept,
validate, and analyze images** is a core backend skill. This chapter builds
a production-style image analysis service that teaches:

| Concern | Tool | Why |
|---|---|---|
| Routing | Chi | Lightweight, `net/http` compatible, middleware-first |
| AI Vision | Gemini (simulated) | Multimodal — understands text AND images |
| Upload | `multipart/form-data` | Standard for file uploads over HTTP |
| Concurrency | Goroutines + Channels | Analyze multiple images in parallel |

---

## Core Concepts

### 1. Multipart File Upload in Go

When a client sends an image, it uses `multipart/form-data` encoding —
the same mechanism browsers use for `<input type="file">`. Go's standard
library handles this natively:

```
Client (curl/frontend)                 Go Server
┌──────────────────────┐              ┌──────────────────────┐
│ POST /api/analyze    │              │ r.ParseMultipartForm │
│ Content-Type:        │  ─────────→  │ r.FormFile("image")  │
│   multipart/form-data│              │ io.ReadAll(file)     │
│ [image bytes]        │              │ → []byte             │
└──────────────────────┘              └──────────────────────┘
```

**Key decisions:**
- **Size limits** — Always set `MaxBytesReader` to prevent memory bombs
- **Type validation** — Check MIME type, not just file extension
- **Memory vs disk** — `ParseMultipartForm(maxMemory)` controls the threshold

### 2. Gemini Multimodal API Pattern

Gemini accepts both text and images in a single request. The REST pattern:

```
POST /v1/models/gemini-pro-vision:generateContent
{
  "contents": [{
    "parts": [
      {"text": "Analyze this produce for quality..."},
      {"inlineData": {"mimeType": "image/jpeg", "data": "<base64>"}}
    ]
  }]
}
```

**Why simulated in this chapter?** Teaching the *pattern* — HTTP client
construction, request/response shaping, error handling — without requiring
an API key. The simulation returns realistic, educational responses.

### 3. Concurrent Batch Analysis

BigBasket receives crates with 10+ items. Analyzing them one-by-one is
too slow. We use the **fan-out/fan-in** pattern:

```
                    ┌─── goroutine 1 → analyze mango.jpg ───┐
POST /analyze/batch │                                        │
  [10 images]  ─────┼─── goroutine 2 → analyze tomato.jpg ──┼──→ collect results
                    │                                        │
                    └─── goroutine 3 → analyze rice.jpg ─────┘
                         (max 5 concurrent — semaphore)
```

**Semaphore pattern:** A buffered channel of capacity N acts as a
counting semaphore. Each goroutine acquires a slot before calling the
AI, preventing API rate-limit violations.

```go
sem := make(chan struct{}, 5)  // max 5 concurrent

sem <- struct{}{}   // acquire (blocks if 5 already running)
// ... do work ...
<-sem               // release
```

### 4. Prompt Engineering for Vision AI

Different analysis types need different prompts. We use **structured
prompt templates** that guide the AI toward consistent, parseable output:

| Analysis Type | Prompt Focus | BigBasket Use Case |
|---|---|---|
| `quality` | Freshness, defects, grade | Incoming produce inspection |
| `label` | Text extraction, expiry dates | Packaged goods verification |
| `categorize` | Product classification | Warehouse sorting automation |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/analyze` | Analyze a single image |
| `POST` | `/api/analyze/batch` | Analyze multiple images concurrently |
| `GET` | `/api/analysis/{id}` | Retrieve a previous analysis result |
| `GET` | `/health` | Health check |

### Example: Single Image Analysis

```bash
curl -X POST http://localhost:8083/api/analyze \
  -F "image=@mango.jpg" \
  -F "analysis_type=quality"
```

### Example: Batch Analysis

```bash
curl -X POST http://localhost:8083/api/analyze/batch \
  -F "images=@mango.jpg" \
  -F "images=@tomato.jpg" \
  -F "images=@rice_bag.jpg" \
  -F "analysis_type=quality"
```

---

## Project Structure

```
39-chitranscan/
├── main.go                          # Entry point, router setup
├── go.mod
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── internal/
    ├── config/
    │   └── config.go                # Environment-based configuration
    ├── ai/
    │   ├── gemini.go                # Gemini client (simulated)
    │   └── prompts.go               # Prompt templates
    ├── model/
    │   └── analysis.go              # Request/response structs
    ├── handler/
    │   └── analysis_handler.go      # HTTP handlers
    └── middleware/
        └── middleware.go            # Logger, recovery, CORS, body limit
```

---

## Key Takeaways

1. **File uploads are just bytes** — `multipart/form-data` is how browsers
   and `curl` send files. Go's `r.FormFile()` gives you an `io.Reader`.

2. **Always limit upload size** — Without `MaxBytesReader`, a malicious
   client can send a 10GB file and crash your server.

3. **Concurrent processing needs coordination** — `sync.WaitGroup` waits
   for all goroutines; channels collect their results; a semaphore
   limits how many run at once.

4. **Simulated AI is great for learning** — You can build the entire
   request/response pipeline without an API key. Swap in the real client
   when you are ready for production.

5. **Prompt engineering is backend work** — The quality of AI output
   depends heavily on how you structure the prompt. Treat prompts as
   code: version them, template them, test them.

---

## BigBasket Story: Why This Matters

BigBasket operates 30+ warehouses across India, processing over 100,000
items daily. When a truck arrives with 500 crates of produce:

- **Before ChitranScan:** Manual inspection by 20+ quality checkers.
  Subjective, slow, inconsistent across shifts.
- **After ChitranScan:** Photograph each crate, batch-analyze with AI.
  Objective scores, consistent grading, 10x faster throughput.

The warehouse supervisor sees a dashboard: "Batch #4827 — 47 crates Grade A,
3 crates Grade B (minor bruising on pomegranates), 0 Reject." That is the
power of vision AI at warehouse scale.
