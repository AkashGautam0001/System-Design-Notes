"""
============================================================
FILE 04: REQUEST BODY, PYDANTIC MODELS, AND DATA VALIDATION
============================================================
Topics: request body vs query params, Pydantic BaseModel,
        type hints, optional fields, Field() validation,
        model_dump(), nested models, List/Set fields,
        model_config, combining body+path+query, multiple
        body params, Body(), model inheritance

WHY THIS MATTERS:
Request bodies carry complex structured data — user profiles,
product listings, payment details. Without validation, bad data
flows into your database and corrupts everything. Pydantic
catches errors at the API boundary, before they cause damage.
============================================================
"""

# STORY: Flipkart — Seller Product Listing (No Price = -500 Allowed)
# Flipkart's marketplace hosts 1.4 lakh+ sellers listing millions of
# products. Early on, a seller API bug allowed negative prices — someone
# listed a phone at -500 INR, and the checkout system actually tried to
# pay the customer! After that incident, Flipkart enforced strict schema
# validation on every product listing. Price must be > 0, title must be
# 3-200 chars, weight must be positive, and pincode must be 6 digits.
# Pydantic models enforce these rules declaratively, not with manual
# if-else chains that developers forget to write.

from typing import Optional, List, Set
from pydantic import BaseModel, Field, ConfigDict
from fastapi import FastAPI, Body, Query, Path
from enum import Enum
import uvicorn

app = FastAPI(
    title="Flipkart Seller API",
    description="Learning Pydantic models through e-commerce product listing.",
    version="2.0.0",
)

# ════════════════════════════════════════════════════════════
# SECTION 1 — Why Request Body Over Query Parameters
# ════════════════════════════════════════════════════════════

# WHY: Query parameters are great for simple filters, but complex
# data (nested objects, lists, validation rules) needs a structured
# JSON body. You can't put an address object in a query string.

# WHEN TO USE WHAT:
#
# Query Parameters (?key=value):
#   - Simple filters: ?category=phones&min_price=10000
#   - Pagination: ?page=2&limit=20
#   - Search: ?q=samsung+galaxy
#   - Limited to strings, must be URL-encoded
#   - Visible in browser history, logs, bookmarks
#   - Max URL length ~2048 characters
#
# Request Body (JSON):
#   - Creating/updating resources (POST, PUT, PATCH)
#   - Complex nested data (address inside user)
#   - Sensitive data (passwords — never in URL!)
#   - No size limit (practically)
#   - Not visible in browser history
#
# Flipkart example:
#   GET /products?category=phones&brand=Samsung   → query params (filtering)
#   POST /products { "title": "...", "price": ... } → body (creating)


# ════════════════════════════════════════════════════════════
# SECTION 2 — Pydantic BaseModel Basics
# ════════════════════════════════════════════════════════════

# WHY: BaseModel is the foundation of all request/response
# validation in FastAPI. Master this and you master FastAPI.

# --- Basic model definition ---
class ProductCreate(BaseModel):
    """
    A Pydantic model for creating a product.

    Rules:
    - Each field has a type hint (str, float, int, etc.)
    - Fields without defaults are REQUIRED
    - Fields with defaults (or Optional) are OPTIONAL
    - FastAPI automatically reads JSON body and validates against this
    """
    title: str                                     # Required string
    description: str                               # Required string
    price: float                                   # Required float
    quantity: int                                   # Required int
    category: str                                  # Required string
    is_active: bool = True                         # Optional, defaults to True


# --- Using the model in a route ---
@app.post("/products", tags=["Products"])
def create_product(product: ProductCreate):
    """
    When you declare a parameter with a Pydantic model type,
    FastAPI automatically:
    1. Reads the request body as JSON
    2. Validates all fields against the model
    3. Converts types (e.g., "123" → 123 for int fields)
    4. Returns 422 with details if validation fails

    Example request body:
    {
        "title": "Samsung Galaxy M34",
        "description": "5G phone with 6000mAh battery",
        "price": 16999.0,
        "quantity": 500,
        "category": "Smartphones"
    }
    """
    return {
        "message": "Product created",
        "product": product.model_dump(),           # Convert model to dict
        "id": 12345,                               # Server-assigned ID
    }


