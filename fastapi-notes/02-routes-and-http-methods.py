"""
============================================================
FILE 02: ROUTES, HTTP METHODS, AND PATH OPERATIONS
============================================================
Topics: HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS,
        HEAD), route ordering, multiple decorators, operation_id,
        decorator parameters, status codes, building a complete
        CRUD API, route grouping strategies

WHY THIS MATTERS:
HTTP methods are the verbs of the web. Using the right method
for the right action is not just convention — it affects
caching, security, idempotency, and how intermediaries
(CDNs, proxies, browsers) treat your requests.
============================================================
"""

# STORY: Zomato — GET Browse, POST Order, PUT Update, DELETE Cancel
# Zomato serves 50M+ monthly active users across India and abroad.
# Their API handles browsing restaurants (GET), placing orders (POST),
# updating delivery addresses (PUT), tweaking item quantities (PATCH),
# and cancelling orders (DELETE). Early on, some developers used GET
# for everything — even placing orders — leading to duplicate orders
# from browser prefetch and cached proxies. Proper HTTP method usage
# eliminated an entire class of bugs overnight.

from fastapi import FastAPI
from starlette import status
import uvicorn

app = FastAPI(
    title="Zomato Food Service API",
    description="Learning HTTP methods through a food delivery context.",
    version="1.0.0",
)

# ════════════════════════════════════════════════════════════
# SECTION 1 — HTTP Methods Overview
# ════════════════════════════════════════════════════════════

# WHY: Each HTTP method has specific semantics that clients,
# browsers, CDNs, and API gateways rely on. Using them correctly
# makes your API predictable and standards-compliant.

# THE SEVEN MAIN HTTP METHODS:
#
# GET     — Read/retrieve a resource. Must be SAFE (no side effects)
#           and IDEMPOTENT (calling 10x = same as calling 1x).
#           Cacheable by browsers and CDNs.
#
# POST    — Create a new resource. NOT idempotent.
#           Calling 10x may create 10 resources.
#
# PUT     — Replace/update a resource completely. IDEMPOTENT.
#           Send the FULL object. Missing fields = deleted/defaulted.
#
# PATCH   — Partially update a resource. Send ONLY changed fields.
#           More bandwidth-efficient than PUT for small changes.
#
# DELETE  — Remove a resource. IDEMPOTENT.
#           Deleting twice should not error (or return 404 on second).
#
# OPTIONS — Preflight / capability check. Used by CORS.
#           Browser sends this automatically before cross-origin requests.
#
# HEAD    — Same as GET but returns ONLY headers, no body.
#           Used to check if a resource exists or get its size.
#
# REAL IMPACT (Zomato example):
#   - GET /restaurants → browser can cache this, CDN can cache this
#   - POST /orders → browser will NEVER cache this, will warn on refresh
#   - DELETE /orders/123 → calling twice won't double-delete

# ════════════════════════════════════════════════════════════
# SECTION 2 — GET: Reading Data
# ════════════════════════════════════════════════════════════

# WHY: GET is the most common HTTP method. It must never modify
# data — this is critical for caching, SEO, and security.

# --- In-memory data store for our examples ---
restaurants_db = {
    1: {"id": 1, "name": "Biryani Blues", "city": "Delhi", "rating": 4.3,
        "cuisine": "Hyderabadi", "is_active": True},
    2: {"id": 2, "name": "Saravana Bhavan", "city": "Chennai", "rating": 4.6,
        "cuisine": "South Indian", "is_active": True},
    3: {"id": 3, "name": "Bademiya", "city": "Mumbai", "rating": 4.1,
        "cuisine": "Mughlai", "is_active": True},
    4: {"id": 4, "name": "Karim's", "city": "Delhi", "rating": 4.5,
        "cuisine": "Mughlai", "is_active": False},
}

orders_db = {}
next_order_id = 1


# --- GET: List all resources ---
@app.get(
    "/restaurants",
    tags=["Restaurants"],
    summary="List All Restaurants",
    description="Returns all restaurants in the system. In production, this would support pagination.",
    response_description="A list of restaurant objects",
)
def list_restaurants():
    """GET for listing — returns a collection."""
    return {"restaurants": list(restaurants_db.values()), "count": len(restaurants_db)}


