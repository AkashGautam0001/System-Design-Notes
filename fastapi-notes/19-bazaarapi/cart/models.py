# ============================================================
# BazaarAPI — Cart Models
# ============================================================
# The shopping cart is where browsing becomes buying.
#
# Design: Each CartItem row = one product in one user's cart.
# The cart itself isn't a table — it's a virtual collection
# of CartItems belonging to a user.
#
# CartResponse aggregates items + calculates total for display.
# ============================================================

from datetime import datetime, timezone
from typing import Optional, List

from sqlmodel import SQLModel, Field


class CartItem(SQLModel, table=True):
    """A single item in a user's shopping cart."""

    __tablename__ = "cart_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    product_id: int = Field(foreign_key="products.id")
    quantity: int = Field(default=1, ge=1)
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --- Request / Response Schemas ---


class CartItemCreate(SQLModel):
    """Schema for adding an item to cart."""
    product_id: int
    quantity: int = Field(default=1, ge=1)


class CartItemRead(SQLModel):
    """Schema for cart item responses (includes product name/price for display)."""
    id: int
    product_id: int
    product_name: str = ""
    product_price: float = 0.0
    quantity: int
    subtotal: float = 0.0


class CartItemUpdate(SQLModel):
    """Schema for updating cart item quantity."""
    quantity: int = Field(ge=1)


class CartResponse(SQLModel):
    """Full cart response — items + total."""
    items: List[CartItemRead]
    total: float
    item_count: int
