# ============================================================
# DwarPal — Auth Models
# ============================================================
# Database tables (User, LoginRecord) and request/response
# schemas (UserCreate, UserRead, Token, TokenData).
#
# KEY RULE: Never expose hashed_password in response models.
# ============================================================

from datetime import datetime
from enum import Enum

from sqlmodel import Field, SQLModel


# --- Enums ---

class UserRole(str, Enum):
    """
    Roles determine what a user can access.
    - admin: Full access — manage users, change roles, view all data
    - user: Standard access — view own profile and login history
    - visitor: Limited access — read-only, restricted endpoints
    """
    admin = "admin"
    user = "user"
    visitor = "visitor"


# --- Database Tables ---

class User(SQLModel, table=True):
    """
    The main user table. Stores credentials and profile information.
    The hashed_password field uses bcrypt — NEVER store plain text.
    """
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True, min_length=3, max_length=50)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str = Field(min_length=1, max_length=100)
    role: UserRole = Field(default=UserRole.user)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LoginRecord(SQLModel, table=True):
    """
    Audit trail for login events. Every successful login creates a record.
    Like the DwarPal's visitor register — who came, when, from where.
    """
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    login_at: datetime = Field(default_factory=datetime.utcnow)
    ip_address: str | None = None


# --- Request Schemas ---

class UserCreate(SQLModel):
    """Schema for user registration. Accepts plain password (will be hashed)."""
    username: str = Field(min_length=3, max_length=50)
    email: str
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1, max_length=100)


class UserLogin(SQLModel):
    """Schema for login (used for documentation; actual login uses OAuth2 form)."""
    username: str
    password: str


# --- Response Schemas ---

class UserRead(SQLModel):
    """
    Safe user response — NO password field.
    This is what clients see when they request user data.
    """
    id: int
    username: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class Token(SQLModel):
    """OAuth2 token response after successful login."""
    access_token: str
    token_type: str = "bearer"


class TokenData(SQLModel):
    """Decoded JWT payload — extracted from the token for request processing."""
    username: str | None = None
    role: str | None = None
