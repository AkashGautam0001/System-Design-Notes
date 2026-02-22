# Chapter 35 — BazaarAPI: E-Commerce Marketplace API

## Story: Flipkart Big Billion Days

It is October in Bangalore, and the Flipkart engineering war room is buzzing. The Big
Billion Days sale — India's largest online shopping event — goes live in 48 hours.
Millions of users will flood the platform simultaneously, adding products to carts,
racing for flash deals, and hammering the checkout button. The backend must handle it
all: products with real-time stock counts, user carts that survive server restarts,
and an order pipeline where two users can never buy the last unit of the same item.

**BazaarAPI** is that backend — a multi-resource e-commerce API built with Chi, SQLite,
and JWT authentication. It is the culmination of patterns learned in Chapter 33
(NotesKaro's CRUD + SQLite) and Chapter 34 (Dwarpal's JWT authentication). Now we
combine them into a system where resources have relationships, transactions guarantee
data integrity, and pagination keeps response times low even with millions of products.

---

## Why Multi-Resource API Design?

Real APIs are not single-table CRUD applications. An e-commerce system has:

| Resource   | Depends On          | Operations                          |
|------------|---------------------|-------------------------------------|
| Users      | Nothing             | Register, Login, Profile            |
| Products   | Users (seller)      | CRUD, Search, Pagination            |
| Cart       | Users + Products    | Add, Update, Remove, View           |
| Orders     | Users + Products    | Create (from cart), Track, Cancel    |

The dependency graph creates challenges:
- **Foreign keys** — a cart item references both a user and a product
- **Transactions** — converting a cart to an order must be atomic
- **Authorization** — users see only their own carts, admins manage products
- **Consistency** — stock must decrement exactly once per order

---

## Database Transactions in Go

The star of this chapter is the `CreateFromCart` method. It demonstrates Go's
`database/sql` transaction API:

```go
tx, err := db.BeginTx(ctx, nil)    // Start transaction
defer tx.Rollback()                  // Safety net — rollback if not committed

// ... multiple operations ...

err = tx.Commit()                    // Make it permanent
```

### Why Transactions Matter (The Big Billion Days Problem)

Imagine two users both have the last OnePlus phone in their carts. Without
transactions, this race condition can occur:

```
User A: SELECT stock FROM products WHERE id=42  → stock = 1 ✓
User B: SELECT stock FROM products WHERE id=42  → stock = 1 ✓
User A: UPDATE products SET stock = 0           → success
User B: UPDATE products SET stock = -1          → oversold!
```

With a transaction, User B's checkout would see stock = 0 and fail gracefully.
The `BEGIN ... COMMIT` block ensures all operations succeed or none do (ACID).

---

## Relationship Modeling with SQLite

SQLite supports foreign keys, but they must be explicitly enabled:

```sql
PRAGMA foreign_keys = ON;
```

Our schema uses these relationships:

```
users (1) ──→ (N) products       (seller_id)
users (1) ──→ (N) cart_items     (user_id)
users (1) ──→ (N) orders         (user_id)
products (1) ──→ (N) cart_items  (product_id)
products (1) ──→ (N) order_items (product_id)
orders (1) ──→ (N) order_items   (order_id)
```

### UNIQUE Constraints for Business Logic

The cart uses `UNIQUE(user_id, product_id)` — a user cannot have duplicate entries
for the same product. Instead, we upsert: if the product already exists in the cart,
we update the quantity. This is enforced at the database level, not application level.

---

## Auth Integration from Chapter 34

BazaarAPI reuses the JWT + bcrypt patterns from Dwarpal (Ch 34):

- **Registration** — hash password with bcrypt, store user
- **Login** — verify password, issue JWT with user ID and role in claims
- **Middleware** — extract and validate JWT, inject user context
- **Role-based access** — `RequireRole("admin")` guards product management

The key addition is **role-based authorization**. Regular users can browse and buy.
Admin users can create products, update stock, and manage order statuses.

---

## Pagination and Filtering

With millions of products, returning everything in one response is not viable.
BazaarAPI implements offset-based pagination:

```
GET /api/products?page=2&limit=20&category=electronics
```

The store translates this to:
```sql
SELECT * FROM products WHERE category = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
```

| Parameter  | Default | Description                    |
|------------|---------|--------------------------------|
| `page`     | 1       | Page number (1-indexed)        |
| `limit`    | 20      | Items per page (max 100)       |
| `category` | (all)   | Filter by product category     |

---

## Project Architecture

```
35-bazaarapi/
├── main.go                              # Entry point — wiring, router, graceful shutdown
├── go.mod                               # Module + dependencies
├── Dockerfile                           # Multi-stage build
├── docker-compose.yml                   # One-command deployment
├── .env.example                         # Environment variable reference
└── internal/
    ├── config/
    │   └── config.go                    # Environment → Config struct
    ├── model/
    │   ├── user.go                      # User, RegisterRequest, LoginRequest
    │   ├── product.go                   # Product, CreateProductRequest
    │   ├── cart.go                      # CartItem, Cart, AddToCartRequest
    │   └── order.go                     # Order, OrderItem, OrderStatus constants
    ├── store/
    │   ├── user_store.go                # User CRUD (Create, GetByEmail, GetByID)
    │   ├── product_store.go             # Product CRUD + pagination + stock
    │   ├── cart_store.go                # Cart operations (upsert, join queries)
    │   └── order_store.go              # Order creation with transactions
    ├── auth/
    │   ├── jwt.go                       # JWT generation + validation
    │   └── password.go                  # bcrypt hash + verify
    ├── handler/
    │   ├── auth_handler.go              # Register + Login
    │   ├── product_handler.go           # Product CRUD + pagination
    │   ├── cart_handler.go              # Cart management
    │   ├── order_handler.go             # Order placement + tracking
    │   └── helpers.go                   # Shared JSON response utilities
    └── middleware/
        ├── auth_middleware.go           # JWT extraction + role checking
        └── middleware.go                # Logger, CORS
```

