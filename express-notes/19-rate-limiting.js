/** ============================================================
 *  FILE 19: Rate Limiting — Controlling Request Flow From Scratch
 *  WHY THIS MATTERS: Rate limiting protects your API from abuse,
 *  brute-force attacks, and resource exhaustion. Building one from
 *  scratch teaches you sliding windows, token buckets, and the
 *  standard rate-limit headers that clients depend on.
 *  ============================================================ */

// THE TATKAL BOOKING RATE LIMITER
// ──────────────────────────────────────────────────────────────
// IRCTC can only handle so many tatkal booking requests per
// minute. The booking server stands at the entrance with a
// counter and a clock. Each passenger's request gets counted;
// when the limit is reached, the server responds with a
// "Please wait" message (429 Too Many Requests).
//
// Some endpoints (routes) are more critical and need tighter
// limits — the tatkal window (10am-12pm) gets stricter controls.
// Authenticated users (with verified IRCTC accounts) get a
// separate, higher quota. And the server periodically cleans up
// records of sessions that expired long ago.
//
// We build this entire tatkal crowd-control system from scratch.
// ──────────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');

// (See nodejs-notes/14 for timing and event loop fundamentals)


// ============================================================
// BLOCK 1 — Building a Rate Limiter Middleware From Scratch
// ============================================================
//
// ALGORITHM: Fixed Window
// ──────────────────────────────────────────────────────────────
// The simplest approach:
// 1. Each client (identified by IP) gets a counter
// 2. The counter resets after a time window (e.g., 1 minute)
// 3. If counter > max, reject with 429
//
// PROBLEM: "Boundary burst" — a client can send max requests at
// 23:59:59 and max more at 00:00:00, doubling the effective rate.
//
// SOLUTION: Sliding Window (Block 2) — weight the previous
// window's count based on how far into the current window we are.
// ──────────────────────────────────────────────────────────────

/**
 * Create a fixed-window rate limiter middleware.
 *
 * @param {object} options - Configuration
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 min)
 * @param {number} options.max - Maximum requests per window (default: 100)
 * @param {string} options.message - Error message when rate limited
 * @param {number} options.statusCode - HTTP status code for rejection (default: 429)
 * @param {boolean} options.headers - Whether to send rate limit headers (default: true)
 * @param {Function} options.keyGenerator - Function(req) => string to identify clients
 * @returns {Function} Express middleware
 */
function fixedWindowLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    headers = true,
    keyGenerator = (req) => {
      // WHY: Default key is the client's IP address.
      // req.ip uses Express's trust proxy setting for correct IP behind proxies.
      // Fallback to socket address for direct connections.
      return req.ip || req.socket.remoteAddress || 'unknown';
    }
  } = options;

  // WHY: In-memory store using a Map.
  // Key: client identifier (IP), Value: { count, resetTime }
  //
  // TRADE-OFF: In-memory stores don't work across multiple server
  // instances (clustered or load-balanced). Production rate limiters
  // use Redis or Memcached for shared state.
  const store = new Map();

  /**
   * Get or create a rate limit record for a client.
   *
   * @param {string} key - Client identifier
   * @returns {object} { count, resetTime }
   */
  function getRecord(key) {
    const now = Date.now();
    let record = store.get(key);

    if (!record || now >= record.resetTime) {
      // WHY: Window expired (or first request) — create a fresh record
      record = {
        count: 0,
        resetTime: now + windowMs
      };
      store.set(key, record);
    }

    return record;
  }

  // WHY: The middleware function itself
  const middleware = (req, res, next) => {
    const key = keyGenerator(req);
    const record = getRecord(key);

    record.count++;

    // Calculate remaining requests and reset time
    const remaining = Math.max(0, max - record.count);
    const resetTimeSeconds = Math.ceil(record.resetTime / 1000);

    // ── Set standard rate limit headers ──────────────────────
    if (headers) {
      // WHY: These are the de facto standard headers for rate limiting.
      // Clients (and API consumers) depend on them to implement backoff.

      // X-RateLimit-Limit: Maximum requests allowed in the window
      res.setHeader('X-RateLimit-Limit', String(max));

      // X-RateLimit-Remaining: How many requests are left in this window
      res.setHeader('X-RateLimit-Remaining', String(remaining));

      // X-RateLimit-Reset: Unix timestamp (seconds) when the window resets
      res.setHeader('X-RateLimit-Reset', String(resetTimeSeconds));
    }

    // ── Check if limit is exceeded ──────────────────────────
    if (record.count > max) {
      // WHY: Retry-After tells the client exactly how long to wait
      const retryAfterSeconds = Math.ceil((record.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', String(Math.max(retryAfterSeconds, 1)));

      return res.status(statusCode).json({
        error: message,
        retryAfter: Math.max(retryAfterSeconds, 1)
      });
    }

    next();
  };

  // WHY: Expose store and a reset method for testing and management
  middleware.store = store;
  middleware.resetKey = (key) => store.delete(key);
  middleware.resetAll = () => store.clear();

  return middleware;
}


// ============================================================
// BLOCK 2 — Sliding Window, Per-Route Limits, Cleanup Interval
// ============================================================
//
// ALGORITHM: Sliding Window Log
// ──────────────────────────────────────────────────────────────
// Instead of resetting the counter at fixed intervals, we store
// the TIMESTAMP of each request. To check the limit, we count
// how many timestamps fall within the last windowMs milliseconds.
//
// PROS: No boundary burst problem, accurate per-second limiting
// CONS: More memory per client (stores N timestamps vs 1 counter)
//
// For high-traffic APIs, a sliding window COUNTER (hybrid) is
// better — we implement that here.
// ──────────────────────────────────────────────────────────────

/**
 * Create a sliding window rate limiter.
 * Uses the "sliding window counter" algorithm: weights the previous
 * window's count based on overlap with the current window.
 *
 * @param {object} options - Same options as fixedWindowLimiter plus:
 * @param {number} options.cleanupIntervalMs - How often to purge expired entries (default: 60000)
 * @returns {Function} Express middleware
 */
function slidingWindowLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    headers = true,
    cleanupIntervalMs = 60 * 1000,
    keyGenerator = (req) => req.ip || req.socket.remoteAddress || 'unknown'
  } = options;

  // WHY: Each client gets TWO windows tracked: previous and current.
  // The "sliding" effect comes from weighting the previous window.
  //
  // Structure: Map<key, { prevCount, prevStart, currCount, currStart }>
  const store = new Map();

  /**
   * Get the effective request count using sliding window weighting.
   * ──────────────────────────────────────────────────────────────
   * Formula:
   *   effectiveCount = prevCount * overlapWeight + currCount
   *
   * Where overlapWeight = (windowMs - elapsedInCurrentWindow) / windowMs
   *
   * Example with 1-minute window:
   *   - Previous window had 80 requests
   *   - Current window (40 seconds in) has 30 requests
   *   - overlapWeight = (60000 - 40000) / 60000 = 0.333
   *   - effectiveCount = 80 * 0.333 + 30 = 56.67 => 57
   * ──────────────────────────────────────────────────────────────
   */
  function getEffectiveCount(key) {
    const now = Date.now();
    let record = store.get(key);

    if (!record) {
      record = {
        prevCount: 0,
        prevStart: now - windowMs,
        currCount: 0,
        currStart: now
      };
      store.set(key, record);
    }

    // Check if current window has expired
    const elapsed = now - record.currStart;

    if (elapsed >= windowMs) {
      // WHY: Current window expired — rotate: current becomes previous
      record.prevCount = record.currCount;
      record.prevStart = record.currStart;
      record.currCount = 0;
      record.currStart = now;
    }

    // Calculate the overlap weight
    const currentElapsed = now - record.currStart;
    const overlapWeight = Math.max(0, (windowMs - currentElapsed) / windowMs);

    // Effective count = weighted previous + current
    const effectiveCount = Math.floor(record.prevCount * overlapWeight) + record.currCount;

    return { record, effectiveCount };
  }

  // ── Cleanup interval ────────────────────────────────────────
  // WHY: Without cleanup, the store grows forever as unique IPs accumulate.
  // We periodically purge entries that haven't been seen in 2 windows.
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    const expiry = now - (windowMs * 2); // Two full windows ago

    for (const [key, record] of store) {
      if (record.currStart < expiry) {
        store.delete(key);
      }
    }
  }, cleanupIntervalMs);

  // WHY: unref() ensures this timer doesn't keep the process alive
  // when all other work is done (important for clean shutdown)
  cleanupTimer.unref();

  const middleware = (req, res, next) => {
    const key = keyGenerator(req);
    const { record, effectiveCount } = getEffectiveCount(key);

    // Increment current window count
    record.currCount++;

    const remaining = Math.max(0, max - effectiveCount - 1);
    const resetTimeSeconds = Math.ceil((record.currStart + windowMs) / 1000);

    if (headers) {
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', String(resetTimeSeconds));
    }

    // WHY: Use effectiveCount (including weighted previous window)
    // to decide if the limit is exceeded
    if (effectiveCount + 1 > max) {
      const retryAfterSeconds = Math.ceil((record.currStart + windowMs - Date.now()) / 1000);
      res.setHeader('Retry-After', String(Math.max(retryAfterSeconds, 1)));

      return res.status(statusCode).json({
        error: message,
        retryAfter: Math.max(retryAfterSeconds, 1)
      });
    }

    next();
  };

  middleware.store = store;
  middleware.resetKey = (key) => store.delete(key);
  middleware.resetAll = () => store.clear();
  middleware.cleanup = () => clearInterval(cleanupTimer);

  return middleware;
}

