# ============================================================
# FILE 18: DWARPAL — AUTHENTICATION SYSTEM
# ============================================================
# Topics: User registration, password hashing, JWT, OAuth2,
#         protected routes, role-based access control
#
# WHY THIS MATTERS:
# Every production API needs authentication. DwarPal teaches you
# the complete auth flow — from password hashing to JWT tokens
# to role-based access — patterns you'll use in every project.
# ============================================================


## STORY: The Housing Society Security Guard

In every Indian housing society, there's a "DwarPal" (doorkeeper/security guard).
He checks IDs before letting anyone in, maintains a visitor log, and knows
which residents have special access to facilities like the gym or pool.

DwarPal API works the same way — it checks credentials (login), issues
passes (JWT tokens), and controls who can access what (RBAC). Just like
the guard at Prestige Lakeside Habitat in Bangalore who manages 2000+
residents with different access levels.

Think about what happens when you visit a gated community:

1. **Registration** — You give your name, phone number, and address at the
   front desk. They create an entry in the register. (User registration)
2. **ID Card** — The guard issues you an ID card with your photo, name,
   and flat number. (JWT token creation)
3. **Entry Check** — Every time you enter, the guard checks your ID card.
   No card? No entry. Expired card? Get a new one. (Token verification)
4. **Access Levels** — Residents can use the pool. Only committee members
   can enter the office. The secretary has the master key. (Role-based access)
5. **Visitor Log** — The guard writes down every entry and exit in his
   thick register. Who came, when, and why. (Audit trail)

DwarPal implements ALL of these patterns as a FastAPI application.


---


## SECTION 1 — Project Architecture

### WHY: A well-structured auth system is the foundation of application security.

Authentication is not something you bolt on at the end — it shapes your
entire application. Getting the architecture right from the start saves
you from painful refactors later.

```
18-dwarpal/
├── main.py                  # App entry point, lifespan, router inclusion
├── database.py              # SQLModel engine, session management
├── config.py                # Settings via pydantic-settings (.env support)
├── auth/
│   ├── __init__.py          # Package marker
│   ├── models.py            # SQLModel tables + request/response schemas
│   ├── routes.py            # API endpoints (register, login, me, admin)
│   ├── services.py          # Business logic (hashing, JWT, user CRUD)
│   └── dependencies.py      # FastAPI dependencies (get_current_user, RBAC)
└── requirements.txt         # Project dependencies
```

### Architecture Flow (ASCII Diagram)

```
Client Request
     │
     ▼
┌──────────┐    ┌──────────────┐    ┌────────────┐
│  Routes   │───▶│ Dependencies │───▶│  Services  │
│ (routes.py)   │(dependencies.py)  │(services.py)│
└──────────┘    └──────────────┘    └────────────┘
                       │                    │
                       ▼                    ▼
                ┌──────────┐        ┌────────────┐
                │  Models  │        │  Database   │
                │(models.py)│       │(database.py)│
                └──────────┘        └────────────┘
```

### Key Dependencies

- **fastapi[standard]** — The web framework with all extras
- **sqlmodel** — SQLAlchemy + Pydantic combined (our ORM)
- **passlib[bcrypt]** — Industry-standard password hashing
- **python-jose[cryptography]** — JWT token creation and verification
- **python-multipart** — Required for OAuth2 form-based login
- **pydantic-settings** — Environment variable management
- **uvicorn** — ASGI server to run the application

### Why This Stack?

passlib with bcrypt is the gold standard for password hashing. It's slow
on purpose — bcrypt adds computational cost so that brute-force attacks
take years instead of seconds. python-jose handles JWT encoding and
decoding, and SQLModel gives us type-safe database operations.


---


## SECTION 2 — User Model and Password Hashing

### WHY: Never store plain text passwords — one breach exposes every user.

In 2012, LinkedIn stored passwords in plain SHA-1 hashes. When they got
breached, 117 million passwords were cracked within days. bcrypt prevents
this by adding a random salt and making hashing deliberately slow.

### The User Model

```python
class UserRole(str, Enum):
    admin = "admin"
    user = "user"
    visitor = "visitor"

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str
    role: UserRole = Field(default=UserRole.user)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

Notice: We store `hashed_password`, NEVER `password`. The plain text
password exists only in memory during the registration/login request
and is immediately hashed.

### Password Hashing with bcrypt

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

**How bcrypt works:**
1. Generate a random 16-byte salt
2. Combine salt + password
3. Run the Blowfish cipher 2^12 times (the "cost factor")
4. Output: `$2b$12$salt_here_22_chars...hash_here_31_chars...`

The salt is embedded in the output, so you never need to store it separately.

### Response Models — Never Leak Passwords

```python
class UserRead(SQLModel):
    id: int
    username: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    # NO password field — this is what clients see
