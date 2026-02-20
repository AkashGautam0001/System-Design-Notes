"""
============================================================
FILE 05: RESPONSE MODELS, STATUS CODES, AND ERROR HANDLING
============================================================
Topics: response_model parameter, response_model with List,
        response_model_exclude_unset/defaults/include/exclude,
        return type annotations, input vs output models,
        HTTP status codes, status module, HTTPException,
        custom exception handlers, RequestValidationError,
        JSONResponse, Response class, generic responses

WHY THIS MATTERS:
Your API is only as good as its responses. Wrong status codes
confuse clients, leaked fields (passwords!) cause security
breaches, and poor error messages waste developer hours.
Mastering responses makes your API professional and secure.
============================================================
"""

# STORY: PhonePe — Payment 201/400/503 Response Codes
# PhonePe processes over 1.5 billion UPI transactions monthly across
# India. Every payment response is critical — a 201 means "payment
# initiated," 400 means "bad request (invalid UPI ID)," and 503 means
# "bank server unavailable, retry later." Getting status codes wrong
# led to a real incident where 200 OK was returned for failed payments,
# causing merchants to ship products for unpaid orders. Now every
# endpoint has strict response_model validation and explicit status
# codes — the API contract is the source of truth.

from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import uvicorn

app = FastAPI(
    title="PhonePe Payment API",
    description="Learning response models and error handling through payments.",
    version="3.0.0",
)

# ════════════════════════════════════════════════════════════
# SECTION 1 — response_model Parameter
# ════════════════════════════════════════════════════════════

# WHY: response_model tells FastAPI what shape the response
# should be. It filters out extra fields, validates output,
# and generates accurate API documentation.

# --- Define separate input and output models ---
class UserCreate(BaseModel):
    """What the client sends to create a user."""
    username: str
    email: str
    password: str                                  # Client sends this
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserResponse(BaseModel):
    """What the API returns — NO PASSWORD!"""
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "id": 1,
                    "username": "rahul_sharma",
                    "email": "rahul@example.com",
                    "full_name": "Rahul Sharma",
                    "phone": "+919876543210",
                    "is_active": True,
                }
            ]
        }
    )


# --- Using response_model to filter output ---
@app.post(
    "/users",
    response_model=UserResponse,                   # Only these fields in response
    status_code=status.HTTP_201_CREATED,
    tags=["Users"],
    summary="Register a New User",
)
def create_user(user: UserCreate):
    """
    response_model=UserResponse ensures:
    1. Password is NEVER sent back (it's not in UserResponse)
    2. Extra fields (like internal DB fields) are filtered out
    3. Swagger docs show the EXACT response shape
    4. Response is validated before sending

    Even if you return a dict with 'password' in it,
    response_model will strip it out. Safety net!
    """
    # Simulate saving to database
    user_dict = user.model_dump()
    user_dict["id"] = 42                           # DB assigns ID
    user_dict["is_active"] = True
    # Even though user_dict contains 'password', response_model removes it
    return user_dict


# --- response_model with List ---
@app.get(
    "/users",
    response_model=List[UserResponse],             # List of UserResponse
    tags=["Users"],
    summary="List All Users",
)
def list_users():
    """
    response_model=List[UserResponse] means the response is a
    JSON array where each element matches UserResponse schema.
    """
    return [
        {"id": 1, "username": "rahul", "email": "rahul@test.com",
         "password": "secret123", "is_active": True},
        {"id": 2, "username": "priya", "email": "priya@test.com",
         "password": "hidden456", "is_active": True},
        # Passwords are in the dicts but response_model strips them!
    ]


# ════════════════════════════════════════════════════════════
# SECTION 2 — response_model Filtering Options
# ════════════════════════════════════════════════════════════

# WHY: Sometimes you want to exclude fields that weren't set
# (to save bandwidth) or include only specific fields (for
# summary views). These options give you fine control.

class PaymentResponse(BaseModel):
    """Payment details model."""
    payment_id: str
    amount: float
    currency: str = "INR"
    status: str
    upi_id: Optional[str] = None
    card_last_four: Optional[str] = None
    bank_reference: Optional[str] = None
    error_message: Optional[str] = None
    refund_amount: Optional[float] = None


