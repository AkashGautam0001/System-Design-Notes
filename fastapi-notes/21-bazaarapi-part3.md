# ============================================================
# FILE 21: BAZAARAPI PART 3 — PRODUCTION FEATURES AND POLISH
# ============================================================
# Topics: Background tasks, middleware, health checks, admin dashboard,
#         Alembic migrations, Docker, production checklist
#
# WHY THIS MATTERS:
# Production isn't just working code — it's observable, deployable,
# maintainable code. This chapter bridges the gap between demo and production.
# ============================================================


## STORY: The 3 AM Production Incident

It's 3 AM on a Saturday. Your phone buzzes. The BazaarAPI monitoring
dashboard shows: response times have spiked from 50ms to 4 seconds.
Orders are failing. Customers are angry on Twitter.

You SSH into the server. No logs. No timing data. No way to tell which
endpoint is slow. You check the database — it's fine. You check the
payment gateway — it's fine. You restart the service and things improve.

Monday morning, the CTO asks: "What happened?" You have no answer.

This chapter ensures you always have an answer. Request logging tells you
WHAT happened. Timing middleware tells you HOW LONG it took. Health checks
tell you IF the system is alive. Admin dashboard tells you HOW MUCH money
you're making. Alembic tells you WHAT changed in the schema. Docker tells
you HOW to deploy it.

Production-ready isn't a feature. It's a state of mind.

---

## SECTION 1 — Background Tasks

### WHY: Don't block API responses with slow operations.

When a customer places an order, you need to:
1. Return the order confirmation (immediately)
2. Send a confirmation email (can wait 5 seconds)
3. Check if any product is low on stock (can wait)
4. Update analytics (can wait)

FastAPI's `BackgroundTasks` lets you do (2), (3), and (4) after
the response is already sent to the customer.

### Using BackgroundTasks

```python
from fastapi import BackgroundTasks

def send_order_confirmation(email: str, order_id: int):
    """Simulate sending an email (replace with real email service)."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Sending order confirmation to {email} for order #{order_id}")
    # In production: use SendGrid, SES, or Mailgun here

def check_low_stock(session_factory, product_ids: list):
    """Alert admin if any product stock is below threshold."""
    import logging
    logger = logging.getLogger(__name__)
    # In production: send Slack notification or email to admin
    logger.info(f"Checking stock levels for products: {product_ids}")

@router.post("/orders/", response_model=OrderRead, status_code=201)
def create_order(
    data: OrderCreate,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_active_user),
    session = Depends(get_session),
):
    order = create_order_from_cart(session, current_user.id, data)

    # These run AFTER the response is sent
    background_tasks.add_task(
        send_order_confirmation,
        current_user.email,
        order.id,
    )
    background_tasks.add_task(
        check_low_stock,
        get_session,
        [item.product_id for item in order_items],
    )

    return order  # Customer gets response immediately
```

### When to Use BackgroundTasks vs Celery

| Criteria         | BackgroundTasks          | Celery                    |
|-----------------|--------------------------|---------------------------|
| Complexity      | Zero setup               | Requires Redis/RabbitMQ   |
| Reliability     | Lost if server crashes   | Persisted in message queue|
| Concurrency     | Same process             | Separate worker processes |
| Use case        | Email, logging, alerts   | Image processing, reports |
| BazaarAPI need  | Sufficient               | Overkill for now          |

**Rule of thumb:** If the background task takes < 30 seconds and can be
retried easily, use `BackgroundTasks`. If it takes minutes or must not
be lost, use Celery with Redis.

---

## SECTION 2 — Middleware Stack

### WHY: Cross-cutting concerns belong in middleware, not routes.

Middleware wraps every request/response. Instead of adding logging to
every single route, you add it once in middleware and it applies everywhere.

### Request Logging Middleware

