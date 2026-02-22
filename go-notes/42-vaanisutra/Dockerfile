# ============================================================
# Dockerfile — Multi-stage build for VaaniSutra
# ============================================================
# WHY multi-stage? The Go toolchain is ~1GB but the compiled
# binary is ~15MB. Multi-stage build gives us a tiny final
# image (based on scratch/alpine) that starts in milliseconds.
# At Jio's scale with hundreds of containers, smaller images
# mean faster deployments and less storage cost.
# ============================================================

# Stage 1: Build the Go binary
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy dependency files first (Docker layer caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o vaanisutra .

# Stage 2: Create minimal runtime image
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/vaanisutra .

EXPOSE 8086

CMD ["./vaanisutra"]
