# ============================================================
#  Dockerfile — Multi-stage Build for DwarPal
# ============================================================
#  WHY MULTI-STAGE?
#  Stage 1 (builder): Uses the full Go toolchain (~800MB) to
#  compile the binary. All source code, dependencies, and build
#  tools live here temporarily.
#
#  Stage 2 (runtime): Uses alpine (~5MB) to run the compiled
#  binary. No Go toolchain, no source code, no build artifacts.
#  Result: a tiny, secure image with minimal attack surface.
#
#  Zerodha analogy: The builder stage is the factory that forges
#  the gate. The runtime stage is the gate installed at the
#  bazaar entrance — lean and purpose-built.
# ============================================================

# ── Stage 1: Build ────────────────────────────────────────────
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy dependency files first — Docker caches this layer.
# If go.mod/go.sum don't change, dependencies aren't re-downloaded.
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o dwarpal .

# ── Stage 2: Runtime ──────────────────────────────────────────
FROM alpine:latest

# Install CA certificates for HTTPS calls (if needed later)
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy only the compiled binary from the builder stage
COPY --from=builder /app/dwarpal .

# Create a non-root user for security
# WHY? Running as root inside a container means a container
# escape vulnerability gives the attacker root on the host.
RUN adduser -D -s /bin/sh dwarpal
USER dwarpal

EXPOSE 8081

CMD ["./dwarpal"]
