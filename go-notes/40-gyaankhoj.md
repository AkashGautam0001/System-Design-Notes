# Chapter 40 — GyaanKhoj: RAG Search Engine
## *The Knowledge Seeker of India's Largest IT Company*

> **Gyaan** (ज्ञान) = Knowledge &nbsp;|&nbsp; **Khoj** (खोज) = Search
>
> TCS (Tata Consultancy Services), India's largest IT company with 600,000+
> employees across 46 countries, generates thousands of internal documents
> every week — architecture decision records, best practices, security
> policies, project retrospectives. Finding the right document in this ocean
> of knowledge is like searching for a needle in a haystack. GyaanKhoj
> changes that — employees type a natural language question, and the system
> retrieves the most relevant passages, then generates a concise answer with
> citations. Powered by RAG (Retrieval-Augmented Generation) and Qdrant
> vector database.

---

## Why This Chapter?

Large Language Models know a lot, but they do not know *your* internal data.
RAG bridges this gap by **retrieving** relevant context from your own
documents and **augmenting** the LLM's prompt before **generation**. This
is the dominant pattern for enterprise AI search in 2024-2025 — used by
every major tech company from Google to Microsoft to TCS.

| Concern | Tool | Why |
|---|---|---|
| Routing | Chi | Lightweight, `net/http` compatible, middleware-first |
| Embeddings | Gemini (simulated) | Convert text to vectors for semantic search |
| Vector DB | Qdrant (+ in-memory fallback) | Purpose-built for similarity search |
| Generation | Gemini (simulated) | Answer synthesis from retrieved context |

---

## Core Concepts

### 1. RAG Architecture — The Full Pipeline

RAG is a three-stage pipeline that gives LLMs access to your private data
without fine-tuning:

```
                         INGESTION (offline)
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Document   │───→│   Chunking   │───→│  Embedding   │───→│  Vector DB   │
│  (raw text)  │    │ (split text) │    │  (text→vec)  │    │   (store)    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘

                         RETRIEVAL + GENERATION (online)
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Question   │───→│  Embed query │───→│ Vector search│───→│  Top-K docs  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────┬───────┘
                                                                   │
                    ┌──────────────┐    ┌──────────────┐           │
                    │    Answer    │←───│  LLM prompt  │←──────────┘
                    │ + citations  │    │  (Q + docs)  │
                    └──────────────┘    └──────────────┘
```

**Why RAG instead of fine-tuning?**
- No training costs — just index your documents
- Always up-to-date — re-index when docs change
- Traceable — you can cite which document the answer came from
- No hallucination risk from stale training data

### 2. Vector Databases — Why Qdrant?

Traditional databases search by exact keywords. Vector databases search by
*meaning*. The text "How do I deploy a microservice?" is close to "Steps for
shipping a service to production" even though they share zero keywords.

```
Traditional DB:    SELECT * FROM docs WHERE content LIKE '%deploy%'
                   → Misses "shipping a service to production"

Vector DB:         SEARCH(embed("How do I deploy?"), top_k=5)
                   → Returns semantically similar passages
```

**How vectors are stored and indexed:**
1. Each text chunk becomes a high-dimensional vector (e.g., 256 dimensions)
2. Vectors are indexed using HNSW (Hierarchical Navigable Small World) graphs
3. Search finds the nearest neighbors in this graph — O(log n) instead of O(n)

**Why Qdrant specifically?**
- Written in Rust — fast and memory-efficient
- REST + gRPC APIs — easy to integrate from any language
- Filtering — combine vector similarity with metadata filters
- Payload storage — attach arbitrary JSON to each vector

### 3. Embedding Strategies

Embeddings convert text into dense numerical vectors that capture meaning.
Two texts with similar meaning will have vectors pointing in similar
directions (high cosine similarity).

```
"Go microservice architecture"  →  [0.12, 0.85, -0.33, 0.67, ...]
"Golang service design patterns" →  [0.14, 0.82, -0.30, 0.71, ...]
                                     ↑ similar vectors = similar meaning

"Best pizza in Mumbai"           →  [-0.55, 0.11, 0.92, -0.23, ...]
                                     ↑ very different = different meaning
```

