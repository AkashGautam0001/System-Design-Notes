# ============================================================
# Dockerfile — Multi-Stage Build for NotesKaro
# ============================================================
# WHY MULTI-STAGE?
# Stage 1 (builder) has the full Go toolchain (~800MB).
# Stage 2 (runtime) only copies the compiled binary (~15MB).
# The final image is tiny — no Go compiler, no source code,
# smaller attack surface, faster deploys.
#
# WHY CGO_ENABLED=0?
# modernc.org/sqlite is pure Go, so we do not need CGO.
# Disabling CGO produces a fully static binary that runs on
# any Linux — even scratch (empty) images. This is one of the
# key advantages of choosing modernc.org over mattn/go-sqlite3.
# ============================================================

# ── Stage 1: Build ───────────────────────────────────────────
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy go.mod first for better layer caching.
# Docker caches each layer. If go.mod has not changed, Docker
# skips the expensive `go mod download` step on rebuilds.
COPY go.mod go.sum* ./
RUN go mod download

# Copy the rest of the source code.
COPY . .

# Build the binary. Key flags:
#   CGO_ENABLED=0  → pure Go, no C dependencies
#   -o noteskaro   → output binary name
#   -ldflags="-s -w" → strip debug info, smaller binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o noteskaro .

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM alpine:latest

# WHY alpine (not scratch)? Alpine includes a shell and basic
# utilities, which helps with debugging in production. For the
# smallest possible image, replace with `FROM scratch`.
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy only the binary from the builder stage.
COPY --from=builder /app/noteskaro .

# Expose the default port (documentation for humans and tools).
EXPOSE 8080

# Run as non-root for security. Even in a training environment,
# good habits matter.
RUN adduser -D -g '' appuser
USER appuser

# Start the server.
ENTRYPOINT ["./noteskaro"]
