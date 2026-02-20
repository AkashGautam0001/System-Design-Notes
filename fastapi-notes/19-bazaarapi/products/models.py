# ============================================================
# BazaarAPI — Product Models
# ============================================================
# The product catalog is the heart of any marketplace.
#
# Key design decisions:
#   - price is stored as float (for simplicity; production would use Decimal)
#   - stock tracks inventory count
#   - category_id is a FK to the categories table
#   - ProductList includes pagination metadata for frontend use
# ============================================================

from datetime import datetime, timezone
from typing import Optional, List

from sqlmodel import SQLModel, Field


class Product(SQLModel, table=True):
    """The products table — everything for sale on BazaarAPI."""

    __tablename__ = "products"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    price: float = Field(ge=0)
    stock: int = Field(default=0, ge=0)
    image_url: Optional[str] = Field(default=None, max_length=500)
    category_id: Optional[int] = Field(default=None, foreign_key="categories.id")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default=None)


# --- Request / Response Schemas ---


class ProductCreate(SQLModel):
    """Schema for creating a product (admin only)."""
    name: str = Field(min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    price: float = Field(gt=0)
    stock: int = Field(default=0, ge=0)
    image_url: Optional[str] = Field(default=None, max_length=500)
    category_id: Optional[int] = None


class ProductRead(SQLModel):
    """Schema for product responses."""
    id: int
    name: str
    description: Optional[str] = None
    price: float
    stock: int
    image_url: Optional[str] = None
    category_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class ProductUpdate(SQLModel):
    """Schema for updating a product — all fields optional."""
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    price: Optional[float] = Field(default=None, gt=0)
    stock: Optional[int] = Field(default=None, ge=0)
    image_url: Optional[str] = Field(default=None, max_length=500)
    category_id: Optional[int] = None
    is_active: Optional[bool] = None


class PaginationMeta(SQLModel):
    """Pagination metadata for list responses."""
    total: int
    page: int
    per_page: int
    total_pages: int


class ProductList(SQLModel):
    """Paginated product list response."""
    items: List[ProductRead]
    pagination: PaginationMeta
