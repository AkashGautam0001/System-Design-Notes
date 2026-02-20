/** ============================================================
 *  FILE 25: DigiLocker Dwar — Authentication Server Project
 *  WHY THIS MATTERS: Authentication is the backbone of every
 *  production API.  This capstone builds JWT auth from scratch
 *  using only Node's built-in crypto module — no third-party
 *  JWT libraries.  You'll see password hashing, token creation,
 *  token verification, refresh token rotation, role-based
 *  access control, and session invalidation — all in one file.
 *  ============================================================ */

// ─── The Gateway That Checks Every Aadhaar Card ──────────────
//
// Kavita ran a DigiLocker-style document vault.  Anyone could
// walk in, download Aadhaar cards, mark-sheets, and land
// records, and walk out.  "We need a dwar (gateway)," she said,
// "that checks WHO you are (authentication), WHAT you're
// allowed to do (authorization), and remembers you so you don't
// flash your Aadhaar every second (sessions)."
//
// Her head of security built DigiLocker Dwar — a system where
// every naagrik (citizen) registers, receives a cryptographic
// badge (JWT), and presents it at every door (middleware).  Some
// doors open for everyone; others only for admins.
//
// This file IS that DigiLocker Dwar.

const express = require('express');
const crypto = require('crypto');

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Configuration & In-Memory Stores
// ════════════════════════════════════════════════════════════════

// ─── JWT secret & timing ──────────────────────────────────────
// WHY: In production these come from environment variables.
// We use short expiry times here so we can test expiration.

const JWT_SECRET = crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = 60;          // 60 seconds for access token
const REFRESH_EXPIRES_IN = 300;     // 5 minutes for refresh token

// ─── In-memory stores ─────────────────────────────────────────
// WHY: These replace a real database.  The patterns (hashing,
// token storage, blacklisting) transfer directly to production.

const users = [];                   // { id, username, passwordHash, salt, role }
const refreshTokens = new Map();    // tokenId -> { userId, expiresAt }
const blacklistedTokens = new Set();// token IDs invalidated by logout

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Password Hashing with crypto.scrypt
// ════════════════════════════════════════════════════════════════

// ─── Why scrypt? ──────────────────────────────────────────────
// WHY: scrypt is a memory-hard key derivation function built into
// Node's crypto module.  It's resistant to GPU/ASIC brute-force
// attacks — unlike SHA-256 or even bcrypt at low work factors.

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    // WHY: keylen 64 produces a 512-bit hash — plenty of security
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve({ hash: derivedKey.toString('hex'), salt });
    });
  });
}

function verifyPassword(password, hash, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      // WHY: timingSafeEqual prevents timing attacks that could
      // reveal how many bytes matched before a mismatch
      resolve(crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        derivedKey
      ));
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SECTION 3 — JWT Implementation from Scratch
// ════════════════════════════════════════════════════════════════

// ─── Why build JWT by hand? ───────────────────────────────────
// WHY: Understanding JWT internals (header.payload.signature)
// makes you a better debugger and security thinker.  In
// production, use the 'jsonwebtoken' package — but knowing
// what it does under the hood is invaluable.

function base64urlEncode(data) {
  // WHY: base64url replaces +/= with -/_ for URL-safe transport
  return Buffer.from(JSON.stringify(data))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(str) {
  // WHY: reverse the URL-safe replacements before decoding
  const padded = str + '='.repeat((4 - str.length % 4) % 4);
  return JSON.parse(Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
}

function createJWT(payload, expiresIn = JWT_EXPIRES_IN) {
  const header = { alg: 'HS256', typ: 'JWT' };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,                      // WHY: issued-at for auditing
    exp: now + expiresIn,          // WHY: auto-expiry limits damage from stolen tokens
    jti: crypto.randomUUID(),      // WHY: unique token ID for blacklisting
  };

  const headerEncoded = base64urlEncode(header);
  const payloadEncoded = base64urlEncode(fullPayload);
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  // WHY: HMAC-SHA256 ensures the token hasn't been tampered with
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return { token: `${signatureInput}.${signature}`, payload: fullPayload };
}

function verifyJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Malformed token' };

    const [headerEnc, payloadEnc, signatureEnc] = parts;

    // ── Step 1: Verify signature ───────────────────────────
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerEnc}.${payloadEnc}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (expectedSig !== signatureEnc) {
      return { valid: false, error: 'Invalid signature' };
    }

    // ── Step 2: Decode payload ─────────────────────────────
    const payload = base64urlDecode(payloadEnc);

    // ── Step 3: Check expiration ───────────────────────────
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    // ── Step 4: Check blacklist ────────────────────────────
    if (blacklistedTokens.has(payload.jti)) {
      return { valid: false, error: 'Token has been revoked' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Token verification failed' };
  }
}

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Refresh Token Management
// ════════════════════════════════════════════════════════════════

