"""
============================================================
FILE 12: DEPENDENCY INJECTION, MIDDLEWARE, AND REQUEST LIFECYCLE
============================================================
Topics: Depends(), function deps, class deps, yield deps,
        nested deps, global deps, router deps, overrides,
        middleware, CORS, timing, logging, GZip, lifespan

WHY THIS MATTERS:
Every production API needs authentication checks, database
sessions, logging, and CORS headers on every request. Without
DI and middleware, you would copy-paste the same 20 lines
into every single endpoint. DI is how professionals build
maintainable, testable APIs.
============================================================
"""

# STORY: Paytm — Rate Limit -> Auth -> Log -> Compress Pipeline
# Paytm processes 1.5 billion+ transactions per month. Every API
# request goes through a pipeline: rate limiting (is this IP
# spamming?), authentication (is the JWT valid?), logging (record
# for audit), and compression (minimize bandwidth for 2G users).
# This is exactly what middleware and dependency injection solve.
# Paytm's backend team uses DI for auth and DB sessions, and
# middleware for cross-cutting concerns like logging and CORS.

from typing import Optional, Annotated
from datetime import datetime, timezone
import time
import logging

from fastapi import (
    FastAPI, Depends, HTTPException, Header, Query, Request, Response,
    status
)
from fastapi.responses import JSONResponse

# ════════════════════════════════════════════════════════════
# SECTION 1 — What Is Dependency Injection and Why It Matters
# ════════════════════════════════════════════════════════════

# WHY: Dependency Injection (DI) means "don't create what you
# need inside a function — receive it from outside." This makes
# code reusable, testable, and composable.

# Without DI (bad):
# @app.get("/users")
# def get_users():
#     db = create_connection()  # hardcoded, can't test
#     token = extract_token()   # repeated in every endpoint
#     ...

# With DI (good):
# @app.get("/users")
# def get_users(db: Session = Depends(get_session),
#               user: User = Depends(get_current_user)):
#     ...  # db and user are injected automatically


# ════════════════════════════════════════════════════════════
# SECTION 2 — Simple Function Dependencies
# ════════════════════════════════════════════════════════════

# WHY: The simplest form of DI — a function that extracts or
# validates something from the request. FastAPI calls it for
# you and injects the return value.

# How Depends() works under the hood:
# 1. FastAPI sees Depends(some_function) in your endpoint signature
# 2. Before calling your endpoint, FastAPI calls some_function
# 3. FastAPI inspects some_function's parameters too (recursively)
# 4. The return value of some_function is passed to your endpoint
# 5. If some_function raises an HTTPException, your endpoint never runs

# --- Dependency function: extract common query params ---

def common_pagination(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
):
    """
    Extract pagination parameters. Instead of repeating these
    two query params in every list endpoint, define once and
    Depends() everywhere.
    """
    return {"page": page, "page_size": page_size, "skip": (page - 1) * page_size}


# --- Dependency that validates a header ---

def verify_api_key(x_api_key: str = Header(..., description="API Key")):
    """
    Check that the request includes a valid API key header.
    Raise 403 if missing or invalid.
    """
    valid_keys = {"paytm-key-2024", "test-key-001"}
    if x_api_key not in valid_keys:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key"
        )
    return x_api_key


# --- Dependency that extracts and returns a value ---

def get_current_timestamp():
    """Return the current UTC timestamp. Useful for audit logging."""
    return datetime.now(timezone.utc)


# ════════════════════════════════════════════════════════════
# SECTION 3 — Dependencies with Parameters and Return Values
# ════════════════════════════════════════════════════════════

# WHY: Sometimes you need a dependency that is configurable.
# For example, a role checker that accepts a list of allowed
# roles. You achieve this with a function that returns a function.

def require_role(allowed_roles: list):
    """
    Factory function that creates a dependency.
    Usage: Depends(require_role(["admin", "manager"]))
    """
    def role_checker(x_user_role: str = Header("user")):
        if x_user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{x_user_role}' not allowed. Need: {allowed_roles}"
            )
        return x_user_role
    return role_checker


# --- Dependency that returns a complex object ---