# --- response_model_exclude_unset ---
@app.get(
    "/payments/{payment_id}/compact",
    response_model=PaymentResponse,
    response_model_exclude_unset=True,             # Skip fields not explicitly set
    tags=["Payments"],
    summary="Get Payment (Compact)",
)
def get_payment_compact(payment_id: str):
    """
    response_model_exclude_unset=True:
    Only returns fields that were explicitly set.
    None-default fields that weren't provided are omitted entirely.

    Result: {"payment_id": "PAY_123", "amount": 999, "status": "success"}
    NOT:    {"payment_id": "PAY_123", "amount": 999, "status": "success",
             "upi_id": null, "card_last_four": null, ...}

    This saves bandwidth — important when PhonePe sends millions
    of responses per minute.
    """
    payment = PaymentResponse(
        payment_id=payment_id,
        amount=999.0,
        status="success",
        upi_id="user@paytm",
        # card_last_four, bank_reference, etc. NOT set → excluded
    )
    return payment


# --- response_model_include and response_model_exclude ---
@app.get(
    "/payments/{payment_id}/summary",
    response_model=PaymentResponse,
    response_model_include={"payment_id", "amount", "status"},  # Only these
    tags=["Payments"],
    summary="Get Payment Summary",
)
def get_payment_summary(payment_id: str):
    """
    response_model_include = set of field names to include.
    Only payment_id, amount, and status will be in the response.
    All other fields are stripped even if they have values.
    """
    return PaymentResponse(
        payment_id=payment_id,
        amount=1499.0,
        status="success",
        upi_id="user@ybl",
        card_last_four="4321",
        bank_reference="REF_789",
    )


@app.get(
    "/payments/{payment_id}/public",
    response_model=PaymentResponse,
    response_model_exclude={"bank_reference", "error_message"},  # Hide these
    tags=["Payments"],
    summary="Get Payment (Public View)",
)
def get_payment_public(payment_id: str):
    """
    response_model_exclude = set of field names to hide.
    Everything except bank_reference and error_message will be returned.
    """
    return PaymentResponse(
        payment_id=payment_id,
        amount=2999.0,
        status="success",
        upi_id="merchant@icici",
        bank_reference="INTERNAL_REF_001",         # Excluded from response
        error_message=None,                        # Excluded from response
    )


# ════════════════════════════════════════════════════════════
# SECTION 3 — Return Type Annotations vs response_model
# ════════════════════════════════════════════════════════════

# WHY: Python 3.9+ lets you use return type annotations instead
# of response_model. Understanding both approaches helps you
# choose the right one for each situation.

class TransactionSummary(BaseModel):
    """Lightweight transaction summary."""
    txn_id: str
    amount: float
    status: str
    timestamp: str


# --- Approach 1: response_model (explicit, older style) ---
@app.get(
    "/transactions/v1/{txn_id}",
    response_model=TransactionSummary,
    tags=["Transactions"],
)
def get_transaction_v1(txn_id: str):
    """Using response_model parameter — works in all Python 3.7+."""
    return {
        "txn_id": txn_id,
        "amount": 1250.0,
        "status": "completed",
        "timestamp": "2024-12-15T10:30:00Z",
        "internal_note": "This field is filtered out by response_model"
    }


# --- Approach 2: Return type annotation (cleaner, Python 3.9+) ---
@app.get("/transactions/v2/{txn_id}", tags=["Transactions"])
def get_transaction_v2(txn_id: str) -> TransactionSummary:
    """
    Return type annotation replaces response_model.
    Cleaner syntax, same behavior.
    FastAPI reads the -> TransactionSummary and uses it as response_model.
    """
    return TransactionSummary(
        txn_id=txn_id,
        amount=1250.0,
        status="completed",
        timestamp="2024-12-15T10:30:00Z",
    )


# --- When to use which ---
# Use response_model when:
#   - You need response_model_exclude/include options
#   - Return type differs from response model (e.g., returning dict but filtering)
#   - You want to return a different type than declared
#
# Use return type annotation when:
#   - Simple, clean code is preferred
#   - No special filtering needed
#   - You're on Python 3.9+


# ════════════════════════════════════════════════════════════
# SECTION 4 — HTTP Status Codes Deep Dive
# ════════════════════════════════════════════════════════════

# WHY: Status codes are the first thing clients check. Using
# 200 for everything is lazy and dangerous — it hides errors
# and breaks automated error handling.