// ─── Why refresh tokens? ──────────────────────────────────────
// WHY: Short-lived access tokens limit damage from theft, but
// re-authenticating every minute is annoying.  Refresh tokens
// let the client silently get a new access token without
// re-entering credentials.  Rotation (issuing a new refresh
// token each time) detects token reuse attacks.

function createRefreshToken(userId) {
  const tokenId = crypto.randomUUID();
  const expiresAt = Date.now() + REFRESH_EXPIRES_IN * 1000;
  refreshTokens.set(tokenId, { userId, expiresAt });
  return tokenId;
}

function verifyRefreshToken(tokenId) {
  const stored = refreshTokens.get(tokenId);
  if (!stored) return { valid: false, error: 'Refresh token not found' };
  if (stored.expiresAt < Date.now()) {
    refreshTokens.delete(tokenId);
    return { valid: false, error: 'Refresh token expired' };
  }
  return { valid: true, userId: stored.userId };
}

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Auth Middleware
// ════════════════════════════════════════════════════════════════

// ─── JWT verification middleware ──────────────────────────────
// WHY: This middleware sits in front of protected routes.  It
// extracts the Bearer token, verifies it, and attaches the
// decoded user to req.user — so handlers can trust req.user.

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Provide Bearer token.',
    });
  }

  const token = authHeader.slice(7);  // WHY: strip "Bearer " prefix
  const result = verifyJWT(token);

  if (!result.valid) {
    return res.status(401).json({
      success: false,
      error: result.error,
    });
  }

  req.user = result.payload;
  req.tokenJti = result.payload.jti;
  next();
}

// ─── Role-based access middleware factory ──────────────────────
// WHY: Some routes should only be accessible to admins.  This
// factory creates middleware that checks req.user.role against
// an allowed list.

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
}

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Route Handlers
// ════════════════════════════════════════════════════════════════

function createApp() {
  const app = express();
  app.use(express.json());

  const authRouter = express.Router();

  // ─── POST /auth/register — Create new naagrik ─────────────
  authRouter.post('/register', async (req, res) => {
    try {
      const { username, password, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required',
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters',
        });
      }

      // WHY: Check for duplicate usernames
      if (users.find(u => u.username === username)) {
        return res.status(409).json({
          success: false,
          error: 'Username already exists',
        });
      }

      const { hash, salt } = await hashPassword(password);
      const user = {
        id: crypto.randomUUID(),
        username,
        passwordHash: hash,
        salt,
        role: role === 'admin' ? 'admin' : 'user',  // WHY: default to 'user' for safety
        createdAt: new Date().toISOString(),
      };

      users.push(user);

      res.status(201).json({
        success: true,
        data: { id: user.id, username: user.username, role: user.role },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Registration failed' });
    }
  });

  // ─── POST /auth/login — Authenticate and return tokens ───
  authRouter.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required',
        });
      }

      const user = users.find(u => u.username === username);
      if (!user) {
        // WHY: Generic message prevents username enumeration
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      const passwordValid = await verifyPassword(password, user.passwordHash, user.salt);
      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // WHY: Access token for API calls, refresh token for renewal
      const { token: accessToken } = createJWT({
        sub: user.id,
        username: user.username,
        role: user.role,
      });
      const refreshToken = createRefreshToken(user.id);

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: { id: user.id, username: user.username, role: user.role },
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Login failed' });
    }
  });

  // ─── GET /auth/profile — Protected route ─────────────────
  authRouter.get('/profile', authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.user.sub);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  });

  // ─── POST /auth/refresh — Token rotation ─────────────────
  authRouter.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    const result = verifyRefreshToken(refreshToken);
    if (!result.valid) {
      return res.status(401).json({
        success: false,
        error: result.error,
      });
    }

    // WHY: Delete old refresh token — this is "rotation"
    // If an attacker reuses the old token, it will fail
    refreshTokens.delete(refreshToken);

    const user = users.find(u => u.id === result.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { token: newAccessToken } = createJWT({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    const newRefreshToken = createRefreshToken(user.id);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  });

  // ─── POST /auth/logout — Invalidate tokens ───────────────
  authRouter.post('/logout', authMiddleware, (req, res) => {
    // WHY: Blacklist the JWT ID so it can't be reused
    blacklistedTokens.add(req.user.jti);
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  });

  // ─── GET /auth/admin — Admin-only route ──────────────────
  authRouter.get('/admin', authMiddleware, requireRole('admin'), (req, res) => {
    res.json({
      success: true,
      data: {
        message: 'Welcome to the admin panel',
        userCount: users.length,
        activeRefreshTokens: refreshTokens.size,
      },
    });
  });

  // ─── GET /auth/users — Admin: list all naagrik ────────────
  authRouter.get('/users', authMiddleware, requireRole('admin'), (req, res) => {
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
    }));
    res.json({ success: true, data: safeUsers });
  });

  app.use('/auth', authRouter);

  // ─── 404 catch-all ───────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  return app;
}

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Self-Test Suite
// ════════════════════════════════════════════════════════════════

