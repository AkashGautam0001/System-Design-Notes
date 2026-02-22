# Chapter 42 — VaaniSutra: AI Processing Pipeline

## The Jio Call Center Challenge

Jio handles **millions** of customer calls every single day. Each call generates a
transcript that needs to be analyzed for sentiment, key entities, and summarized for
quality assurance. Doing this sequentially would take forever. VaaniSutra
(Vaani = speech/voice, Sutra = formula/system) is the pipeline that processes these
transcripts through multiple AI stages concurrently, then stores results in a vector
database so managers can search by meaning, not just keywords.

This is the **capstone project** of the course. It brings together everything we have
learned: goroutines (ch15), channels (ch15), select (ch16), context (ch18),
concurrency patterns (ch28), HTTP servers (ch32), and vector databases (ch40).

---

## 1. Fan-Out / Fan-In Pattern

The most important concurrency pattern in this project. When a transcript arrives,
we need three independent analyses: sentiment, entity extraction, and summarization.
These have no dependencies on each other, so we **fan out** to three goroutines and
**fan in** the results.

```
                    +---> [Sentiment Analysis] ---+
                    |                              |
  Transcript ----> Fan-Out ---> [Entity Extraction] ---> Fan-In ---> [Embed + Store]
                    |                              |
                    +---> [Summarization] ---------+
```

**Why fan-out/fan-in?** Each AI call takes 50-200ms. Running three sequentially means
300-600ms per transcript. Running them concurrently means only 50-200ms (the slowest
one). At Jio's scale of millions of transcripts, this 3x speedup is enormous.

```go
// Fan-out: launch goroutines for each independent stage
sentimentCh := make(chan SentimentResult, 1)
entitiesCh := make(chan []Entity, 1)
summaryCh  := make(chan string, 1)

go func() { sentimentCh <- analyzeSentiment(text) }()
go func() { entitiesCh <- extractEntities(text) }()
go func() { summaryCh <- summarize(text) }()

// Fan-in: collect all results
sentiment := <-sentimentCh
entities  := <-entitiesCh
summary   := <-summaryCh
```

---

## 2. Worker Pool Pattern

We do not want unbounded goroutines — that would overwhelm the AI service. Instead,
we use a **worker pool** with a configurable number of workers (default: 4). Each
worker reads from a shared input channel.

```
  [Input Channel] ---> Worker 1 ---> [Results]
                  \--> Worker 2 ---> [Results]
                  \--> Worker 3 ---> [Results]
                  \--> Worker 4 ---> [Results]
```

**Why bounded concurrency?** If Jio submits 10,000 transcripts at once, spinning up
10,000 goroutines would cause memory spikes and API rate limiting. A worker pool of
4-8 workers processes them steadily with predictable resource usage.

**Backpressure:** When the input channel is full (queue size reached), new submissions
get a "queue full" response. This prevents the system from being overwhelmed.

---

## 3. Pipeline Stages with Channels

Each transcript flows through stages connected by the worker's processing logic:

```
  Submit --> [Queue Channel] --> Worker picks up --> Sentiment
                                                  --> Entities  (fan-out)
                                                  --> Summary
                                                  --> Keywords --> Embed --> Store in VectorDB
```

The key insight: the **queue channel** decouples submission from processing. The HTTP
handler returns 202 Accepted immediately, and the pipeline processes asynchronously.

---

## 4. AI for Text Analytics

VaaniSutra uses three AI capabilities (simulated by default, real Gemini API optional):

| Stage              | Input      | Output                           |
|--------------------|------------|----------------------------------|
| Sentiment Analysis | Text       | Score (-1 to 1), Label, Confidence |
| Entity Extraction  | Text       | Entities with types and positions |
| Summarization      | Text       | 2-3 sentence summary             |
| Keyword Extraction | Text       | Top keywords by frequency         |
| Embedding          | Text       | 256-dim vector for search         |

**Simulated mode** uses word counting for sentiment, regex for entities, and FNV
hashing for embeddings. This means the project works without any API keys.

---

## 5. Vector Database Integration