# STATUS CODE FAMILIES:
#
# 1xx — Informational (rarely used in APIs)
#   100 Continue
#
# 2xx — Success
#   200 OK              → GET, PUT, PATCH (default)
#   201 Created         → POST (resource created)
#   202 Accepted        → async processing started
#   204 No Content      → DELETE (success, no body)
#
# 3xx — Redirection
#   301 Moved Permanently
#   307 Temporary Redirect
#
# 4xx — Client Error (client sent bad request)
#   400 Bad Request     → generic client error
#   401 Unauthorized    → not authenticated
#   403 Forbidden       → authenticated but not authorized
#   404 Not Found       → resource doesn't exist
#   409 Conflict        → duplicate, race condition
#   422 Unprocessable   → validation error (FastAPI default)
#   429 Too Many Reqs   → rate limited
#
# 5xx — Server Error (our fault)
#   500 Internal Error  → unhandled exception
#   502 Bad Gateway     → upstream service down
#   503 Unavailable     → service overloaded/maintenance
#
# PhonePe payment context:
#   201 → payment initiated successfully
#   400 → invalid UPI ID format
#   402 → insufficient funds (Payment Required)
#   503 → bank server unreachable, retry in 30s

# --- Using status codes correctly ---
@app.post(
    "/payments",
    status_code=status.HTTP_201_CREATED,           # Using status module constant
    tags=["Payments"],
    summary="Initiate a Payment",
)
def initiate_payment(amount: float, upi_id: str):
    """status.HTTP_201_CREATED is cleaner than magic number 201."""
    return {
        "payment_id": "PAY_2024_001",
        "amount": amount,
        "upi_id": upi_id,
        "status": "initiated",
    }


@app.delete(
    "/payments/{payment_id}",
    status_code=status.HTTP_204_NO_CONTENT,        # No body in response
    tags=["Payments"],
    summary="Cancel a Payment",
)
def cancel_payment(payment_id: str):
    """204 No Content — deletion succeeded, nothing to return."""
    # Don't return anything for 204
    return None


@app.post(
    "/payments/async-process",
    status_code=status.HTTP_202_ACCEPTED,           # Processing started, not done
    tags=["Payments"],
    summary="Queue Payment for Processing",
)
def queue_payment(amount: float):
    """
    202 Accepted means "I received your request and will process it later."
    Used for async/queue-based operations.
    PhonePe queues payment verification — the result comes via webhook.
    """
    return {
        "queue_id": "Q_2024_001",
        "status": "queued",
        "estimated_completion": "30 seconds",
        "webhook_url": "https://merchant.com/webhook",
    }


# ════════════════════════════════════════════════════════════
# SECTION 5 — HTTPException for Error Responses
# ════════════════════════════════════════════════════════════

# WHY: HTTPException is FastAPI's way to return error responses.
# It immediately stops execution and sends the error to the client
# with the proper status code and message.

# --- Simulated data ---
payments_db = {
    "PAY_001": {"id": "PAY_001", "amount": 999, "status": "success", "user": "rahul"},
    "PAY_002": {"id": "PAY_002", "amount": 2499, "status": "failed", "user": "priya"},
    "PAY_003": {"id": "PAY_003", "amount": 599, "status": "pending", "user": "amit"},
}


@app.get("/payments/{payment_id}", tags=["Payments"])
def get_payment(payment_id: str):
    """
    HTTPException returns an error response immediately.

    /payments/PAY_001 → 200 OK with payment data
    /payments/PAY_999 → 404 Not Found with error message
    """
    if payment_id not in payments_db:
        # This immediately stops and returns 404
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment {payment_id} not found",
        )
    return payments_db[payment_id]


# --- HTTPException with custom detail structure ---
@app.get("/payments/{payment_id}/refund", tags=["Payments"])
def request_refund(payment_id: str):
    """
    HTTPException detail can be a string, dict, or list.
    Dicts are useful for structured error responses.
    """
    if payment_id not in payments_db:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "PAYMENT_NOT_FOUND",
                "message": f"Payment {payment_id} does not exist",
                "suggestion": "Check the payment ID and try again",
            },
        )

    payment = payments_db[payment_id]

    if payment["status"] != "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "REFUND_NOT_ALLOWED",
                "message": f"Cannot refund a {payment['status']} payment",
                "current_status": payment["status"],
                "allowed_statuses": ["success"],
            },
        )

    return {
        "refund_id": f"REF_{payment_id}",
        "original_amount": payment["amount"],
        "refund_amount": payment["amount"],
        "status": "refund_initiated",
    }


