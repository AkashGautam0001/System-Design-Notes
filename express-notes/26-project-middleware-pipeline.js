/** ============================================================
 *  FILE 26: Railway Signal Cabin — Middleware Pipeline Project
 *  WHY THIS MATTERS: Production Express apps stack 5–10
 *  middleware layers BEFORE any route handler runs.  This
 *  capstone builds every common middleware from scratch —
 *  security headers, CORS, rate limiting, logging, body
 *  parsing, validation, 404 handling, and error handling —
 *  so you understand exactly what "npm install helmet" and
 *  "npm install cors" do under the hood.
 *  ============================================================ */

// ─── The Signal Cabin With Seven Levers ──────────────────────
//
// The Rajdhani Express once had a single wooden boom gate at
// Mughalsarai Junction.  Unauthorized locos strolled in, used
// the main line, and left.  The Station Master said:
// "You need LAYERS — a track-clear check (CORS), a speed
// governor (rate limiter), a loco identity check (auth), a
// load inspection (validation), and a log entry at each
// lever (logger)."
//
// He built seven interlocking levers in the signal cabin.
// Every train passed through each one in order.  The junction
// was never breached again.
//
// Express middleware IS those levers: an ordered pipeline
// where each function can inspect, transform, reject, or
// pass the request to the next layer.
//
// This file builds every lever from raw code.

const express = require('express');
const crypto = require('crypto');
const { Buffer } = require('buffer');

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Security Headers Middleware
// ════════════════════════════════════════════════════════════════

// ─── What helmet does — we build it by hand ───────────────────
// WHY: Security headers tell browsers to enable protections.
// helmet npm package sets ~15 headers; we implement the most
// critical ones so you know what each header actually does.

function securityHeaders() {
  return (req, res, next) => {
    // WHY: Prevents MIME-type sniffing — browser trusts Content-Type
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // WHY: Blocks page from loading in an iframe (clickjacking defense)
    res.setHeader('X-Frame-Options', 'DENY');

    // WHY: Enables XSS filter in older browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // WHY: Controls how much referrer info is sent with requests
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // WHY: Prevents Flash/Acrobat from loading data cross-domain
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // WHY: Tells browsers to only use HTTPS for this domain
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // WHY: Content-Security-Policy is the most powerful header —
    // it restricts where scripts, styles, images can load from
    res.setHeader('Content-Security-Policy', "default-src 'self'");

    // WHY: Remove the X-Powered-By header that Express sets by default
    // — it reveals your tech stack to attackers
    res.removeHeader('X-Powered-By');

    next();
  };
}

// ════════════════════════════════════════════════════════════════
// SECTION 2 — CORS Middleware
// ════════════════════════════════════════════════════════════════

// ─── Cross-Origin Resource Sharing from scratch ───────────────
// WHY: Browsers block cross-origin requests by default (Same-Origin
// Policy).  CORS headers tell the browser "this origin is allowed."
// Preflight OPTIONS requests check permissions before the real request.

function corsMiddleware(options = {}) {
  const {
    allowedOrigins = ['*'],
    allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Request-ID'],
    maxAge = 86400,         // WHY: Cache preflight for 24 hours to reduce OPTIONS requests
    credentials = false,
  } = options;

  return (req, res, next) => {
    const origin = req.headers.origin;

    // ── Determine if origin is allowed ─────────────────────
    let allowOrigin = '';
    if (allowedOrigins.includes('*')) {
      allowOrigin = '*';
    } else if (origin && allowedOrigins.includes(origin)) {
      allowOrigin = origin;
    }

    if (allowOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    }

    // WHY: Vary header tells caches that responses differ by origin
    res.setHeader('Vary', 'Origin');

    if (credentials) {
      // WHY: Needed for cookies/auth headers in cross-origin requests
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // ── Handle preflight OPTIONS request ───────────────────
    // WHY: Browsers send OPTIONS before PUT/DELETE/PATCH or
    // requests with custom headers — to ask "is this allowed?"
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      res.setHeader('Access-Control-Max-Age', String(maxAge));
      return res.status(204).end();  // WHY: 204 No Content for preflight
    }

    next();
  };
}

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Rate Limiter Middleware
// ════════════════════════════════════════════════════════════════