**Key choices:**
- **Model:** Gemini embedding-001, OpenAI text-embedding-3-small, etc.
- **Dimensionality:** Higher dims capture more nuance but cost more storage
- **Normalization:** Most models output unit vectors for cosine similarity

### 4. Chunking Strategies

Documents must be split into chunks before embedding. The chunk size
dramatically affects retrieval quality:

| Strategy | Chunk Size | Overlap | Pros | Cons |
|---|---|---|---|---|
| Fixed-size | 500 chars | 50 chars | Simple, predictable | May split mid-sentence |
| Sentence-based | 3-5 sentences | 1 sentence | Respects grammar | Variable size |
| Paragraph-based | Full paragraphs | None | Natural boundaries | May be too large |
| Semantic | By topic shift | None | Best quality | Complex to implement |

**Our approach:** Fixed-size with overlap. Each chunk is ~500 characters with
50-character overlap so that context at chunk boundaries is not lost.

```
Document: "AAAA BBBB CCCC DDDD EEEE FFFF"
           |--- chunk 1 ---|
                     |--- chunk 2 ---|
                               |--- chunk 3 ---|
                 overlap ↑↑↑
```

### 5. Retrieval Quality — Top-K and Similarity Thresholds

Not all retrieved chunks are equally relevant. Two knobs control quality:

- **Top-K:** How many chunks to retrieve (typically 3-10)
- **Similarity threshold:** Minimum cosine similarity score (typically 0.7+)

```
Query: "How to set up CI/CD pipeline?"

Result 1: score=0.92  "TCS CI/CD Pipeline Guide: Step 1..."     ✅ Include
Result 2: score=0.85  "Jenkins configuration for Go projects..." ✅ Include
Result 3: score=0.78  "Code review best practices..."            ✅ Include
Result 4: score=0.55  "TCS cafeteria menu for Pune office..."    ❌ Below threshold
```

### 6. Prompt Augmentation Patterns

The magic of RAG is in how you construct the prompt. The LLM receives:
1. A system instruction explaining its role
2. The retrieved context passages
3. The user's original question

```
┌─────────────────────────────────────────────────────┐
│ SYSTEM: You are a TCS knowledge assistant.          │
│ Answer ONLY from the provided context.              │
│                                                     │
│ CONTEXT:                                            │
│ [1] "TCS follows trunk-based development..."        │
│ [2] "All microservices use gRPC for internal..."    │
│ [3] "CI pipelines must include lint + test..."      │
│                                                     │
│ QUESTION: How does TCS handle microservice comms?   │
│                                                     │
│ INSTRUCTION: Cite sources as [1], [2], etc.         │
└─────────────────────────────────────────────────────┘
```

### 7. Citation Tracking

Every answer must be traceable to its source documents. This is critical
in enterprise settings — TCS auditors need to verify that policy answers
come from approved documents, not LLM hallucinations.

Our citation format includes:
- Document title and source
- The exact chunk text that informed the answer
- The similarity score (how relevant the chunk was)

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/documents` | Ingest a single document |
| `POST` | `/api/documents/bulk` | Bulk ingest multiple documents |
| `POST` | `/api/search` | Semantic similarity search |
| `POST` | `/api/ask` | Full RAG: question → answer with citations |
| `GET` | `/api/documents` | List all documents |
| `GET` | `/api/documents/{id}` | Get a specific document |
| `DELETE` | `/api/documents/{id}` | Delete a document and its vectors |
| `GET` | `/health` | Health check |

### Example: Ingest a Document

```bash
curl -X POST http://localhost:8084/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Go Error Handling at TCS",
    "content": "At TCS, all Go services must use structured error handling...",
    "source": "TCS Engineering Wiki",
    "category": "engineering",
    "tags": ["go", "errors", "best-practices"]
  }'