# --- HTTPException with custom headers ---
@app.get("/rate-limited-endpoint", tags=["Demo"])
def rate_limited():
    """
    HTTPException can include custom headers.
    Common use: rate limit headers telling the client when to retry.
    """
    # Simulate rate limit exceeded
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Rate limit exceeded. Max 100 requests per minute.",
        headers={
            "Retry-After": "60",                   # Retry after 60 seconds
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": "1702641600",
        },
    )


# ════════════════════════════════════════════════════════════
# SECTION 6 — Custom Exception Handlers
# ════════════════════════════════════════════════════════════

# WHY: Default error responses might not match your API's format.
# Custom handlers let you standardize ALL error responses across
# your entire API — consistency is professional.

# --- Custom exception class ---
class PaymentException(Exception):
    """Custom exception for payment-related errors."""
    def __init__(self, payment_id: str, error_code: str, message: str):
        self.payment_id = payment_id
        self.error_code = error_code
        self.message = message


# --- Register custom exception handler ---
@app.exception_handler(PaymentException)
async def payment_exception_handler(request: Request, exc: PaymentException):
    """
    Custom handler for PaymentException.
    Returns a consistent error format across all payment errors.
    """
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "payment_id": exc.payment_id,
            },
            "request_url": str(request.url),
        },
    )


@app.post("/payments/process", tags=["Payments"])
def process_payment(amount: float, upi_id: str):
    """
    Uses custom PaymentException for domain-specific errors.
    """
    if amount <= 0:
        raise PaymentException(
            payment_id="N/A",
            error_code="INVALID_AMOUNT",
            message=f"Amount must be positive, got {amount}",
        )

    if not upi_id.endswith(("@ybl", "@paytm", "@icici", "@sbi", "@okaxis")):
        raise PaymentException(
            payment_id="N/A",
            error_code="INVALID_UPI",
            message=f"UPI ID '{upi_id}' has an unsupported provider",
        )

    return {
        "payment_id": "PAY_2024_NEW",
        "amount": amount,
        "upi_id": upi_id,
        "status": "processing",
    }