// ─── Token bucket rate limiter — built from scratch ───────────
// WHY: Without rate limiting, a single client can overwhelm your
// server with thousands of requests per second.  The "fixed window"
// approach counts requests per IP per time window.

function rateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,    // WHY: 1-minute window
    maxRequests = 100,         // WHY: 100 requests per window
  } = options;

  const clients = new Map();   // ip -> { count, resetTime }

  // WHY: Periodically clean up expired entries to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of clients) {
      if (data.resetTime <= now) {
        clients.delete(ip);
      }
    }
  }, windowMs);

  // WHY: Allow cleanup interval to not block process exit
  if (cleanupInterval.unref) cleanupInterval.unref();

  function middleware(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let clientData = clients.get(ip);

    if (!clientData || clientData.resetTime <= now) {
      clientData = { count: 0, resetTime: now + windowMs };
      clients.set(ip, clientData);
    }

    clientData.count++;

    // ── Set rate limit headers (standard convention) ───────
    const remaining = Math.max(0, maxRequests - clientData.count);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(clientData.resetTime / 1000)));

    if (clientData.count > maxRequests) {
      // WHY: 429 Too Many Requests is the standard status code
      const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter,
      });
    }

    next();
  }

  middleware.cleanup = () => clearInterval(cleanupInterval);
  return middleware;
}

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Request Logger Middleware
// ════════════════════════════════════════════════════════════════

// ─── Morgan-style logger — from scratch ───────────────────────
// WHY: Logging request method, URL, status, and response time
// is essential for debugging and monitoring.  Morgan does this
// automatically — we build it to understand the pattern.

function requestLogger() {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();

    // WHY: Attach request ID so downstream middleware can use it
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    // WHY: We hook into the 'finish' event — it fires after the
    // response is fully sent, so we get accurate status codes
    res.on('finish', () => {
      const duration = Number(process.hrtime.bigint() - start) / 1e6;
      const log = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration.toFixed(2)}ms [${requestId.slice(0, 8)}]`;
      // WHY: Store logs in app.locals for testing verification
      req.app.locals.requestLogs = req.app.locals.requestLogs || [];
      req.app.locals.requestLogs.push(log);
    });

    next();
  };
}

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Request Validation Middleware
// ════════════════════════════════════════════════════════════════

// ─── Schema-based validation — lightweight Joi alternative ────
// WHY: Validating request bodies in each route handler leads to
// duplicated code.  A reusable validator middleware keeps
// handlers clean and validation rules centralized.

function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value === undefined) continue;  // WHY: Skip optional missing fields

      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`${field} must be a string`);
      }

      if (rules.type === 'number' && typeof value !== 'number') {
        errors.push(`${field} must be a number`);
      }

      if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }

      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
      }

      if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
        errors.push(`${field} must be at least ${rules.min}`);
      }

      if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
        errors.push(`${field} must be at most ${rules.max}`);
      }

      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    next();
  };
}

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Simple Response Compression Middleware
// ════════════════════════════════════════════════════════════════

// ─── Why compress? ────────────────────────────────────────────
// WHY: JSON responses compress well (50–80% reduction).  In
// production use the 'compression' npm package with zlib.
// Here we demonstrate the concept with a simple deflate.

const zlib = require('zlib');

function compressionMiddleware() {
  return (req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'] || '';

    // WHY: Only compress if the client says it supports gzip
    if (!acceptEncoding.includes('gzip')) {
      return next();
    }

    // WHY: Override res.json to compress the output
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const raw = JSON.stringify(body);

      // WHY: Don't bother compressing tiny responses
      if (raw.length < 1024) {
        return originalJson(body);
      }

      const compressed = zlib.gzipSync(Buffer.from(raw));
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Length', compressed.length);
      return res.end(compressed);
    };

    next();
  };
}

// ════════════════════════════════════════════════════════════════
// SECTION 7 — 404 Handler & Error Handler
// ════════════════════════════════════════════════════════════════

// ─── 404 catch-all ────────────────────────────────────────────
// WHY: Any request that passed through ALL routes without a
// match ends up here.  It must come AFTER all routes but
// BEFORE the error handler.

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.path}`,
    hint: 'Check the URL and HTTP method',
  });
}