```

### Example: Ask a Question (RAG)

```bash
curl -X POST http://localhost:8084/api/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the code review guidelines at TCS?",
    "top_k": 5
  }'
```

Response:
```json
{
  "answer": "According to TCS Engineering guidelines, code reviews must...",
  "citations": [
    {
      "document_title": "Code Review Guidelines — TCS Engineering",
      "chunk_text": "Every pull request requires at least two approvals...",
      "score": 0.92,
      "source": "TCS Engineering Wiki"
    }
  ],
  "confidence": 0.89,
  "processing_time": "245ms"
}
```

---

## Project Structure

```
40-gyaankhoj/
├── main.go                              # Entry point, router, graceful shutdown
├── go.mod
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── internal/
    ├── config/
    │   └── config.go                    # Environment-based configuration
    ├── ai/
    │   ├── gemini.go                    # Gemini client (simulated embeddings + generation)
    │   └── prompts.go                   # RAG prompt templates
    ├── model/
    │   ├── document.go                  # Document, Chunk, IngestRequest/Response
    │   └── search.go                    # SearchRequest/Result, AskRequest/Response
    ├── handler/
    │   ├── document_handler.go          # Document CRUD handlers
    │   ├── search_handler.go            # Search and RAG handlers
    │   ├── rag_service.go               # RAG orchestrator (ingest, search, ask)
    │   └── seed.go                      # Sample TCS documents for seeding
    ├── vectordb/
    │   └── qdrant.go                    # Qdrant client + in-memory fallback
    └── middleware/
        └── middleware.go                # Logger, recovery, CORS, request ID
```

---

## Docker Setup

```yaml
# docker-compose.yml
services:
  gyaankhoj:
    build: .
    ports:
      - "8084:8084"
    environment:
      - QDRANT_URL=http://qdrant:6333
    depends_on:
      - qdrant

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
```

**Without Docker:** The app works without Qdrant! The in-memory vector store
automatically activates as a fallback. Just run `go run main.go`.

---

## Key Takeaways

1. **RAG = Retrieve + Augment + Generate** — The dominant pattern for giving
   LLMs access to private data. No fine-tuning, no training costs, always
   up-to-date.

2. **Vector databases think in meaning, not keywords** — Cosine similarity
   between embedding vectors captures semantic relationships that keyword
   search misses entirely.

3. **Chunking is critical** — Too small and you lose context. Too large and
   you dilute relevance. Fixed-size with overlap is a practical starting point.

4. **Always provide fallbacks** — The in-memory vector store lets developers
   run GyaanKhoj without Docker or Qdrant. Production uses Qdrant; development
   uses in-memory. Same interface, different backend.

5. **Citations build trust** — Enterprise users (TCS auditors, compliance
   teams) will not trust an AI answer without knowing which document it came
   from. Every RAG answer must be traceable.

6. **Simulated AI is great for learning** — Build the entire RAG pipeline
   without an API key. The architecture, chunking, retrieval, and prompt
   patterns are identical to production. Swap in real Gemini when ready.

---

## TCS Story: Why This Matters

TCS has 600,000+ employees across 150+ offices worldwide. Every day,
engineers ask questions like:

- "What is the TCS standard for API authentication?"
- "How do we handle PII data in EU projects?"
- "What were the lessons from the Jio project migration?"

**Before GyaanKhoj:** Search the Confluence wiki with keywords, browse
through 50 results, read 5 documents, maybe find the answer in 30 minutes.
Or worse — ask on the internal Slack, wait hours, get conflicting answers.

**After GyaanKhoj:** Type your question in natural language. Get a concise,
cited answer in 2 seconds. The system searched 50,000 documents, found the
3 most relevant passages, and synthesized an answer — with links to the
source documents for verification.

The TCS Knowledge Management team reports a 70% reduction in "where do I
find..." questions on Slack after deploying GyaanKhoj. New joiners ramp up
40% faster because institutional knowledge is instantly accessible. That is
the power of RAG at enterprise scale.