# --- GET: Retrieve a single resource ---
@app.get(
    "/restaurants/{restaurant_id}",
    tags=["Restaurants"],
    summary="Get Restaurant by ID",
)
def get_restaurant(restaurant_id: int):
    """GET for detail — returns one specific resource."""
    if restaurant_id not in restaurants_db:
        return {"error": "Restaurant not found", "id": restaurant_id}
    return restaurants_db[restaurant_id]


# ════════════════════════════════════════════════════════════
# SECTION 3 — POST: Creating Resources
# ════════════════════════════════════════════════════════════

# WHY: POST creates new resources. It should return 201 Created
# (not 200) and include the created resource in the response
# so the client knows the server-assigned ID.

# --- POST: Create a new order ---
@app.post(
    "/orders",
    tags=["Orders"],
    summary="Place a New Order",
    description="Creates a new food order. Returns the created order with a server-assigned ID.",
    status_code=status.HTTP_201_CREATED,          # 201 = resource created
    response_description="The newly created order",
)
def create_order(restaurant_id: int, items: str):
    """
    POST creates a new resource.
    In a real app, the body would be a Pydantic model (covered in File 04).
    Here we use query params for simplicity.
    """
    global next_order_id
    order = {
        "id": next_order_id,
        "restaurant_id": restaurant_id,
        "items": items.split(","),
        "status": "placed",
        "total": 0,
    }
    orders_db[next_order_id] = order
    next_order_id += 1
    return order


# --- POST: Another creation example ---
@app.post(
    "/restaurants",
    tags=["Restaurants"],
    summary="Add a New Restaurant",
    status_code=201,                              # Can also use plain int
)
def add_restaurant(name: str, city: str, cuisine: str):
    """Register a new restaurant partner."""
    new_id = max(restaurants_db.keys()) + 1 if restaurants_db else 1
    restaurant = {
        "id": new_id,
        "name": name,
        "city": city,
        "rating": 0.0,
        "cuisine": cuisine,
        "is_active": True,
    }
    restaurants_db[new_id] = restaurant
    return restaurant


# ════════════════════════════════════════════════════════════
# SECTION 4 — PUT and PATCH: Updating Resources
# ════════════════════════════════════════════════════════════

# WHY: PUT replaces the entire resource; PATCH updates only
# specified fields. Using the wrong one leads to accidental
# data loss (PUT) or unexpected nulls.

# --- PUT: Full replacement ---
@app.put(
    "/restaurants/{restaurant_id}",
    tags=["Restaurants"],
    summary="Replace Restaurant (Full Update)",
    description=(
        "Replaces the entire restaurant record. All fields must be provided. "
        "Any field not included will be lost."
    ),
)
def replace_restaurant(restaurant_id: int, name: str, city: str,
                       cuisine: str, rating: float, is_active: bool):
    """
    PUT = full replacement. Client must send ALL fields.
    If they forget 'rating', it doesn't default — it's required.
    """
    if restaurant_id not in restaurants_db:
        return {"error": "Restaurant not found"}
    restaurants_db[restaurant_id] = {
        "id": restaurant_id,
        "name": name,
        "city": city,
        "cuisine": cuisine,
        "rating": rating,
        "is_active": is_active,
    }
    return restaurants_db[restaurant_id]


# --- PATCH: Partial update ---
@app.patch(
    "/restaurants/{restaurant_id}",
    tags=["Restaurants"],
    summary="Update Restaurant (Partial)",
    description="Updates only the provided fields. Omitted fields remain unchanged.",
)
def update_restaurant(restaurant_id: int, name: str = None,
                      city: str = None, rating: float = None):
    """
    PATCH = partial update. Only provided fields change.
    This is what Zomato uses when a restaurant updates just their name
    or rating — they don't need to resend every single field.
    """
    if restaurant_id not in restaurants_db:
        return {"error": "Restaurant not found"}
    restaurant = restaurants_db[restaurant_id]
    if name is not None:
        restaurant["name"] = name
    if city is not None:
        restaurant["city"] = city
    if rating is not None:
        restaurant["rating"] = rating
    return restaurant