```

Always use a separate response model. If you return the User model
directly, the hashed password leaks in the API response.


---


## SECTION 3 — User Registration Flow

### WHY: Registration is the entry point — validate early, hash immediately.

Registration is deceptively simple but has critical security implications.
You must validate input, check for duplicates, hash the password, and
return a safe response — all in one endpoint.

### The Registration Endpoint

```python
@router.post("/register", response_model=UserRead, status_code=201)
def register_user(user_data: UserCreate, session: Session = Depends(get_session)):
    user = create_user(session=session, user_create=user_data)
    return user
```

### What Happens Inside create_user()

1. **Check for duplicate username** — SELECT from users WHERE username = ?
2. **Check for duplicate email** — SELECT from users WHERE email = ?
3. **Hash the password** — bcrypt transforms "MyPass123" into "$2b$12$..."
4. **Create the User object** — With hashed_password, not plain password
5. **Save to database** — session.add(user), session.commit()
6. **Return the user** — Routes converts this to UserRead (no password)

### Duplicate Checking

```python
existing = session.exec(
    select(User).where(User.username == user_create.username)
).first()
if existing:
    raise HTTPException(status_code=400, detail="Username already registered")
```

This prevents two users from having the same username or email. In a
production system, you'd also want rate limiting to prevent registration
spam.


---


## SECTION 4 — JWT Token Creation

### WHY: Stateless tokens let you scale without session stores.

Traditional session-based auth stores session data on the server. With
10 servers behind a load balancer, you need sticky sessions or a shared
session store. JWT tokens contain all the information inside themselves —
any server can verify them without checking a database.

### JWT Structure

A JWT has three parts, separated by dots:

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJyYWh1bCIsInJvbGUiOiJ1c2VyIn0.signature
│                      │                                         │
│  HEADER              │  PAYLOAD                                │  SIGNATURE
│  {"alg": "HS256"}    │  {"sub": "rahul", "role": "user"}      │  HMAC-SHA256
```

### Token Creation

```python
from jose import jwt
from datetime import datetime, timedelta

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=30))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

We put the username in the "sub" (subject) claim and the role for RBAC.
The expiration time ensures tokens don't live forever — even if stolen,
they become useless after 30 minutes.

### Token Decoding

```python
def decode_token(token: str) -> TokenData:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    username: str = payload.get("sub")
    role: str = payload.get("role")
    return TokenData(username=username, role=role)
```

If the token is expired, tampered with, or invalid, python-jose raises
a JWTError, which we catch and convert to a 401 response.


---


## SECTION 5 — Login and Token Issuance

### WHY: OAuth2 password flow is the standard for first-party apps.

FastAPI has built-in support for OAuth2. The OAuth2PasswordRequestForm
expects `username` and `password` as form data (not JSON), which is the
OAuth2 spec requirement.

### The Login Endpoint

```python
@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
    request: Request = None,
):
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value}
    )
    return Token(access_token=access_token, token_type="bearer")
```

### authenticate_user() Flow

1. Look up user by username
2. If not found → return None
3. Verify password with bcrypt
4. If wrong → return None
5. If correct → return User

**Security note:** We return the same error message for "user not found"
and "wrong password". This prevents attackers from knowing which usernames
exist in our system (username enumeration attack).

### Recording the Login

After successful authentication, we record the login event:

```python
record_login(session=session, user_id=user.id, ip_address=client_ip)
```

This creates an audit trail — who logged in, when, and from where.


---


## SECTION 6 — Protected Routes

### WHY: The whole point of auth is protecting resources.

Without protected routes, authentication is useless. FastAPI's dependency
injection system makes it elegant — add a single dependency, and the
route is protected.

### The get_current_user Dependency

```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    token_data = decode_token(token)
    user = get_user_by_username(session, token_data.username)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user
```

**How it works:**
1. `OAuth2PasswordBearer` extracts the token from the `Authorization: Bearer <token>` header
2. `decode_token` verifies and decodes the JWT
3. We look up the user in the database (they might have been deleted)
4. Return the user object — now available in the route function

### Using Protected Routes

```python
@router.get("/me", response_model=UserRead)
def get_my_profile(current_user: User = Depends(get_current_active_user)):
    return current_user
