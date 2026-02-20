# ============================================================
# DwarPal — Auth Routes
# ============================================================
# All authentication and authorization endpoints:
#
# PUBLIC:
#   POST /auth/register  — Create a new user account
#   POST /auth/login     — Authenticate and receive JWT token
#
# AUTHENTICATED (any logged-in user):
#   GET  /auth/me            — View own profile
#   GET  /auth/login-history — View own login history
#
# ADMIN ONLY:
#   GET   /auth/users                    — List all users
#   PATCH /auth/users/{user_id}/role     — Change a user's role
#   PATCH /auth/users/{user_id}/deactivate — Deactivate a user
# ============================================================

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from auth.dependencies import get_current_active_user, require_role
from auth.models import (
    LoginRecord,
    Token,
    User,
    UserCreate,
    UserRead,
    UserRole,
)
from auth.services import (
    authenticate_user,
    create_access_token,
    create_user,
    record_login,
)
from config import settings
from database import get_session

router = APIRouter(prefix="/auth", tags=["Authentication"])


# --- PUBLIC ENDPOINTS ---


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(
    user_data: UserCreate,
    session: Session = Depends(get_session),
):
    """
    Register a new user account.

    - Validates input (username length, password length, etc.)
    - Checks for duplicate username and email
    - Hashes the password with bcrypt
    - Returns the created user (without password)
    """
    user = create_user(session=session, user_create=user_data)
    return user


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
    request: Request = None,
):
    """
    Authenticate and receive a JWT access token.

    Uses OAuth2 password flow — send username and password as form data.
    On success, returns {"access_token": "...", "token_type": "bearer"}.

    The token must be included in subsequent requests as:
        Authorization: Bearer <access_token>
    """
    user = authenticate_user(
        session=session,
        username=form_data.username,
        password=form_data.password,
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact an administrator.",
        )

    # Create JWT token with username and role
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value},
        expires_delta=access_token_expires,
    )

    # Record the login event (audit trail)
    client_ip = request.client.host if request and request.client else None
    record_login(session=session, user_id=user.id, ip_address=client_ip)

    return Token(access_token=access_token, token_type="bearer")


# --- AUTHENTICATED ENDPOINTS ---


@router.get("/me", response_model=UserRead)
def get_my_profile(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get the current user's profile.
    Requires a valid JWT token in the Authorization header.
    """
    return current_user


@router.get("/login-history")
def get_login_history(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    """
    Get the login history for the current user.
    Shows all login events with timestamps and IP addresses.
    Like checking the DwarPal's register for your own entries.
    """
    records = session.exec(
        select(LoginRecord)
        .where(LoginRecord.user_id == current_user.id)
        .order_by(LoginRecord.login_at.desc())  # type: ignore[arg-type]
    ).all()
    return records


# --- ADMIN-ONLY ENDPOINTS ---


@router.get("/users", response_model=list[UserRead])
def list_users(
    current_user: User = Depends(require_role(UserRole.admin)),
    session: Session = Depends(get_session),
):
    """
    List all registered users.
    Admin only — regular users cannot see other users' data.
    """
    users = session.exec(select(User)).all()
    return users


@router.patch("/users/{user_id}/role", response_model=UserRead)
def change_user_role(
    user_id: int,
    new_role: UserRole,
    current_user: User = Depends(require_role(UserRole.admin)),
    session: Session = Depends(get_session),
):
    """
    Change a user's role (admin, user, visitor).
    Admin only — prevents privilege escalation by regular users.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent admin from demoting themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role",
        )

    user.role = new_role
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.patch("/users/{user_id}/deactivate", response_model=UserRead)
def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_role(UserRole.admin)),
    session: Session = Depends(get_session),
):
    """
    Deactivate a user account.
    Admin only — the user won't be able to log in or access any endpoints.
    Their existing tokens will still be valid until expiry, but the
    get_current_active_user dependency will block them.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent admin from deactivating themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account",
        )

    user.is_active = False
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
