/** ============================================================
 *  FILE 17: CORS From Scratch — Understanding Cross-Origin Requests
 *  WHY THIS MATTERS: CORS errors are among the most common issues
 *  developers face. Understanding the Same-Origin Policy and how
 *  CORS headers work at the protocol level lets you debug issues
 *  instantly instead of blindly adding "cors" middleware.
 *  ============================================================ */

// THE EMBASSY VISA COUNTER
// ──────────────────────────────────────────────────────────────
// Imagine a world of sovereign nations (origins). Each nation has
// its own domain, port, and protocol. By default, citizens of
// one nation CANNOT access resources in another — the Same-Origin
// Policy is the law of the land.
//
// CORS (Cross-Origin Resource Sharing) is the visa system at the
// Indian embassy. When a foreign website (browser) tries to access
// your server, the visa officer (server) checks the passport
// (Origin header) and stamps it with permission headers. For
// dangerous requests, the officer demands a "preflight" check —
// the applicant must attend a visa interview (OPTIONS request)
// BEFORE actual entry is granted.
//
// We will build this entire visa counter system from scratch.
// ──────────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');

// (See nodejs-notes/11 for HTTP headers fundamentals)

// ============================================================
// BACKGROUND: The Same-Origin Policy
// ============================================================
//
// An "origin" = protocol + hostname + port
//   http://example.com:80    — origin A
//   https://example.com:443  — origin B (different protocol!)
//   http://api.example.com   — origin C (different hostname!)
//   http://example.com:3000  — origin D (different port!)
//
// The Same-Origin Policy (SOP) says:
// - JavaScript on origin A can ONLY read responses from origin A
// - Requests to B, C, D will be SENT but the RESPONSE is BLOCKED
// - This prevents malicious sites from reading your bank data
//
// CORS relaxes SOP by having the SERVER explicitly opt in:
// "Yes, origin A is allowed to read my responses."
//
// SIMPLE vs PREFLIGHTED requests:
// ──────────────────────────────────────────────────────────────
// SIMPLE (no preflight needed):
//   - Methods: GET, HEAD, POST
//   - Headers: Accept, Accept-Language, Content-Language,
//              Content-Type (only: text/plain, multipart/form-data,
//              application/x-www-form-urlencoded)
//
// PREFLIGHTED (browser sends OPTIONS first — the visa interview):
//   - Methods: PUT, DELETE, PATCH, etc.
//   - Custom headers: Authorization, X-Custom-Header, etc.
//   - Content-Type: application/json
//   - WHY: Browser asks "is this OK?" before sending the real request
// ──────────────────────────────────────────────────────────────


// ============================================================
// BLOCK 1 — Basic CORS Middleware (Allow All, Allow Specific)
// ============================================================

/**
 * Create a basic CORS middleware that allows all origins.
 * This is the "open visa" policy — any nation can enter.
 *
 * @returns {Function} Express middleware
 */
function corsAllowAll() {
  return (req, res, next) => {
    // WHY: The "*" wildcard means "allow ANY origin"
    // The browser checks this header to decide if JS can read the response
    res.setHeader('Access-Control-Allow-Origin', '*');

    // WHY: Tell the browser which methods are allowed for cross-origin requests
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

    // WHY: Tell the browser which custom headers the client can send
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // WHY: Handle preflight requests — browser sends OPTIONS before the real request
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
      // 204 = "No Content" — preflight succeeded, no body needed
    }

    next();
  };
}

/**
 * Create a CORS middleware that only allows specific origins.
 * This is the "visa check" — only listed nations may enter.
 *
 * @param {string|string[]} allowedOrigins - Single origin or array of allowed origins
 * @returns {Function} Express middleware
 */