```

That's it. One dependency. If the token is missing, invalid, or expired,
FastAPI automatically returns a 401 response. The route function only
runs if authentication succeeds.

### Active User Check

```python
def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")
    return current_user
```

This adds another layer — even with a valid token, deactivated users
can't access the API. Useful when you need to ban someone without
waiting for their token to expire.


---


## SECTION 7 — Role-Based Access Control

### WHY: Different users need different permissions.

Authentication answers "who are you?" but authorization answers "what
can you do?" A regular user shouldn't be able to delete other users.
Only admins should manage roles. RBAC adds this permission layer.

### The require_role Dependency (Closure Pattern)

```python
def require_role(required_role: UserRole):
    def role_checker(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required role: {required_role.value}",
            )
        return current_user
    return role_checker
```

This is a **dependency factory** — a function that returns a dependency.
It uses Python closures to "remember" the required_role.

### Using RBAC in Routes

```python
@router.get("/users", response_model=list[UserRead])
def list_users(
    current_user: User = Depends(require_role(UserRole.admin)),
    session: Session = Depends(get_session),
):
    users = session.exec(select(User)).all()
    return users
```

Only admins can list all users. If a regular user tries, they get a
403 Forbidden response. The closure pattern means you can create
`require_role(UserRole.admin)`, `require_role(UserRole.user)`, etc.

### Admin-Only Operations

- **List all users** — GET /auth/users (admin only)
- **Change user role** — PATCH /auth/users/{user_id}/role (admin only)
- **Deactivate user** — PATCH /auth/users/{user_id}/deactivate (admin only)

Regular users can only:
- **Register** — POST /auth/register (public)
- **Login** — POST /auth/login (public)
- **View profile** — GET /auth/me (authenticated)
- **Login history** — GET /auth/login-history (authenticated)


---


## SECTION 8 — Visitor Log (Audit Trail)

### WHY: Knowing who accessed what and when is critical for security.

Just like the DwarPal writes down every visitor's entry and exit, our
system records every login event. This is essential for:

- **Security auditing** — Detecting suspicious login patterns
- **Compliance** — Many regulations require access logs
- **Debugging** — "When did this user last log in?"

### The LoginRecord Model

```python
class LoginRecord(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    login_at: datetime = Field(default_factory=datetime.utcnow)
    ip_address: str | None = None
```

### Recording Logins

Every successful login creates a record:

```python
def record_login(session: Session, user_id: int, ip_address: str | None = None):
    record = LoginRecord(user_id=user_id, ip_address=ip_address)
    session.add(record)
    session.commit()
```

### Viewing Login History

Users can see their own login history:

```python
@router.get("/login-history")
def get_login_history(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    records = session.exec(
        select(LoginRecord)
        .where(LoginRecord.user_id == current_user.id)
        .order_by(LoginRecord.login_at.desc())
    ).all()
    return records
```

In a production system, you'd also log:
- Failed login attempts (brute-force detection)
- IP geolocation (detect logins from unusual locations)
- User-Agent (detect logins from new devices)
- Logout events


---


## KEY TAKEAWAYS

1. **Always hash passwords with bcrypt** — never store plaintext. Even
   if your database is breached, bcrypt makes passwords nearly impossible
   to crack.

2. **JWT tokens are stateless** — the server doesn't store session data.
   All information is encoded in the token itself, signed with a secret key.

3. **OAuth2PasswordBearer tells FastAPI where the login endpoint is** — this
   enables the automatic "Authorize" button in Swagger UI.

4. **get_current_user is the most important dependency in auth systems** —
   it's the bridge between "has a token" and "is a real user."

5. **RBAC adds a permission layer on top of authentication** — authentication
   is "who are you?" and authorization is "what can you do?"

6. **Refresh tokens extend sessions without re-entering passwords** — in
   production, you'd add a /refresh endpoint that issues new access tokens.

7. **"Trust, but verify — then verify again."** — The DwarPal of Prestige
   Lakeside Habitat doesn't just check your ID once. He checks it every
   single time you enter.

### What's Next?

With DwarPal, you've learned the complete authentication flow. In a
real-world application, you'd extend this with:
- Refresh tokens for long-lived sessions
- Email verification during registration
- Password reset via email
- Two-factor authentication (2FA)
- OAuth2 with external providers (Google, GitHub)
- Rate limiting on login attempts

DwarPal is your foundation. Every FastAPI project you build from here
will use these same patterns — hash, token, verify, protect, control.
