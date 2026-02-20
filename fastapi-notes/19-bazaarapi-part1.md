# ============================================================
# FILE 19: BAZAARAPI PART 1 — FOUNDATION (USERS, PRODUCTS, CATEGORIES)
# ============================================================
# Topics: Project setup, database schema, user auth, product CRUD,
#         categories, search, filtering, pagination, admin roles
#
# WHY THIS MATTERS:
# Every e-commerce app starts with users and a product catalog.
# This chapter builds the foundation that everything else rests on.
# ============================================================


## STORY: From a Bangalore Apartment to Big Billion Days

In 2007, Sachin and Binny Bansal started Flipkart from a 2BHK apartment
in Koramangala, Bangalore. Their first order was a book — "Leaving Microsoft
to Change the World." Today, Flipkart handles 10M+ orders during Big Billion
Days. BazaarAPI is our Flipkart — starting small, but built with patterns
that scale.

In Part 1, we build what every marketplace needs first: users who can sign
up, and products they can browse. No cart, no payments — just the solid
foundation that the entire e-commerce experience will rest on.

Think about it: Amazon started as a bookstore. Flipkart started as a
bookstore. Every great marketplace began with a catalog and customers.

---

## SECTION 1 — Project Architecture and Setup

### WHY: A solid architecture prevents costly rewrites later.

BazaarAPI follows a modular architecture where each business domain
(users, products, cart, orders, payments) lives in its own Python
package with models, routes, and services separated cleanly.

### Project Structure

```
19-bazaarapi/
├── main.py                  # App entry point, lifespan, middleware, routers
├── config.py                # Settings from environment variables
├── database.py              # SQLModel engine and session management
├── auth/
│   ├── __init__.py
│   ├── jwt_handler.py       # Token creation and decoding
│   └── dependencies.py      # Auth dependencies (get_current_user, etc.)
├── users/
│   ├── __init__.py
│   ├── models.py            # User table + request/response schemas
│   ├── routes.py            # Register, login, profile endpoints
│   └── services.py          # Password hashing, user CRUD
├── categories/
│   ├── __init__.py
│   ├── models.py            # Category table + schemas
│   ├── routes.py            # Category CRUD endpoints
│   └── services.py          # Category business logic
├── products/
│   ├── __init__.py
│   ├── models.py            # Product table + schemas + pagination
│   ├── routes.py            # Product CRUD + search/filter/paginate
│   └── services.py          # Product business logic + search engine
├── cart/                    # (Part 2)
├── orders/                  # (Part 2)
├── payments/                # (Part 2)
├── admin/                   # (Part 3)
├── middleware/              # (Part 3)
├── alembic/                 # (Part 3)
├── .env.example
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### Tech Stack

| Layer        | Technology          | Why                                    |
|-------------|--------------------|-----------------------------------------|
| Framework   | FastAPI            | Async, typed, auto-docs, fast           |
| ORM         | SQLModel           | SQLAlchemy + Pydantic in one            |
| Database    | SQLite (dev)       | Zero setup; swap to PostgreSQL for prod |
| Auth        | JWT (python-jose)  | Stateless, scalable authentication      |
| Payments    | Razorpay           | India's leading payment gateway         |
| Deployment  | Docker             | Consistent environments everywhere      |

### Design Principles

1. **Thin routes, thick services** — Routes validate and route. Services contain logic.
2. **Separate schemas** — Create, Read, Update schemas keep data flow explicit.
3. **Soft deletes** — Products and categories are deactivated, not removed.
4. **Progressive query building** — Filters compose; each is optional.
5. **Atomic operations** — Cart-to-order conversion is all-or-nothing.

### Configuration with pydantic-settings

```python
# config.py — All configuration from environment variables
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./bazaarapi.db"
    SECRET_KEY: str = "change-this-to-a-random-secret-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    DEBUG: bool = True

    model_config = {"env_file": ".env"}

