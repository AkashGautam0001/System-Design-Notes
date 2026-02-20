# ============================================================
# BazaarAPI — Timing Middleware
# ============================================================
# Adds an X-Process-Time header to every response.
#
# This is useful for:
#   - Frontend devs debugging slow responses
#   - Load balancers monitoring response times
#   - API consumers identifying performance issues
#
# The header value is in seconds (e.g., "0.045" = 45ms).
# ============================================================

import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class TimingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds X-Process-Time header to responses.

    The value is the server-side processing time in seconds.
    This does NOT include network latency — only server time.
    """

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}"
        return response