# ════════════════════════════════════════════════════════════
# SECTION 3 — Optional Fields and Defaults
# ════════════════════════════════════════════════════════════

# WHY: Not every field should be required. Product descriptions
# can be optional; discount might default to 0. Getting optional
# vs required right determines your API's usability.

class ProductUpdate(BaseModel):
    """
    For PATCH (partial update), ALL fields should be Optional.
    Only provided fields will be updated.
    """
    title: Optional[str] = None                    # Optional, default None
    description: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    discount_percent: float = 0.0                  # Optional with specific default


@app.patch("/products/{product_id}", tags=["Products"])
def update_product(product_id: int, product: ProductUpdate):
    """
    Partial update — only non-None fields are applied.

    Request body (only updating price and discount):
    {
        "price": 14999.0,
        "discount_percent": 12.0
    }
    """
    # model_dump(exclude_unset=True) gives only fields the user sent
    update_data = product.model_dump(exclude_unset=True)
    return {
        "product_id": product_id,
        "updated_fields": update_data,
        "message": f"Updated {len(update_data)} fields"
    }


# ════════════════════════════════════════════════════════════
# SECTION 4 — Field() for Detailed Validation
# ════════════════════════════════════════════════════════════

# WHY: Field() is where you prevent the "-500 price" bug.
# It adds constraints that Pydantic enforces automatically —
# no manual validation code needed.

class ValidatedProduct(BaseModel):
    """
    Product model with comprehensive Field() validation.
    This is what Flipkart's actual product listing API might look like.
    """
    title: str = Field(
        ...,                                       # ... = required
        min_length=3,                              # At least 3 characters
        max_length=200,                            # At most 200 characters
        description="Product title as shown to buyers",
        examples=["Samsung Galaxy M34 5G"],
    )
    description: str = Field(
        default="",
        max_length=5000,
        description="Detailed product description with features",
    )
    price: float = Field(
        ...,
        gt=0,                                      # Greater than 0 (not >= 0!)
        le=10_000_000,                             # Max 1 crore INR
        description="Price in INR. Must be positive.",
        examples=[16999.0],
    )
    mrp: float = Field(
        ...,
        gt=0,
        description="Maximum Retail Price (MRP) in INR",
    )
    quantity: int = Field(
        default=0,
        ge=0,                                      # Greater than or equal to 0
        le=100_000,                                # Max 1 lakh units
        description="Available stock quantity",
    )
    weight_grams: float = Field(
        ...,
        gt=0,                                      # Weight must be positive
        description="Product weight in grams",
    )
    seller_pincode: str = Field(
        ...,
        pattern=r"^\d{6}$",                        # Exactly 6 digits
        description="6-digit pincode of seller warehouse",
        examples=["560001"],
    )

    # Field validation summary:
    #   gt  = greater than (exclusive)
    #   ge  = greater than or equal (inclusive)
    #   lt  = less than (exclusive)
    #   le  = less than or equal (inclusive)
    #   min_length = minimum string length
    #   max_length = maximum string length
    #   pattern    = regex pattern for strings
    #   multiple_of = number must be a multiple of this


@app.post("/products/validated", tags=["Products"])
def create_validated_product(product: ValidatedProduct):
    """
    With Field() validation, these requests will FAIL:
    - {"title": "AB", "price": 100, ...}           → title too short
    - {"title": "Phone", "price": -500, ...}       → price not > 0
    - {"title": "Phone", "price": 100, "seller_pincode": "ABC"}  → pincode invalid
    - {"title": "Phone", "price": 100, "weight_grams": 0}        → weight not > 0

    The 422 error response includes EXACTLY which field failed and why.
    """
    return {"message": "Product validated and created", "product": product.model_dump()}


# ════════════════════════════════════════════════════════════
# SECTION 5 — model_dump() and Serialization
# ════════════════════════════════════════════════════════════

# WHY: You need to convert models to dicts/JSON for database
# storage, API responses, and logging. model_dump() gives you
# fine-grained control over what gets included.

class DemoProduct(BaseModel):
    """Model to demonstrate serialization options."""
    title: str
    price: float
    discount: float = 0.0
    tags: List[str] = []
    is_featured: bool = False


