"""
============================================================
FILE 06: ADVANCED VALIDATION — QUERY, PATH, BODY, HEADER
============================================================
Topics: Query(), Path(), Body(), Header(), Cookie(), Field(),
        @field_validator, @model_validator, custom errors,
        regex patterns, Annotated types, Indian form validation

WHY THIS MATTERS:
Bad data is the #1 source of production bugs. Validation is
your first line of defense. FastAPI + Pydantic give you the
most powerful validation toolkit in any Python framework.
============================================================
"""

# STORY: Aadhaar (UIDAI) — 12-Digit Validation at 1.4 Billion Scale
# The Unique Identification Authority of India issues Aadhaar numbers
# to 1.4 billion residents. Every single API call — whether from a
# bank verifying KYC, a telco activating a SIM, or a government
# portal disbursing subsidies — MUST validate that the 12-digit
# number is structurally correct before it even hits the database.
# A single malformed digit means a failed authentication, a stuck
# subsidy payment, or a denied hospital admission. UIDAI reportedly
# handles 100 million+ authentication requests daily. At that scale,
# validation is not optional — it is the architecture.

from fastapi import (
    FastAPI,
    Query,
    Path,
    Body,
    Header,
    Cookie,
    HTTPException,
)
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Annotated, Optional
from enum import Enum

app = FastAPI(title="Validation Deep Dive")


# ════════════════════════════════════════════════════════════
# SECTION 1 — Query Parameter Validation with Query()
# ════════════════════════════════════════════════════════════

# WHY: Query parameters come directly from users via URLs. They are
# the most exposed surface of your API — never trust them blindly.

# --- Basic Query() with min/max length ---
@app.get("/search")
def search_items(
    # q is a required query param with length constraints
    q: Annotated[str, Query(min_length=2, max_length=100)] = ...,
    # page must be >= 1
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    # size must be between 1 and 100
    size: Annotated[int, Query(ge=1, le=100)] = 10,
):
    """Search with validated query parameters."""
    return {"query": q, "page": page, "size": size}


# --- Query() with regex pattern ---
# Indian pincode is exactly 6 digits, first digit 1-9
@app.get("/location")
def get_location(
    pincode: Annotated[
        str,
        Query(pattern=r"^[1-9][0-9]{5}$", description="Indian PIN code"),
    ]
):
    """Validate Indian PIN code format via query parameter."""
    return {"pincode": pincode, "valid": True}


# --- Query() with alias (when Python name differs from URL param) ---
@app.get("/items")
def list_items(
    # URL uses ?item-type=xyz but Python needs a valid variable name
    item_type: Annotated[
        Optional[str],
        Query(alias="item-type", max_length=50),
    ] = None,
):
    """Use alias when URL param name is not a valid Python identifier."""
    return {"item_type": item_type}


# --- Deprecated query parameter ---
@app.get("/products")
def list_products(
    # Old param kept for backward compat but marked deprecated
    category: Annotated[
        Optional[str],
        Query(deprecated=True, description="Use 'cat' instead"),
    ] = None,
    cat: Optional[str] = None,
):
    """Show how to deprecate a query parameter gracefully."""
    effective = cat or category
    return {"category": effective}


# --- Hidden query parameter (exclude from schema / docs) ---
@app.get("/internal")
def internal_endpoint(
    debug_token: Annotated[
        Optional[str],
        Query(include_in_schema=False),
    ] = None,
):
    """Hidden param does not appear in OpenAPI docs."""
    is_debug = debug_token == "secret-debug-2024"
    return {"debug_mode": is_debug}


# ════════════════════════════════════════════════════════════
# SECTION 2 — Path Parameter Validation with Path()
# ════════════════════════════════════════════════════════════

# WHY: Path parameters are part of the URL structure. Validating them
# prevents nonsensical routes like /users/-5 or /orders/0.

# --- Numeric constraints: ge, gt, le, lt ---
@app.get("/users/{user_id}")
def get_user(
    user_id: Annotated[
        int,
        Path(ge=1, le=999999999, title="User ID", description="Positive integer"),
    ]
):
    """Path param must be a positive integer up to 999,999,999."""
    return {"user_id": user_id}


# --- String path with length validation ---
@app.get("/profiles/{username}")
def get_profile(
    username: Annotated[
        str,
        Path(min_length=3, max_length=30, pattern=r"^[a-z0-9_]+$"),
    ]
):
    """Username: lowercase alphanumeric + underscore, 3-30 chars."""
    return {"username": username}


# --- Enum path parameter (constrained choices) ---
class OrderStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    shipped = "shipped"
    delivered = "delivered"

@app.get("/orders/status/{status}")
def get_orders_by_status(status: OrderStatus):
    """Path param restricted to enum values — automatic 422 for invalid."""
    return {"status": status.value, "orders": []}


