"""
============================================================
FILE 07: COMPLETE CRUD OPERATIONS — BUILDING A REAL API
============================================================
Topics: POST create, GET read (all + single), PUT full update,
        PATCH partial update, DELETE, filtering, sorting,
        search, pagination, PUT vs PATCH, in-memory store

WHY THIS MATTERS:
Every API in the world boils down to CRUD. Whether you are
building a food delivery app or a government portal, mastering
Create-Read-Update-Delete is the foundation of backend work.
============================================================
"""

# STORY: Dunzo — Delivery Task Create/Read/Update/Delete
# Dunzo is a Bangalore-born hyperlocal delivery platform. Every order
# — whether it is picking up biryani from Meghana Foods or medicines
# from Apollo Pharmacy — is a "task" in their system. Each task goes
# through a lifecycle: created, assigned, picked_up, delivered, or
# cancelled. Their backend must support creating thousands of tasks
# per minute, reading them with filters (by city, status, rider),
# updating status in real-time, and soft-deleting cancelled ones.
# Understanding CRUD deeply is how you build Dunzo-scale systems.

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum

app = FastAPI(title="Dunzo-Style Delivery Tasks API")


# ════════════════════════════════════════════════════════════
# SECTION 1 — In-Memory Data Store and Models
# ════════════════════════════════════════════════════════════

# WHY: Before connecting a real database, an in-memory store lets you
# prototype all CRUD logic. The patterns transfer directly to SQL/NoSQL.

# --- Auto-incrementing ID counter ---
task_id_counter: int = 0
# --- Dictionary store: {id: task_dict} for O(1) lookups ---
tasks_db: dict[int, dict] = {}


def get_next_id() -> int:
    """Generate next auto-incrementing ID."""
    global task_id_counter
    task_id_counter += 1
    return task_id_counter


# --- Enum for task status ---
class TaskStatus(str, Enum):
    created = "created"
    assigned = "assigned"
    picked_up = "picked_up"
    in_transit = "in_transit"
    delivered = "delivered"
    cancelled = "cancelled"


class TaskCategory(str, Enum):
    food = "food"
    grocery = "grocery"
    medicine = "medicine"
    documents = "documents"
    parcels = "parcels"
    other = "other"