function corsAllowSpecific(allowedOrigins) {
  // WHY: Normalize to array for consistent handling
  const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins];

  return (req, res, next) => {
    const requestOrigin = req.headers.origin;

    if (requestOrigin && origins.includes(requestOrigin)) {
      // WHY: When allowing specific origins, you MUST echo back the exact origin,
      // not use "*". The browser compares this to the page's actual origin.
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);

      // WHY: "Vary: Origin" tells caches that the response changes based on the
      // Origin header. Without this, a CDN might cache a response for origin A
      // and serve it (incorrectly) to origin B.
      res.setHeader('Vary', 'Origin');
    }
    // WHY: If origin is NOT in the list, we simply don't set the header.
    // The browser will block the response on the client side.
    // The request still reaches our server — CORS is enforced by BROWSERS, not servers.

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  };
}


// ============================================================
// BLOCK 2 — Preflight, Credentials, Dynamic Origin, Expose Headers
// ============================================================

/**
 * Full-featured CORS middleware with all configuration options.
 * This is what libraries like "cors" do under the hood.
 *
 * @param {object} options - CORS configuration
 * @param {string|string[]|Function} options.origin - Allowed origins, "*", or function(origin) => boolean
 * @param {string[]} options.methods - Allowed HTTP methods
 * @param {string[]} options.allowedHeaders - Headers the client can send
 * @param {string[]} options.exposedHeaders - Headers the client can READ from the response
 * @param {boolean} options.credentials - Allow cookies/auth headers
 * @param {number} options.maxAge - How long (seconds) browsers cache preflight results
 * @returns {Function} Express middleware
 */
function corsMiddleware(options = {}) {
  const {
    origin = '*',
    methods = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    exposedHeaders = [],
    credentials = false,
    maxAge = null
  } = options;

  /**
   * Determine if the given request origin is allowed.
   *
   * @param {string} requestOrigin - The Origin header from the request
   * @returns {string|false} The allowed origin string or false
   */
  function resolveOrigin(requestOrigin) {
    // WHY: Support three patterns for maximum flexibility:

    // Pattern 1: Wildcard — allow everything
    if (origin === '*') return '*';

    // Pattern 2: Function — dynamic check (e.g., regex, database lookup)
    if (typeof origin === 'function') {
      return origin(requestOrigin) ? requestOrigin : false;
    }

    // Pattern 3: String or array — whitelist
    const list = Array.isArray(origin) ? origin : [origin];
    return list.includes(requestOrigin) ? requestOrigin : false;
  }

  return (req, res, next) => {
    const requestOrigin = req.headers.origin;

    // ── Step 1: Determine and set the origin header ─────────
    const allowedOriginValue = resolveOrigin(requestOrigin);

    if (allowedOriginValue && allowedOriginValue !== false) {
      res.setHeader('Access-Control-Allow-Origin', allowedOriginValue);

      // WHY: Only add Vary when we're reflecting a specific origin
      // (not when using "*")
      if (allowedOriginValue !== '*') {
        res.setHeader('Vary', 'Origin');
      }
    }

    // ── Step 2: Credentials ─────────────────────────────────
    if (credentials) {
      // WHY: This header tells the browser it's OK to include cookies,
      // Authorization headers, and TLS client certificates.
      //
      // CRITICAL RULE: When credentials is true, origin CANNOT be "*"
      // The browser WILL reject a response with:
      //   Access-Control-Allow-Origin: *
      //   Access-Control-Allow-Credentials: true
      // You MUST echo back the specific origin.
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // ── Step 3: Expose Headers ──────────────────────────────
    if (exposedHeaders.length > 0) {
      // WHY: By default, browsers only expose "simple" response headers
      // to JavaScript: Cache-Control, Content-Language, Content-Type,
      // Expires, Last-Modified, Pragma.
      //
      // If your API returns custom headers (e.g., X-Total-Count,
      // X-Request-Id), the client can't see them unless you
      // explicitly expose them here.
      res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    }

    // ── Step 4: Handle Preflight (OPTIONS) ──────────────────
    if (req.method === 'OPTIONS') {
      // WHY: Preflight is the visa interview — the browser asking
      // "may I send this request?" We respond with what's allowed.

      res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));

      if (maxAge !== null) {
        // WHY: Max-Age tells the browser how long to cache the preflight
        // result. Without it, the browser sends a preflight for EVERY
        // request, doubling the number of HTTP calls.
        // 86400 = 24 hours is a common value.
        res.setHeader('Access-Control-Max-Age', String(maxAge));
      }

      // WHY: 204 No Content — preflight is just a permission check,
      // there's no body to return.
      return res.status(204).end();
    }

    next();
  };
}


