# ============================================================
# BazaarAPI — Payment Models
# ============================================================
# Tracks Razorpay payment lifecycle.
#
# The payment record links our order to Razorpay's system:
#   - razorpay_order_id: created by us via Razorpay API
#   - razorpay_payment_id: set by Razorpay after customer pays
#   - razorpay_signature: used to verify payment authenticity
#
# NEVER trust the client. Always verify with Razorpay's signature.
# ============================================================

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field


class Payment(SQLModel, table=True):
    """The payments table — links orders to Razorpay transactions."""

    __tablename__ = "payments"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id", index=True)
    razorpay_order_id: str = Field(max_length=100, index=True)
    razorpay_payment_id: Optional[str] = Field(default=None, max_length=100)
    razorpay_signature: Optional[str] = Field(default=None, max_length=500)
    amount: float = Field(ge=0)
    currency: str = Field(default="INR", max_length=3)
    status: str = Field(default="created", max_length=20)  # created, paid, failed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --- Request / Response Schemas ---


class PaymentCreate(SQLModel):
    """Schema for initiating a payment (internal use)."""
    order_id: int
    amount: float
    currency: str = "INR"


class PaymentRead(SQLModel):
    """Schema for payment responses."""
    id: int
    order_id: int
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    amount: float
    currency: str
    status: str
    created_at: datetime


class PaymentVerify(SQLModel):
    """
    Schema for payment verification request.

    The frontend sends these three values after the customer
    completes payment on Razorpay's checkout page.
    """
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class RazorpayOrderResponse(SQLModel):
    """Schema for the Razorpay order creation response."""
    razorpay_order_id: str
    amount: int  # Amount in paise (INR smallest unit)
    currency: str
    key_id: str  # Razorpay key ID (safe to expose to frontend)
