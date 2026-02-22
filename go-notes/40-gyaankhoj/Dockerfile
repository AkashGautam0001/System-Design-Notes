# ============================================================
#  Dockerfile — Multi-stage build for GyaanKhoj
# ============================================================
#  WHY multi-stage? The Go toolchain is ~1GB. The compiled binary
#  is ~15MB. Multi-stage builds keep the production image small,
#  reducing pull times and attack surface. At TCS, every Docker
#  image must pass a size audit — no bloated images in production.
# ============================================================

# Stage 1: Build the Go binary.
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy dependency files first for better layer caching.
# WHY separate COPY? Docker caches each layer. If go.mod hasn't
# changed, `go mod download` is skipped — saving minutes on rebuilds.
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code and build.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o gyaankhoj .

# Stage 2: Minimal production image.
FROM alpine:3.19

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /app/gyaankhoj .

EXPOSE 8084

CMD ["./gyaankhoj"]
