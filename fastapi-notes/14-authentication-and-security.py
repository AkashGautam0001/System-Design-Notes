"""
============================================================
FILE 14: AUTHENTICATION, JWT TOKENS, AND SECURITY
============================================================
Topics: auth vs authz, password hashing, passlib, bcrypt,
        user registration, OAuth2 password flow, Bearer tokens,
        JWT structure, python-jose, token creation/verification,
        get_current_user, protected routes, RBAC, refresh tokens

WHY THIS MATTERS:
Every API that stores user data needs authentication. Without
it, anyone can read anyone's data, delete accounts, or make
purchases. Authentication is not optional — it is the first
thing auditors and pen-testers check.
============================================================
"""

# STORY: DigiLocker — 150M Citizens, Aadhaar OTP to JWT
# DigiLocker is India's official document wallet, used by 150M+
# citizens to store Aadhaar, PAN, driving license, and mark
# sheets. A user authenticates via Aadhaar OTP, receives a JWT
# token, and then uses that token to access their documents.
# Every API call is verified — the JWT proves "this is Rahul,
# and he can only see HIS documents." A single auth bug would
# expose 150 million citizens' personal documents. This is why
# authentication must be done right.

from typing import Optional
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field

# ════════════════════════════════════════════════════════════
# SECTION 1 — Authentication vs Authorization
# ════════════════════════════════════════════════════════════

# WHY: These are two different things that people constantly
# confuse. Getting the terminology right matters for system
# design and security reviews.

# AUTHENTICATION (AuthN): "Who are you?"
#   - Verifying identity: username + password, OTP, biometrics
#   - Result: "This request is from Rahul Sharma"
#   - Analogy: Showing your Aadhaar card at the airport
#
# AUTHORIZATION (AuthZ): "What can you do?"
#   - Checking permissions: can this user delete posts? access admin?
#   - Result: "Rahul is a regular user, not an admin"
#   - Analogy: Your boarding pass says economy, not business class
#
# Flow: Authenticate first -> then Authorize
# DigiLocker: OTP proves identity (AuthN), role check ensures
# a citizen cannot access another citizen's docs (AuthZ)


# ════════════════════════════════════════════════════════════
# SECTION 2 — Password Hashing with Passlib + Bcrypt
# ════════════════════════════════════════════════════════════

# WHY: NEVER store plain-text passwords. If your database leaks,
# hashed passwords are useless to attackers. Bcrypt is the gold
# standard — it is slow on purpose, making brute force attacks
# impractical.

# In production, install: pip install "passlib[bcrypt]"
# For this teaching file, we simulate the hashing interface
# so the file compiles without optional dependencies.

# --- What production code looks like ---
# from passlib.context import CryptContext
#
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
#
# def hash_password(password: str) -> str:
#     return pwd_context.hash(password)
#
# def verify_password(plain: str, hashed: str) -> bool:
#     return pwd_context.verify(plain, hashed)

# --- Simulated version for compilation ---

import hashlib