@app.post("/products/serialization-demo", tags=["Demo"])
def serialization_demo(product: DemoProduct):
    """
    Demonstrates different model_dump() options.
    """
    return {
        # --- Full dump (all fields, including defaults) ---
        "full_dump": product.model_dump(),

        # --- Exclude unset (only fields the user actually sent) ---
        "exclude_unset": product.model_dump(exclude_unset=True),

        # --- Exclude defaults (skip fields that match their default) ---
        "exclude_defaults": product.model_dump(exclude_defaults=True),

        # --- Include only specific fields ---
        "include_only": product.model_dump(include={"title", "price"}),

        # --- Exclude specific fields ---
        "exclude_fields": product.model_dump(exclude={"is_featured"}),

        # --- JSON string ---
        "json_string": product.model_dump_json(),
    }


# ════════════════════════════════════════════════════════════
# SECTION 6 — Nested Models and Complex Structures
# ════════════════════════════════════════════════════════════

# WHY: Real data is nested. A seller has an address, a product
# has dimensions, an order has items. Pydantic handles nesting
# naturally with model composition.

# --- Address as a nested model ---
class Address(BaseModel):
    """Reusable address model."""
    street: str
    city: str
    state: str
    pincode: str = Field(..., pattern=r"^\d{6}$")
    landmark: Optional[str] = None


class SellerProfile(BaseModel):
    """Seller with nested address model."""
    business_name: str = Field(..., min_length=2, max_length=100)
    gstin: str = Field(
        ...,
        pattern=r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}$",
        description="15-character GSTIN number",
        examples=["29ABCDE1234F1Z5"],
    )
    email: str
    phone: str = Field(..., pattern=r"^\+91\d{10}$", examples=["+919876543210"])

    # --- Nested model ---
    warehouse_address: Address                     # Required nested model
    return_address: Optional[Address] = None       # Optional nested model


@app.post("/sellers/register", tags=["Sellers"])
def register_seller(seller: SellerProfile):
    """
    Nested model validation — Address is validated recursively.

    Request body:
    {
        "business_name": "Sharma Electronics",
        "gstin": "29ABCDE1234F1Z5",
        "email": "seller@example.com",
        "phone": "+919876543210",
        "warehouse_address": {
            "street": "12 MG Road",
            "city": "Bangalore",
            "state": "Karnataka",
            "pincode": "560001"
        }
    }

    If the nested pincode is invalid → 422 error points to
    warehouse_address.pincode specifically!
    """
    return {
        "message": "Seller registered",
        "seller": seller.model_dump(),
    }


# --- List and Set fields ---
class ProductListing(BaseModel):
    """Product with List and Set fields."""
    title: str
    price: float = Field(..., gt=0)
    # List: ordered, allows duplicates
    images: List[str] = Field(
        default=[],
        max_length=10,                             # Max 10 images
        description="List of image URLs",
    )
    # Set: unordered, no duplicates
    tags: Set[str] = set()                         # Automatically deduplicates!
    # List of nested models
    specifications: List[dict] = []


@app.post("/products/listing", tags=["Products"])
def create_listing(listing: ProductListing):
    """
    List and Set fields in action.

    Send: {"tags": ["phone", "5G", "phone", "samsung", "5G"]}
    Receive: {"tags": ["phone", "5G", "samsung"]}  (Set removes duplicates!)
    """
    return {
        "listing": listing.model_dump(),
        "image_count": len(listing.images),
        "unique_tags": len(listing.tags),
    }


# ════════════════════════════════════════════════════════════
# SECTION 7 — Model Config and JSON Schema Examples
# ════════════════════════════════════════════════════════════

# WHY: model_config lets you add example data to your docs,
# configure JSON behavior, and control schema generation.
# Good examples in docs = fewer support tickets from API consumers.

class OrderItem(BaseModel):
    """Single item in an order."""
    product_id: int
    product_name: str
    quantity: int = Field(..., ge=1, le=50)
    unit_price: float = Field(..., gt=0)

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "product_id": 101,
                    "product_name": "Realme Narzo 60",
                    "quantity": 1,
                    "unit_price": 15999.0,
                }
            ]
        }
    )