# ════════════════════════════════════════════════════════════
# SECTION 3 — Body Parameter Validation with Body()
# ════════════════════════════════════════════════════════════

# WHY: Body() gives you control over how JSON body fields are parsed,
# including embedding single values and adding metadata.

# --- Embed a single body parameter ---
@app.put("/items/{item_id}")
def update_item_importance(
    item_id: int,
    # Without embed=True, FastAPI expects just the raw int in body
    # With embed=True, it expects {"importance": 5}
    importance: Annotated[int, Body(ge=1, le=10, embed=True)],
):
    """Body(embed=True) wraps a single value in a JSON key."""
    return {"item_id": item_id, "importance": importance}


# --- Multiple body parameters ---
@app.post("/compare")
def compare_prices(
    price_a: Annotated[float, Body(gt=0, description="First price")],
    price_b: Annotated[float, Body(gt=0, description="Second price")],
):
    """Multiple Body() params are expected as separate keys in JSON."""
    cheaper = "a" if price_a < price_b else "b"
    return {"price_a": price_a, "price_b": price_b, "cheaper": cheaper}


# ════════════════════════════════════════════════════════════
# SECTION 4 — Header and Cookie Validation
# ════════════════════════════════════════════════════════════

# WHY: Headers carry auth tokens, API keys, and client metadata.
# Cookies manage sessions. Both need validation at the gate.

# --- Header() with automatic underscore-to-hyphen conversion ---
@app.get("/with-headers")
def read_headers(
    # Python: user_agent -> HTTP header: User-Agent (auto-converted)
    user_agent: Annotated[Optional[str], Header()] = None,
    # Custom header: x_token -> X-Token
    x_token: Annotated[
        Optional[str],
        Header(min_length=10, max_length=200),
    ] = None,
    # To disable auto conversion, use convert_underscores=False
    x_custom: Annotated[
        Optional[str],
        Header(convert_underscores=False),
    ] = None,
):
    """FastAPI auto-converts underscores to hyphens for headers."""
    return {
        "user_agent": user_agent,
        "x_token": x_token,
        "x_custom": x_custom,
    }


# --- Duplicate headers (list of values) ---
@app.get("/multi-header")
def read_duplicate_headers(
    # Some proxies send multiple X-Forwarded-For headers
    x_forwarded_for: Annotated[Optional[list[str]], Header()] = None,
):
    """When a header appears multiple times, collect as a list."""
    return {"forwarded_for_chain": x_forwarded_for}


# --- Cookie() parameter ---
@app.get("/dashboard")
def get_dashboard(
    session_id: Annotated[
        Optional[str],
        Cookie(min_length=20, max_length=100),
    ] = None,
):
    """Read and validate a cookie value."""
    if session_id is None:
        return {"logged_in": False, "message": "No session cookie found"}
    return {"logged_in": True, "session_id_prefix": session_id[:8] + "..."}


# ════════════════════════════════════════════════════════════
# SECTION 5 — Field() Inside Pydantic Models
# ════════════════════════════════════════════════════════════

# WHY: Field() is where you put validation INSIDE your data models.
# This is the most common place for business-rule validation.

class Product(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100,
        description="Product name",
        examples=["Parle-G Biscuits"],
    )
    price: float = Field(
        gt=0,
        le=10_000_000,  # 1 crore max
        description="Price in INR",
    )
    discount_percent: float = Field(
        default=0.0,
        ge=0,
        le=100,
        description="Discount percentage",
    )
    category: str = Field(
        pattern=r"^[a-zA-Z][a-zA-Z0-9 _-]{1,49}$",
        description="Category slug",
    )
    stock: int = Field(
        ge=0,
        description="Available stock count",
    )
    # JSON Schema extra metadata
    sku: str = Field(
        min_length=8,
        max_length=12,
        description="Stock Keeping Unit code",
        json_schema_extra={"example": "PRD-12345"},
    )

@app.post("/products")
def create_product(product: Product):
    """All Field() validations run automatically on the request body."""
    return {"created": product.model_dump()}


# ════════════════════════════════════════════════════════════
# SECTION 6 — Custom Validators: @field_validator and @model_validator
# ════════════════════════════════════════════════════════════

# WHY: Built-in constraints handle 80% of cases. The remaining 20% —
# Luhn checks, cross-field logic, business rules — need custom validators.

