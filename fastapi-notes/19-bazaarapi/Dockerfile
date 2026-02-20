# ============================================================
# BazaarAPI — Dockerfile
# ============================================================
# Multi-stage is overkill for this; single-stage slim image.
# In production, you'd add a non-root user and health check.
# ============================================================

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose the port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