settings = Settings()
```

**WHY pydantic-settings?** It validates environment variables at startup.
A missing `SECRET_KEY` fails fast instead of silently using an empty string.

---

## SECTION 2 — Database Schema Design

### WHY: The schema IS your application — get it right early.

### Entity Relationship Diagram (ASCII)

```
┌──────────┐     ┌────────────┐     ┌──────────┐
│  users   │     │ categories │     │ products │
├──────────┤     ├────────────┤     ├──────────┤
│ id (PK)  │     │ id (PK)    │     │ id (PK)  │
│ username │     │ name       │────>│ cat_id   │ (FK)
│ email    │     │ slug       │     │ name     │
│ password │     │ is_active  │     │ price    │
│ role     │     └────────────┘     │ stock    │
│ is_active│                        │ is_active│
└────┬─────┘                        └──────────┘
     │
     │ 1:N
     v
┌────────────┐     ┌─────────────┐     ┌──────────┐
│ cart_items │     │   orders    │     │ payments │
├────────────┤     ├─────────────┤     ├──────────┤
│ id (PK)   │     │ id (PK)     │     │ id (PK)  │
│ user_id   │(FK) │ user_id     │(FK) │ order_id │(FK)
│ product_id│(FK) │ total       │     │ rp_order │
│ quantity  │     │ status      │     │ rp_pay   │
└────────────┘    │ address     │     │ status   │
                  └──────┬──────┘     └──────────┘
                         │
                         │ 1:N
                         v
                  ┌─────────────┐
                  │ order_items │
                  ├─────────────┤
                  │ id (PK)     │
                  │ order_id    │(FK)
                  │ product_id  │(FK)
                  │ quantity    │
                  │ price_at    │
                  └─────────────┘
```

### All Tables

| Table        | Records          | Key Fields                           |
|-------------|------------------|--------------------------------------|
| users       | Platform users   | username, email, role, is_active     |
| categories  | Product groups   | name, slug, is_active                |
| products    | Items for sale   | name, price, stock, category_id (FK) |
| cart_items  | Shopping cart     | user_id (FK), product_id (FK), qty   |
| orders      | Placed orders    | user_id (FK), total, status, address |
| order_items | Order details    | order_id (FK), product_id (FK), price|
| payments    | Payment records  | order_id (FK), razorpay IDs, status  |

### SQLModel + Database Setup

```python
# database.py — Engine, session, and table creation
from sqlmodel import SQLModel, Session, create_engine
from config import settings

engine = create_engine(settings.DATABASE_URL, echo=settings.DEBUG)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
```

**WHY SQLModel?** It gives us SQLAlchemy's power with Pydantic's validation
in a single class. One `User` class is both the database model AND the
serialization schema.

---

## SECTION 3 — User Authentication (Reusing DwarPal Patterns)

### WHY: Don't reinvent auth — reuse proven patterns.

If you completed Chapter 18 (DwarPal), this section will feel familiar.
BazaarAPI reuses the same JWT auth pattern with one addition: **roles**.

### User Model with Roles

```python
# users/models.py
from enum import Enum
from sqlmodel import SQLModel, Field
from datetime import datetime, timezone

class UserRole(str, Enum):
    admin = "admin"
    customer = "customer"

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole = Field(default=UserRole.customer)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
```

**WHY roles?** E-commerce has distinct user types. Customers browse and buy.
Admins manage products, view dashboards, and update order statuses.
The `UserRole` enum enforces this at the database level.

### Auth Dependencies

```python
# auth/dependencies.py — Three-layer auth system
def get_current_user(token, session) -> User:
    """Extract user from JWT. Raises 401 if invalid."""

def get_current_active_user(current_user) -> User:
    """Ensures user account is active. Raises 403 if deactivated."""

def require_admin(current_user) -> User:
    """Ensures user has admin role. Raises 403 if not admin."""
```

**Usage pattern:**
```python
# Any authenticated user
@router.get("/me")
def profile(user: User = Depends(get_current_active_user)): ...

# Admin only
@router.post("/products")
def create_product(admin: User = Depends(require_admin)): ...
```

### User Endpoints

| Method | Path             | Auth     | Purpose                |
|--------|-----------------|----------|------------------------|
| POST   | /users/register | Public   | Create new account     |
| POST   | /users/login    | Public   | Get JWT token          |
| GET    | /users/me       | Customer | View own profile       |
| PATCH  | /users/me       | Customer | Update own profile     |

### Registration Flow

```python
# users/routes.py — Registration with duplicate checks
@router.post("/register", response_model=UserRead, status_code=201)
def register(user_data: UserCreate, session = Depends(get_session)):
    if get_user_by_email(session, user_data.email):
        raise HTTPException(409, "Email already registered")
    if get_user_by_username(session, user_data.username):
        raise HTTPException(409, "Username already taken")
    return create_user(session, user_data)