# --- Override default validation error handler ---
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Override FastAPI's default 422 validation error response.

    Default format is detailed but not always user-friendly.
    This handler converts it to a simpler format.

    Default: {"detail": [{"loc": [...], "msg": "...", "type": "..."}]}
    Custom:  {"success": false, "errors": [...], "message": "..."}
    """
    errors = []
    for error in exc.errors():
        # Build a readable field path (e.g., "body.price" or "query.limit")
        field_path = " -> ".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field_path,
            "message": error["msg"],
            "type": error["type"],
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": f"Validation failed: {len(errors)} error(s)",
            "errors": errors,
            "body": exc.body,
        },
    )


# ════════════════════════════════════════════════════════════
# SECTION 7 — JSONResponse and Custom Responses
# ════════════════════════════════════════════════════════════

# WHY: Sometimes you need full control over the response — custom
# headers, cookies, different content types, or non-standard
# status codes that vary per request.

@app.get("/payments/{payment_id}/receipt", tags=["Payments"])
def get_receipt(payment_id: str):
    """
    JSONResponse gives full control over the response.
    You set status_code, headers, and content directly.
    """
    if payment_id not in payments_db:
        return JSONResponse(
            status_code=404,
            content={"error": "Payment not found"},
            headers={"X-Error-Code": "PAYMENT_NOT_FOUND"},
        )

    payment = payments_db[payment_id]
    return JSONResponse(
        status_code=200,
        content={
            "receipt": {
                "payment_id": payment["id"],
                "amount": payment["amount"],
                "status": payment["status"],
                "generated_at": "2024-12-15T10:30:00Z",
            }
        },
        headers={
            "X-Receipt-Version": "2.0",
            "Cache-Control": "no-store",           # Don't cache receipts
        },
    )


# --- Generic responses for OpenAPI documentation ---
# These tell Swagger about POSSIBLE responses (not just the happy path).

@app.get(
    "/payments/{payment_id}/details",
    tags=["Payments"],
    summary="Get Payment Details",
    responses={
        200: {
            "description": "Payment found successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "PAY_001",
                        "amount": 999,
                        "status": "success"
                    }
                }
            },
        },
        404: {
            "description": "Payment not found",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Payment PAY_999 not found"
                    }
                }
            },
        },
        503: {
            "description": "Payment service temporarily unavailable",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Payment service is under maintenance",
                        "retry_after": 300,
                    }
                }
            },
        },
    },
)
def get_payment_details(payment_id: str):
    """
    The `responses` parameter documents all possible responses
    in Swagger UI. Clients can see what 404 and 503 look like
    without triggering them.

    This is especially important for PhonePe's merchant API:
    merchants need to know EVERY possible response to handle
    payment flows correctly.
    """
    if payment_id not in payments_db:
        raise HTTPException(status_code=404, detail=f"Payment {payment_id} not found")
    return payments_db[payment_id]


# --- Separate input/output models: complete example ---

class MerchantIn(BaseModel):
    """What merchants send to register."""
    business_name: str = Field(..., min_length=3)
    owner_name: str
    pan_number: str = Field(..., pattern=r"^[A-Z]{5}\d{4}[A-Z]$")
    bank_account: str
    ifsc_code: str = Field(..., pattern=r"^[A-Z]{4}0[A-Z0-9]{6}$")
    password: str = Field(..., min_length=8)


class MerchantOut(BaseModel):
    """What the API returns — sensitive fields removed."""
    id: int
    business_name: str
    owner_name: str
    is_verified: bool = False
    # NO pan_number, bank_account, ifsc_code, or password!


@app.post(
    "/merchants",
    response_model=MerchantOut,
    status_code=status.HTTP_201_CREATED,
    tags=["Merchants"],
    summary="Register a Merchant",
)
def register_merchant(merchant: MerchantIn):
    """
    Input/Output model separation:
    - MerchantIn accepts: business_name, owner_name, PAN, bank details, password
    - MerchantOut returns: id, business_name, owner_name, is_verified

    Even if you accidentally return the full dict, response_model
    filters out PAN, bank account, IFSC, and password automatically.
    This is the security pattern every Indian fintech MUST follow.
    """
    return {
        "id": 1001,
        "business_name": merchant.business_name,
        "owner_name": merchant.owner_name,
        "pan_number": merchant.pan_number,         # ← Will be FILTERED OUT
        "bank_account": merchant.bank_account,     # ← Will be FILTERED OUT
        "ifsc_code": merchant.ifsc_code,           # ← Will be FILTERED OUT
        "password": merchant.password,             # ← Will be FILTERED OUT
        "is_verified": False,
    }


# --- Health check with conditional status ---
@app.get("/health", tags=["System"])
def health_check():
    """
    Health check endpoint.
    Returns 200 if healthy.
    In production, you'd check DB, Redis, and external services.
    """
    services = {
        "database": True,
        "redis": True,
        "payment_gateway": True,
    }
    all_healthy = all(services.values())

    if not all_healthy:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "services": services,
            }
        )

    return {
        "status": "healthy",
        "services": services,
        "version": "3.0.0",
    }


# ════════════════════════════════════════════════════════════
# KEY TAKEAWAYS
# ════════════════════════════════════════════════════════════
# 1. response_model filters output fields — use it to NEVER leak passwords or internal data.
# 2. Use separate Input/Output models (UserIn vs UserOut) for security-sensitive resources.
# 3. response_model_exclude_unset=True saves bandwidth by skipping null/default fields.
# 4. Use status module constants (status.HTTP_201_CREATED) for readable, self-documenting code.
# 5. HTTPException stops execution immediately and returns the error — no need for if/else/return.
# 6. Custom exception handlers (@app.exception_handler) standardize error format across your API.
# 7. The `responses` parameter in decorators documents all possible responses in Swagger UI.
# 8. JSONResponse gives full control when you need custom headers, dynamic status codes, or cookies.
# "In preparing for battle, I have always found that plans are useless, but planning is indispensable." — Eisenhower

if __name__ == "__main__":
    uvicorn.run(
        "05-response-models-and-status-codes:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
