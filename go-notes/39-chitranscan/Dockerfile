# ============================================================
#  Multi-stage Dockerfile for ChitranScan
# ============================================================
#  WHY multi-stage?
#  Stage 1 (builder): Has Go compiler, downloads deps, builds
#    the binary. Image size: ~1GB with Go toolchain.
#  Stage 2 (runtime): Only the compiled binary + CA certs.
#    Image size: ~12MB. That's 80x smaller.
#
#  BigBasket runs 30+ warehouse instances. Smaller images mean
#  faster pulls, faster scaling, smaller attack surface.
# ============================================================

# ── Stage 1: Build ──
FROM golang:1.23-alpine AS builder

WORKDIR /app

# WHY copy go.mod first? Docker caches layers. If go.mod hasn't
# changed, Docker reuses the cached dependency download — saving
# minutes on every build.
COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o chitranscan .

# ── Stage 2: Runtime ──
FROM alpine:3.19

# WHY ca-certificates? If we switch to real Gemini API calls,
# we need TLS certificates to verify Google's HTTPS endpoints.
RUN apk --no-cache add ca-certificates

WORKDIR /app
COPY --from=builder /app/chitranscan .

EXPOSE 8083

CMD ["./chitranscan"]