```

### Admin Seeding

```python
# users/services.py — Seed admin on startup
def seed_admin_user(session):
    """Create default admin if it doesn't exist."""
    existing = get_user_by_email(session, settings.ADMIN_EMAIL)
    if existing:
        return
    create_user(session, admin_data, role=UserRole.admin)
```

**WHY seed on startup?** You need at least one admin to bootstrap the system.
Without this, there's no way to create the first admin account (it's a
chicken-and-egg problem).

---

## SECTION 4 — Category CRUD

### WHY: Products need organization — categories are the skeleton.

On Flipkart, you browse by "Electronics > Mobiles > Samsung."
Categories provide this hierarchy (we implement flat categories here;
nested categories are an extension exercise).

### Category Model

```python
# categories/models.py
class Category(SQLModel, table=True):
    __tablename__ = "categories"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    description: Optional[str] = None
    slug: str = Field(index=True, unique=True)  # "electronics", "clothing"
    is_active: bool = Field(default=True)
    created_at: datetime
```

**WHY slug?** Slugs create SEO-friendly URLs. `/categories/electronics` is
better than `/categories/1` for both humans and search engines.

### Category Endpoints

| Method | Path                | Auth   | Purpose              |
|--------|--------------------| -------|----------------------|
| GET    | /categories        | Public | List active categories|
| GET    | /categories/{id}   | Public | Get single category  |
| POST   | /categories        | Admin  | Create category      |
| PATCH  | /categories/{id}   | Admin  | Update category      |
| DELETE | /categories/{id}   | Admin  | Soft-delete category |

### Soft Delete Pattern

```python
# categories/services.py
def delete_category(session, category):
    """Soft-delete: mark inactive, don't remove."""
    category.is_active = False
    session.add(category)
    session.commit()
```

**WHY soft delete?** If we hard-delete category "Electronics" and 500 products
reference it, we break those foreign key relationships. Soft-delete preserves
data integrity while hiding the category from public views.

---

## SECTION 5 — Product CRUD

### WHY: The product catalog is the heart of any marketplace.

### Product Model

```python
# products/models.py
class Product(SQLModel, table=True):
    __tablename__ = "products"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    price: float = Field(ge=0)
    stock: int = Field(default=0, ge=0)
    image_url: Optional[str] = None
    category_id: Optional[int] = Field(foreign_key="categories.id")
    is_active: bool = Field(default=True)
    created_at: datetime
    updated_at: Optional[datetime] = None
```

**Key design decisions:**

1. **`price` as float** — Simplified for learning. Production apps use `Decimal`
   to avoid floating-point errors (0.1 + 0.2 != 0.3 in IEEE 754).

2. **`stock` tracking** — When an order is placed, stock decrements atomically.
   This prevents overselling (selling 11 of something when only 10 exist).

3. **`category_id` FK** — Links products to categories. Optional because some
   products might not be categorized yet.

4. **`updated_at`** — Tracks when a product was last modified. Useful for
   cache invalidation and admin auditing.

### Pagination Model

```python
class PaginationMeta(SQLModel):
    total: int        # Total matching products
    page: int         # Current page number
    per_page: int     # Items per page
    total_pages: int  # Calculated total pages

class ProductList(SQLModel):
    items: List[ProductRead]
    pagination: PaginationMeta