class PaginationParams:
    """A structured object to hold pagination state."""
    def __init__(self, page: int, page_size: int):
        self.page = page
        self.page_size = page_size
        self.skip = (page - 1) * page_size
        self.limit = page_size


def get_pagination(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginationParams:
    """Return a PaginationParams object."""
    return PaginationParams(page=page, page_size=page_size)


# ════════════════════════════════════════════════════════════
# SECTION 4 — Nested Dependencies (Dependency Chains)
# ════════════════════════════════════════════════════════════

# WHY: Real apps have dependency chains. To get the current user,
# you first need to extract the token, then decode it, then
# look up the user. Each step is a dependency that feeds the next.

def extract_token(authorization: str = Header(...)):
    """
    Step 1: Extract the bearer token from the Authorization header.
    Header value: "Bearer eyJhbGci..."
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format"
        )
    token = authorization.replace("Bearer ", "")
    return token


def decode_token(token: str = Depends(extract_token)):
    """
    Step 2: Decode the token to get user info.
    Depends on extract_token — FastAPI chains them automatically.
    """
    # In production, this would verify a JWT
    # For demo, we simulate decoding
    fake_users_db = {
        "valid-token-rahul": {"user_id": 1, "username": "rahul", "role": "admin"},
        "valid-token-priya": {"user_id": 2, "username": "priya", "role": "user"},
    }
    user_data = fake_users_db.get(token)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    return user_data


def get_current_user(user_data: dict = Depends(decode_token)):
    """
    Step 3: Return the current user from decoded token data.
    Chain: Header -> extract_token -> decode_token -> get_current_user
    """
    return user_data


# ════════════════════════════════════════════════════════════
# SECTION 5 — Class-Based Dependencies
# ════════════════════════════════════════════════════════════

# WHY: When a dependency needs state or configuration, a class
# with __call__ is cleaner than nested closures. Think of a
# rate limiter that tracks request counts.

class RateLimiter:
    """
    A simple in-memory rate limiter.
    In production, use Redis for distributed rate limiting.
    """

    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict = {}  # ip -> [(timestamp), ...]

    def __call__(self, request: Request):
        """
        FastAPI calls this when the dependency is resolved.
        Because __call__ exists, the class instance IS a callable.
        """
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Clean old requests outside the window
        if client_ip in self.requests:
            self.requests[client_ip] = [
                t for t in self.requests[client_ip]
                if now - t < self.window_seconds
            ]
        else:
            self.requests[client_ip] = []

        # Check limit
        if len(self.requests[client_ip]) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Max {self.max_requests} requests per {self.window_seconds}s"
            )

        # Record this request
        self.requests[client_ip].append(now)
        return {"ip": client_ip, "remaining": self.max_requests - len(self.requests[client_ip])}


# Create an instance — this IS the dependency
rate_limiter = RateLimiter(max_requests=50, window_seconds=60)


# ════════════════════════════════════════════════════════════
# SECTION 6 — Yield Dependencies (With Cleanup)
# ════════════════════════════════════════════════════════════

# WHY: Database sessions, file handles, and network connections
# must be CLOSED after the request. Yield dependencies give you
# setup + cleanup in one function — like a context manager.

def get_db_session():
    """
    Yield a fake database session.
    Everything before yield = setup.
    Everything after yield = cleanup (always runs).
    """
    print("[DB] Opening session...")
    session = {"connection": "active", "queries": []}
    try:
        yield session
        # If the endpoint succeeds, we get here
        print("[DB] Committing transaction...")
    except Exception:
        # If the endpoint raises an error
        print("[DB] Rolling back transaction...")
        raise
    finally:
        # Always runs — like a finally block
        print("[DB] Closing session...")


def get_file_writer():
    """
    Another yield dependency: opens a log file, yields it,
    then closes it. Cleanup is guaranteed.
    """
    log_file = open("/tmp/api_audit.log", "a")
    try:
        yield log_file
    finally:
        log_file.close()


# ════════════════════════════════════════════════════════════
# SECTION 7 — Global, Router, and Override Dependencies
# ════════════════════════════════════════════════════════════

# WHY: Some dependencies should run on EVERY request (auth,
# rate limiting). You can set them at the app level instead
# of adding Depends() to every single endpoint.

from fastapi import APIRouter

# --- App-level global dependencies ---
# Every endpoint in this app will require a valid API key.
# (Commented out to keep the demo app flexible)
# app = FastAPI(dependencies=[Depends(verify_api_key)])

# --- Router-level dependencies ---
# Only endpoints in this router require admin role.
admin_router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_role(["admin"]))],
)


@admin_router.get("/dashboard")
def admin_dashboard():
    """Only accessible if x-user-role header is 'admin'."""
    return {"message": "Welcome to admin dashboard"}


@admin_router.get("/users")
def admin_list_users():
    """Also protected by router-level admin dependency."""
    return {"users": ["rahul", "priya", "amit"]}


# --- Dependency Overrides for Testing ---
# In tests, you don't want to hit a real database or auth service.
# Override the dependency with a fake one.

def fake_get_current_user():
    """Fake user for testing — no real auth needed."""
    return {"user_id": 999, "username": "test_user", "role": "admin"}

# To override in tests:
# app.dependency_overrides[get_current_user] = fake_get_current_user
# ... run tests ...
# app.dependency_overrides.clear()  # clean up after

# Why overrides matter:
# 1. Tests run without external services (DB, Redis, APIs)
# 2. Tests are fast — no network calls, no real auth
# 3. Tests are deterministic — same fake data every time
# 4. You can simulate edge cases (expired tokens, disabled users)
# 5. Override is scoped to the test — clean up with .clear()


# ════════════════════════════════════════════════════════════
# SECTION 8 — Middleware and the Request Lifecycle
# ════════════════════════════════════════════════════════════

# WHY: Middleware wraps EVERY request. It runs before the
# endpoint and after the response. Perfect for logging,
# timing, headers, and security checks.

# Request lifecycle:
# Client -> Middleware 1 -> Middleware 2 -> ... -> Route Handler
# Client <- Middleware 1 <- Middleware 2 <- ... <- Response

app = FastAPI(title="Paytm-style API with Middleware")
app.include_router(admin_router)


# --- Timing Middleware ---
# Measures how long each request takes. Paytm monitors this
# to ensure UPI payments respond within 2 seconds.

@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    """Add X-Process-Time header to every response."""
    start_time = time.time()

    # call_next passes the request to the next middleware or route
    response = await call_next(request)

    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    return response


# --- Logging Middleware ---
# Log every request for audit and debugging.

logger = logging.getLogger("paytm_api")


@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Log request method, path, and response status."""
    logger.info(f"Request: {request.method} {request.url.path}")

    response = await call_next(request)

    logger.info(
        f"Response: {request.method} {request.url.path} "
        f"-> {response.status_code}"
    )
    return response


# --- Custom Security Headers Middleware ---

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Add security headers to every response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# ════════════════════════════════════════════════════════════
# SECTION 9 — CORS, Trusted Host, and GZip Middleware
# ════════════════════════════════════════════════════════════

# WHY: CORS is required when your React/Vue frontend is on a
# different domain than your API. Without it, browsers block
# every request. GZip reduces response sizes by 70-90%.

from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

# --- CORS Middleware ---
# Allow your frontend (e.g., paytm.com) to call this API

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://paytm.com",
        "https://app.paytm.com",
        "http://localhost:3000",  # React dev server
    ],
    allow_credentials=True,       # Allow cookies
    allow_methods=["*"],          # Allow all HTTP methods
    allow_headers=["*"],          # Allow all headers
    expose_headers=["X-Process-Time"],  # Expose custom headers to JS
)