class Order(BaseModel):
    """Complete order with nested items."""
    customer_name: str
    customer_phone: str = Field(..., pattern=r"^\+91\d{10}$")
    delivery_address: Address
    items: List[OrderItem] = Field(..., min_length=1)  # At least 1 item
    payment_method: str = "COD"
    coupon_code: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "customer_name": "Amit Patel",
                    "customer_phone": "+919876543210",
                    "delivery_address": {
                        "street": "42 Jubilee Hills",
                        "city": "Hyderabad",
                        "state": "Telangana",
                        "pincode": "500033",
                    },
                    "items": [
                        {
                            "product_id": 101,
                            "product_name": "Realme Narzo 60",
                            "quantity": 1,
                            "unit_price": 15999.0,
                        }
                    ],
                    "payment_method": "UPI",
                    "coupon_code": "FIRST50",
                }
            ]
        }
    )


@app.post("/orders", tags=["Orders"])
def place_order(order: Order):
    """
    Complex nested order with model_config examples.
    The examples show up in Swagger UI's "Example Value" section,
    making it easy for frontend developers to understand the schema.
    """
    total = sum(item.unit_price * item.quantity for item in order.items)
    return {
        "order_id": "FK-2024-78901",
        "total": total,
        "items_count": len(order.items),
        "status": "placed",
        "order": order.model_dump(),
    }


# ════════════════════════════════════════════════════════════
# SECTION 8 — Combining Body + Path + Query Parameters
# ════════════════════════════════════════════════════════════

# WHY: In practice, you often need all three: path param to
# identify the resource, query params for options, and body
# for the actual data.

class ReviewCreate(BaseModel):
    """Product review model."""
    rating: int = Field(..., ge=1, le=5)
    title: str = Field(..., min_length=5, max_length=100)
    comment: str = Field(default="", max_length=2000)
    is_verified_purchase: bool = False


@app.post("/products/{product_id}/reviews", tags=["Reviews"])
def add_review(
    product_id: int,                               # Path parameter
    notify_seller: bool = True,                    # Query parameter
    review: ReviewCreate = Body(...),              # Request body
):
    """
    All three parameter types in one endpoint:
    - product_id: from URL path (/products/42/reviews)
    - notify_seller: from query string (?notify_seller=false)
    - review: from JSON request body

    FastAPI figures out each parameter's source automatically:
    - In the URL path template? → path parameter
    - Pydantic model? → request body
    - Everything else? → query parameter
    """
    return {
        "product_id": product_id,
        "notify_seller": notify_seller,
        "review": review.model_dump(),
        "message": "Review submitted successfully",
    }


# --- Multiple body parameters ---
class ItemDetails(BaseModel):
    """Item details for comparison."""
    name: str
    price: float


class ComparisonRequest(BaseModel):
    """Request to compare two items."""
    criteria: List[str] = ["price", "rating", "delivery_time"]


@app.post("/compare", tags=["Products"])
def compare_products(
    item_a: ItemDetails,
    item_b: ItemDetails,
):
    """
    Multiple body parameters.

    When you have 2+ body parameters, FastAPI expects:
    {
        "item_a": {"name": "Phone A", "price": 15999},
        "item_b": {"name": "Phone B", "price": 17999}
    }

    Each model becomes a KEY in the JSON body.
    """
    cheaper = item_a.name if item_a.price <= item_b.price else item_b.name
    return {
        "item_a": item_a.model_dump(),
        "item_b": item_b.model_dump(),
        "cheaper": cheaper,
        "price_difference": abs(item_a.price - item_b.price),
    }


# --- Body(embed=True) for single model ---
@app.post("/products/quick-add", tags=["Products"])
def quick_add_product(
    product: ProductCreate = Body(..., embed=True),
):
    """
    Body(embed=True) wraps a single model in a key.

    WITHOUT embed=True, request body is:
    {"title": "...", "price": ...}

    WITH embed=True, request body becomes:
    {"product": {"title": "...", "price": ...}}

    This is useful when you want consistent API structure
    where the body always has named keys.
    """
    return {"message": "Product added", "product": product.model_dump()}