# --- @field_validator for single-field custom logic ---
class AadhaarVerification(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    aadhaar: str = Field(min_length=12, max_length=12)
    phone: str = Field(min_length=10, max_length=10)
    pan: str = Field(min_length=10, max_length=10)
    pincode: str = Field(min_length=6, max_length=6)

    @field_validator("aadhaar")
    @classmethod
    def validate_aadhaar(cls, v: str) -> str:
        """Aadhaar: exactly 12 digits, first digit not 0 or 1."""
        if not v.isdigit():
            raise ValueError("Aadhaar must contain only digits")
        if v[0] in ("0", "1"):
            raise ValueError("Aadhaar cannot start with 0 or 1")
        return v

    @field_validator("phone")
    @classmethod
    def validate_indian_phone(cls, v: str) -> str:
        """Indian mobile: 10 digits starting with 6-9."""
        if not v.isdigit():
            raise ValueError("Phone must contain only digits")
        if v[0] not in ("6", "7", "8", "9"):
            raise ValueError("Indian mobile must start with 6, 7, 8, or 9")
        return v

    @field_validator("pan")
    @classmethod
    def validate_pan_card(cls, v: str) -> str:
        """PAN format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)."""
        v = v.upper()
        import re
        if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", v):
            raise ValueError("Invalid PAN format. Expected: ABCDE1234F")
        # 4th character indicates holder type: P=Person, C=Company, etc.
        valid_4th = set("ABCFGHLJPT")
        if v[3] not in valid_4th:
            raise ValueError(f"4th character must be one of {valid_4th}")
        return v

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: str) -> str:
        """Indian pincode: 6 digits, first digit 1-9."""
        if not v.isdigit():
            raise ValueError("Pincode must contain only digits")
        if v[0] == "0":
            raise ValueError("Pincode cannot start with 0")
        return v


# --- @model_validator for cross-field validation ---
class MoneyTransfer(BaseModel):
    sender_account: str
    receiver_account: str
    amount: float = Field(gt=0, le=10_00_000)  # 10 lakh limit
    sender_ifsc: str
    receiver_ifsc: str

    @model_validator(mode="after")
    def validate_transfer(self):
        """Cross-field validations that need multiple fields together."""
        # Cannot transfer to yourself
        if self.sender_account == self.receiver_account:
            raise ValueError("Sender and receiver accounts must differ")
        # NEFT minimum is Rs 1
        if self.amount < 1:
            raise ValueError("Minimum transfer amount is Rs 1")
        return self

    @field_validator("sender_ifsc", "receiver_ifsc")
    @classmethod
    def validate_ifsc(cls, v: str) -> str:
        """IFSC code: 4 letters + 0 + 6 alphanumeric (e.g., SBIN0001234)."""
        import re
        v = v.upper()
        if not re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", v):
            raise ValueError("Invalid IFSC format. Expected: ABCD0XXXXXX")
        return v


@app.post("/verify-aadhaar")
def verify_aadhaar(data: AadhaarVerification):
    """All field and model validators run before this function executes."""
    return {"verified": True, "name": data.name}


@app.post("/transfer")
def transfer_money(transfer: MoneyTransfer):
    """Cross-field validation ensures sender != receiver, etc."""
    return {"status": "initiated", "amount": transfer.amount}


# ════════════════════════════════════════════════════════════
# SECTION 7 — Annotated Types for Reusable Validation
# ════════════════════════════════════════════════════════════

# WHY: Without Annotated types, you copy-paste the same Query(pattern=...)
# everywhere. Annotated lets you define a type ONCE and reuse it.

# --- Define reusable validated types ---
IndianPhone = Annotated[str, Field(pattern=r"^[6-9]\d{9}$")]
AadhaarNumber = Annotated[str, Field(pattern=r"^[2-9]\d{11}$")]
PINCode = Annotated[str, Field(pattern=r"^[1-9]\d{5}$")]
PANNumber = Annotated[str, Field(pattern=r"^[A-Z]{5}\d{4}[A-Z]$")]
IFSCCode = Annotated[str, Field(pattern=r"^[A-Z]{4}0[A-Z0-9]{6}$")]

# Query-parameter reusable types
PageNumber = Annotated[int, Query(ge=1, description="Page number")]
PageSize = Annotated[int, Query(ge=1, le=100, description="Items per page")]
SearchQuery = Annotated[str, Query(min_length=1, max_length=200)]


# --- Use them in models: clean and DRY ---
class CustomerKYC(BaseModel):
    """KYC model using reusable Annotated types."""
    full_name: str = Field(min_length=2, max_length=100)
    phone: IndianPhone
    aadhaar: AadhaarNumber
    pan: PANNumber
    address_pincode: PINCode
    bank_ifsc: IFSCCode


# --- Use them in endpoints ---
@app.get("/customers")
def list_customers(
    page: PageNumber = 1,
    size: PageSize = 20,
    q: Optional[SearchQuery] = None,
):
    """Reusable Query types keep endpoint signatures clean."""
    return {"page": page, "size": size, "search": q}


@app.post("/kyc")
def submit_kyc(kyc: CustomerKYC):
    """All Indian-format validations via reusable Annotated types."""
    return {"status": "submitted", "name": kyc.full_name}