// ─── Centralized error handler ────────────────────────────────
// WHY: Four-parameter middleware is Express's error handler.
// It catches anything thrown or passed to next(err).

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.expose ? err.message : 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details,
    }),
  });
}

// ════════════════════════════════════════════════════════════════
// SECTION 8 — App Assembly — The Full Pipeline
// ════════════════════════════════════════════════════════════════

// ─── The ORDER of middleware matters ──────────────────────────
// WHY: Each layer runs in registration order.  Security headers
// must be set before any response.  Rate limiting should reject
// abusers before any expensive work.  Body parsing must happen
// before validation.  Error handling must be LAST.

function createApp() {
  const app = express();

  // ── Layer 1: Security headers (first — protects every response)
  app.use(securityHeaders());

  // ── Layer 2: CORS (before routes — handles preflight)
  app.use(corsMiddleware({
    allowedOrigins: ['http://localhost:3000', 'http://indianrailways.gov.in'],
    credentials: true,
  }));

  // ── Layer 3: Rate limiter (reject abusers early)
  const limiter = rateLimiter({ windowMs: 60000, maxRequests: 100 });
  app.use(limiter);

  // ── Layer 4: Request logger (log everything that passes rate limit)
  app.use(requestLogger());

  // ── Layer 5: Body parser (built-in Express middleware)
  app.use(express.json({ limit: '10kb' }));  // WHY: limit body size to prevent abuse

  // ── Layer 6: Compression
  app.use(compressionMiddleware());

  // ── Routes ───────────────────────────────────────────────

  // Health check — no validation needed
  app.get('/health', (req, res) => {
    res.json({ success: true, data: { status: 'healthy', uptime: process.uptime() } });
  });

  // Public route
  app.get('/api/info', (req, res) => {
    res.json({
      success: true,
      data: {
        name: 'Railway Signal Cabin API',
        version: '1.0.0',
        middleware: [
          'securityHeaders',
          'cors',
          'rateLimiter',
          'requestLogger',
          'bodyParser',
          'compression',
          'validation',
        ],
      },
    });
  });

  // ── Route with validation middleware ──────────────────────
  const grievanceSchema = {
    name: { required: true, type: 'string', minLength: 2, maxLength: 50 },
    email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    message: { required: true, type: 'string', minLength: 10, maxLength: 500 },
  };

  app.post('/api/grievance', validate(grievanceSchema), (req, res) => {
    const { name, email, message } = req.body;
    res.status(201).json({
      success: true,
      data: {
        id: crypto.randomUUID(),
        name,
        email,
        message,
        receivedAt: new Date().toISOString(),
      },
    });
  });

  // ── Route that triggers an error (for testing) ───────────
  app.get('/api/error', (req, res) => {
    const err = new Error('Intentional test error');
    err.statusCode = 500;
    err.expose = true;
    throw err;
  });

  // ── Large response route (for compression testing) ───────
  app.get('/api/large', (req, res) => {
    const items = Array.from({ length: 200 }, (_, i) => ({
      id: i + 1,
      name: `Coach ${i + 1}`,
      description: `This is a detailed description for coach number ${i + 1} in the Rajdhani Express consist.`,
      fare: parseFloat((Math.random() * 5000).toFixed(2)),
      category: ['sleeper', 'ac-3tier', 'ac-2tier', 'ac-first'][i % 4],
    }));
    res.json({ success: true, data: items, count: items.length });
  });

  // ── Layer 7: 404 handler (after all routes) ──────────────
  app.use(notFoundHandler);

  // ── Layer 8: Error handler (must be last) ────────────────
  app.use(errorHandler);

  // WHY: Store reference to limiter for cleanup
  app.locals.limiter = limiter;

  return app;
}

