# ============================================================
# BazaarAPI — Category Routes
# ============================================================
# Public: list and view categories
# Admin: create, update, delete categories
# ============================================================

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from database import get_session
from auth.dependencies import require_admin
from users.models import User
from categories.models import (
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
)
from categories.services import (
    get_all_categories,
    get_category_by_id,
    get_category_by_slug,
    create_category,
    update_category,
    delete_category,
)

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get(
    "/",
    response_model=List[CategoryRead],
    summary="List all active categories",
)
def list_categories(
    session: Session = Depends(get_session),
) -> list:
    """Public endpoint — returns all active categories."""
    return get_all_categories(session)


@router.get(
    "/{category_id}",
    response_model=CategoryRead,
    summary="Get a single category by ID",
)
def get_category(
    category_id: int,
    session: Session = Depends(get_session),
) -> dict:
    """Public endpoint — returns category details."""
    category = get_category_by_id(session, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    return category


@router.post(
    "/",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new category (admin)",
)
def create_new_category(
    data: CategoryCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> dict:
    """
    Admin-only: Create a new product category.

    Checks for duplicate name and slug before creation.
    """
    # Check duplicate slug
    if get_category_by_slug(session, data.slug):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category with slug '{data.slug}' already exists",
        )
    return create_category(session, data)


@router.patch(
    "/{category_id}",
    response_model=CategoryRead,
    summary="Update a category (admin)",
)
def update_existing_category(
    category_id: int,
    updates: CategoryUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> dict:
    """Admin-only: Update an existing category."""
    category = get_category_by_id(session, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # If slug is being changed, check for duplicates
    if updates.slug and updates.slug != category.slug:
        if get_category_by_slug(session, updates.slug):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Category with slug '{updates.slug}' already exists",
            )

    return update_category(session, category, updates)


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a category (admin)",
)
def delete_existing_category(
    category_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> None:
    """
    Admin-only: Soft-delete a category.

    The category is marked inactive, not removed from the database,
    because existing products may reference it.
    """
    category = get_category_by_id(session, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    delete_category(session, category)
