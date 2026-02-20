/** ============================================================
 *  FILE 15 — JWT Authentication from Scratch
 *  Topic: Build JWT sign/verify, auth middleware, RBAC
 *  WHY THIS MATTERS: JWTs are the dominant token format for
 *  stateless authentication. Building one from scratch with
 *  Node's crypto module reveals there's no magic — just
 *  base64 encoding and HMAC signing. Understanding the
 *  internals lets you debug token issues, choose proper
 *  expiry times, and avoid common security pitfalls.
 *  ============================================================ */

// ── THE STORY ──────────────────────────────────────────────
// DigiLocker Authentication
// At DigiLocker (the govt document wallet), Officer Meena
// issues digitally signed access passes (tokens). Each pass
// has three parts: a cover describing the document type
// (header), pages with the holder's name, Aadhaar reference,
// and expiry (payload), and an official digital stamp that
// only DigiLocker can produce (signature). Service counters
// (auth middleware) don't call DigiLocker HQ to verify —
// they check the stamp locally. If someone tampers with the
// pages, the stamp won't match, and the pass is rejected.
// When it expires, the holder must return for a renewal
// (refresh token). Protected routes = accessing your
// marksheet, PAN card, or driving licence.
// ───────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');
const crypto = require('crypto');

// ============================================================
// BLOCK 1 — Build JWT Sign & Verify from Scratch
// ============================================================
//
// JWT structure:  header.payload.signature
//
// 1. Header:    { "alg": "HS256", "typ": "JWT" }
// 2. Payload:   { "sub": "user123", "iat": 1234567890, ... }
// 3. Signature: HMAC-SHA256(base64url(header) + "." + base64url(payload), secret)
//
// The entire token: base64url(header) + "." + base64url(payload) + "." + signature
//
// WHY: The signature proves the payload hasn't been tampered with.
// Anyone can DECODE a JWT (it's just base64), but only someone
// with the secret can FORGE a valid signature.
// (See nodejs-notes/09 for crypto fundamentals)

const JWT_SECRET = 'digilocker-seal-ultra-secret-key-2025';
const REFRESH_SECRET = 'digilocker-refresh-seal-even-more-secret';

// ── Base64URL encoding/decoding ────────────────────────────
// WHY: Standard base64 uses +, /, and = which are problematic
// in URLs and HTTP headers. Base64URL replaces + with -,
// / with _, and strips trailing = padding.
function base64UrlEncode(data) {
  let str;
  if (typeof data === 'string') {
    str = Buffer.from(data, 'utf8').toString('base64');
  } else {
    // For objects, JSON-stringify first
    str = Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
  }
  // WHY: Replace base64 chars that are URL-unsafe
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(str) {
  // WHY: Reverse the URL-safe replacements before decoding
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add back padding
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

// ── HMAC-SHA256 Signature ──────────────────────────────────
// WHY: HMAC (Hash-based Message Authentication Code) combines
// a secret key with the message to produce a signature that
// can only be reproduced by someone who has the same secret.
function createSignature(headerB64, payloadB64, secret) {
  const data = `${headerB64}.${payloadB64}`;
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

// ── JWT Sign (create a token) ──────────────────────────────
function jwtSign(payload, secret, options = {}) {
  const {
    expiresIn = 3600  // Default: 1 hour in seconds
  } = options;

  // Step 1: Create the header
  // WHY: The header declares the algorithm. Verifiers use this
  // to know HOW to check the signature. We hardcode HS256 to
  // avoid the "alg: none" attack where a malicious token claims
  // no signature is needed.
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // Step 2: Add standard claims to payload
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,                     // Issued At — when the token was created
    exp: now + expiresIn          // Expiration — when the token dies
  };

  // Step 3: Base64URL encode header and payload
  const headerB64 = base64UrlEncode(header);
  const payloadB64 = base64UrlEncode(fullPayload);

  // Step 4: Create the signature
  const signature = createSignature(headerB64, payloadB64, secret);

  // Step 5: Concatenate with dots
  // WHY: The dot-separated format is the JWT standard (RFC 7519).
  // It's a single string that can be sent in an HTTP header.
  return `${headerB64}.${payloadB64}.${signature}`;
}

// ── JWT Verify (validate and decode a token) ────────────────
function jwtVerify(token, secret) {
  // Step 1: Split the token into its three parts
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Token must have 3 parts (header.payload.signature)' };
  }

  const [headerB64, payloadB64, providedSignature] = parts;

  // Step 2: Decode the header and check the algorithm
  let header;
  try {
    header = JSON.parse(base64UrlDecode(headerB64));
  } catch (e) {
    return { valid: false, error: 'Invalid header encoding' };
  }

  // WHY: ALWAYS check the algorithm. The "alg: none" attack
  // tricks servers into skipping signature verification.
  if (header.alg !== 'HS256') {
    return { valid: false, error: `Unsupported algorithm: ${header.alg}` };
  }

  // Step 3: Recompute the signature and compare
  const expectedSignature = createSignature(headerB64, payloadB64, secret);

  // WHY: timingSafeEqual prevents timing attacks. A naive
  // string comparison (===) returns faster when the first
  // chars differ, leaking info about the correct signature.
  const sigBuffer = Buffer.from(providedSignature);
  const expBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return { valid: false, error: 'Invalid signature — token may have been tampered with' };
  }

  // Step 4: Decode the payload
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64));
  } catch (e) {
    return { valid: false, error: 'Invalid payload encoding' };
  }

  // Step 5: Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    return { valid: false, error: 'Token has expired', expired: true };
  }

  // All checks passed
  return { valid: true, payload };
}