// ════════════════════════════════════════════════════════════════
// SECTION 9 — Self-Test Suite
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

    // WHY: Read response carefully — may be gzip or JSON
    let data;
    const contentEncoding = res.headers.get('content-encoding');
    if (contentEncoding === 'gzip') {
      const arrayBuf = await res.arrayBuffer();
      const decompressed = zlib.gunzipSync(Buffer.from(arrayBuf));
      data = JSON.parse(decompressed.toString());
    } else {
      data = await res.json().catch(() => null);
    }
    return { status: res.status, body: data, headers: res.headers };
  }

  console.log('\n  Railway Signal Cabin Middleware — Test Suite');
  console.log('  ' + '─'.repeat(50));

  // ── Test 1: Security headers present ─────────────────────
  await test('Security headers are set on responses', async () => {
    const { headers } = await req('GET', '/health');
    assert(headers.get('x-content-type-options') === 'nosniff', 'Missing X-Content-Type-Options');
    assert(headers.get('x-frame-options') === 'DENY', 'Missing X-Frame-Options');
    assert(headers.get('x-xss-protection') === '1; mode=block', 'Missing X-XSS-Protection');
    assert(headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Missing Referrer-Policy');
    assert(headers.get('strict-transport-security'), 'Missing HSTS');
    assert(headers.get('content-security-policy') === "default-src 'self'", 'Missing CSP');
  });

  // ── Test 2: X-Powered-By removed ────────────────────────
  await test('X-Powered-By header is removed', async () => {
    const { headers } = await req('GET', '/health');
    assert(!headers.get('x-powered-by'), 'X-Powered-By should be removed');
  });

  // ── Test 3: CORS preflight (OPTIONS) ─────────────────────
  await test('CORS preflight returns 204 with headers', async () => {
    const url = `${baseURL}/api/info`;
    const res = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    assert(res.status === 204, `Expected 204, got ${res.status}`);
    assert(res.headers.get('access-control-allow-methods'), 'Missing Allow-Methods');
    assert(res.headers.get('access-control-allow-headers'), 'Missing Allow-Headers');
    assert(res.headers.get('access-control-max-age'), 'Missing Max-Age');
  });

  // ── Test 4: CORS origin reflected for allowed origin ─────
  await test('CORS reflects allowed origin', async () => {
    const url = `${baseURL}/health`;
    const res = await fetch(url, {
      headers: { Origin: 'http://localhost:3000' },
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    assert(allowOrigin === 'http://localhost:3000', `Expected localhost:3000, got ${allowOrigin}`);
  });

  // ── Test 5: CORS blocks disallowed origin ────────────────
  await test('CORS does not reflect disallowed origin', async () => {
    const url = `${baseURL}/health`;
    const res = await fetch(url, {
      headers: { Origin: 'http://evil.com' },
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    assert(!allowOrigin, `Should not set Allow-Origin for evil.com, got ${allowOrigin}`);
  });

  // ── Test 6: Rate limit headers present ───────────────────
  await test('Rate limit headers on every response', async () => {
    const { headers } = await req('GET', '/health');
    assert(headers.get('x-ratelimit-limit') === '100', 'Missing X-RateLimit-Limit');
    assert(headers.get('x-ratelimit-remaining'), 'Missing X-RateLimit-Remaining');
    assert(headers.get('x-ratelimit-reset'), 'Missing X-RateLimit-Reset');
  });

  // ── Test 7: Rate limiter enforces limit ──────────────────
  await test('Rate limiter blocks after limit exceeded', async () => {
    // WHY: Create a separate app with a very low limit to test blocking
    const testApp = express();
    const strictLimiter = rateLimiter({ windowMs: 60000, maxRequests: 3 });
    testApp.use(strictLimiter);
    testApp.get('/test', (req, res) => res.json({ ok: true }));

    const testServer = testApp.listen(0);
    const testPort = testServer.address().port;
    const testURL = `http://127.0.0.1:${testPort}`;

    try {
      // WHY: Make 3 allowed requests, then the 4th should be blocked
      for (let i = 0; i < 3; i++) {
        const r = await fetch(`${testURL}/test`);
        assert(r.status === 200, `Request ${i + 1} should succeed`);
      }

      const blocked = await fetch(`${testURL}/test`);
      assert(blocked.status === 429, `Expected 429, got ${blocked.status}`);

      const data = await blocked.json();
      assert(data.error.includes('Too many requests'), 'Should say too many requests');
      assert(data.retryAfter > 0, 'Should include retryAfter');
    } finally {
      strictLimiter.cleanup();
      testServer.close();
    }
  });

  // ── Test 8: Request logger assigns X-Request-ID ──────────
  await test('Request logger adds X-Request-ID header', async () => {
    const { headers } = await req('GET', '/health');
    const requestId = headers.get('x-request-id');
    assert(requestId, 'Missing X-Request-ID');
    assert(requestId.length >= 32, 'Request ID should be a UUID');
  });

  // ── Test 9: Validation passes for valid body ─────────────
  await test('Validation passes for valid grievance', async () => {
    const { status, body } = await req('POST', '/api/grievance', {
      name: 'Sunita Devi',
      email: 'sunita@railmail.gov.in',
      message: 'Platform 3 par paani ka intezaam zaruri hai, yatriyon ko pareshani ho rahi hai.',
    });
    assert(status === 201, `Expected 201, got ${status}`);
    assert(body.data.name === 'Sunita Devi', 'Name should match');
    assert(body.data.id, 'Should have generated an ID');
  });

  // ── Test 10: Validation rejects missing required fields ──
  await test('Validation rejects missing fields', async () => {
    const { status, body } = await req('POST', '/api/grievance', {
      name: 'Sunita Devi',
    });
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.error === 'Validation failed', 'Should say validation failed');
    assert(body.details.length >= 2, 'Should list missing email and message');
  });

  // ── Test 11: Validation rejects invalid email format ─────
  await test('Validation rejects invalid email', async () => {
    const { status, body } = await req('POST', '/api/grievance', {
      name: 'Sunita Devi',
      email: 'not-an-email',
      message: 'This is a valid message length for the grievance.',
    });
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.details.some(d => d.includes('email')), 'Should mention email');
  });

  // ── Test 12: Validation rejects too-short fields ─────────
  await test('Validation rejects short message', async () => {
    const { status, body } = await req('POST', '/api/grievance', {
      name: 'S',      // minLength 2
      email: 's@r.in',
      message: 'Short',  // minLength 10
    });
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.details.length >= 2, 'Should flag both name and message');
  });

  // ── Test 13: Error handler catches thrown errors ──────────
  await test('Error handler catches route errors', async () => {
    const { status, body } = await req('GET', '/api/error');
    assert(status === 500, `Expected 500, got ${status}`);
    assert(body.success === false, 'success should be false');
    assert(body.error === 'Intentional test error', 'Error message should match');
  });

  // ── Test 14: 404 handler for unknown routes ──────────────
  await test('404 handler for unknown routes', async () => {
    const { status, body } = await req('GET', '/nonexistent');
    assert(status === 404, `Expected 404, got ${status}`);
    assert(body.error.includes('Cannot GET'), 'Should say Cannot GET');
    assert(body.hint, 'Should include a hint');
  });

  // ── Test 15: Compression for large responses ─────────────
  await test('Large responses are gzip-compressed', async () => {
    // WHY: Node's native fetch auto-decompresses gzip and strips
    // the Content-Encoding header.  We use raw http.request to
    // verify the server actually sends gzip-compressed bytes.
    const http = require('http');
    const parsedURL = new URL(`${baseURL}/api/large`);

    const data = await new Promise((resolve, reject) => {
      const request = http.request({
        hostname: parsedURL.hostname,
        port: parsedURL.port,
        path: parsedURL.pathname,
        method: 'GET',
        headers: { 'Accept-Encoding': 'gzip' },
      }, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks);
          const encoding = res.headers['content-encoding'];

          if (encoding === 'gzip') {
            // WHY: Server sent compressed data — decompress to verify
            const decompressed = zlib.gunzipSync(raw);
            const parsed = JSON.parse(decompressed.toString());
            resolve({ compressed: true, data: parsed, rawSize: raw.length, fullSize: decompressed.length });
          } else {
            const parsed = JSON.parse(raw.toString());
            resolve({ compressed: false, data: parsed, rawSize: raw.length, fullSize: raw.length });
          }
        });
      });
      request.on('error', reject);
      request.end();
    });

    assert(data.data.data.length === 200, `Expected 200 items, got ${data.data.data.length}`);
    assert(data.data.success === true, 'success should be true');
    assert(data.compressed === true, 'Response should be gzip-compressed');
    assert(data.rawSize < data.fullSize, `Compressed (${data.rawSize}B) should be smaller than full (${data.fullSize}B)`);
  });

  // ── Test 16: Pipeline order verification ─────────────────
  await test('Full pipeline processes request correctly', async () => {
    const { status, body, headers } = await req('GET', '/api/info');
    assert(status === 200, `Expected 200, got ${status}`);

    // WHY: Verify that multiple middleware layers all executed
    assert(headers.get('x-content-type-options') === 'nosniff', 'Security headers ran');
    assert(headers.get('x-request-id'), 'Logger ran');
    assert(headers.get('x-ratelimit-limit'), 'Rate limiter ran');
    assert(body.data.name === 'Railway Signal Cabin API', 'Route handler ran');
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
// SECTION 10 — Start Server, Run Tests, Shut Down
// ════════════════════════════════════════════════════════════════

async function main() {
  console.log('============================================================');
  console.log(' FILE 26 — Railway Signal Cabin: Middleware Pipeline Project');
  console.log('============================================================');

  const app = createApp();

  const server = app.listen(0, async () => {
    const { port } = server.address();
    const baseURL = `http://127.0.0.1:${port}`;
    console.log(`\n  Railway Signal Cabin running on ${baseURL}`);

    try {
      await runTests(baseURL);
    } catch (err) {
      console.error('  Test suite error:', err.message);
    } finally {
      // WHY: Clean up rate limiter interval before closing
      if (app.locals.limiter && app.locals.limiter.cleanup) {
        app.locals.limiter.cleanup();
      }

      server.close(() => {
        console.log('\n  Server closed. Railway Signal Cabin tests complete.\n');

        // ── KEY TAKEAWAYS ──────────────────────────────────
        console.log('  KEY TAKEAWAYS');
        console.log('  ' + '─'.repeat(50));
        console.log('  1. Middleware order matters: security headers');
        console.log('     first, error handler last.');
        console.log('  2. CORS handles preflight OPTIONS requests');
        console.log('     BEFORE the real request reaches your routes.');
        console.log('  3. Rate limiting protects your server from abuse');
        console.log('     — 429 Too Many Requests is the standard code.');
        console.log('  4. The X-Request-ID pattern traces a request');
        console.log('     through every log entry and downstream service.');
        console.log('  5. Schema-based validation middleware keeps');
        console.log('     route handlers clean and rules reusable.');
        console.log('  6. Security headers (CSP, HSTS, X-Frame-Options)');
        console.log('     instruct browsers to enable protections.');
        console.log('  7. Compression reduces response size 50-80%');
        console.log('     — check Accept-Encoding before compressing.');
        console.log('  8. The 404 handler sits AFTER routes but');
        console.log('     BEFORE the error handler in the pipeline.');
        process.exit(0);
      });
    }
  });
}

main();
