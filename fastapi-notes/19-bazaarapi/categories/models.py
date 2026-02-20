# ============================================================
# BazaarAPI — Category Models
# ============================================================
# Categories organize products into browsable groups.
# Think: Electronics, Clothing, Books, Home & Kitchen.
#
# The slug field enables SEO-friendly URLs:
#   /categories/electronics vs /categories/1
# ============================================================

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field


class Category(SQLModel, table=True):
    """The categories table — product organization."""

    __tablename__ = "categories"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    slug: str = Field(index=True, unique=True, max_length=100)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --- Request / Response Schemas ---


class CategoryCreate(SQLModel):
    """Schema for creating a category (admin only)."""
    name: str = Field(min_length=2, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    slug: str = Field(min_length=2, max_length=100)


class CategoryRead(SQLModel):
    """Schema for category responses."""
    id: int
    name: str
    description: Optional[str] = None
    slug: str
    is_active: bool
    created_at: datetime


class CategoryUpdate(SQLModel):
    """Schema for updating a category — all fields optional."""
    name: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    slug: Optional[str] = Field(default=None, max_length=100)
    is_active: Optional[bool] = None
