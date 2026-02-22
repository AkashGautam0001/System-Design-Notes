# Chapter 33 — NotesKaro: CRUD Notes API

## Story: Infosys Mysore Training Campus

The Infosys Mysore campus is legendary — thousands of fresh graduates arrive every
quarter for intensive training. The training coordinators need a simple system where
trainees can save their learning notes during the program. Each batch gets their own
notes collection. The system must be lightweight (no heavy database servers), fast to
deploy, and dead simple to run. **NotesKaro** is that system — a clean CRUD REST API
built with Chi router and SQLite.

---

## Why Chi Router?

| Concern                  | Chi                          | net/http (stdlib)            |
|--------------------------|------------------------------|------------------------------|
| URL parameters           | `chi.URLParam(r, "id")`     | Manual path parsing          |
| Middleware chaining       | Built-in, composable         | DIY wrapper functions        |
| Subrouters               | `r.Route("/api", ...)`      | Not available                |
| net/http compatible?      | Yes — implements Handler     | N/A (it IS net/http)         |
| External dependency?      | Yes, but tiny (~2k LOC)     | No                           |

**Key insight:** Chi is not a framework — it is a router. Your handlers remain plain
`http.HandlerFunc` signatures. You can eject Chi at any time and keep all your code.

---

## Why SQLite with modernc.org/sqlite?

Most Go SQLite drivers (`mattn/go-sqlite3`) require CGO — a C compiler must be
present at build time. This breaks `CGO_ENABLED=0` builds and complicates Docker
multi-stage builds.

`modernc.org/sqlite` is a **pure Go** translation of SQLite's C code. It means:
- `CGO_ENABLED=0` works perfectly
- Cross-compilation is trivial (`GOOS=linux GOARCH=arm64`)
- Docker scratch/alpine images work without gcc
- Same SQL, same reliability — it is SQLite, just compiled differently

---

## Project Architecture

```
33-noteskaro/
├── main.go                         # Entry point — wiring, server, graceful shutdown
├── go.mod                          # Module definition + dependencies
├── Dockerfile                      # Multi-stage build (builder + runtime)
├── docker-compose.yml              # One-command deployment
├── .env.example                    # Environment variable reference
└── internal/                       # Private application packages
    ├── config/
    │   └── config.go               # Environment → Config struct
    ├── model/
    │   └── note.go                 # Data structures (Note, CreateRequest, UpdateRequest)
    ├── store/
    │   └── sqlite.go               # SQLite repository (CRUD operations)
    ├── handler/
    │   └── note_handler.go         # HTTP handlers (JSON in/out, status codes)
    └── middleware/
        └── middleware.go           # RequestLogger, RequestID, ContentType, Recovery
```

### Why `internal/`?

Go enforces that packages under `internal/` cannot be imported by code outside the
parent module. This is a compile-time guarantee — not a convention. It means our
store, handler, and middleware packages are truly private to NotesKaro.

### The Dependency Flow

```
main.go
  ├── config.Load()          → reads env vars
  ├── store.NewSQLiteStore() → opens DB, runs migrations
  ├── handler.NewNoteHandler(store) → injects store dependency
  └── chi.NewRouter()        → wires middleware + routes
```

Dependencies flow **inward**: handlers depend on store, store depends on model,
but model depends on nothing. This is the **Dependency Inversion Principle** at work.

---

## API Endpoints

| Method   | Path              | Description                | Status Codes      |
|----------|-------------------|----------------------------|--------------------|
| `GET`    | `/health`         | Health check               | 200                |
| `GET`    | `/api/notes`      | List all notes             | 200                |
| `GET`    | `/api/notes?category=golang` | Filter by category | 200           |
| `POST`   | `/api/notes`      | Create a new note          | 201, 400           |
| `GET`    | `/api/notes/{id}` | Get a single note          | 200, 404           |
| `PUT`    | `/api/notes/{id}` | Update a note              | 200, 400, 404      |
| `DELETE` | `/api/notes/{id}` | Delete a note              | 204, 404           |

---

## Key Go Patterns Used

### 1. Repository Pattern
The `store.SQLiteStore` hides all SQL behind clean Go methods. Handlers never see
SQL strings — they call `store.Create(ctx, note)` and get back a model.

### 2. Graceful Shutdown
We listen for `SIGINT`/`SIGTERM`, then call `server.Shutdown(ctx)` with a timeout.
This lets in-flight requests finish before the process exits — critical for
production deployments.

### 3. Middleware Chain
Middleware wraps handlers like layers of an onion. Order matters:
```
Recovery → RequestID → Logger → ContentType → [your handler]
```
Recovery must be outermost so it catches panics from any inner layer.

### 4. Constructor Injection
`NewNoteHandler(store)` takes the store as a parameter — no globals, no init().
This makes testing trivial: pass a mock store in tests.

### 5. Context Propagation
Every store method takes `context.Context` as the first parameter. This lets us
propagate request deadlines and cancellations down to the database layer.

---

## How to Run

### Local (go run)
```bash
cd 33-noteskaro
go mod tidy          # download dependencies
go run main.go       # starts on :8080

# Test it
curl http://localhost:8080/health
curl -X POST http://localhost:8080/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Go Channels","content":"Channels are typed conduits","category":"golang"}'
curl http://localhost:8080/api/notes
```

### Docker
```bash
cd 33-noteskaro
docker compose up --build
```

### Environment Variables
| Variable        | Default         | Description              |
|-----------------|-----------------|--------------------------|
| `PORT`          | `8080`          | Server listen port       |
| `DB_PATH`       | `noteskaro.db`  | SQLite file path         |
| `READ_TIMEOUT`  | `10s`           | HTTP read timeout        |
| `WRITE_TIMEOUT` | `10s`           | HTTP write timeout       |
| `IDLE_TIMEOUT`  | `120s`          | HTTP idle timeout        |

---

## Key Takeaways

1. **Chi is net/http-compatible** — your handlers are plain `http.HandlerFunc`.
   No framework lock-in.

2. **SQLite is a legitimate production database** for read-heavy, single-writer
   workloads. WhatsApp used it. Fly.io advocates for it. With WAL mode, it handles
   concurrent reads beautifully.

3. **`internal/` is a compile-time boundary**, not just a naming convention. Use it
   to enforce encapsulation in multi-package projects.

4. **Graceful shutdown is not optional** — without it, your users get broken
   connections during deployments. Go makes it easy with `server.Shutdown()`.

5. **The Repository Pattern** decouples your business logic from your storage.
   Today it is SQLite, tomorrow it could be PostgreSQL — only the store package
   changes.

6. **Middleware order matters** — Recovery wraps everything, Logger should be early
   to capture timing, ContentType can be innermost.

7. **Pure Go dependencies** (`modernc.org/sqlite`) simplify your build pipeline.
   No C compiler, no cross-compilation headaches, no CGO flags.

---

## What is Next?

Chapter 34 (**Dwarpal**) adds JWT authentication middleware to NotesKaro. Trainees
will need to log in before they can create or modify notes. Chapter 35
(**BazaarAPI**) scales up to a marketplace with multiple resources, pagination, and
PostgreSQL.