// ── JWT Decode (without verification — for inspection) ─────
// WHY: Sometimes you need to read the payload without verifying
// (e.g., to check expiry before sending a refresh request).
// NEVER trust decoded-but-unverified data for authorization.
function jwtDecode(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    return {
      header: JSON.parse(base64UrlDecode(parts[0])),
      payload: JSON.parse(base64UrlDecode(parts[1]))
    };
  } catch (e) {
    return null;
  }
}

// ============================================================
// BLOCK 2 — Auth Middleware, Login Route, Protected Routes
// ============================================================
//
// The standard flow:
// 1. Client POSTs credentials (Aadhaar OTP) to /login
// 2. Server validates, creates JWT, returns it
// 3. Client includes JWT in future requests:
//      Authorization: Bearer <token>
// 4. Auth middleware extracts token, verifies, attaches req.user
// 5. Protected routes can use req.user safely
//
// WHY: This is the stateless authentication model used by
// virtually every API. No session store needed — the token
// carries all the info, signed by the server.

// ── Auth middleware ─────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: { message: 'No Authorization header provided' }
    });
  }

  // WHY: The "Bearer" scheme is the standard for token auth (RFC 6750).
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authorization header must use Bearer scheme' }
    });
  }

  const token = authHeader.slice(7);  // Remove "Bearer "

  const result = jwtVerify(token, JWT_SECRET);

  if (!result.valid) {
    const status = result.expired ? 401 : 403;
    // WHY: 401 = "you're not authenticated" (expired/missing token)
    //      403 = "you're authenticated but the token is invalid/forged"
    return res.status(status).json({
      success: false,
      error: {
        message: result.error,
        ...(result.expired && { code: 'TOKEN_EXPIRED' })
      }
    });
  }

  // WHY: Attach the verified payload to req.user so route
  // handlers can access user info without re-verifying.
  req.user = result.payload;
  next();
}

// ============================================================
// BLOCK 3 — Token Expiry, Refresh Tokens, Role-Based Access
// ============================================================
//
// Refresh token pattern:
//   - Access token: short-lived (15 min), used for API calls
//   - Refresh token: long-lived (7 days), used ONLY to get new access tokens
//   - When access token expires, client sends refresh token to /refresh
//   - Server verifies refresh token, issues new access token
//
// WHY: Short access tokens limit damage if stolen. The refresh
// token is only sent to one endpoint, reducing exposure.
//
// Role-Based Access Control (RBAC):
//   - Each user has a role (admin, editor, viewer)
//   - Middleware checks if req.user.role is allowed
//   - Unauthorized → 403 Forbidden

// ── In-memory refresh token store ──────────────────────────
// WHY: Refresh tokens must be stored server-side so they can
// be revoked (e.g., on logout). Access tokens are stateless.
const refreshTokenStore = new Map();

