# ============================================================
# BazaarAPI — User Routes
# ============================================================
# Thin routes: validate input, call services, return response.
# Auth endpoints: register, login, get profile, update profile.
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

from database import get_session
from auth.jwt_handler import create_access_token
from auth.dependencies import get_current_active_user
from users.models import (
    User,
    UserCreate,
    UserRead,
    UserUpdate,
    TokenResponse,
)
from users.services import (
    create_user,
    authenticate_user,
    get_user_by_email,
    get_user_by_username,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new customer account",
)
def register(
    user_data: UserCreate,
    session: Session = Depends(get_session),
) -> User:
    """
    Register a new user account.

    - Checks for duplicate email and username
    - Hashes password before storage
    - Default role is 'customer'
    """
    # Check duplicate email
    if get_user_by_email(session, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Check duplicate username
    if get_user_by_username(session, user_data.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    return create_user(session, user_data)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and get JWT token",
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
) -> dict:
    """
    Authenticate with email (as username field) and password.

    Returns a JWT access token on success.
    Uses OAuth2PasswordRequestForm for Swagger UI compatibility.
    """
    user = authenticate_user(session, form_data.username, form_data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get(
    "/me",
    response_model=UserRead,
    summary="Get current user profile",
)
def get_profile(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Return the authenticated user's profile."""
    return current_user


@router.patch(
    "/me",
    response_model=UserRead,
    summary="Update current user profile",
)
def update_profile(
    updates: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> User:
    """
    Update the authenticated user's profile.

    Only provided (non-None) fields are updated.
    Email and password changes are not allowed through this endpoint.
    """
    update_data = updates.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(current_user, field, value)

    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user