# --- Pydantic models for request/response ---
class TaskCreate(BaseModel):
    """What the client sends to CREATE a task."""
    title: str = Field(min_length=3, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    pickup_address: str = Field(min_length=5, max_length=500)
    delivery_address: str = Field(min_length=5, max_length=500)
    category: TaskCategory = TaskCategory.other
    estimated_price: float = Field(gt=0, le=50000)
    customer_phone: str = Field(pattern=r"^[6-9]\d{9}$")


class TaskUpdate(BaseModel):
    """Full update — ALL fields required (PUT semantics)."""
    title: str = Field(min_length=3, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    pickup_address: str = Field(min_length=5, max_length=500)
    delivery_address: str = Field(min_length=5, max_length=500)
    category: TaskCategory
    estimated_price: float = Field(gt=0, le=50000)
    customer_phone: str = Field(pattern=r"^[6-9]\d{9}$")
    status: TaskStatus


class TaskPatch(BaseModel):
    """Partial update — all fields optional (PATCH semantics)."""
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    pickup_address: Optional[str] = Field(default=None, min_length=5, max_length=500)
    delivery_address: Optional[str] = Field(default=None, min_length=5, max_length=500)
    category: Optional[TaskCategory] = None
    estimated_price: Optional[float] = Field(default=None, gt=0, le=50000)
    customer_phone: Optional[str] = Field(
        default=None, pattern=r"^[6-9]\d{9}$"
    )
    status: Optional[TaskStatus] = None


class TaskResponse(BaseModel):
    """What the API returns for a single task."""
    id: int
    title: str
    description: Optional[str] = None
    pickup_address: str
    delivery_address: str
    category: TaskCategory
    estimated_price: float
    customer_phone: str
    status: TaskStatus
    created_at: str
    updated_at: str


class PaginatedResponse(BaseModel):
    """Wrapper for paginated list responses."""
    items: list[TaskResponse]
    total: int
    page: int
    size: int
    pages: int


# ════════════════════════════════════════════════════════════
# SECTION 2 — CREATE: POST Endpoint
# ════════════════════════════════════════════════════════════

# WHY: POST creates a new resource. It must validate input, assign
# an ID, set timestamps, store the data, and return the created resource.

@app.post("/tasks", response_model=TaskResponse, status_code=201)
def create_task(task: TaskCreate):
    """
    Create a new delivery task.
    - Auto-assigns an ID
    - Sets initial status to 'created'
    - Records created_at and updated_at timestamps
    """
    now = datetime.now(timezone.utc).isoformat()
    task_id = get_next_id()

    task_dict = {
        "id": task_id,
        **task.model_dump(),
        "status": TaskStatus.created,
        "created_at": now,
        "updated_at": now,
    }

    tasks_db[task_id] = task_dict
    return task_dict


# ════════════════════════════════════════════════════════════
# SECTION 3 — READ: GET All Items with Pagination
# ════════════════════════════════════════════════════════════

# WHY: Returning ALL records is dangerous at scale. Pagination (skip/limit
# or page/size) is mandatory for any production API.

@app.get("/tasks", response_model=PaginatedResponse)
def list_tasks(
    page: int = Query(ge=1, default=1, description="Page number"),
    size: int = Query(ge=1, le=100, default=10, description="Items per page"),
):
    """
    List all tasks with pagination.
    Returns items, total count, current page, and total pages.
    """
    all_tasks = list(tasks_db.values())
    total = len(all_tasks)

    # Calculate pagination
    pages = max(1, (total + size - 1) // size)  # ceiling division
    skip = (page - 1) * size
    paginated = all_tasks[skip : skip + size]

    return {
        "items": paginated,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


# ════════════════════════════════════════════════════════════
# SECTION 4 — READ: GET Single Item by ID
# ════════════════════════════════════════════════════════════

# WHY: The most common API call — fetch one resource by ID.
# Always handle the "not found" case with a 404.

@app.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: int):
    """
    Get a single task by ID.
    Returns 404 if the task does not exist.
    """
    if task_id not in tasks_db:
        raise HTTPException(
            status_code=404,
            detail=f"Task with id {task_id} not found",
        )
    return tasks_db[task_id]


# ════════════════════════════════════════════════════════════
# SECTION 5 — UPDATE: PUT for Full Replacement
# ════════════════════════════════════════════════════════════

# WHY: PUT means "replace the entire resource." The client must send
# ALL fields, even the ones that did not change. This is simple but
# requires the client to know the full current state.

@app.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task_full(task_id: int, task: TaskUpdate):
    """
    Full update (PUT) — replaces all fields.
    Client must send every field. Missing fields = validation error.
    Preserves: id, created_at. Updates: updated_at.
    """
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")

    existing = tasks_db[task_id]
    now = datetime.now(timezone.utc).isoformat()

    updated = {
        "id": task_id,
        **task.model_dump(),
        "created_at": existing["created_at"],  # preserve original
        "updated_at": now,
    }

    tasks_db[task_id] = updated
    return updated


# ════════════════════════════════════════════════════════════
# SECTION 6 — UPDATE: PATCH for Partial Update
# ════════════════════════════════════════════════════════════

# WHY: PATCH sends ONLY the fields that changed. This is more efficient
# and less error-prone than PUT. The key trick is exclude_unset=True.

@app.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task_partial(task_id: int, task: TaskPatch):
    """
    Partial update (PATCH) — only updates fields that were sent.

    The magic: model_dump(exclude_unset=True) returns ONLY the fields
    the client explicitly included in the JSON body. Fields not sent
    are left unchanged.

    Example: {"status": "assigned"} updates ONLY status.
    """
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")

    existing = tasks_db[task_id]

    # exclude_unset=True is the KEY difference from PUT
    # It only includes fields the client actually sent
    update_data = task.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400, detail="No fields to update"
        )

    # Apply only the sent fields to existing data
    for field, value in update_data.items():
        existing[field] = value

    existing["updated_at"] = datetime.now(timezone.utc).isoformat()
    tasks_db[task_id] = existing
    return existing


# --- PUT vs PATCH: Quick Comparison ---
#
# | Aspect      | PUT                      | PATCH                    |
# |-------------|--------------------------|--------------------------|
# | Fields      | ALL fields required      | Only changed fields      |
# | Semantics   | Replace entire resource  | Modify specific fields   |
# | Model       | All fields mandatory     | All fields Optional      |
# | Key method  | model_dump()             | model_dump(exclude_unset)|
# | Use when    | Client has full state    | Client has partial state |
# | Idempotent  | Yes                      | Not always               |
# | Bandwidth   | More (full payload)      | Less (partial payload)   |
#
# Rule of thumb: Use PATCH for most real-world updates.
# Use PUT when you want strict "replace" semantics (e.g., config files).


# ════════════════════════════════════════════════════════════
# SECTION 7 — DELETE: Remove an Item
# ════════════════════════════════════════════════════════════

# WHY: Deletion seems simple but has nuances: hard vs soft delete,
# returning the deleted item, and proper 404 handling.

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    """
    Delete a task by ID (hard delete — removed from store).
    Returns the deleted task data for confirmation.
    """
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")

    deleted_task = tasks_db.pop(task_id)
    return {"message": "Task deleted", "deleted": deleted_task}


# --- Soft delete alternative (preferred in production) ---
# Instead of removing, set a deleted_at timestamp:
#
# @app.delete("/tasks/{task_id}")
# def soft_delete_task(task_id: int):
#     if task_id not in tasks_db:
#         raise HTTPException(status_code=404, detail="Task not found")
#     tasks_db[task_id]["deleted_at"] = datetime.now(timezone.utc).isoformat()
#     tasks_db[task_id]["status"] = "cancelled"
#     return {"message": "Task soft-deleted"}
#
# Then filter out soft-deleted items in list endpoints:
# active_tasks = [t for t in tasks_db.values() if "deleted_at" not in t]


# ════════════════════════════════════════════════════════════
# SECTION 8 — Filtering, Sorting, and Search
# ════════════════════════════════════════════════════════════

# WHY: Real APIs are never just "get all." Users need to filter by
# status, sort by date, and search by keywords. These are the most
# requested features after basic CRUD.

class SortField(str, Enum):
    created_at = "created_at"
    updated_at = "updated_at"
    estimated_price = "estimated_price"
    title = "title"

class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"


@app.get("/tasks/search/advanced", response_model=PaginatedResponse)
def search_tasks(
    # --- Filtering ---
    status: Optional[TaskStatus] = Query(default=None, description="Filter by status"),
    category: Optional[TaskCategory] = Query(default=None, description="Filter by category"),
    min_price: Optional[float] = Query(default=None, ge=0, description="Min price"),
    max_price: Optional[float] = Query(default=None, ge=0, description="Max price"),
    # --- Search ---
    q: Optional[str] = Query(
        default=None, min_length=1, max_length=100,
        description="Search in title and description",
    ),
    # --- Sorting ---
    sort_by: SortField = Query(default=SortField.created_at),
    order: SortOrder = Query(default=SortOrder.desc),
    # --- Pagination ---
    page: int = Query(ge=1, default=1),
    size: int = Query(ge=1, le=100, default=10),
):
    """
    Advanced search with filtering, text search, sorting, and pagination.
    All parameters are optional — combine as needed.
    """
    results = list(tasks_db.values())

    # --- Apply filters ---
    if status is not None:
        results = [t for t in results if t["status"] == status]

    if category is not None:
        results = [t for t in results if t["category"] == category]

    if min_price is not None:
        results = [t for t in results if t["estimated_price"] >= min_price]

    if max_price is not None:
        results = [t for t in results if t["estimated_price"] <= max_price]

    # --- Apply text search (case-insensitive contains) ---
    if q is not None:
        q_lower = q.lower()
        results = [
            t for t in results
            if q_lower in t["title"].lower()
            or (t.get("description") and q_lower in t["description"].lower())
        ]

    # --- Apply sorting ---
    reverse = order == SortOrder.desc
    results.sort(
        key=lambda t: t.get(sort_by.value, ""),
        reverse=reverse,
    )

    # --- Apply pagination ---
    total = len(results)
    pages = max(1, (total + size - 1) // size)
    skip = (page - 1) * size
    paginated = results[skip : skip + size]

    return {
        "items": paginated,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


# ════════════════════════════════════════════════════════════
# SECTION 9 — Complete Example: Seed Data and Status Transitions
# ════════════════════════════════════════════════════════════

# WHY: A real delivery system has business rules about status transitions.
# You cannot jump from "created" to "delivered" — it must go through
# assigned -> picked_up -> in_transit -> delivered.

# Valid status transitions for a Dunzo-style task
VALID_TRANSITIONS: dict[str, list[str]] = {
    "created": ["assigned", "cancelled"],
    "assigned": ["picked_up", "cancelled"],
    "picked_up": ["in_transit", "cancelled"],
    "in_transit": ["delivered", "cancelled"],
    "delivered": [],      # terminal state
    "cancelled": [],      # terminal state
}


@app.patch("/tasks/{task_id}/status")
def update_task_status(
    task_id: int,
    new_status: TaskStatus = Query(description="New status value"),
):
    """
    Update task status with transition validation.
    Ensures only valid status transitions are allowed.
    """
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks_db[task_id]
    current_status = task["status"]
    allowed = VALID_TRANSITIONS.get(current_status, [])

    if new_status.value not in allowed:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot transition from '{current_status}' to "
                f"'{new_status.value}'. Allowed: {allowed}"
            ),
        )

    task["status"] = new_status.value
    task["updated_at"] = datetime.now(timezone.utc).isoformat()
    tasks_db[task_id] = task

    return {"message": f"Status updated to {new_status.value}", "task": task}


# --- Seed data endpoint for testing ---
@app.post("/tasks/seed", status_code=201)
def seed_tasks():
    """Populate the store with sample Dunzo-style tasks for testing."""
    sample_tasks = [
        TaskCreate(
            title="Biryani from Meghana Foods",
            description="2x Chicken Biryani, 1x Gulab Jamun",
            pickup_address="Meghana Foods, Koramangala 5th Block, Bangalore",
            delivery_address="42 Wind Tunnel Road, Murugeshpalya, Bangalore",
            category=TaskCategory.food,
            estimated_price=650.0,
            customer_phone="9876543210",
        ),
        TaskCreate(
            title="Medicines from Apollo Pharmacy",
            description="Paracetamol 500mg x 10, Crocin strips x 3",
            pickup_address="Apollo Pharmacy, Indiranagar 100ft Road",
            delivery_address="15 CMH Road, Indiranagar, Bangalore",
            category=TaskCategory.medicine,
            estimated_price=350.0,
            customer_phone="8765432109",
        ),
        TaskCreate(
            title="Groceries from BigBasket Darkstore",
            description="Rice 5kg, Dal 2kg, Oil 1L, Atta 5kg",
            pickup_address="BigBasket Darkstore, HSR Layout Sector 2",
            delivery_address="303 Salarpuria Greenage, HSR Layout",
            category=TaskCategory.grocery,
            estimated_price=1200.0,
            customer_phone="7654321098",
        ),
        TaskCreate(
            title="Documents to Koramangala Office",
            description="Signed agreement copies, 5 pages",
            pickup_address="WeWork Galaxy, Residency Road",
            delivery_address="Dunzo HQ, Koramangala 4th Block",
            category=TaskCategory.documents,
            estimated_price=80.0,
            customer_phone="9988776655",
        ),
    ]

    created = []
    for task_data in sample_tasks:
        now = datetime.now(timezone.utc).isoformat()
        task_id = get_next_id()
        task_dict = {
            "id": task_id,
            **task_data.model_dump(),
            "status": TaskStatus.created,
            "created_at": now,
            "updated_at": now,
        }
        tasks_db[task_id] = task_dict
        created.append(task_dict)

    return {"message": f"Seeded {len(created)} tasks", "tasks": created}


# --- Statistics endpoint ---
@app.get("/tasks/stats/summary")
def get_task_stats():
    """Get summary statistics of all tasks."""
    all_tasks = list(tasks_db.values())
    total = len(all_tasks)

    if total == 0:
        return {"total": 0, "message": "No tasks yet. POST /tasks/seed to add sample data."}

    status_counts: dict[str, int] = {}
    category_counts: dict[str, int] = {}
    total_price = 0.0

    for task in all_tasks:
        s = task["status"]
        c = task["category"]
        status_counts[s] = status_counts.get(s, 0) + 1
        category_counts[c] = category_counts.get(c, 0) + 1
        total_price += task["estimated_price"]

    return {
        "total_tasks": total,
        "by_status": status_counts,
        "by_category": category_counts,
        "average_price": round(total_price / total, 2),
        "total_value": round(total_price, 2),
    }


# ════════════════════════════════════════════════════════════
# KEY TAKEAWAYS
# ════════════════════════════════════════════════════════════
# 1. Use a dict with int keys for O(1) lookups by ID — this pattern
#    maps directly to database primary key lookups later.
# 2. Always return 404 (HTTPException) when a resource is not found —
#    never return None or empty dict silently.
# 3. POST returns 201 (Created), not 200. Use status_code=201.
# 4. PUT = full replacement (all fields required).
#    PATCH = partial update (all fields Optional + exclude_unset=True).
# 5. model_dump(exclude_unset=True) is the key to proper PATCH — it
#    distinguishes "field not sent" from "field sent as None."
# 6. Pagination must return metadata (total, page, pages) — not just
#    the items list — so the client can build pagination UI.
# 7. Filtering + sorting + search + pagination can all coexist as
#    optional query parameters on a single GET endpoint.
# 8. Status transitions should be validated against a state machine.
#    Do not let clients jump from "created" to "delivered" directly.
# "First make it work (CRUD), then make it right (validation),
#  then make it fast (database)." — Dunzo Engineering Principle
