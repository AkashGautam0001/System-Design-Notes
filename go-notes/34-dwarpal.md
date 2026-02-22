# Chapter 34 — DwarPal: Auth Gateway
## *The Doorkeeper of the Trading Bazaar*

> **Dwar** (द्वार) = Gate/Door &nbsp;|&nbsp; **Pal** (पाल) = Keeper/Guardian
>
> Every trader entering Zerodha's bazaar must pass through the dwar.
> DwarPal checks their identity, stamps their token, and decides which
> stalls they may visit. No token, no entry. Expired token? Step aside
> and get a fresh stamp.

---

## Why This Chapter?

Authentication is the **single most security-critical** piece of any API.
Get it wrong and you expose user data, financial transactions, or worse.
This chapter builds a production-style auth gateway using:

| Concern | Tool | Why |
|---|---|---|
| Routing | Chi | Lightweight, `net/http` compatible, middleware-first |
| Database | SQLite (modernc) | Zero-dependency, pure-Go, perfect for learning |
| Tokens | JWT (HMAC-SHA256) | Stateless, scalable, industry standard |
| Passwords | bcrypt | Timing-safe, adaptive cost, battle-tested |

---

## Core Concepts

### 1. Why JWT for Stateless Auth (vs Sessions)

**Session-based auth** stores state on the server — every request hits
a session store (Redis, DB) to look up "who is this user?"

**JWT-based auth** encodes the user's identity *inside* the token itself.
The server just validates the signature — no database lookup needed per
request.

```
Session Flow:                       JWT Flow:
┌────────┐   cookie/sid   ┌────┐   ┌────────┐  Bearer token  ┌────┐
│ Client │ ─────────────→ │ DB │   │ Client │ ─────────────→ │ Go │
└────────┘                └────┘   └────────┘                └────┘
  (stateful: server remembers)       (stateless: token carries info)
```

**Trade-offs:**
- JWT: No server-side storage, but you cannot easily revoke a token
  before it expires (hence short expiry + refresh tokens).
- Sessions: Easy revocation, but every request needs a store lookup.

For Zerodha's trading API, we choose JWT — thousands of concurrent
traders making rapid API calls benefit from stateless verification.

### 2. Password Hashing with bcrypt

**Never store plain-text passwords.** Not even encrypted — use a
one-way hash.

**Why bcrypt over SHA-256?**
- bcrypt is *intentionally slow* (adaptive cost factor)
- Each hash includes a random salt (no rainbow tables)
- `CompareHashAndPassword` is **timing-safe** — it takes the same time
  whether the password is wrong at byte 1 or byte 30, preventing
  timing attacks

**Cost Factor:**
- Cost 10 → ~100ms (development)
- Cost 12 → ~300ms (production — good balance)
- Cost 14 → ~1s (high security, but slows login)

```go
// The cost factor is the exponent: 2^cost iterations
hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
```

### 3. RBAC — Role-Based Access Control

DwarPal assigns each user a **role**:

| Role | Access |
|---|---|
| `trader` | Own profile, place orders, view portfolio |
| `admin` | Everything above + list all users, manage system |

The middleware chain enforces this:

```
Request → JWTAuth middleware → RequireRole("admin") → Handler
                 ↓                      ↓
          "Who are you?"        "Are you allowed?"
```

### 4. Middleware-Based Auth in Go

Go's `net/http` middleware pattern wraps handlers:

```go
func JWTAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 1. Extract token from Authorization header
        // 2. Validate token signature and expiry
        // 3. Store claims in request context
        // 4. Call next.ServeHTTP(w, r) — or reject with 401
    })
}
```

Chi's `r.Group` + `r.Use` makes this elegant:

```go
r.Group(func(r chi.Router) {
    r.Use(middleware.JWTAuth)          // all routes here require auth
    r.Get("/api/users/me", handler.HandleMe)

    r.Group(func(r chi.Router) {
        r.Use(middleware.RequireRole("admin"))  // nested: also need admin
        r.Get("/api/admin/users", handler.HandleListUsers)
    })
})
```

### 5. Token Refresh Strategy

```
Timeline:
├── Login ──────────────────────────────────────────────────────┤
│   Access Token (15 min)  │          EXPIRED                   │
│   Refresh Token ─────────────────── (7 days) ────────────────│
│                          │                                    │
│                    Client uses refresh token                  │
│                    to get NEW access + refresh                │
│                    (old refresh is REVOKED)                   │
```