```python
# middleware/logging.py
import time, logging
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("bazaarapi.requests")

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.time()
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000

        path = request.url.path
        if request.url.query:
            path = f"{path}?{request.url.query}"

        log_msg = f"{request.method} {path} -> {response.status_code} ({duration_ms:.1f}ms)"

        if response.status_code >= 500:
            logger.error(log_msg)
        elif response.status_code >= 400:
            logger.warning(log_msg)
        else:
            logger.info(log_msg)

        return response
```

**Example log output:**
```
INFO:  POST /users/login -> 200 (45.2ms)
INFO:  GET /products?search=phone -> 200 (12.8ms)
WARN:  GET /orders/999 -> 404 (3.1ms)
ERROR: POST /orders/ -> 500 (1204.5ms)
```

### Timing Middleware

```python
# middleware/timing.py
class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}"
        return response
```

**WHY X-Process-Time?** Frontend developers can see this header in the
browser's Network tab. If an API call takes 3 seconds, they can check:
- X-Process-Time says 0.05s -> network is the bottleneck
- X-Process-Time says 2.9s -> server is the bottleneck

### CORS Middleware

```python
# main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**WHY CORS?** Without it, a React frontend on `localhost:3000` cannot call
your API on `localhost:8000`. The browser blocks cross-origin requests by
default. CORS middleware tells the browser: "It's okay, I trust this origin."

### Middleware Order Matters

```python
# main.py — last added runs FIRST
app.add_middleware(CORSMiddleware, ...)     # 3rd: handles CORS
app.add_middleware(TimingMiddleware)         # 2nd: adds timing header
app.add_middleware(RequestLoggingMiddleware) # 1st: logs everything
```

The request flows: Logging -> Timing -> CORS -> Route -> CORS -> Timing -> Logging

---

## SECTION 3 — Admin Dashboard Endpoints

### WHY: Business stakeholders need data without touching the database.

Your CEO doesn't know SQL. Your product manager doesn't have database
access. But they both need to know: "How many orders today? What's our
revenue? Which products are selling best?"

Admin dashboard endpoints turn your database into a business intelligence
tool accessible through the API.

### Dashboard Stats

```python
# admin/services.py
def get_dashboard_stats(session):
    total_users = session.exec(
        select(func.count()).select_from(User)
    ).one()

    total_orders = session.exec(
        select(func.count()).select_from(Order)
    ).one()

    paid_statuses = [OrderStatus.paid, OrderStatus.shipped, OrderStatus.delivered]
    total_revenue = session.exec(
        select(func.sum(Order.total_amount)).where(
            Order.status.in_(paid_statuses)
        )
    ).one() or 0.0

    return {
        "total_users": total_users,
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "total_products": total_products,
        "orders_by_status": orders_by_status,
    }
```

### Top Selling Products

```python
def get_top_products(session, limit=10):
    results = session.exec(
        select(
            OrderItem.product_id,
            func.sum(OrderItem.quantity).label("total_sold"),
            func.sum(
                OrderItem.price_at_purchase * OrderItem.quantity
            ).label("total_revenue"),
        )
        .group_by(OrderItem.product_id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
    ).all()

    return [
        {
            "product_id": row[0],
            "product_name": get_product_name(session, row[0]),
            "total_sold": row[1],
            "total_revenue": round(row[2], 2),
        }
        for row in results
    ]
```

### Revenue by Period

```python
def get_revenue_stats(session, period="daily", days=30):
    """Revenue grouped by day, week, or month."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    orders = session.exec(
        select(Order).where(
            Order.status.in_(paid_statuses),
            Order.created_at >= since,
        )
    ).all()

    # Group into time buckets
    buckets = {}
    for order in orders:
        if period == "daily":
            key = order.created_at.strftime("%Y-%m-%d")
        elif period == "weekly":
            key = order.created_at.strftime("%Y-W%W")
        else:
            key = order.created_at.strftime("%Y-%m")

        if key not in buckets:
            buckets[key] = {"period": key, "revenue": 0.0, "order_count": 0}
        buckets[key]["revenue"] += order.total_amount
        buckets[key]["order_count"] += 1

    return sorted(buckets.values(), key=lambda x: x["period"])
```

### Admin Endpoints

| Method | Path                 | Purpose                        |
|--------|---------------------|--------------------------------|
| GET    | /admin/dashboard    | Total users, orders, revenue   |
| GET    | /admin/top-products | Best sellers by quantity       |
| GET    | /admin/recent-orders| Latest orders with user info   |
| GET    | /admin/revenue      | Revenue by day/week/month      |

All admin endpoints require the `require_admin` dependency.

---

## SECTION 4 — API Polish

### WHY: Professional APIs have health checks, versioning, and proper pagination.

### Health Check

```python
@app.get("/health")
def health_check():
    """Used by load balancers and monitoring tools."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
    }