# --- Trusted Host Middleware ---
# Reject requests with unexpected Host headers (prevents host header attacks)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "api.paytm.com",
        "localhost",
        "127.0.0.1",
        "testserver",     # Required for TestClient
    ],
)

# --- GZip Middleware ---
# Compress responses larger than 500 bytes.
# Great for Indian users on slow 2G/3G connections.

app.add_middleware(
    GZipMiddleware,
    minimum_size=500  # Only compress if response > 500 bytes
)


# ════════════════════════════════════════════════════════════
# SECTION 10 — Lifespan Events (Startup/Shutdown)
# ════════════════════════════════════════════════════════════

# WHY: You need to initialize resources (DB pool, cache, ML model)
# when the app starts and clean them up when it stops. The modern
# way is the lifespan context manager (replaces on_event).

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(the_app: FastAPI):
    """
    Modern lifespan handler (FastAPI 0.93+).
    Replaces @app.on_event("startup") and @app.on_event("shutdown").
    """
    # --- Startup ---
    print("[STARTUP] Initializing database connection pool...")
    print("[STARTUP] Loading ML fraud detection model...")
    print("[STARTUP] Connecting to Redis cache...")

    # You can store resources on app.state
    the_app.state.cache = {"initialized": True}

    yield  # App is running, handling requests

    # --- Shutdown ---
    print("[SHUTDOWN] Closing database connections...")
    print("[SHUTDOWN] Releasing ML model memory...")
    print("[SHUTDOWN] Disconnecting from Redis...")