After processing, each transcript's embedding is stored in Qdrant (or an in-memory
fallback). This enables **semantic search**: finding transcripts by meaning rather
than exact keyword match.

Example: searching "customer unhappy with internet speed" will find transcripts about
slow connections, buffering issues, and bandwidth complaints — even if they do not
contain the exact search words.

---

## 6. Graceful Pipeline Shutdown

When the server receives SIGINT/SIGTERM:

1. Stop accepting new HTTP requests
2. Close the pipeline input channel (no new work)
3. Wait for in-flight workers to finish (WaitGroup)
4. Shut down the HTTP server

This ensures no transcript is half-processed when the server stops.

---

## 7. Monitoring and Metrics

The pipeline tracks metrics using atomic counters (no locks needed):

- **Queued**: transcripts waiting in the channel
- **Processing**: currently being processed by workers
- **Completed**: successfully processed
- **Failed**: processing errors
- **WorkerCount**: number of active workers
- **Uptime**: time since pipeline started

Access via `GET /api/pipeline/status`.

---

## 8. Docker Compose Setup

```yaml
services:
  vaanisutra:
    build: .
    ports:
      - "8086:8086"
    environment:
      - QDRANT_URL=http://qdrant:6333
    depends_on:
      - qdrant

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
```

Run with: `docker-compose up --build`

Or run without Docker (uses in-memory vector store):
```bash
cd 42-vaanisutra
go run main.go
```

---

## API Endpoints

| Method | Path                    | Description                        |
|--------|-------------------------|------------------------------------|
| POST   | /api/transcripts        | Submit single transcript           |
| POST   | /api/transcripts/batch  | Submit batch of transcripts        |
| GET    | /api/transcripts/{id}   | Get processed result               |
| GET    | /api/transcripts        | List all processed transcripts     |
| POST   | /api/search             | Semantic search over transcripts   |
| GET    | /api/pipeline/status    | Pipeline metrics                   |
| GET    | /health                 | Health check                       |

---

## Key Takeaways

1. **Fan-out/fan-in** is the go-to pattern when you have independent work items that
   can run concurrently and whose results need to be combined.

2. **Worker pools** provide bounded concurrency — essential for production systems
   where resources (memory, API rate limits) are finite.

3. **Channel pipelines** decouple producers (HTTP handlers) from consumers (workers),
   enabling asynchronous processing with backpressure.

4. **Atomic operations** (sync/atomic) are faster than mutexes for simple counters
   and are perfect for metrics.

5. **Graceful shutdown** is not optional in production — Jio cannot afford to lose
   partially-processed transcripts during deployments.

6. **Vector search** transforms how we query unstructured data — from exact keyword
   matching to semantic similarity.

7. **Simulate everything** for development — the project works without Gemini API
   keys or a running Qdrant instance, making it easy to develop and test.

---

## The Jio Story

Reliance Jio launched in 2016 and disrupted Indian telecom with free calls and
cheap data. Within years, they had 400+ million subscribers, each potentially calling
customer support. Their call centers across India handle everything from "my internet
is slow" to "how do I activate international roaming?"

VaaniSutra represents how a company at Jio's scale would build an AI pipeline:
processing millions of transcripts daily, extracting insights (which plans cause the
most complaints? which agents handle difficult calls well?), and making all of it
searchable. The Go concurrency model — goroutines, channels, and select — is
perfectly suited for this kind of high-throughput pipeline work.

---

## Running the Project

```bash
# Without Docker (in-memory mode)
cd 42-vaanisutra
go run main.go

# Submit a transcript
curl -X POST http://localhost:8086/api/transcripts \
  -H "Content-Type: application/json" \
  -d '{"caller_id":"JIO-9876543210","agent_id":"AGT-101","content":"I am very angry about my slow internet connection. I have the Jio 999 plan and it has been terrible for a week.","duration":180,"language":"en"}'

# Check pipeline status
curl http://localhost:8086/api/pipeline/status

# Search processed transcripts
curl -X POST http://localhost:8086/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"customer unhappy with internet","top_k":5}'
```