```

**WHY health checks?** Kubernetes, Docker, AWS ELB — they all need to know
"Is this service alive?" A health check endpoint returns 200 when the
service is running. In production, you'd also check database connectivity.

### API Versioning Strategy

BazaarAPI v1.0.0 uses a simple approach: the version is in the app metadata,
not in the URL. When breaking changes are needed, two strategies:

**Strategy 1: URL prefix** (recommended for major changes)
```
/v1/products    # Current
/v2/products    # New version with breaking changes
```

**Strategy 2: Header-based** (recommended for minor changes)
```
Accept: application/json; version=2
```

### Root Endpoint

```python
@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }
```

---

## SECTION 5 — Alembic Migrations

### WHY: You can't drop and recreate tables in production.

During development, `SQLModel.metadata.create_all()` works fine. But in
production, you have real data. You can't drop the users table to add a
`phone` column — you'd lose all user accounts.

Alembic handles schema evolution: it generates migration scripts that
alter tables without losing data.

### Setup

```bash
# Initialize Alembic (already done in our project)
alembic init alembic

# alembic/env.py — Configure to use SQLModel
from sqlmodel import SQLModel
target_metadata = SQLModel.metadata
```

### Creating a Migration

```bash
# After modifying a model (e.g., adding User.phone)
alembic revision --autogenerate -m "add phone to users"

# This generates a file like:
# alembic/versions/2024_01_15_a1b2c3_add_phone_to_users.py
```

```python
# Generated migration file
def upgrade():
    op.add_column('users', sa.Column('phone', sa.String(15), nullable=True))

def downgrade():
    op.drop_column('users', 'phone')
```

### Running Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# See current revision
alembic current

# See migration history
alembic history
```

### Migration Best Practices

1. **Always review autogenerated migrations** — Alembic guesses, but it can
   get confused by renames (it sees "drop column + add column" instead of
   "rename column").

2. **Test migrations on a copy of production data** — Never run untested
   migrations against production.

3. **Make migrations reversible** — Always implement both `upgrade()` and
   `downgrade()`. If a migration goes wrong, you need to roll back.

4. **One migration per change** — Don't batch unrelated changes into one
   migration. "Add phone to users" and "add image_url to products" should
   be separate migrations.

---

## SECTION 6 — Docker and Deployment

### WHY: "Works on my machine" isn't deployment.

Docker ensures your application runs the same way everywhere: your laptop,
your colleague's laptop, staging, production.

### Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Line-by-line explanation:**
1. `FROM python:3.11-slim` — Start with a minimal Python image (not full Ubuntu)
2. `WORKDIR /app` — All subsequent commands run in /app
3. `COPY requirements.txt .` — Copy deps list first (for layer caching)
4. `RUN pip install ...` — Install deps (cached unless requirements.txt changes)
5. `COPY . .` — Copy application code (not cached — changes every deploy)
6. `EXPOSE 8000` — Document the port (doesn't actually open it)
7. `CMD [...]` — Default command when container starts

### Docker Compose

```yaml
# docker-compose.yml
version: "3.8"
services:
  web:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - .:/app
    restart: unless-stopped
```

### Running with Docker

```bash
# Build and start
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f web

# Stop
docker-compose down
```

### Production Checklist

Before deploying BazaarAPI to production, verify:

**Security:**
- [ ] Change `SECRET_KEY` to a random 256-bit string
- [ ] Set `DEBUG=false`
- [ ] Restrict `CORS_ORIGINS` to your actual frontend domain
- [ ] Use HTTPS (TLS termination at load balancer)
- [ ] Set real `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- [ ] Remove admin seed password or use a strong one

**Database:**
- [ ] Switch from SQLite to PostgreSQL
- [ ] Run Alembic migrations instead of `create_all()`
- [ ] Set up database backups
- [ ] Use connection pooling

**Performance:**
- [ ] Set appropriate `per_page` limits
- [ ] Add database indexes for frequently queried columns
- [ ] Consider Redis caching for product listings
- [ ] Use multiple Uvicorn workers: `--workers 4`

**Monitoring:**
- [ ] Set up log aggregation (ELK stack, CloudWatch, or Datadog)
- [ ] Configure health check monitoring (UptimeRobot, Pingdom)
- [ ] Set up error tracking (Sentry)
- [ ] Monitor Razorpay webhook failures

**Operations:**
- [ ] Set up CI/CD pipeline (GitHub Actions, GitLab CI)
- [ ] Create staging environment
- [ ] Document API with examples in `/docs`
- [ ] Set up rate limiting for public endpoints

---

## KEY TAKEAWAYS

1. **Background tasks keep responses fast** — Use `BackgroundTasks` for emails,
   alerts, and analytics. The customer gets their response immediately while
   slow operations run after.

2. **Middleware is for cross-cutting concerns** — Logging, timing, and CORS apply
   to every request. Middleware is the right abstraction — not decorators on
   every route.

3. **Health checks are non-negotiable** — Every production service needs a
   `/health` endpoint. Load balancers, container orchestrators, and monitoring
   tools all depend on it.

4. **Admin endpoints unlock business value** — The API isn't just for customers.
   Dashboard endpoints give stakeholders real-time access to sales data, top
   products, and revenue trends.

5. **Alembic is for production schema changes** — `create_all()` is for
   development. Alembic migrations are for production. They track every schema
   change with reversible up/down scripts.

6. **Docker eliminates "works on my machine"** — A Dockerfile defines the exact
   environment. Docker Compose orchestrates multi-service setups. Together they
   make deployment reproducible.

7. **Production is a mindset, not a feature** — Logging, monitoring, health
   checks, migrations, Docker — none of these change what the API does. They
   change how confidently you can run it at 3 AM when things go wrong.

---

## THE COMPLETE BAZAARAPI

Across three chapters, we've built a full e-commerce API:

| Chapter | Part          | What We Built                              |
|---------|--------------|---------------------------------------------|
| 19      | Foundation   | Users, auth, categories, products, search   |
| 20      | Transactions | Cart, orders, Razorpay payments, webhooks   |
| 21      | Production   | Middleware, admin, migrations, Docker        |

### Final Endpoint Summary

| Module     | Endpoints | Auth       | Key Features              |
|-----------|-----------|------------|---------------------------|
| Users     | 4         | Public+JWT | Register, login, profile  |
| Categories| 5         | Public+Admin| CRUD, soft delete        |
| Products  | 5         | Public+Admin| Search, filter, paginate |
| Cart      | 5         | JWT        | Add, update, remove, clear|
| Orders    | 5         | JWT+Admin  | Create, list, cancel      |
| Payments  | 3         | JWT+Public | Razorpay, verify, webhook |
| Admin     | 4         | Admin      | Dashboard, stats, revenue |
| Root      | 2         | Public     | Info, health check        |
| **Total** | **33**    |            |                           |

### Running the Project

```bash
cd 19-bazaarapi

# Option 1: Direct
pip install -r requirements.txt
uvicorn main:app --reload

# Option 2: Docker
docker-compose up --build

# Then open: http://localhost:8000/docs
```

This is BazaarAPI — from a 2BHK apartment to Big Billion Days.
Not in scale, but in architecture and intent.