# ════════════════════════════════════════════════════════════
# SECTION 8 — Practical Example: Complete Indian Form Validation
# ════════════════════════════════════════════════════════════

# WHY: Putting it all together — a realistic endpoint that validates
# an Indian user registration form with every technique we learned.

class IndianAddress(BaseModel):
    """Sub-model for Indian postal address."""
    line1: str = Field(min_length=5, max_length=200)
    line2: Optional[str] = Field(default=None, max_length=200)
    city: str = Field(min_length=2, max_length=50)
    state: str = Field(min_length=2, max_length=50)
    pincode: PINCode

    @field_validator("state")
    @classmethod
    def validate_indian_state(cls, v: str) -> str:
        """Check against a known list of Indian states/UTs."""
        valid_states = {
            "andhra pradesh", "arunachal pradesh", "assam", "bihar",
            "chhattisgarh", "goa", "gujarat", "haryana", "himachal pradesh",
            "jharkhand", "karnataka", "kerala", "madhya pradesh",
            "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland",
            "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu",
            "telangana", "tripura", "uttar pradesh", "uttarakhand",
            "west bengal", "delhi", "jammu and kashmir", "ladakh",
            "chandigarh", "puducherry", "lakshadweep",
            "dadra and nagar haveli and daman and diu",
            "andaman and nicobar islands",
        }
        if v.lower().strip() not in valid_states:
            raise ValueError(f"'{v}' is not a recognized Indian state/UT")
        return v.strip().title()


class UserRegistration(BaseModel):
    """Complete Indian user registration form."""
    full_name: str = Field(min_length=2, max_length=100)
    email: str = Field(pattern=r"^[\w.+-]+@[\w-]+\.[\w.]+$")
    phone: IndianPhone
    alternate_phone: Optional[IndianPhone] = None
    aadhaar: AadhaarNumber
    pan: PANNumber
    date_of_birth: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    gender: str = Field(pattern=r"^(male|female|other)$")
    address: IndianAddress

    @model_validator(mode="after")
    def validate_phones_differ(self):
        """Primary and alternate phone must not be the same."""
        if self.alternate_phone and self.phone == self.alternate_phone:
            raise ValueError("Primary and alternate phone must be different")
        return self

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: str) -> str:
        """Basic date validation: must be parseable and age >= 18."""
        from datetime import datetime, date
        try:
            dob = datetime.strptime(v, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError("Invalid date format. Use YYYY-MM-DD")
        today = date.today()
        age = today.year - dob.year - (
            (today.month, today.day) < (dob.month, dob.day)
        )
        if age < 18:
            raise ValueError("User must be at least 18 years old")
        if age > 150:
            raise ValueError("Please enter a realistic date of birth")
        return v


@app.post("/register", status_code=201)
def register_user(user: UserRegistration):
    """
    Complete registration endpoint. By the time this function runs,
    ALL of the following have been validated:
    - Name length, email format, phone format
    - Aadhaar (12 digits, no leading 0/1)
    - PAN (ABCDE1234F format)
    - DOB (valid date, age >= 18)
    - Address (with valid Indian state and pincode)
    - Cross-field: primary != alternate phone
    """
    return {
        "status": "registered",
        "user_id": 1001,
        "name": user.full_name,
        "state": user.address.state,
    }


# ════════════════════════════════════════════════════════════
# KEY TAKEAWAYS
# ════════════════════════════════════════════════════════════
# 1. Query(), Path(), Body(), Header(), Cookie() — each has its own
#    validation parameters suited to its HTTP location.
# 2. Field() inside Pydantic models is the workhorse for body
#    validation — supports min/max, patterns, descriptions, examples.
# 3. @field_validator runs on a SINGLE field — great for format checks
#    like Aadhaar, PAN, phone, IFSC code.
# 4. @model_validator runs on the WHOLE model — use mode="after" for
#    cross-field checks (sender != receiver, phone != alt_phone).
# 5. Annotated types (IndianPhone, PINCode, etc.) let you define
#    validation ONCE and reuse across all models and endpoints.
# 6. Header() auto-converts Python underscores to HTTP hyphens;
#    use convert_underscores=False to disable.
# 7. Use alias in Query() when the URL param is not a valid Python
#    name (e.g., "item-type" -> alias="item-type").
# 8. Indian-specific patterns to memorize:
#    Phone: ^[6-9]\d{9}$  |  Aadhaar: ^[2-9]\d{11}$
#    PAN: ^[A-Z]{5}\d{4}[A-Z]$  |  PIN: ^[1-9]\d{5}$
#    IFSC: ^[A-Z]{4}0[A-Z0-9]{6}$
# "Garbage in, garbage out. Validate at the gate." — Every UIDAI engineer
