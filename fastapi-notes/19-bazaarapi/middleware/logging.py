# ============================================================
# BazaarAPI — Request Logging Middleware
# ============================================================
# Logs every incoming request with method, path, status code,
# and response time. Essential for debugging and monitoring.
#
# Example log output:
#   INFO: POST /users/login -> 200 (45.2ms)
#   INFO: GET /products?search=phone -> 200 (12.8ms)
#   WARNING: GET /orders/999 -> 404 (3.1ms)
# ============================================================

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("bazaarapi.requests")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs every HTTP request.

    Captures:
    - HTTP method and path
    - Query parameters (for debugging search/filter issues)
    - Response status code
    - Processing duration in milliseconds

    Uses WARNING level for 4xx/5xx responses to make errors
    easier to spot in log aggregation tools.
    """

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        start_time = time.time()

        # Build the request description
        path = request.url.path
        if request.url.query:
            path = f"{path}?{request.url.query}"

        # Process the request
        response = await call_next(request)

        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000

        # Log with appropriate level
        log_message = (
            f"{request.method} {path} -> {response.status_code} "
            f"({duration_ms:.1f}ms)"
        )

        if response.status_code >= 500:
            logger.error(log_message)
        elif response.status_code >= 400:
            logger.warning(log_message)
        else:
            logger.info(log_message)

        return response