// ── RBAC middleware factory ────────────────────────────────
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // WHY: 403 Forbidden — you're authenticated but not
      // authorized. "I know who you are, but you can't do this."
      return res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
        }
      });
    }

    next();
  };
}

// ============================================================
// BUILD THE APP
// ============================================================
function buildApp() {
  const app = express();
  app.use(express.json());

  // Simulated user database
  const users = {
    meena:    { password: 'digilocker123', role: 'admin',  fullName: 'Officer Meena' },
    anand:    { password: 'aadhaar456',    role: 'editor', fullName: 'Anand Verma' },
    suresh:   { password: 'citizen789',    role: 'viewer', fullName: 'Suresh Kumar' }
  };

  // ── Block 2: Login — issue access + refresh tokens ────────

  app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'username and password are required' }
      });
    }

    const user = users[username];
    if (!user || user.password !== password) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials' }
      });
    }

    // Create access token (short-lived)
    // WHY: 15 minutes is a common access token lifespan.
    // Short enough to limit damage if stolen, long enough
    // to avoid constant refreshing.
    const accessToken = jwtSign(
      { sub: username, role: user.role, name: user.fullName },
      JWT_SECRET,
      { expiresIn: 900 }  // 15 minutes
    );

    // Create refresh token (long-lived)
    const refreshToken = jwtSign(
      { sub: username, type: 'refresh' },
      REFRESH_SECRET,
      { expiresIn: 604800 }  // 7 days
    );

    // Store refresh token server-side
    // WHY: This allows us to revoke it on logout.
    refreshTokenStore.set(refreshToken, {
      username,
      createdAt: Date.now()
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: 900,
        tokenType: 'Bearer'
      }
    });
  });

  // ── Block 3: Refresh — exchange refresh token for new access token ──

  app.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { message: 'refreshToken is required' }
      });
    }

    // Check if refresh token exists in store (not revoked)
    if (!refreshTokenStore.has(refreshToken)) {
      return res.status(401).json({
        success: false,
        error: { message: 'Refresh token not found or revoked' }
      });
    }

    // Verify the refresh token's signature and expiry
    const result = jwtVerify(refreshToken, REFRESH_SECRET);
    if (!result.valid) {
      refreshTokenStore.delete(refreshToken);  // Clean up invalid token
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid refresh token: ' + result.error }
      });
    }

    const username = result.payload.sub;
    const user = users[username];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User no longer exists' }
      });
    }

    // Issue new access token
    // WHY: The refresh token stays the same until it expires
    // or the user logs out. Only the access token is replaced.
    const newAccessToken = jwtSign(
      { sub: username, role: user.role, name: user.fullName },
      JWT_SECRET,
      { expiresIn: 900 }
    );

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: 900,
        tokenType: 'Bearer'
      }
    });
  });

  // ── Block 2: Logout — revoke refresh token ────────────────

  app.post('/logout', authMiddleware, (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // WHY: Deleting from the store means the refresh token
      // can never be used again, even if it hasn't expired.
      refreshTokenStore.delete(refreshToken);
    }

    res.json({
      success: true,
      data: { message: `${req.user.name} logged out successfully` }
    });
  });

  // ── Block 2: Protected routes ─────────────────────────────

  // Any authenticated user can access
  app.get('/profile', authMiddleware, (req, res) => {
    res.json({
      success: true,
      data: {
        user: req.user,
        message: `Welcome, ${req.user.name}!`
      }
    });
  });

  // ── Block 3: Role-based routes ─────────────────────────────

  // Only admins
  app.get('/admin/dashboard', authMiddleware, requireRole('admin'), (req, res) => {
    res.json({
      success: true,
      data: {
        message: 'Admin dashboard',
        stats: { users: 3, activeSessions: refreshTokenStore.size }
      }
    });
  });

  // Admins and editors
  app.post('/documents', authMiddleware, requireRole('admin', 'editor'), (req, res) => {
    res.json({
      success: true,
      data: {
        message: `Document created by ${req.user.name} (${req.user.role})`,
        documentId: crypto.randomUUID()
      }
    });
  });

  // All roles (including viewer)
  app.get('/documents', authMiddleware, requireRole('admin', 'editor', 'viewer'), (req, res) => {
    res.json({
      success: true,
      data: {
        documents: [
          { id: 1, title: 'Class X Marksheet' },
          { id: 2, title: 'PAN Card #ABCDE1234F' }
        ]
      }
    });
  });

  // Token inspection endpoint (for debugging)
  app.post('/inspect-token', (req, res) => {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: { message: 'token is required' } });
    }

    const decoded = jwtDecode(token);
    if (!decoded) {
      return res.status(400).json({ success: false, error: { message: 'Invalid token format' } });
    }

    const verified = jwtVerify(token, JWT_SECRET);

    res.json({
      success: true,
      data: {
        header: decoded.header,
        payload: decoded.payload,
        signatureValid: verified.valid,
        expired: verified.expired || false,
        error: verified.error || null
      }
    });
  });

  return app;
}