```

**WHY pagination metadata?** The frontend needs to know: "How many pages
total? Am I on the last page? How many results matched my search?" Without
metadata, the frontend is blind.

### Product Endpoints

| Method | Path              | Auth   | Purpose                        |
|--------|------------------|--------|--------------------------------|
| GET    | /products        | Public | Search, filter, paginate       |
| GET    | /products/{id}   | Public | Get single product             |
| POST   | /products        | Admin  | Create product                 |
| PATCH  | /products/{id}   | Admin  | Update product                 |
| DELETE | /products/{id}   | Admin  | Soft-delete product            |

---

## SECTION 6 — Search, Filter, and Pagination

### WHY: Users don't browse — they search. Make it fast.

The product listing endpoint is the most complex query in BazaarAPI.
It composes multiple optional filters into a single efficient query.

### Progressive Query Building

```python
# products/services.py — The workhorse query
def get_products(session, search=None, category_id=None,
                 min_price=None, max_price=None,
                 sort_by="created_at", sort_order="desc",
                 page=1, per_page=20):

    # Start with base query
    statement = select(Product).where(Product.is_active == True)

    # Layer on filters — each is optional
    if search:
        statement = statement.where(
            col(Product.name).contains(search)
        )

    if category_id is not None:
        statement = statement.where(
            Product.category_id == category_id
        )

    if min_price is not None:
        statement = statement.where(Product.price >= min_price)

    if max_price is not None:
        statement = statement.where(Product.price <= max_price)

    # Count total BEFORE pagination (for metadata)
    total = session.exec(
        select(func.count()).select_from(statement.subquery())
    ).one()

    # Apply sorting
    sort_column = getattr(Product, sort_by, Product.created_at)
    if sort_order == "asc":
        statement = statement.order_by(sort_column.asc())
    else:
        statement = statement.order_by(sort_column.desc())

    # Apply pagination
    offset = (page - 1) * per_page
    statement = statement.offset(offset).limit(per_page)

    products = list(session.exec(statement).all())
    pagination = PaginationMeta(
        total=total, page=page, per_page=per_page,
        total_pages=math.ceil(total / per_page)
    )
    return products, pagination
```

### Query Parameter Usage

```
GET /products                                    # All products, page 1
GET /products?search=samsung                     # Search by name
GET /products?category_id=1                      # Filter by category
GET /products?min_price=500&max_price=2000       # Price range
GET /products?sort_by=price&sort_order=asc       # Sort by price
GET /products?page=2&per_page=10                 # Pagination
GET /products?search=phone&category_id=1&min_price=10000&sort_by=price&page=1
# ^ All filters combined!
```

**WHY progressive composition?** Each filter is independent. The query builds
up from a base and only applies filters that are provided. This is the
same pattern used by major e-commerce APIs (Amazon, Shopify, Flipkart).

### Route with Query Parameters

```python
# products/routes.py
@router.get("/", response_model=ProductList)
def list_products(
    search: Optional[str] = Query(default=None),
    category_id: Optional[int] = Query(default=None),
    min_price: Optional[float] = Query(default=None, ge=0),
    max_price: Optional[float] = Query(default=None, ge=0),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    session = Depends(get_session),
):
    products, pagination = get_products(
        session, search, category_id,
        min_price, max_price,
        sort_by, sort_order, page, per_page,
    )
    return ProductList(items=products, pagination=pagination)
```

### Example API Response

```json
{
    "items": [
        {
            "id": 1,
            "name": "Samsung Galaxy S24",
            "price": 79999.0,
            "stock": 50,
            "category_id": 1,
            "is_active": true,
            "created_at": "2024-01-15T10:30:00Z"
        }
    ],
    "pagination": {
        "total": 47,
        "page": 1,
        "per_page": 20,
        "total_pages": 3
    }
}
```

---

## KEY TAKEAWAYS

1. **Modular architecture scales** — Each domain (users, products, categories)
   is a self-contained package. Adding a "reviews" feature means creating a new
   package, not modifying existing ones.

2. **Thin routes, thick services** — Routes handle HTTP concerns (status codes,
   dependencies). Services handle business logic (validation, database operations).
   This makes services testable without HTTP.

3. **Roles solve authorization** — Two simple roles (admin, customer) with a
   single `require_admin` dependency. No complex RBAC needed for most apps.

4. **Soft deletes preserve integrity** — Never hard-delete data that other
   tables reference. Mark it inactive and filter it in queries.

5. **Progressive query composition** — Build queries incrementally. Start with a
   base, add optional filters. This pattern handles any combination of search
   criteria without writing N different query functions.

6. **Pagination metadata empowers frontends** — Return total count, page number,
   and total pages. The frontend can render page controls without guessing.

7. **Admin seeding solves the bootstrap problem** — The first admin account is
   created automatically on startup. Without this, you can't create admin
   accounts through the API (no existing admin to authorize the creation).

---

## WHAT'S NEXT

In Part 2, we build the transactional heart of BazaarAPI:
- **Cart management** — Add, update, remove items
- **Order placement** — Atomic cart-to-order conversion
- **Razorpay integration** — Real payment processing
- **Webhooks** — Async payment confirmation

The foundation is solid. Now we make money.
