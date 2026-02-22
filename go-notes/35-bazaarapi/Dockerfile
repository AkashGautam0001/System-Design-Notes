# ============================================================
#  Dockerfile — BazaarAPI Multi-Stage Build
# ============================================================
#  WHY multi-stage? Two reasons:
#  1. The builder stage has Go toolchain (~1GB). The runtime stage
#     has only the binary (~20MB). Smaller images = faster deploys.
#  2. No source code in the runtime image — just the compiled binary.
#     This reduces the attack surface in production.
#
#  WHY CGO_ENABLED=0? Because modernc.org/sqlite is a pure Go
#  SQLite implementation. No C compiler needed. This means we can
#  use a minimal base image (alpine) without gcc or glibc.
# ============================================================

# ── Stage 1: Build ──────────────────────────────────────────
FROM golang:1.23-alpine AS builder

WORKDIR /app

# WHY copy go.mod and go.sum first? Docker caches each layer.
# If dependencies have not changed, Docker reuses the cached
# "go mod download" layer — saving minutes on rebuilds.
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code and build.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o bazaarapi .

# ── Stage 2: Runtime ────────────────────────────────────────
FROM alpine:3.20

# WHY ca-certificates? For HTTPS calls (if the API ever needs
# to reach external services). Alpine does not include them by default.
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy only the binary from the builder stage.
COPY --from=builder /app/bazaarapi .

# Create a directory for the SQLite database file.
RUN mkdir -p /app/data

# WHY a non-root user? Running as root inside a container is a
# security risk. If an attacker exploits the app, they get root
# on the container. A non-root user limits the blast radius.
RUN adduser -D -g '' appuser
USER appuser

EXPOSE 8080

# WHY exec form (JSON array)? So that the Go binary is PID 1 and
# receives SIGTERM directly from Docker. Shell form wraps the binary
# in /bin/sh, which may not forward signals — breaking graceful shutdown.
CMD ["./bazaarapi"]