// ============================================================
// SELF-TEST — Full JWT authentication flow
// ============================================================
async function runTests() {
  const app = buildApp();

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const base = `http://localhost:${port}`;
    console.log(`[15-jwt-authentication] Server on port ${port}\n`);

    try {
      // ── Block 1: JWT Sign & Verify ─────────────────────────

      console.log('=== Block 1 — JWT Sign & Verify from Scratch ===\n');

      // Create a token manually
      const testToken = jwtSign(
        { sub: 'test-user', role: 'admin', name: 'Test User' },
        JWT_SECRET,
        { expiresIn: 3600 }
      );

      console.log('Created JWT:');
      console.log('  Full token:', testToken.substring(0, 50) + '...');
      // Output: Full token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
      console.log('  Parts:', testToken.split('.').length);
      // Output: Parts: 3
      console.log('');

      // Decode without verification
      const decoded = jwtDecode(testToken);
      console.log('Decoded (no verification):');
      console.log('  Header:', JSON.stringify(decoded.header));
      // Output: Header: {"alg":"HS256","typ":"JWT"}
      console.log('  Payload sub:', decoded.payload.sub);
      // Output: Payload sub: test-user
      console.log('  Payload role:', decoded.payload.role);
      // Output: Payload role: admin
      console.log('  Has iat:', typeof decoded.payload.iat === 'number');
      // Output: Has iat: true
      console.log('  Has exp:', typeof decoded.payload.exp === 'number');
      // Output: Has exp: true
      console.log('');

      // Verify valid token
      const verifyResult = jwtVerify(testToken, JWT_SECRET);
      console.log('Verify (correct secret):');
      console.log('  Valid:', verifyResult.valid);
      // Output: Valid: true
      console.log('  Payload name:', verifyResult.payload.name);
      // Output: Payload name: Test User
      console.log('');

      // Verify with wrong secret
      const wrongResult = jwtVerify(testToken, 'wrong-secret');
      console.log('Verify (wrong secret):');
      console.log('  Valid:', wrongResult.valid);
      // Output: Valid: false
      console.log('  Error:', wrongResult.error);
      // Output: Error: Invalid signature — token may have been tampered with
      console.log('');

      // Verify tampered token
      const parts = testToken.split('.');
      const tamperedPayload = base64UrlEncode({ sub: 'hacker', role: 'admin', iat: 0, exp: 9999999999 });
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      const tamperedResult = jwtVerify(tamperedToken, JWT_SECRET);
      console.log('Verify (tampered payload):');
      console.log('  Valid:', tamperedResult.valid);
      // Output: Valid: false
      console.log('  Error:', tamperedResult.error);
      // Output: Error: Invalid signature — token may have been tampered with
      console.log('');

      // Verify expired token
      const expiredToken = jwtSign(
        { sub: 'expired-user' },
        JWT_SECRET,
        { expiresIn: -10 }  // Already expired
      );
      const expiredResult = jwtVerify(expiredToken, JWT_SECRET);
      console.log('Verify (expired token):');
      console.log('  Valid:', expiredResult.valid);
      // Output: Valid: false
      console.log('  Error:', expiredResult.error);
      // Output: Error: Token has expired
      console.log('  Expired flag:', expiredResult.expired);
      // Output: Expired flag: true
      console.log('');

      // ── Block 2: Login, Protected Routes ───────────────────

      console.log('=== Block 2 — Login & Protected Routes ===\n');

      // Access protected route without token → 401
      const r1 = await fetch(`${base}/profile`);
      const j1 = await r1.json();
      console.log('GET /profile (no token)');
      console.log('Status:', r1.status);
      // Output: Status: 401
      console.log('Error:', j1.error.message);
      // Output: Error: No Authorization header provided
      console.log('');

      // Login as admin (meena)
      const r2 = await fetch(`${base}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'meena', password: 'digilocker123' })
      });
      const j2 = await r2.json();
      console.log('POST /login (meena — admin)');
      console.log('Status:', r2.status);
      // Output: Status: 200
      console.log('Token type:', j2.data.tokenType);
      // Output: Token type: Bearer
      console.log('Expires in:', j2.data.expiresIn, 'seconds');
      // Output: Expires in: 900 seconds
      console.log('Has access token:', !!j2.data.accessToken);
      // Output: Has access token: true
      console.log('Has refresh token:', !!j2.data.refreshToken);
      // Output: Has refresh token: true
      console.log('');

      const adminToken = j2.data.accessToken;
      const adminRefresh = j2.data.refreshToken;

      // Access profile with valid token
      const r3 = await fetch(`${base}/profile`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const j3 = await r3.json();
      console.log('GET /profile (with admin token)');
      console.log('Status:', r3.status);
      // Output: Status: 200
      console.log('User:', j3.data.user.name);
      // Output: User: Officer Meena
      console.log('Role:', j3.data.user.role);
      // Output: Role: admin
      console.log('');

      // Invalid credentials → 401
      const r4 = await fetch(`${base}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'meena', password: 'wrong' })
      });
      const j4 = await r4.json();
      console.log('POST /login (wrong password)');
      console.log('Status:', r4.status);
      // Output: Status: 401
      console.log('');

      // Inspect token
      const r5 = await fetch(`${base}/inspect-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminToken })
      });
      const j5 = await r5.json();
      console.log('POST /inspect-token');
      console.log('Algorithm:', j5.data.header.alg);
      // Output: Algorithm: HS256
      console.log('Subject:', j5.data.payload.sub);
      // Output: Subject: meena
      console.log('Signature valid:', j5.data.signatureValid);
      // Output: Signature valid: true
      console.log('');

      // ── Block 3: RBAC, Refresh, Expiry ─────────────────────

      console.log('=== Block 3 — RBAC, Refresh, Token Expiry ===\n');

      // Login as viewer (suresh)
      const r6 = await fetch(`${base}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'suresh', password: 'citizen789' })
      });
      const j6 = await r6.json();
      const viewerToken = j6.data.accessToken;
      const viewerRefresh = j6.data.refreshToken;
      console.log('POST /login (suresh — viewer)');
      console.log('Status:', r6.status);
      // Output: Status: 200
      console.log('');

      // Viewer accessing admin route → 403
      const r7 = await fetch(`${base}/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${viewerToken}` }
      });
      const j7 = await r7.json();
      console.log('GET /admin/dashboard (viewer token)');
      console.log('Status:', r7.status);
      // Output: Status: 403
      console.log('Error:', j7.error.message);
      // Output: Error: Access denied. Required role: admin. Your role: viewer
      console.log('');

      // Admin accessing admin route → 200
      const r8 = await fetch(`${base}/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const j8 = await r8.json();
      console.log('GET /admin/dashboard (admin token)');
      console.log('Status:', r8.status);
      // Output: Status: 200
      console.log('Dashboard:', j8.data.message);
      // Output: Dashboard: Admin dashboard
      console.log('');

      // Viewer trying to create document → 403
      const r9 = await fetch(`${base}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${viewerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: 'Test Doc' })
      });
      const j9 = await r9.json();
      console.log('POST /documents (viewer — no create permission)');
      console.log('Status:', r9.status);
      // Output: Status: 403
      console.log('');

      // Viewer reading documents → 200 (viewer can read)
      const r10 = await fetch(`${base}/documents`, {
        headers: { 'Authorization': `Bearer ${viewerToken}` }
      });
      const j10 = await r10.json();
      console.log('GET /documents (viewer — read allowed)');
      console.log('Status:', r10.status);
      // Output: Status: 200
      console.log('Documents:', j10.data.documents.length);
      // Output: Documents: 2
      console.log('');

      // Login as editor (anand)
      const r11 = await fetch(`${base}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'anand', password: 'aadhaar456' })
      });
      const j11 = await r11.json();
      const editorToken = j11.data.accessToken;

      // Editor creating document → 200 (editor can create)
      const r12 = await fetch(`${base}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${editorToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: 'New Marksheet' })
      });
      const j12 = await r12.json();
      console.log('POST /documents (editor — create allowed)');
      console.log('Status:', r12.status);
      // Output: Status: 200
      console.log('Created by:', j12.data.message);
      // Output: Created by: Document created by Anand Verma (editor)
      console.log('');

      // ── Refresh token flow ─────────────────────────────────

      console.log('── Refresh Token Flow ──\n');

      // WHY: We wait 1 second so the new token's `iat` timestamp
      // differs from the original, producing a visibly different token.
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Use refresh token to get new access token
      const r13 = await fetch(`${base}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: adminRefresh })
      });
      const j13 = await r13.json();
      console.log('POST /refresh (admin refresh token)');
      console.log('Status:', r13.status);
      // Output: Status: 200
      console.log('New access token received:', !!j13.data.accessToken);
      // Output: New access token received: true
      console.log('Token different from original:', j13.data.accessToken !== adminToken);
      // Output: Token different from original: true
      console.log('');

      // Verify new token works
      const newToken = j13.data.accessToken;
      const r14 = await fetch(`${base}/profile`, {
        headers: { 'Authorization': `Bearer ${newToken}` }
      });
      const j14 = await r14.json();
      console.log('GET /profile (with refreshed token)');
      console.log('Status:', r14.status);
      // Output: Status: 200
      console.log('User:', j14.data.user.name);
      // Output: User: Officer Meena
      console.log('');

      // Logout — revoke refresh token
      const r15 = await fetch(`${base}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: adminRefresh })
      });
      const j15 = await r15.json();
      console.log('POST /logout (revoke refresh token)');
      console.log('Message:', j15.data.message);
      // Output: Message: Officer Meena logged out successfully
      console.log('');

      // Try to use revoked refresh token → 401
      const r16 = await fetch(`${base}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: adminRefresh })
      });
      const j16 = await r16.json();
      console.log('POST /refresh (revoked refresh token)');
      console.log('Status:', r16.status);
      // Output: Status: 401
      console.log('Error:', j16.error.message);
      // Output: Error: Refresh token not found or revoked
      console.log('');

      // ── Expired token test via inspect ─────────────────────
      const shortToken = jwtSign(
        { sub: 'temp', role: 'viewer' },
        JWT_SECRET,
        { expiresIn: -1 }  // Already expired
      );
      const r17 = await fetch(`${base}/inspect-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: shortToken })
      });
      const j17 = await r17.json();
      console.log('POST /inspect-token (expired token)');
      console.log('Signature valid:', j17.data.signatureValid);
      // Output: Signature valid: false
      console.log('Expired:', j17.data.expired);
      // Output: Expired: true

    } catch (err) {
      console.error('Test error:', err.message);
    } finally {
      server.close(() => {
        console.log('\n── Server closed ──');

        // ── KEY TAKEAWAYS ─────────────────────────────────────
        // 1. A JWT is just three base64url-encoded strings joined
        //    by dots: header.payload.signature. No magic.
        //
        // 2. The signature is an HMAC-SHA256 hash of the header
        //    and payload using a secret key. Tampering with the
        //    payload invalidates the signature.
        //
        // 3. ALWAYS verify the algorithm in the header. The
        //    "alg: none" attack is real and devastating.
        //
        // 4. Use crypto.timingSafeEqual for signature comparison
        //    to prevent timing attacks.
        //
        // 5. Access tokens are short-lived (15 min) and stateless.
        //    Refresh tokens are long-lived (7 days) and stored
        //    server-side so they can be revoked.
        //
        // 6. RBAC middleware checks req.user.role against allowed
        //    roles. Chain it after authMiddleware: first verify
        //    identity, then check permissions.
        //
        // 7. Anyone can DECODE a JWT. Only the server can VERIFY
        //    it. Never put secrets in the payload — it's base64,
        //    not encryption.
      });
    }
  });
}

runTests();
