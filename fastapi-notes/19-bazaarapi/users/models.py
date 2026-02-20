# ============================================================
# BazaarAPI — User Models
# ============================================================
# The User table is the foundation of the entire app.
# Every order, cart, and payment links back to a user.
#
# We use separate schemas for Create/Read/Update to control
# exactly what data flows in and out of the API.
# ============================================================

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field


class UserRole(str, Enum):
    """
    Two roles in BazaarAPI:
    - admin: can manage products, categories, view dashboard
    - customer: can browse, cart, order, pay
    """
    admin = "admin"
    customer = "customer"


class User(SQLModel, table=True):
    """The users table — every person on the platform."""

    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, min_length=3, max_length=50)
    email: str = Field(index=True, unique=True, max_length=255)
    hashed_password: str
    full_name: str = Field(max_length=100)
    phone: Optional[str] = Field(default=None, max_length=15)
    role: UserRole = Field(default=UserRole.customer)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --- Request / Response Schemas ---


class UserCreate(SQLModel):
    """Schema for user registration."""
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(max_length=255)
    password: str = Field(min_length=6, max_length=100)
    full_name: str = Field(max_length=100)
    phone: Optional[str] = Field(default=None, max_length=15)


class UserRead(SQLModel):
    """Schema for user responses — never exposes password."""
    id: int
    username: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: datetime


class UserUpdate(SQLModel):
    """Schema for updating user profile — all fields optional."""
    full_name: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=15)


class UserLogin(SQLModel):
    """Schema for login request."""
    email: str
    password: str


class TokenResponse(SQLModel):
    """Schema for login response."""
    access_token: str
    token_type: str = "bearer"