def hash_password(password: str) -> str:
    """
    Hash a password. In production, use bcrypt via passlib.
    This SHA-256 version is for TEACHING ONLY — never use
    SHA-256 for passwords in production (too fast to brute force).
    """
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hash."""
    return hash_password(plain_password) == hashed_password


# Key points about hashing:
# 1. Same password always produces same hash (deterministic)
# 2. You CANNOT reverse a hash to get the password
# 3. With bcrypt, same password produces DIFFERENT hashes (salting)
# 4. bcrypt.verify handles the salt comparison internally


# ════════════════════════════════════════════════════════════
# SECTION 3 — User Model and Registration
# ════════════════════════════════════════════════════════════

# WHY: The user model stores the hashed password, never the
# plain text. Registration hashes the password before saving.

# --- User schemas ---

class UserCreate(BaseModel):
    """Schema for user registration."""
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(min_length=5)
    password: str = Field(min_length=8, description="Min 8 characters")
    full_name: str = Field(default="")


class UserResponse(BaseModel):
    """Schema for user in responses — NO password field."""
    id: int
    username: str
    email: str
    full_name: str
    is_active: bool
    role: str


class UserInDB(BaseModel):
    """Internal model with hashed password — never sent to client."""
    id: int
    username: str
    email: str
    full_name: str
    is_active: bool = True
    role: str = "user"
    hashed_password: str


# --- Simulated database ---
fake_users_db: dict = {}
user_id_counter = 0


# ════════════════════════════════════════════════════════════
# SECTION 4 — OAuth2 Password Flow Overview
# ════════════════════════════════════════════════════════════

# WHY: OAuth2 is an industry standard for authentication. FastAPI
# has built-in support for the "password" flow, which is perfect
# for first-party apps (your own frontend calling your own API).

# OAuth2 Password Flow:
# 1. Client sends username + password to /auth/login
# 2. Server verifies credentials, returns JWT
# 3. Client includes token: Authorization: Bearer <token>
# 4. Server verifies token on each request
#
# Why JWT? Stateless, contains user info, signed, expires.

# --- OAuth2PasswordBearer ---
# This tells FastAPI: "tokens come from /auth/login endpoint"
# It also creates the lock icon in Swagger docs.

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# When you use oauth2_scheme as a dependency, FastAPI:
# 1. Looks for "Authorization: Bearer <token>" header
# 2. Extracts the token string
# 3. Passes it to your dependency function
# 4. Returns 401 if header is missing


# ════════════════════════════════════════════════════════════
# SECTION 5 — JWT Tokens Explained
# ════════════════════════════════════════════════════════════

# WHY: JWT is the token format used by 90%+ of modern APIs.
# Understanding its structure helps you debug auth issues and
# make informed security decisions.

# JWT Structure: header.payload.signature
# HEADER: {"alg": "HS256", "typ": "JWT"}  (base64 encoded)
# PAYLOAD: {"sub": "rahul", "role": "citizen", "exp": 1709283600}
# SIGNATURE: HMAC_SHA256(base64(header) + "." + base64(payload), secret)
#
# Important: Payload is NOT encrypted — anyone can decode it.
# The signature only prevents TAMPERING, not reading.
# Never put sensitive data (passwords, Aadhaar numbers) in JWT.

# --- JWT Configuration ---

JWT_SECRET_KEY = "digilocker-super-secret-key-change-in-production"
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


# ════════════════════════════════════════════════════════════
# SECTION 6 — Creating and Verifying JWT Tokens
# ════════════════════════════════════════════════════════════

# WHY: The login endpoint creates tokens, and the auth
# middleware verifies them. Both operations must be correct
# or your entire security model breaks.

# In production, use python-jose or PyJWT:
#   pip install python-jose[cryptography]
#   from jose import JWTError, jwt
#   encoded = jwt.encode(payload, SECRET, algorithm="HS256")
#   decoded = jwt.decode(token, SECRET, algorithms=["HS256"])

# --- Simulated JWT for compilation (base64-based, NOT secure) ---

import json
import base64
import hmac


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a simulated JWT token.
    In production, use python-jose or PyJWT.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire.isoformat(),
        "iat": datetime.now(timezone.utc).isoformat(),
    })

    # Simulated encoding (base64 payload + HMAC signature)
    payload_bytes = base64.urlsafe_b64encode(
        json.dumps(to_encode).encode()
    ).decode()
    signature = hmac.new(
        JWT_SECRET_KEY.encode(),
        payload_bytes.encode(),
        hashlib.sha256,
    ).hexdigest()

    return f"{payload_bytes}.{signature}"


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a simulated JWT token.
    In production, use python-jose or PyJWT.
    """
    try:
        parts = token.split(".")
        if len(parts) != 2:
            raise ValueError("Invalid token format")

        payload_bytes, signature = parts

        # Verify signature
        expected_signature = hmac.new(
            JWT_SECRET_KEY.encode(),
            payload_bytes.encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            raise ValueError("Invalid signature")

        # Decode payload
        payload = json.loads(base64.urlsafe_b64decode(payload_bytes))

        # Check expiration
        exp = datetime.fromisoformat(payload["exp"])
        if datetime.now(timezone.utc) > exp:
            raise ValueError("Token expired")

        return payload

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# --- Token Response Schema ---

class Token(BaseModel):
    """Response schema for login endpoint."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int = ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds


class TokenData(BaseModel):
    """Decoded token data."""
    username: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[str] = None


# ════════════════════════════════════════════════════════════
# SECTION 7 — get_current_user Dependency
# ════════════════════════════════════════════════════════════

# WHY: This is the CORE dependency that every protected endpoint
# uses. It extracts the token, decodes it, and returns the user.
# If the token is invalid, it raises 401 immediately.

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    """
    Core authentication dependency.
    Chain: Request -> OAuth2PasswordBearer -> decode -> user lookup
    """
    # Decode the token
    payload = decode_access_token(token)

    username = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Look up user in database
    user = fake_users_db.get(username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return UserInDB(**user)


async def get_current_active_user(
    current_user: UserInDB = Depends(get_current_user),
) -> UserInDB:
    """
    Extends get_current_user — also checks that user is active.
    Disabled accounts get rejected even with valid tokens.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )
    return current_user


