# ============================================================
# DwarPal — Auth Services (Business Logic)
# ============================================================
# All authentication logic lives here:
# - Password hashing and verification (bcrypt via passlib)
# - JWT token creation and decoding (python-jose)
# - User CRUD operations (create, find, authenticate)
# - Login recording (audit trail)
#
# Routes call services. Services call the database.
# This separation keeps routes thin and logic testable.
# ============================================================

from datetime import datetime, timedelta

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from auth.models import (
    LoginRecord,
    TokenData,
    User,
    UserCreate,
)
from config import settings

# --- Password Hashing ---
# bcrypt is deliberately slow — this is a FEATURE, not a bug.
# It makes brute-force attacks computationally expensive.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against its bcrypt hash.
    Returns True if they match, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)


# --- JWT Token Operations ---

def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create a JWT access token.

    Args:
        data: Payload to encode (typically {"sub": username, "role": role})
        expires_delta: Custom expiration time. Defaults to settings value.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def decode_token(token: str) -> TokenData:
    """
    Decode and verify a JWT token.

    Raises HTTPException 401 if the token is invalid, expired, or
    missing required claims.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        username: str | None = payload.get("sub")
        role: str | None = payload.get("role")
        if username is None:
            raise credentials_exception
        return TokenData(username=username, role=role)
    except JWTError:
        raise credentials_exception


# --- User Operations ---

def get_user_by_username(session: Session, username: str) -> User | None:
    """Look up a user by their username. Returns None if not found."""
    statement = select(User).where(User.username == username)
    return session.exec(statement).first()


def authenticate_user(
    session: Session,
    username: str,
    password: str,
) -> User | None:
    """
    Authenticate a user by username and password.

    Returns the User if credentials are valid, None otherwise.
    We return None for both "user not found" and "wrong password"
    to prevent username enumeration attacks.
    """
    user = get_user_by_username(session, username)
    if user is None:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_user(session: Session, user_create: UserCreate) -> User:
    """
    Register a new user.

    1. Check for duplicate username
    2. Check for duplicate email
    3. Hash the password
    4. Create and save the User
    5. Return the created User

    Raises HTTPException 400 if username or email already exists.
    """
    # Check duplicate username
    existing_username = session.exec(
        select(User).where(User.username == user_create.username)
    ).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    # Check duplicate email
    existing_email = session.exec(
        select(User).where(User.email == user_create.email)
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user with hashed password
    user = User(
        username=user_create.username,
        email=user_create.email,
        hashed_password=hash_password(user_create.password),
        full_name=user_create.full_name,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def record_login(
    session: Session,
    user_id: int,
    ip_address: str | None = None,
) -> LoginRecord:
    """
    Record a successful login event in the audit trail.
    Like the DwarPal writing in his register.
    """
    record = LoginRecord(
        user_id=user_id,
        ip_address=ip_address,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record