// ============================================================
// SELF-TEST: The Embassy Visa Counter Opens
// ============================================================

async function runTests() {
  const app = express();

  // ── Route group 1: Open visa (allow all) ───────────────────
  app.use('/open', corsAllowAll());
  app.get('/open/data', (req, res) => {
    res.json({ zone: 'open', message: 'Welcome, any origin!' });
  });

  // ── Route group 2: Specific origins only ────────────────────
  app.use('/restricted', corsAllowSpecific([
    'http://trusted-app.in',
    'http://partner-site.gov.in'
  ]));
  app.get('/restricted/data', (req, res) => {
    res.json({ zone: 'restricted', message: 'Verified visa holders only' });
  });

  // ── Route group 3: Full-featured CORS ───────────────────────
  app.use('/full', corsMiddleware({
    origin: (requestOrigin) => {
      // WHY: Dynamic origin check — could hit a database or use regex
      const whitelist = ['http://app.india.gov.in', 'http://admin.india.gov.in'];
      return whitelist.includes(requestOrigin);
    },
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Total-Count', 'X-Request-Id'],
    credentials: true,
    maxAge: 86400
  }));
  app.get('/full/data', (req, res) => {
    res.setHeader('X-Total-Count', '42');
    res.setHeader('X-Request-Id', 'req-abc-123');
    res.json({ zone: 'full', message: 'Full CORS configured' });
  });

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    console.log(`Embassy Visa Counter server listening on port ${port}\n`);

    try {
      // ── Test 1: Open CORS (any origin) ──────────────────────
      console.log('--- Test 1: Open CORS — Any Origin Allowed ---');
      const res1 = await makeRequest(`${base}/open/data`, 'GET', {
        Origin: 'http://random-site.com'
      });
      console.log('Status:', res1.status);
      // Output: Status: 200
      console.log('Access-Control-Allow-Origin:', res1.headers['access-control-allow-origin']);
      // Output: Access-Control-Allow-Origin: *
      console.log('Body:', JSON.stringify(res1.body));
      // Output: Body: {"zone":"open","message":"Welcome, any origin!"}
      console.log();

      // ── Test 2: Specific origin (trusted) ───────────────────
      console.log('--- Test 2: Specific Origin — Trusted Site ---');
      const res2 = await makeRequest(`${base}/restricted/data`, 'GET', {
        Origin: 'http://trusted-app.in'
      });
      console.log('Status:', res2.status);
      // Output: Status: 200
      console.log('Access-Control-Allow-Origin:', res2.headers['access-control-allow-origin']);
      // Output: Access-Control-Allow-Origin: http://trusted-app.in
      console.log('Vary:', res2.headers['vary']);
      // Output: Vary: Origin
      console.log();

      // ── Test 3: Specific origin (untrusted) ─────────────────
      console.log('--- Test 3: Specific Origin — Untrusted Site ---');
      const res3 = await makeRequest(`${base}/restricted/data`, 'GET', {
        Origin: 'http://evil-hacker.com'
      });
      console.log('Status:', res3.status);
      // Output: Status: 200
      // WHY: The server STILL returns 200! CORS doesn't block the request
      // on the server — it's the BROWSER that blocks JS from reading the response.
      console.log('Access-Control-Allow-Origin:', res3.headers['access-control-allow-origin']);
      // Output: Access-Control-Allow-Origin: undefined
      // WHY: No ACAO header = browser blocks the response
      console.log();

      // ── Test 4: Preflight (OPTIONS) for open CORS ───────────
      console.log('--- Test 4: Preflight OPTIONS — Open CORS ---');
      const res4 = await makeRequest(`${base}/open/data`, 'OPTIONS', {
        Origin: 'http://anywhere.com',
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      });
      console.log('Status:', res4.status);
      // Output: Status: 204
      console.log('Allow-Origin:', res4.headers['access-control-allow-origin']);
      // Output: Allow-Origin: *
      console.log('Allow-Methods:', res4.headers['access-control-allow-methods']);
      // Output: Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
      console.log('Allow-Headers:', res4.headers['access-control-allow-headers']);
      // Output: Allow-Headers: Content-Type, Authorization
      console.log();

      // ── Test 5: Full CORS with credentials ──────────────────
      console.log('--- Test 5: Full CORS — Credentials & Expose Headers ---');
      const res5 = await makeRequest(`${base}/full/data`, 'GET', {
        Origin: 'http://app.india.gov.in'
      });
      console.log('Status:', res5.status);
      // Output: Status: 200
      console.log('Allow-Origin:', res5.headers['access-control-allow-origin']);
      // Output: Allow-Origin: http://app.india.gov.in
      console.log('Allow-Credentials:', res5.headers['access-control-allow-credentials']);
      // Output: Allow-Credentials: true
      console.log('Expose-Headers:', res5.headers['access-control-expose-headers']);
      // Output: Expose-Headers: X-Total-Count, X-Request-Id
      console.log('X-Total-Count:', res5.headers['x-total-count']);
      // Output: X-Total-Count: 42
      console.log();

      // ── Test 6: Preflight with Max-Age ──────────────────────
      console.log('--- Test 6: Preflight — Max-Age & Allowed Methods ---');
      const res6 = await makeRequest(`${base}/full/data`, 'OPTIONS', {
        Origin: 'http://admin.india.gov.in',
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'Authorization, X-Request-Id'
      });
      console.log('Status:', res6.status);
      // Output: Status: 204
      console.log('Allow-Methods:', res6.headers['access-control-allow-methods']);
      // Output: Allow-Methods: GET, POST, PUT
      console.log('Allow-Headers:', res6.headers['access-control-allow-headers']);
      // Output: Allow-Headers: Content-Type, Authorization, X-Request-Id
      console.log('Max-Age:', res6.headers['access-control-max-age']);
      // Output: Max-Age: 86400
      console.log('Allow-Credentials:', res6.headers['access-control-allow-credentials']);
      // Output: Allow-Credentials: true
      console.log();

      // ── Test 7: Full CORS — denied origin ───────────────────
      console.log('--- Test 7: Full CORS — Denied Origin ---');
      const res7 = await makeRequest(`${base}/full/data`, 'GET', {
        Origin: 'http://evil-site.com'
      });
      console.log('Status:', res7.status);
      // Output: Status: 200
      console.log('Allow-Origin:', res7.headers['access-control-allow-origin']);
      // Output: Allow-Origin: undefined
      console.log('Allow-Credentials:', res7.headers['access-control-allow-credentials']);
      // Output: Allow-Credentials: true
      // WHY: Credentials header is still set, but without Allow-Origin,
      // the browser rejects the response entirely.
      console.log();

    } catch (err) {
      console.error('Test error:', err.message);
    } finally {
      server.close(() => {
        console.log('Server closed.\n');

        // ── KEY TAKEAWAYS ─────────────────────────────────────
        console.log('KEY TAKEAWAYS:');
        console.log('1. CORS is enforced by BROWSERS, not servers. The server only sets headers; the browser decides whether to block.');
        console.log('2. Access-Control-Allow-Origin must match the request Origin exactly, or be "*" (wildcard).');
        console.log('3. When using credentials (cookies/auth), origin CANNOT be "*" — you must echo the specific origin.');
        console.log('4. Preflight (OPTIONS) requests happen automatically for "non-simple" requests (custom headers, PUT/DELETE, JSON content-type).');
        console.log('5. Max-Age caches preflight results to avoid sending OPTIONS before every request.');
        console.log('6. Expose-Headers controls which response headers JavaScript can read — most are hidden by default.');
        console.log('7. Always set "Vary: Origin" when reflecting specific origins, so CDNs cache correctly.');
      });
    }
  });
}

/**
 * Helper: Make an HTTP request and return { status, headers, body }.
 */
function makeRequest(url, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

runTests();