# To use lifespan, create the app with it:
# app_with_lifespan = FastAPI(lifespan=lifespan)
# (We keep our main app above for the middleware examples)

# Benefits of lifespan over @app.on_event:
# 1. Single function for both startup and shutdown
# 2. Resources can be shared via yield (no global state)
# 3. Type-safe — the app parameter is properly typed
# 4. Recommended by FastAPI docs since version 0.93+
# 5. Works well with async resources (DB pools, HTTP clients)


# ════════════════════════════════════════════════════════════
# SECTION 11 — Complete Example: All Pieces Together
# ════════════════════════════════════════════════════════════

# WHY: Seeing DI + middleware + lifespan together in one app
# shows how they compose into a production-ready API.

# --- Endpoints using dependencies ---

@app.get("/")
def root():
    """Public endpoint — no auth required."""
    return {"message": "Welcome to Paytm API", "status": "healthy"}


@app.get("/transactions")
def list_transactions(
    pagination: dict = Depends(common_pagination),
    rate_info: dict = Depends(rate_limiter),
    db: dict = Depends(get_db_session),
):
    """
    List transactions with pagination and rate limiting.
    Three dependencies injected automatically:
    1. pagination — extracts page/page_size from query params
    2. rate_info — checks and enforces rate limit
    3. db — provides a database session (with cleanup)
    """
    return {
        "transactions": [
            {"id": 1, "amount": 500, "type": "UPI"},
            {"id": 2, "amount": 1200, "type": "wallet"},
        ],
        "pagination": pagination,
        "rate_limit_remaining": rate_info["remaining"],
    }


@app.get("/profile")
def get_profile(current_user: dict = Depends(get_current_user)):
    """
    Protected endpoint — requires valid Bearer token.
    Dependency chain: Header -> extract -> decode -> user
    """
    return {
        "user": current_user,
        "message": f"Hello, {current_user['username']}!"
    }


@app.get("/admin-only")
def admin_endpoint(
    current_user: dict = Depends(get_current_user),
    role: str = Depends(require_role(["admin"])),
):
    """Requires both authentication AND admin role."""
    return {"message": "Admin access granted", "user": current_user}


@app.post("/transfer")
def transfer_money(
    amount: float = Query(gt=0, le=100000),
    to_user: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db: dict = Depends(get_db_session),
    rate_info: dict = Depends(rate_limiter),
):
    """
    Transfer money — uses auth + DB session + rate limiting.
    All injected, all testable, all reusable.
    """
    return {
        "status": "success",
        "from": current_user["username"],
        "to": to_user,
        "amount": amount,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ════════════════════════════════════════════════════════════
# KEY TAKEAWAYS
# ════════════════════════════════════════════════════════════
# 1. Depends() injects return values of functions into endpoints
# 2. Dependencies can depend on other dependencies (chaining)
# 3. yield dependencies provide setup + guaranteed cleanup
# 4. Class-based dependencies (__call__) are great for stateful logic
# 5. Router-level deps apply to all endpoints in that router
# 6. dependency_overrides lets you swap deps for testing
# 7. Middleware wraps every request — use for logging, timing, CORS
# 8. Lifespan context manager replaces startup/shutdown events
# "Write code that is easy to delete, not easy to extend." — tef