**Why two tokens?**
- **Access token**: Short-lived (15 min), sent with every API call.
  If stolen, the window of abuse is small.
- **Refresh token**: Long-lived (7 days), stored securely by client,
  used *only* to get new access tokens. Stored hashed in the DB so
  we can revoke it.

**Refresh token rotation**: Every time a refresh token is used, we
issue a *new* refresh token and revoke the old one. If an attacker
tries to reuse a revoked token, we know the pair was compromised.

### 6. Security Best Practices

1. **Never log passwords or tokens** — even in debug mode
2. **Use crypto/rand, not math/rand** — for refresh tokens and secrets
3. **Hash refresh tokens before storing** — if the DB leaks, tokens
   are useless to attackers
4. **Short access token expiry** — 15 minutes is a good default
5. **HTTPS in production** — JWT over HTTP is like whispering secrets
   in a crowded bazaar
6. **Validate all inputs** — email format, password length, role values
7. **Use constant-time comparison** — bcrypt does this; never roll
   your own password check
8. **Set proper CORS headers** — browsers enforce same-origin policy

---

## API Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/auth/register` | No | — | Create a new trader/admin account |
| POST | `/api/auth/login` | No | — | Authenticate and receive token pair |
| POST | `/api/auth/refresh` | No* | — | Exchange refresh token for new pair |
| GET | `/api/users/me` | Yes | any | Get current user's profile |
| GET | `/api/admin/users` | Yes | admin | List all registered users |

*Refresh endpoint uses the refresh token in the request body, not the
Authorization header.

---

## Project Structure

```
34-dwarpal/
├── main.go                          # Entry point: config, router, server
├── go.mod
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── internal/
    ├── config/config.go             # App configuration from env
    ├── model/user.go                # Data types: User, requests, claims
    ├── store/user_store.go          # SQLite: users + refresh_tokens tables
    ├── auth/
    │   ├── jwt.go                   # JWT generation & validation
    │   └── password.go              # bcrypt hashing & verification
    ├── handler/auth_handler.go      # HTTP handlers for all endpoints
    └── middleware/
        ├── auth_middleware.go       # JWT auth & role-check middleware
        └── middleware.go            # Logger, CORS, common middleware
```

---

## Running the Project

```bash
# 1. Set environment variables
export JWT_SECRET=$(openssl rand -hex 32)
export PORT=8081

# 2. Run
cd 34-dwarpal
go run main.go

# 3. Test
# Register
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"kiran@zerodha.com","password":"TradeSafe123!","role":"trader"}'

# Login
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kiran@zerodha.com","password":"TradeSafe123!"}'

# Access protected route (use the access_token from login response)
curl http://localhost:8081/api/users/me \
  -H "Authorization: Bearer <access_token>"

# Refresh tokens
curl -X POST http://localhost:8081/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<refresh_token>"}'
```

---

## Key Takeaways

1. **Stateless auth scales** — JWT eliminates per-request DB lookups
   for identity verification, critical for high-throughput systems
   like stock trading APIs.

2. **Defense in depth** — bcrypt for passwords, short-lived JWTs for
   access, hashed refresh tokens in the DB, role-based middleware.
   No single layer is the "security layer" — they all work together.

3. **Middleware is Go's superpower** — the `func(http.Handler) http.Handler`
   pattern composes cleanly. Auth, logging, CORS — each is a single
   function that wraps the next.

4. **Context carries request-scoped data** — after the JWT middleware
   validates a token, it stores claims in `r.Context()`. Downstream
   handlers retrieve it without coupling to the auth mechanism.

5. **Refresh token rotation prevents replay** — every refresh
   invalidates the old token. If an attacker replays a revoked token,
   you know the chain is compromised.

6. **Never roll your own crypto** — use `crypto/rand` for randomness,
   `bcrypt` for passwords, `golang-jwt` for tokens. The Go ecosystem
   provides battle-tested libraries for every piece.

7. **Separation of concerns** — config, models, store, auth, handlers,
   and middleware each live in their own package. Changing the database
   from SQLite to PostgreSQL only touches `store/`. Swapping JWT for
   Paseto only touches `auth/`.

---

*In the next chapter, we build BazaarAPI (Ch 35) — the trading
endpoints that sit behind DwarPal's gate. The bazaar opens only
for those who carry a valid token.*