async function runTests(baseURL) {
  const results = [];
  let testNum = 0;

  async function test(name, fn) {
    testNum++;
    try {
      await fn();
      results.push({ num: testNum, name, pass: true });
      console.log(`  [PASS] Test ${testNum}: ${name}`);
    } catch (err) {
      results.push({ num: testNum, name, pass: false, error: err.message });
      console.log(`  [FAIL] Test ${testNum}: ${name} — ${err.message}`);
    }
  }

  function assert(condition, msg) {
    if (!condition) throw new Error(msg);
  }

  async function req(method, path, body = null, headers = {}) {
    const url = `${baseURL}${path}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    const data = await res.json();
    return { status: res.status, body: data };
  }

  console.log('\n  DigiLocker Dwar Auth — Test Suite');
  console.log('  ' + '─'.repeat(50));

  // ── Shared state for tests ───────────────────────────────
  let accessToken = '';
  let refreshTokenVal = '';
  let adminAccessToken = '';

  // ── Test 1: Register a regular naagrik ────────────────────
  await test('Register naagrik "ananya"', async () => {
    const { status, body } = await req('POST', '/auth/register', {
      username: 'ananya', password: 'aadhaar123',
    });
    assert(status === 201, `Expected 201, got ${status}`);
    assert(body.data.username === 'ananya', 'Username should be ananya');
    assert(body.data.role === 'user', 'Default role should be user');
  });

  // ── Test 2: Register an admin naagrik ─────────────────────
  await test('Register admin "vikash"', async () => {
    const { status, body } = await req('POST', '/auth/register', {
      username: 'vikash', password: 'admin_pass1', role: 'admin',
    });
    assert(status === 201, `Expected 201, got ${status}`);
    assert(body.data.role === 'admin', 'Role should be admin');
  });

  // ── Test 3: Duplicate username rejected ──────────────────
  await test('Duplicate username returns 409', async () => {
    const { status } = await req('POST', '/auth/register', {
      username: 'ananya', password: 'other_password',
    });
    assert(status === 409, `Expected 409, got ${status}`);
  });

  // ── Test 4: Short password rejected ──────────────────────
  await test('Short password returns 400', async () => {
    const { status } = await req('POST', '/auth/register', {
      username: 'deepak', password: '123',
    });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  // ── Test 5: Login with correct credentials ───────────────
  await test('Login ananya — returns tokens', async () => {
    const { status, body } = await req('POST', '/auth/login', {
      username: 'ananya', password: 'aadhaar123',
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.data.accessToken, 'Should return accessToken');
    assert(body.data.refreshToken, 'Should return refreshToken');
    assert(body.data.user.username === 'ananya', 'User should be ananya');
    accessToken = body.data.accessToken;
    refreshTokenVal = body.data.refreshToken;
  });

  // ── Test 6: Login with wrong password ────────────────────
  await test('Login with wrong password returns 401', async () => {
    const { status, body } = await req('POST', '/auth/login', {
      username: 'ananya', password: 'wrong_password',
    });
    assert(status === 401, `Expected 401, got ${status}`);
    assert(body.error === 'Invalid credentials', 'Should say invalid credentials');
  });

  // ── Test 7: Access profile with valid token ──────────────
  await test('GET /auth/profile with valid token', async () => {
    const { status, body } = await req('GET', '/auth/profile', null, {
      Authorization: `Bearer ${accessToken}`,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.data.username === 'ananya', 'Should return ananya profile');
  });

  // ── Test 8: Access profile without token ─────────────────
  await test('GET /auth/profile without token returns 401', async () => {
    const { status } = await req('GET', '/auth/profile');
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // ── Test 9: Access profile with invalid token ────────────
  await test('GET /auth/profile with bad token returns 401', async () => {
    const { status } = await req('GET', '/auth/profile', null, {
      Authorization: 'Bearer invalid.token.here',
    });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // ── Test 10: Refresh token rotation ──────────────────────
  await test('POST /auth/refresh rotates tokens', async () => {
    const { status, body } = await req('POST', '/auth/refresh', {
      refreshToken: refreshTokenVal,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.data.accessToken, 'Should return new accessToken');
    assert(body.data.refreshToken, 'Should return new refreshToken');
    assert(body.data.refreshToken !== refreshTokenVal, 'Refresh token should rotate');
    // WHY: Update for subsequent tests
    accessToken = body.data.accessToken;
    refreshTokenVal = body.data.refreshToken;
  });

  // ── Test 11: Old refresh token is invalid ────────────────
  await test('Old refresh token rejected after rotation', async () => {
    const { status } = await req('POST', '/auth/refresh', {
      refreshToken: 'old-token-that-does-not-exist',
    });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // ── Test 12: Admin login ─────────────────────────────────
  await test('Login admin vikash', async () => {
    const { status, body } = await req('POST', '/auth/login', {
      username: 'vikash', password: 'admin_pass1',
    });
    assert(status === 200, `Expected 200, got ${status}`);
    adminAccessToken = body.data.accessToken;
  });

  // ── Test 13: Admin route — admin can access ──────────────
  await test('Admin can access GET /auth/admin', async () => {
    const { status, body } = await req('GET', '/auth/admin', null, {
      Authorization: `Bearer ${adminAccessToken}`,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.data.message.includes('admin panel'), 'Should mention admin panel');
    assert(body.data.userCount === 2, 'Should have 2 users');
  });

  // ── Test 14: Regular naagrik blocked from admin route ─────
  await test('Regular naagrik blocked from GET /auth/admin', async () => {
    const { status, body } = await req('GET', '/auth/admin', null, {
      Authorization: `Bearer ${accessToken}`,
    });
    assert(status === 403, `Expected 403, got ${status}`);
    assert(body.error.includes('Access denied'), 'Should say access denied');
  });

  // ── Test 15: Admin can list naagrik ──────────────────────
  await test('Admin can list all naagrik', async () => {
    const { status, body } = await req('GET', '/auth/users', null, {
      Authorization: `Bearer ${adminAccessToken}`,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.data.length === 2, 'Should list 2 users');
    // WHY: Ensure passwords are NOT exposed
    assert(!body.data[0].passwordHash, 'Should not expose password hash');
  });

  // ── Test 16: Logout invalidates token ────────────────────
  await test('POST /auth/logout invalidates token', async () => {
    const { status, body } = await req('POST', '/auth/logout', null, {
      Authorization: `Bearer ${accessToken}`,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.data.message.includes('Logged out'), 'Should confirm logout');
  });

  // ── Test 17: Token rejected after logout ─────────────────
  await test('Token rejected after logout', async () => {
    const { status, body } = await req('GET', '/auth/profile', null, {
      Authorization: `Bearer ${accessToken}`,
    });
    assert(status === 401, `Expected 401, got ${status}`);
    assert(body.error.includes('revoked'), 'Should say token revoked');
  });

  // ── Summary ──────────────────────────────────────────────
  console.log('  ' + '─'.repeat(50));
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`  Results: ${passed} passed, ${failed} failed out of ${results.length} tests`);
  if (failed > 0) {
    console.log('  Failed tests:');
    results.filter(r => !r.pass).forEach(r => {
      console.log(`    - Test ${r.num}: ${r.name} — ${r.error}`);
    });
  }
}

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Start Server, Run Tests, Shut Down
// ════════════════════════════════════════════════════════════════

async function main() {
  console.log('============================================================');
  console.log(' FILE 25 — DigiLocker Dwar: Authentication Server Project');
  console.log('============================================================');

  const app = createApp();

  const server = app.listen(0, async () => {
    const { port } = server.address();
    const baseURL = `http://127.0.0.1:${port}`;
    console.log(`\n  DigiLocker Dwar running on ${baseURL}`);

    try {
      await runTests(baseURL);
    } catch (err) {
      console.error('  Test suite error:', err.message);
    } finally {
      server.close(() => {
        console.log('\n  Server closed. DigiLocker Dwar tests complete.\n');

        // ── KEY TAKEAWAYS ──────────────────────────────────
        console.log('  KEY TAKEAWAYS');
        console.log('  ' + '─'.repeat(50));
        console.log('  1. crypto.scrypt is a memory-hard hash function');
        console.log('     built into Node — no npm packages needed.');
        console.log('  2. JWT = base64url(header).base64url(payload)');
        console.log('     .HMAC-SHA256-signature — three dot-separated parts.');
        console.log('  3. Short-lived access tokens + refresh token');
        console.log('     rotation balances security and usability.');
        console.log('  4. Token blacklisting (by jti) enables logout');
        console.log('     for stateless JWTs.');
        console.log('  5. Role-based access middleware is a factory:');
        console.log('     requireRole("admin") returns middleware.');
        console.log('  6. timingSafeEqual prevents timing attacks when');
        console.log('     comparing hashes or signatures.');
        console.log('  7. Never expose passwordHash or salt in API');
        console.log('     responses — map to safe objects before sending.');
        console.log('  8. Generic "Invalid credentials" messages prevent');
        console.log('     username enumeration attacks.');
        process.exit(0);
      });
    }
  });
}

main();