# ════════════════════════════════════════════════════════════
# SECTION 9 — Model Inheritance and Computed Fields
# ════════════════════════════════════════════════════════════

# WHY: Model inheritance avoids code duplication. You define
# shared fields once and extend them for different use cases
# (create, update, response, database).

# --- Base model with shared fields ---
class ProductBase(BaseModel):
    """Base fields shared across all product models."""
    title: str = Field(..., min_length=3, max_length=200)
    description: str = ""
    price: float = Field(..., gt=0)
    category: str = "General"


# --- Create model (what the client sends) ---
class ProductIn(ProductBase):
    """Fields needed to CREATE a product. Inherits all from ProductBase."""
    seller_id: int
    quantity: int = Field(default=0, ge=0)


# --- Response model (what the server returns) ---
class ProductOut(ProductBase):
    """Fields returned to the client. NEVER includes seller_id."""
    id: int
    is_available: bool
    discount_price: Optional[float] = None

    # model_config for example in docs
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "id": 12345,
                    "title": "boAt Rockerz 450",
                    "description": "Wireless headphone with 15hr battery",
                    "price": 1499.0,
                    "category": "Electronics",
                    "is_available": True,
                    "discount_price": 1199.0,
                }
            ]
        }
    )


# --- Database model (what gets stored — you'd use this with an ORM) ---
class ProductDB(ProductBase):
    """Internal model with database fields. Never exposed to clients."""
    id: int
    seller_id: int
    quantity: int
    is_active: bool = True
    internal_sku: str = ""                         # Internal field, never in API


@app.post("/products/v2", tags=["Products V2"], response_model=ProductOut)
def create_product_v2(product: ProductIn):
    """
    Model inheritance pattern:
    - Client sends: ProductIn (title, desc, price, category, seller_id, quantity)
    - Server returns: ProductOut (title, desc, price, category, id, is_available)
    - Database stores: ProductDB (everything + internal fields)

    Notice: seller_id is in ProductIn but NOT in ProductOut.
    The client sends it, but it's never leaked back in responses.
    This is the pattern to hide sensitive internal data.
    """
    # Simulate creating in database
    product_out = ProductOut(
        id=12345,
        title=product.title,
        description=product.description,
        price=product.price,
        category=product.category,
        is_available=product.quantity > 0,
        discount_price=product.price * 0.9 if product.price > 1000 else None,
    )
    return product_out


# --- Category enum for type safety ---
class Category(str, Enum):
    electronics = "electronics"
    fashion = "fashion"
    home = "home"
    grocery = "grocery"
    books = "books"


class CategorizedProduct(BaseModel):
    """Product with enum category."""
    title: str
    price: float = Field(..., gt=0)
    category: Category


@app.post("/products/categorized", tags=["Products V2"])
def create_categorized_product(product: CategorizedProduct):
    """
    Enum fields restrict values to predefined options.
    Sending category: "toys" will fail with 422.
    Valid: "electronics", "fashion", "home", "grocery", "books"
    """
    return {"product": product.model_dump(), "message": "Categorized product created"}


# ════════════════════════════════════════════════════════════
# KEY TAKEAWAYS
# ════════════════════════════════════════════════════════════
# 1. Use query params for simple filters; use request body (Pydantic models) for complex data.
# 2. BaseModel fields with no default are REQUIRED; with default or Optional they are OPTIONAL.
# 3. Field(gt=0, min_length=3, pattern=r"...") prevents bad data at the API boundary.
# 4. model_dump(exclude_unset=True) gives you only the fields the client actually sent — perfect for PATCH.
# 5. Nested models (Address inside Seller) validate recursively — errors pinpoint the exact nested field.
# 6. Set fields auto-deduplicate; List fields preserve order and duplicates.
# 7. Use model inheritance (ProductBase → ProductIn / ProductOut) to avoid field duplication.
# 8. Body(embed=True) wraps a single model in a named key — useful for consistent API structure.
# "Data is a precious thing and will last longer than the systems themselves." — Tim Berners-Lee

if __name__ == "__main__":
    uvicorn.run(
        "04-request-body-and-pydantic:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
