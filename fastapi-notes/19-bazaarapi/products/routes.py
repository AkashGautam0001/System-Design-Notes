# ============================================================
# BazaarAPI — Product Routes
# ============================================================
# Public: search, filter, paginate, view products
# Admin: create, update, delete products
# ============================================================

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from database import get_session
from auth.dependencies import require_admin
from users.models import User
from products.models import ProductCreate, ProductRead, ProductUpdate, ProductList
from products.services import (
    get_products,
    get_product_by_id,
    create_product,
    update_product,
    delete_product,
)

router = APIRouter(prefix="/products", tags=["Products"])


@router.get(
    "/",
    response_model=ProductList,
    summary="Search, filter, and paginate products",
)
def list_products(
    search: Optional[str] = Query(default=None, description="Search by product name"),
    category_id: Optional[int] = Query(default=None, description="Filter by category"),
    min_price: Optional[float] = Query(default=None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(default=None, ge=0, description="Maximum price"),
    sort_by: str = Query(default="created_at", description="Sort field: name, price, created_at"),
    sort_order: str = Query(default="desc", description="Sort order: asc or desc"),
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=100, description="Items per page"),
    session: Session = Depends(get_session),
) -> dict:
    """
    Public endpoint — the main product browsing API.

    Supports:
    - Text search by name
    - Filter by category, price range
    - Sort by name, price, or creation date
    - Pagination with metadata
    """
    products, pagination = get_products(
        session=session,
        search=search,
        category_id=category_id,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )
    return ProductList(items=products, pagination=pagination)


@router.get(
    "/{product_id}",
    response_model=ProductRead,
    summary="Get a single product by ID",
)
def get_product(
    product_id: int,
    session: Session = Depends(get_session),
) -> dict:
    """Public endpoint — returns product details."""
    product = get_product_by_id(session, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return product


@router.post(
    "/",
    response_model=ProductRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product (admin)",
)
def create_new_product(
    data: ProductCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> dict:
    """Admin-only: Create a new product listing."""
    return create_product(session, data)


@router.patch(
    "/{product_id}",
    response_model=ProductRead,
    summary="Update a product (admin)",
)
def update_existing_product(
    product_id: int,
    updates: ProductUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> dict:
    """Admin-only: Update an existing product."""
    product = get_product_by_id(session, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return update_product(session, product, updates)


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a product (admin)",
)
def delete_existing_product(
    product_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> None:
    """Admin-only: Soft-delete a product."""
    product = get_product_by_id(session, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    delete_product(session, product)