# ════════════════════════════════════════════════════════════
# SECTION 5 — DELETE: Removing Resources
# ════════════════════════════════════════════════════════════

# WHY: DELETE must be idempotent — deleting something that's
# already gone should not crash. Return 204 No Content or
# 200 with a confirmation message.

# --- DELETE: Remove a resource ---
@app.delete(
    "/orders/{order_id}",
    tags=["Orders"],
    summary="Cancel an Order",
    description="Cancels and removes an order. Returns 200 with confirmation.",
    response_description="Confirmation of deletion",
)
def cancel_order(order_id: int):
    """
    DELETE removes a resource.
    Idempotent: calling DELETE on an already-deleted order returns a
    friendly message, not a server crash.
    """
    if order_id not in orders_db:
        return {"message": f"Order {order_id} not found (already deleted or never existed)"}
    deleted_order = orders_db.pop(order_id)
    return {"message": f"Order {order_id} cancelled", "cancelled_order": deleted_order}


# --- DELETE with 204 No Content ---
@app.delete(
    "/restaurants/{restaurant_id}",
    tags=["Restaurants"],
    summary="Remove a Restaurant",
    status_code=status.HTTP_204_NO_CONTENT,       # 204 = success, no body
)
def remove_restaurant(restaurant_id: int):
    """
    204 No Content means the deletion succeeded but there's
    nothing to return. The response body will be empty.
    """
    restaurants_db.pop(restaurant_id, None)        # pop with default = idempotent
    # When status_code=204, FastAPI sends no response body
    return None


# ════════════════════════════════════════════════════════════
# SECTION 6 — Route Order, Multiple Decorators, and operation_id
# ════════════════════════════════════════════════════════════

# WHY: Route order matters because FastAPI matches the FIRST
# route that fits. Getting this wrong means your specific routes
# become unreachable, shadowed by generic ones.

# --- ROUTE ORDER MATTERS ---
# FastAPI (like Starlette) checks routes TOP to BOTTOM.
# The first match wins.

# CORRECT ORDER: specific before generic
@app.get("/menu/today", tags=["Menu"])
def todays_menu():
    """This MUST come before /menu/{menu_id} or it will never match."""
    return {"menu": "Today's special: Dal Makhani + Naan", "date": "2024-12-15"}


@app.get("/menu/{menu_id}", tags=["Menu"])
def get_menu(menu_id: int):
    """This is the generic route — matched after specific ones above."""
    return {"menu_id": menu_id, "items": ["Item 1", "Item 2"]}


# WRONG ORDER (don't do this):
# @app.get("/menu/{menu_id}")    # ← This catches "today" as menu_id!
# @app.get("/menu/today")        # ← This NEVER runs!

# --- operation_id parameter ---
# By default, FastAPI uses the function name as the operation_id.
# You can override it for cleaner SDK generation.

@app.get(
    "/orders",
    tags=["Orders"],
    summary="List All Orders",
    operation_id="listAllOrders",                 # Custom operation_id
)
def list_orders():
    """
    operation_id is used by code generators to create method names.
    Default: 'list_orders'  →  Custom: 'listAllOrders'
    This matters when generating TypeScript/Java/Kotlin client SDKs.
    """
    return {"orders": list(orders_db.values()), "count": len(orders_db)}


# --- OPTIONS and HEAD ---
# FastAPI auto-handles HEAD for every GET route.
# OPTIONS is mainly for CORS (handled by CORSMiddleware).
# You rarely need to define these manually, but you can:

@app.options("/orders", tags=["Orders"], summary="Order Endpoint Capabilities")
def orders_options():
    """Returns allowed methods for the /orders endpoint."""
    return {"allowed_methods": ["GET", "POST", "OPTIONS"]}


@app.head("/restaurants", tags=["Restaurants"], summary="Check Restaurants Endpoint")
def restaurants_head():
    """HEAD returns headers only — useful for checking if endpoint is alive."""
    # The body won't be sent, but headers will
    return None


