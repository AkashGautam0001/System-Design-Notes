# ============================================================
# BazaarAPI — User Services (Business Logic)
# ============================================================
# All user-related business logic lives here.
# Routes should be thin — they call services.
#
# This separation means:
#   - Services can be tested without HTTP
#   - Logic can be reused across routes
#   - Routes stay clean and readable
# ============================================================

from typing import Optional

from passlib.context import CryptContext
from sqlmodel import Session, select

from users.models import User, UserCreate, UserRole

# bcrypt hashing context — same pattern as DwarPal (Chapter 18)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_user_by_email(session: Session, email: str) -> Optional[User]:
    """Look up a user by email. Returns None if not found."""
    return session.exec(select(User).where(User.email == email)).first()


def get_user_by_username(session: Session, username: str) -> Optional[User]:
    """Look up a user by username. Returns None if not found."""
    return session.exec(select(User).where(User.username == username)).first()


def create_user(
    session: Session,
    user_data: UserCreate,
    role: UserRole = UserRole.customer,
) -> User:
    """
    Create a new user in the database.

    Business rules:
    - Email must be unique
    - Username must be unique
    - Password is hashed before storage

    Returns the created User object.
    """
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
        role=role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def authenticate_user(
    session: Session,
    email: str,
    password: str,
) -> Optional[User]:
    """
    Authenticate a user by email and password.

    Returns the User if credentials are valid, None otherwise.
    This is used by the login endpoint.
    """
    user = get_user_by_email(session, email)
    if user is None:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def seed_admin_user(session: Session) -> None:
    """
    Create the default admin user if it doesn't exist.

    Called during app startup (lifespan) to ensure there's
    always at least one admin account.
    """
    from config import settings

    existing = get_user_by_email(session, settings.ADMIN_EMAIL)
    if existing:
        return

    admin_data = UserCreate(
        username="admin",
        email=settings.ADMIN_EMAIL,
        password=settings.ADMIN_PASSWORD,
        full_name="BazaarAPI Admin",
    )
    create_user(session, admin_data, role=UserRole.admin)
