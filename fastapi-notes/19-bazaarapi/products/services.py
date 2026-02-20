# ============================================================
# BazaarAPI — Product Services (Business Logic)
# ============================================================
# Handles search, filtering, pagination, and CRUD operations.
# The get_products function is the most complex — it supports
# full-text search, category filter, price range, sorting,
# and pagination in a single composable query.
# ============================================================

import math
from datetime import datetime, timezone
from typing import Optional, Tuple, List

from sqlmodel import Session, select, func, col

from products.models import (
    Product,
    ProductCreate,
    ProductUpdate,
    PaginationMeta,
)


def get_products(
    session: Session,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    per_page: int = 20,
) -> Tuple[List[Product], PaginationMeta]:
    """
    Fetch products with search, filter, sort, and pagination.

    This is the workhorse query of BazaarAPI. It composes filters
    progressively — each filter is only applied if the parameter
    is provided.

    Args:
        search: Partial name match (case-insensitive via LIKE)
        category_id: Filter to a specific category
        min_price: Minimum price filter
        max_price: Maximum price filter
        sort_by: Field to sort by (name, price, created_at)
        sort_order: asc or desc
        page: Page number (1-indexed)
        per_page: Items per page (max 100)

    Returns:
        Tuple of (products list, pagination metadata)
    """
    # --- Build base query ---
    statement = select(Product).where(Product.is_active == True)  # noqa: E712

    # --- Apply filters progressively ---
    if search:
        statement = statement.where(col(Product.name).contains(search))

    if category_id is not None:
        statement = statement.where(Product.category_id == category_id)

    if min_price is not None:
        statement = statement.where(Product.price >= min_price)

    if max_price is not None:
        statement = statement.where(Product.price <= max_price)

    # --- Count total before pagination ---
    count_statement = select(func.count()).select_from(statement.subquery())
    total = session.exec(count_statement).one()

    # --- Sorting ---
    sort_column = getattr(Product, sort_by, Product.created_at)
    if sort_order == "asc":
        statement = statement.order_by(sort_column.asc())  # type: ignore
    else:
        statement = statement.order_by(sort_column.desc())  # type: ignore

    # --- Pagination ---
    per_page = min(per_page, 100)  # Cap at 100 items per page
    offset = (page - 1) * per_page
    statement = statement.offset(offset).limit(per_page)

    products = list(session.exec(statement).all())

    pagination = PaginationMeta(
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if per_page > 0 else 0,
    )

    return products, pagination


def get_product_by_id(session: Session, product_id: int) -> Optional[Product]:
    """Fetch a single product by ID."""
    return session.get(Product, product_id)


def create_product(session: Session, data: ProductCreate) -> Product:
    """Create a new product (admin only)."""
    product = Product(
        name=data.name,
        description=data.description,
        price=data.price,
        stock=data.stock,
        image_url=data.image_url,
        category_id=data.category_id,
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


def update_product(
    session: Session,
    product: Product,
    updates: ProductUpdate,
) -> Product:
    """Update an existing product with provided fields."""
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    product.updated_at = datetime.now(timezone.utc)
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


def delete_product(session: Session, product: Product) -> None:
    """Soft-delete a product by marking it inactive."""
    product.is_active = False
    product.updated_at = datetime.now(timezone.utc)
    session.add(product)
    session.commit()