# ════════════════════════════════════════════════════════════
# SECTION 7 — Complete CRUD Resource and Route Grouping
# ════════════════════════════════════════════════════════════

# WHY: In real projects, each resource gets its own complete
# set of CRUD routes. Seeing the full pattern helps you build
# consistent APIs.

# --- Complete CRUD for "Products" (Zomato grocery items) ---

products_db = {
    1: {"id": 1, "name": "Basmati Rice 5kg", "price": 450, "stock": 100},
    2: {"id": 2, "name": "Toor Dal 1kg", "price": 160, "stock": 200},
    3: {"id": 3, "name": "Amul Butter 500g", "price": 270, "stock": 50},
}
next_product_id = 4


@app.get("/products", tags=["Products"], summary="List all products")
def list_products():
    """GET /products → list all"""
    return list(products_db.values())


@app.get("/products/{product_id}", tags=["Products"], summary="Get one product")
def get_product(product_id: int):
    """GET /products/{id} → get one"""
    if product_id in products_db:
        return products_db[product_id]
    return {"error": "Not found"}


@app.post("/products", tags=["Products"], summary="Create a product",
          status_code=status.HTTP_201_CREATED)
def create_product(name: str, price: float, stock: int = 0):
    """POST /products → create"""
    global next_product_id
    product = {"id": next_product_id, "name": name, "price": price, "stock": stock}
    products_db[next_product_id] = product
    next_product_id += 1
    return product


@app.put("/products/{product_id}", tags=["Products"], summary="Replace a product")
def replace_product(product_id: int, name: str, price: float, stock: int):
    """PUT /products/{id} → full replace"""
    if product_id not in products_db:
        return {"error": "Not found"}
    products_db[product_id] = {"id": product_id, "name": name,
                               "price": price, "stock": stock}
    return products_db[product_id]


@app.patch("/products/{product_id}", tags=["Products"], summary="Partially update a product")
def patch_product(product_id: int, name: str = None, price: float = None,
                  stock: int = None):
    """PATCH /products/{id} → partial update"""
    if product_id not in products_db:
        return {"error": "Not found"}
    product = products_db[product_id]
    if name is not None:
        product["name"] = name
    if price is not None:
        product["price"] = price
    if stock is not None:
        product["stock"] = stock
    return product


@app.delete("/products/{product_id}", tags=["Products"], summary="Delete a product",
            status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int):
    """DELETE /products/{id} → remove"""
    products_db.pop(product_id, None)
    return None


# --- Route Grouping Strategies ---
#
# Strategy 1: Tags (what we've been using)
#   Group related routes with tags=["GroupName"]
#   Shows up as sections in Swagger UI
#
# Strategy 2: APIRouter (covered in later files)
#   Separate routers per resource, then include in main app
#   Better for large applications
#
# Strategy 3: URL prefix convention
#   /api/v1/orders/...
#   /api/v1/restaurants/...
#   /api/v2/orders/...  (new version)
#
# Zomato's API structure (approximate):
#   /api/v2/restaurants          → restaurant listing
#   /api/v2/restaurants/{id}     → restaurant detail
#   /api/v2/search               → search with filters
#   /api/v2/order/create         → place order
#   /api/v2/order/{id}/track     → track delivery


# ════════════════════════════════════════════════════════════
# KEY TAKEAWAYS
# ════════════════════════════════════════════════════════════
# 1. GET reads data (cacheable, safe). POST creates data (not cacheable).
# 2. PUT replaces the whole resource; PATCH updates only specified fields.
# 3. DELETE should be idempotent — deleting twice should not error.
# 4. Route order matters: define /items/special BEFORE /items/{id}.
# 5. Use status_code=201 for POST (resource created), 204 for DELETE (no content).
# 6. Tags group related routes in Swagger UI — use them consistently.
# 7. operation_id matters for SDK generation — keep them clean and unique.
# 8. HEAD and OPTIONS are auto-handled by FastAPI for most use cases;
#    you rarely need to define them manually.
# "An API is a user interface for developers. Design it carefully." — Unknown

if __name__ == "__main__":
    uvicorn.run(
        "02-routes-and-http-methods:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
