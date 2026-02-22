# ============================================================
#  Dockerfile — Multi-Stage Build for SahayakBot
# ============================================================
#  WHY multi-stage? The Go toolchain is ~1GB. The compiled binary
#  is ~15MB. Multi-stage builds give us a tiny production image:
#    - Stage 1 (builder): full Go SDK, compiles the binary
#    - Stage 2 (runtime): minimal Alpine, runs the binary
#
#  Swiggy runs 200+ Go microservices on Kubernetes. Every MB saved
#  in the image means faster pod starts and lower storage costs.
# ============================================================

# Stage 1: Build
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy dependency files first (Docker layer caching)
# WHY separate COPY? If only source code changes (not go.mod),
# Docker reuses the cached module download layer. This saves
# 30-60 seconds on every build.
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o sahayakbot main.go

# Stage 2: Runtime
FROM alpine:3.19

RUN apk --no-cache add ca-certificates

WORKDIR /app
COPY --from=builder /app/sahayakbot .

EXPOSE 8085

CMD ["./sahayakbot"]
