# ============================================================
# BazaarAPI — Order Models
# ============================================================
# Orders represent the transition from "shopping" to "buying."
#
# Key design:
#   - Order holds the overall info (user, total, status, address)
#   - OrderItem holds per-product details (quantity, price at purchase)
#   - price_at_purchase captures the price when ordered — not the
#     current product price (which may change later)
#   - OrderStatus tracks the lifecycle from placed to delivered
# ============================================================

from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List

from sqlmodel import SQLModel, Field


class OrderStatus(str, Enum):
    """
    Order lifecycle states:
      placed -> paid -> shipped -> delivered
      placed -> cancelled
      paid -> cancelled -> refunded
    """
    placed = "placed"
    paid = "paid"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    refunded = "refunded"


class Order(SQLModel, table=True):
    """The orders table — represents a confirmed purchase."""

    __tablename__ = "orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    total_amount: float = Field(ge=0)
    status: OrderStatus = Field(default=OrderStatus.placed)
    shipping_address: str = Field(max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default=None)


class OrderItem(SQLModel, table=True):
    """Individual items within an order."""

    __tablename__ = "order_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id", index=True)
    product_id: int = Field(foreign_key="products.id")
    quantity: int = Field(ge=1)
    price_at_purchase: float = Field(ge=0)


# --- Request / Response Schemas ---


class OrderCreate(SQLModel):
    """Schema for creating an order (from cart)."""
    shipping_address: str = Field(min_length=10, max_length=500)


class OrderItemRead(SQLModel):
    """Schema for order item responses."""
    id: int
    product_id: int
    product_name: str = ""
    quantity: int
    price_at_purchase: float
    subtotal: float = 0.0


class OrderRead(SQLModel):
    """Schema for order responses."""
    id: int
    user_id: int
    total_amount: float
    status: OrderStatus
    shipping_address: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[OrderItemRead] = []


class OrderStatusUpdate(SQLModel):
    """Schema for updating order status (admin)."""
    status: OrderStatus