# ════════════════════════════════════════════════════════════
# SECTION 8 — Role-Based Access Control (RBAC)
# ════════════════════════════════════════════════════════════

# WHY: Authentication says WHO you are. Authorization says WHAT
# you can do. RBAC assigns roles (admin, citizen, verifier) and
# checks them before allowing access to endpoints.

# DigiLocker roles:
# - citizen: can view/download their own documents
# - verifier: can verify a citizen's document (e.g., bank KYC)
# - admin: can manage users, view analytics

def require_role(allowed_roles: list):
    """
    Factory that creates a role-checking dependency.
    Usage: Depends(require_role(["admin", "verifier"]))
    """
    async def role_checker(
        current_user: UserInDB = Depends(get_current_active_user),
    ) -> UserInDB:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' not authorized. "
                       f"Required: {allowed_roles}",
            )
        return current_user
    return role_checker


# Convenience dependencies for common role checks
require_admin = require_role(["admin"])
require_citizen = require_role(["citizen", "admin"])
require_verifier = require_role(["verifier", "admin"])


# ════════════════════════════════════════════════════════════
# SECTION 9 — Complete Auth API
# ════════════════════════════════════════════════════════════

# WHY: Bringing it all together — register, login, get token,
# access protected routes, role-based endpoints.

app = FastAPI(
    title="DigiLocker Auth API",
    description="Authentication and authorization for India's digital document wallet",
    version="1.0.0",
)


# --- Registration Endpoint ---

@app.post("/auth/register", response_model=UserResponse, status_code=201)
def register(user_data: UserCreate):
    """
    Register a new user.
    1. Check if username/email already exists
    2. Hash the password
    3. Store in database
    4. Return user (without password)
    """
    global user_id_counter

    # Check for existing user
    if user_data.username in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    # Check for existing email
    for existing_user in fake_users_db.values():
        if existing_user["email"] == user_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

    # Create user with hashed password
    user_id_counter += 1
    hashed = hash_password(user_data.password)
    user_record = {
        "id": user_id_counter,
        "username": user_data.username,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "is_active": True,
        "role": "citizen",  # Default role
        "hashed_password": hashed,
    }
    fake_users_db[user_data.username] = user_record

    return UserResponse(**user_record)


# --- Login Endpoint ---