/**
 * Create a rate limiter that applies DIFFERENT limits to different routes.
 * This is how you protect tatkal booking endpoints more aggressively than
 * general train search endpoints.
 *
 * @param {object} routeLimits - Map of route pattern => limiter options
 * @returns {object} Object with limiters and a middleware function
 */
function perRouteLimiter(routeLimits) {
  // WHY: Create a separate limiter instance for each route pattern.
  // This ensures /tatkal/book rate limits don't consume /api/trains quota.
  const limiters = {};

  for (const [route, options] of Object.entries(routeLimits)) {
    limiters[route] = fixedWindowLimiter(options);
  }

  return limiters;
}


// ============================================================
// SELF-TEST: IRCTC Opens the Tatkal Window
// ============================================================

async function runTests() {
  const app = express();

  // ── Global rate limiter (generous) ──────────────────────────
  const globalLimiter = fixedWindowLimiter({
    windowMs: 60 * 1000,   // 1 minute
    max: 10,               // 10 requests per minute (low for testing)
    message: 'Global rate limit exceeded'
  });

  // ── Per-route limiters ──────────────────────────────────────
  const tatkalLimiter = fixedWindowLimiter({
    windowMs: 60 * 1000,
    max: 3,                // Only 3 tatkal booking attempts per minute
    message: 'Too many tatkal booking attempts, please wait',
    keyGenerator: (req) => {
      // WHY: For tatkal, key on IP + passenger name to prevent brute-force
      // booking against a specific train while still allowing other passengers
      const body = req.body || {};
      const passengerName = body.passengerName || 'anonymous';
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      return `${ip}:${passengerName}`;
    }
  });

  const slidingLimiter = slidingWindowLimiter({
    windowMs: 60 * 1000,
    max: 5,                // 5 requests per sliding minute
    message: 'Sliding window limit exceeded',
    cleanupIntervalMs: 30 * 1000
  });

  // ── Routes ──────────────────────────────────────────────────
  app.get('/api/trains', globalLimiter, (req, res) => {
    res.json({ data: 'IRCTC tatkal train schedule', timestamp: Date.now() });
  });

  app.post('/tatkal/book', express.json(), tatkalLimiter, (req, res) => {
    res.json({ message: 'Tatkal booking attempt processed', passenger: req.body?.passengerName });
  });

  app.get('/api/sliding', slidingLimiter, (req, res) => {
    res.json({ data: 'Sliding window data', timestamp: Date.now() });
  });

  // ── Error handler ───────────────────────────────────────────
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    console.log(`IRCTC Tatkal Booking server listening on port ${port}\n`);

    try {
      // ── Test 1: Normal requests within limit ────────────────
      console.log('--- Test 1: Normal Requests Within Limit ---');
      const res1 = await makeRequest(`${base}/api/trains`);
      console.log('Status:', res1.status);
      // Output: Status: 200
      console.log('X-RateLimit-Limit:', res1.headers['x-ratelimit-limit']);
      // Output: X-RateLimit-Limit: 10
      console.log('X-RateLimit-Remaining:', res1.headers['x-ratelimit-remaining']);
      // Output: X-RateLimit-Remaining: 9
      console.log('X-RateLimit-Reset:', res1.headers['x-ratelimit-reset'] ? 'present' : 'missing');
      // Output: X-RateLimit-Reset: present
      console.log('Body:', JSON.stringify(res1.body));
      // Output: Body: {"data":"IRCTC tatkal train schedule","timestamp":<number>}
      console.log();

      // ── Test 2: Remaining count decreases ───────────────────
      console.log('--- Test 2: Remaining Count Decreases ---');
      await makeRequest(`${base}/api/trains`); // 2nd request
      const res2c = await makeRequest(`${base}/api/trains`); // 3rd request
      console.log('After 3 requests:');
      console.log('X-RateLimit-Remaining:', res2c.headers['x-ratelimit-remaining']);
      // Output: X-RateLimit-Remaining: 7
      console.log();

      // ── Test 3: Exceed the limit (10 requests) ──────────────
      console.log('--- Test 3: Exceed Rate Limit ---');
      // Send remaining 7 requests to hit the limit
      for (let i = 0; i < 7; i++) {
        await makeRequest(`${base}/api/trains`);
      }
      // 11th request — should be rejected
      const res3 = await makeRequest(`${base}/api/trains`);
      console.log('Status:', res3.status);
      // Output: Status: 429
      console.log('Body:', JSON.stringify(res3.body));
      // Output: Body: {"error":"Global rate limit exceeded","retryAfter":<number>}
      console.log('Retry-After:', res3.headers['retry-after'] ? 'present' : 'missing');
      // Output: Retry-After: present
      console.log('X-RateLimit-Remaining:', res3.headers['x-ratelimit-remaining']);
      // Output: X-RateLimit-Remaining: 0
      console.log();

      // ── Test 4: Tatkal rate limiter (stricter, 3 max) ────────
      console.log('--- Test 4: Tatkal Rate Limiter (3 Max) ---');
      for (let i = 1; i <= 4; i++) {
        const resTatkal = await makeRequest(`${base}/tatkal/book`, 'POST', {
          'Content-Type': 'application/json'
        }, JSON.stringify({ passengerName: 'Rajesh Kumar', trainNo: '12301' }));
        console.log(`  Tatkal attempt ${i}: status=${resTatkal.status}, remaining=${resTatkal.headers['x-ratelimit-remaining']}`);
      }
      // Output:   Tatkal attempt 1: status=200, remaining=2
      // Output:   Tatkal attempt 2: status=200, remaining=1
      // Output:   Tatkal attempt 3: status=200, remaining=0
      // Output:   Tatkal attempt 4: status=429, remaining=0
      console.log();

      // ── Test 5: Sliding window limiter ──────────────────────
      console.log('--- Test 5: Sliding Window Limiter ---');
      for (let i = 1; i <= 6; i++) {
        const resSlide = await makeRequest(`${base}/api/sliding`);
        console.log(`  Sliding request ${i}: status=${resSlide.status}, remaining=${resSlide.headers['x-ratelimit-remaining']}`);
      }
      // Output:   Sliding request 1: status=200, remaining=4
      // Output:   Sliding request 2: status=200, remaining=3
      // Output:   Sliding request 3: status=200, remaining=2
      // Output:   Sliding request 4: status=200, remaining=1
      // Output:   Sliding request 5: status=200, remaining=0
      // Output:   Sliding request 6: status=429, remaining=0
      console.log();

      // ── Test 6: Store inspection ────────────────────────────
      console.log('--- Test 6: Store Inspection ---');
      console.log('Global limiter store size:', globalLimiter.store.size);
      // Output: Global limiter store size: 1
      console.log('Tatkal limiter store size:', tatkalLimiter.store.size);
      // Output: Tatkal limiter store size: 1

      // WHY: Reset and verify it works
      globalLimiter.resetAll();
      console.log('After resetAll, store size:', globalLimiter.store.size);
      // Output: After resetAll, store size: 0

      // Verify we can make requests again after reset
      const resAfterReset = await makeRequest(`${base}/api/trains`);
      console.log('After reset, status:', resAfterReset.status);
      // Output: After reset, status: 200
      console.log('After reset, remaining:', resAfterReset.headers['x-ratelimit-remaining']);
      // Output: After reset, remaining: 9
      console.log();

      // ── Test 7: Custom key generator demonstration ──────────
      console.log('--- Test 7: Custom Key Generator (Different Passengers) ---');
      // WHY: Different passenger names should have independent rate limits
      tatkalLimiter.resetAll();

      const resPassenger1 = await makeRequest(`${base}/tatkal/book`, 'POST', {
        'Content-Type': 'application/json'
      }, JSON.stringify({ passengerName: 'Priya Sharma' }));
      console.log('Priya attempt 1:', resPassenger1.status, 'remaining:', resPassenger1.headers['x-ratelimit-remaining']);
      // Output: Priya attempt 1: 200 remaining: 2

      const resPassenger2 = await makeRequest(`${base}/tatkal/book`, 'POST', {
        'Content-Type': 'application/json'
      }, JSON.stringify({ passengerName: 'Amit Patel' }));
      console.log('Amit attempt 1:', resPassenger2.status, 'remaining:', resPassenger2.headers['x-ratelimit-remaining']);
      // Output: Amit attempt 1: 200 remaining: 2
      // WHY: Priya and Amit have SEPARATE counters because the key
      // generator combines IP + passengerName
      console.log('Tatkal store size (2 keys):', tatkalLimiter.store.size);
      // Output: Tatkal store size (2 keys): 2
      console.log();

    } catch (err) {
      console.error('Test error:', err.message);
    } finally {
      // ── Cleanup ─────────────────────────────────────────────
      slidingLimiter.cleanup(); // Clear the cleanup interval
      globalLimiter.resetAll();
      tatkalLimiter.resetAll();

      server.close(() => {
        console.log('Server closed.\n');

        // ── KEY TAKEAWAYS ─────────────────────────────────────
        console.log('KEY TAKEAWAYS:');
        console.log('1. Rate limiting protects against brute-force attacks, API abuse, and resource exhaustion.');
        console.log('2. Fixed window is simple but has a "boundary burst" problem — sliding window fixes this.');
        console.log('3. Standard headers (X-RateLimit-Limit, Remaining, Reset) let API consumers implement backoff.');
        console.log('4. Retry-After header tells clients exactly how long to wait before retrying.');
        console.log('5. Custom key generators let you rate-limit by IP, user, API key, or any combination.');
        console.log('6. Per-route limiting lets you protect sensitive endpoints (tatkal, payment) more aggressively.');
        console.log('7. In-memory stores work for single-server setups; use Redis for distributed rate limiting.');
        console.log('8. Always run a cleanup interval to prevent memory leaks from accumulating expired entries.');
        console.log('9. Use unref() on timers so they do not prevent clean process shutdown.');
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

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

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
    if (body) req.write(body);
    req.end();
  });
}

runTests();