### Dependency Flow

```
main.go
  ├── config.Load()                    → reads environment variables
  ├── store.NewUserStore(db)           → creates users table
  ├── store.NewProductStore(db)        → creates products table
  ├── store.NewCartStore(db)           → creates cart_items table
  ├── store.NewOrderStore(db)          → creates orders + order_items tables
  ├── auth.NewJWTService(secret, ttl)  → token management
  ├── handler.New*Handler(store, ...)  → injects dependencies
  └── chi.NewRouter()                  → wires middleware + routes
```

---

## API Endpoints

### Public (No Authentication)

| Method | Path                  | Description            | Status Codes |
|--------|-----------------------|------------------------|--------------|
| POST   | `/api/auth/register`  | Create new user        | 201, 400, 409|
| POST   | `/api/auth/login`     | Login, get JWT         | 200, 400, 401|
| GET    | `/api/products`       | List products (paged)  | 200          |
| GET    | `/api/products/{id}`  | Get single product     | 200, 404     |

### Protected (Requires JWT)

| Method | Path                  | Description            | Status Codes |
|--------|-----------------------|------------------------|--------------|
| GET    | `/api/profile`        | Get current user info  | 200          |
| GET    | `/api/cart`           | View user's cart       | 200          |
| POST   | `/api/cart`           | Add item to cart       | 200, 400     |
| PUT    | `/api/cart/{productId}` | Update item quantity | 200, 400, 404|
| DELETE | `/api/cart/{productId}` | Remove from cart     | 204, 404     |
| POST   | `/api/orders`         | Create order from cart | 201, 400     |
| GET    | `/api/orders`         | List user's orders     | 200          |
| GET    | `/api/orders/{id}`    | Get order details      | 200, 404     |

### Admin Only (Requires JWT + admin role)

| Method | Path                        | Description           | Status Codes |
|--------|-----------------------------|-----------------------|--------------|
| POST   | `/api/admin/products`       | Create product        | 201, 400     |
| PUT    | `/api/admin/products/{id}`  | Update product        | 200, 400, 404|
| DELETE | `/api/admin/products/{id}`  | Delete product        | 204, 404     |
| PUT    | `/api/admin/orders/{id}/status` | Update order status | 200, 400, 404|

---

## How to Run

### Local (go run)
```bash
cd 35-bazaarapi
go mod tidy
go run main.go

# Register a user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"rahul@flipkart.com","password":"bigbillion2024","name":"Rahul Sharma"}'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rahul@flipkart.com","password":"bigbillion2024"}'
# → {"token":"eyJhbGciOiJI..."}

# Browse products
curl http://localhost:8080/api/products?page=1&limit=10&category=electronics

# Add to cart (use token from login)
curl -X POST http://localhost:8080/api/cart \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":2}'

# Place order
curl -X POST http://localhost:8080/api/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"shipping_address":"Koramangala, Bangalore 560034"}'
```

### Docker
```bash
cd 35-bazaarapi
docker compose up --build
```

---

## Key Takeaways

1. **Transactions are non-negotiable for e-commerce.** The `CreateFromCart` method
   wraps cart-to-order conversion in a single transaction. Without it, Big Billion
   Days would mean overselling and angry customers.

2. **Foreign keys enforce relationships at the database level.** Application-level
   checks can have race conditions. `PRAGMA foreign_keys = ON` makes SQLite enforce
   referential integrity — you cannot create a cart item for a non-existent product.

3. **Upsert patterns simplify cart logic.** Instead of check-then-insert (which
   races), we use `ON CONFLICT ... DO UPDATE` — the database handles the
   atomicity.

4. **Pagination is mandatory for list endpoints.** Returning all products in a
   marketplace with millions of items would crash both the server and the client.
   Offset-based pagination with sensible defaults keeps things responsive.

5. **Role-based access control separates concerns.** Regular users buy, admin users
   manage. The middleware checks the JWT claims and rejects unauthorized access
   before the handler even runs.

6. **Price as float64 is educational, not production-grade.** Real payment systems
   (Razorpay, Stripe) use integer cents to avoid floating-point rounding errors.
   We use float64 here for simplicity — the concept of the API matters more than
   penny-precise arithmetic.

7. **Multi-resource APIs need careful routing.** Chi's `r.Route()` and `r.Group()`
   let us organize endpoints cleanly, applying middleware to specific groups
   (protected routes, admin routes) without repetition.

---

## What is Next?

Chapter 35 completes the e-commerce trilogy (CRUD → Auth → Marketplace). From here,
the course moves to more advanced projects: scanning tools, search engines, bots,
and speech processing — each building on the patterns established in these foundational
chapters.