@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login with username + password, receive JWT token.
    Uses OAuth2PasswordRequestForm which expects:
    - username (form field)
    - password (form field)
    - grant_type (optional, defaults to "password")
    """
    # Look up user
    user = fake_users_db.get(form_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if account is active
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    # Create token with user info in payload
    access_token = create_access_token(
        data={
            "sub": user["username"],
            "user_id": user["id"],
            "role": user["role"],
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return Token(access_token=access_token)


# --- Protected Endpoints ---

@app.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user: UserInDB = Depends(get_current_active_user),
):
    """
    Get current user's profile.
    Requires valid JWT token in Authorization header.
    """
    return UserResponse(**current_user.model_dump())


@app.get("/my-documents")
async def get_my_documents(
    current_user: UserInDB = Depends(require_citizen),
):
    """
    Get current user's documents.
    Only citizens and admins can access this.
    """
    return {
        "user": current_user.username,
        "documents": [
            {"type": "Aadhaar", "id": "XXXX-XXXX-1234", "status": "verified"},
            {"type": "PAN", "id": "ABCDE1234F", "status": "verified"},
            {"type": "Driving License", "id": "DL-1234567890", "status": "pending"},
        ],
    }


# --- Admin-Only Endpoints ---

@app.get("/admin/users")
async def admin_list_users(
    current_user: UserInDB = Depends(require_admin),
):
    """
    List all users — admin only.
    A citizen trying to access this gets 403 Forbidden.
    """
    users = [
        UserResponse(**u) for u in fake_users_db.values()
    ]
    return {"users": users, "total": len(users)}


@app.put("/admin/users/{username}/role")
async def admin_change_role(
    username: str,
    new_role: str,
    current_user: UserInDB = Depends(require_admin),
):
    """Change a user's role — admin only."""
    user = fake_users_db.get(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    valid_roles = ["citizen", "verifier", "admin"]
    if new_role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {valid_roles}",
        )

    user["role"] = new_role
    return {"message": f"User {username} role changed to {new_role}"}


@app.put("/admin/users/{username}/deactivate")
async def admin_deactivate_user(
    username: str,
    current_user: UserInDB = Depends(require_admin),
):
    """Deactivate a user account — admin only."""
    user = fake_users_db.get(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["is_active"] = False
    return {"message": f"User {username} has been deactivated"}


# ════════════════════════════════════════════════════════════
# SECTION 10 — Refresh Tokens and Security Best Practices
# ════════════════════════════════════════════════════════════

# WHY: Access tokens should be short-lived (15-30 min). Refresh
# tokens let users get new access tokens without re-entering
# passwords. This limits the damage window if a token leaks.

# Refresh Token Flow:
# 1. Login returns access_token (30 min) + refresh_token (7 days)
# 2. When access_token expires, client sends refresh_token
# 3. Server returns new access_token without re-login
# 4. If refresh_token expires, user must login again

@app.post("/auth/refresh", response_model=Token)
def refresh_token(refresh_token_str: str):
    """
    Get a new access token using a refresh token.
    In production, refresh tokens are stored in the database
    and can be revoked.
    """
    # Decode refresh token (same process as access token)
    payload = decode_access_token(refresh_token_str)

    # Create new access token
    new_access_token = create_access_token(
        data={
            "sub": payload["sub"],
            "user_id": payload.get("user_id"),
            "role": payload.get("role"),
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=new_access_token)


# --- Security Best Practices ---
# 1. ALWAYS hash passwords with bcrypt (never MD5/SHA/plain text)
# 2. Use HTTPS in production (TLS encrypts tokens in transit)
# 3. Set short access token expiration (15-30 minutes)
# 4. Store refresh tokens server-side for revocation
# 5. Validate JWT signature AND expiration on every request
# 6. Never put sensitive data in JWT payload (base64, not encrypted)
# 7. Implement rate limiting on login endpoint (prevent brute force)
# 8. Use CORS to restrict which domains can call your API
# 9. Validate all input (Pydantic does this for free in FastAPI)


# ════════════════════════════════════════════════════════════
# KEY TAKEAWAYS
# ════════════════════════════════════════════════════════════
# 1. Authentication = who are you; Authorization = what can you do
# 2. ALWAYS hash passwords with bcrypt — never store plain text
# 3. OAuth2PasswordBearer extracts tokens from Authorization header
# 4. JWT = header.payload.signature — payload is NOT encrypted
# 5. get_current_user dependency is the backbone of auth in FastAPI
# 6. Use require_role() factory for clean role-based access control
# 7. Access tokens should be short-lived (15-30 min) with refresh tokens
# 8. Security is layers: hashing + HTTPS + CORS + rate limiting + input validation
# "Security is not a product, but a process." — Bruce Schneier
