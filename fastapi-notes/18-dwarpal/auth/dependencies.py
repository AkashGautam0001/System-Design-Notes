# ============================================================
# DwarPal — Auth Dependencies
# ============================================================
# FastAPI dependencies for authentication and authorization.
#
# These are the "guards" that protect your routes:
# - oauth2_scheme: Extracts the Bearer token from the header
# - get_current_user: Verifies the token and returns the User
# - get_current_active_user: Adds an is_active check
# - require_role: Closure-based RBAC dependency factory
# ============================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from auth.models import User, UserRole
from auth.services import decode_token, get_user_by_username
from database import get_session

# OAuth2PasswordBearer tells FastAPI:
# 1. Where the login endpoint is (for Swagger UI "Authorize" button)
# 2. To look for "Authorization: Bearer <token>" in request headers
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    """
    Core authentication dependency.

    1. Extract Bearer token from Authorization header (via oauth2_scheme)
    2. Decode and verify the JWT token
    3. Look up the user in the database
    4. Return the User object

    If any step fails, return 401 Unauthorized.
    """
    token_data = decode_token(token)

    user = get_user_by_username(session, token_data.username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Extended authentication dependency that also checks if the user
    is active. Deactivated users get 403 Forbidden even with a valid token.

    Use this instead of get_current_user when you want to block
    deactivated accounts immediately (without waiting for token expiry).
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    return current_user


def require_role(required_role: UserRole):
    """
    Dependency factory for role-based access control (RBAC).

    Uses Python closures to create a dependency that checks if the
    current user has the required role.

    Usage in routes:
        @router.get("/admin-only")
        def admin_endpoint(user: User = Depends(require_role(UserRole.admin))):
            ...

    How it works:
        1. require_role(UserRole.admin) is called at import time
        2. It returns role_checker (a closure that "remembers" UserRole.admin)
        3. FastAPI calls role_checker at request time
        4. role_checker calls get_current_active_user (which calls get_current_user)
        5. If the user's role doesn't match, raise 403 Forbidden
    """
    def role_checker(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role.value}",
            )
        return current_user
    return role_checker
