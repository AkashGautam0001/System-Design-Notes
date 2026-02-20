/** ============================================================
 *  FILE 4: Middleware Fundamentals — The Heart of Express
 *  WHY THIS MATTERS: Middleware is Express's core abstraction.
 *  Every request passes through a pipeline of middleware
 *  functions.  Routing, parsing, auth, logging, error handling
 *  — they are ALL middleware.  Understand middleware and you
 *  understand Express.
 *  ============================================================ */

// ─── Delhi Metro Security Checkpoints ─────────────────────────
//
// At Delhi Metro, every commuter walks through a series of
// security checkpoints before boarding:
//
//   1. Bag scan       (logger — records who's arriving)
//   2. Metal detector (timing — measures processing time)
//   3. CISF officer   (auth — verifies identity)
//   4. Token check    (conditional — only for certain lines)
//   5. Platform gate  (route handler — final destination)
//
// Each checkpoint can:
//   - Inspect and modify the commuter's info (req, res)
//   - Pass the commuter to the next checkpoint (next())
//   - Stop the commuter and send them back (res.send())
//   - Skip to a different lane (next('route'))
//
// ORDER MATTERS: You can't board before the bag scan.
// If a checkpoint doesn't call next(), the commuter is stuck.
//
// (See nodejs-notes/08 for HTTP request lifecycle fundamentals)

const express = require('express');
const http = require('http');

// ════════════════════════════════════════════════════════════════
// BLOCK 1 — Logger, Timing, and Request Counter Middleware
// ════════════════════════════════════════════════════════════════

function block1_basicMiddleware() {
  return new Promise((resolve) => {
    const app = express();
    const logs = [];        // Collect logs for test verification
    let requestCount = 0;   // Global request counter

    // ─── Middleware #1: Request Logger ─────────────────────────
    app.use((req, res, next) => {
      // WHY: A middleware is just a function with (req, res, next).
      // app.use() with NO path mounts it on ALL routes.
      const logEntry = `${req.method} ${req.url}`;
      logs.push(logEntry);
      console.log(`  [LOG] ${logEntry}`);
      next();
      // WHY: next() passes control to the NEXT middleware in the
      // stack.  Without it, the request hangs forever — the
      // commuter is stuck at the checkpoint.
    });

    // ─── Middleware #2: Request Timer ─────────────────────────
    app.use((req, res, next) => {
      // WHY: Middleware can attach data to `req` for downstream
      // handlers to use.  Here we record the start time.
      req.startTime = Date.now();

      // Intercept the response finish to calculate duration
      res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        console.log(`  [TIMER] ${req.method} ${req.url} took ${duration}ms`);
      });

      next();
    });

    // ─── Middleware #3: Request Counter ────────────────────────
    app.use((req, res, next) => {
      // WHY: Middleware runs for EVERY matching request, making it
      // perfect for cross-cutting concerns like counting, logging,
      // and rate limiting.
      requestCount++;
      req.requestNumber = requestCount;
      next();
    });

    // ─── Routes ───────────────────────────────────────────────
    app.get('/lines', (req, res) => {
      res.json({
        lines: ['Blue Line', 'Yellow Line'],
        requestNumber: req.requestNumber,
      });
    });

    app.get('/stations', (req, res) => {
      res.json({
        stations: ['Rajiv Chowk', 'Kashmere Gate', 'Hauz Khas'],
        requestNumber: req.requestNumber,
      });
    });

    app.get('/stats', (req, res) => {
      res.json({
        totalRequests: requestCount,
        logs: logs,
      });
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log('=== BLOCK 1: Logger, Timer, Counter Middleware ===');
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test — middleware runs on every request ───────────
        const r1 = await fetch(`${base}/lines`);
        const d1 = await r1.json();
        console.log('GET /lines:', JSON.stringify(d1));
        // Output: GET /lines: {"lines":["Blue Line","Yellow Line"],"requestNumber":1}

        const r2 = await fetch(`${base}/stations`);
        const d2 = await r2.json();
        console.log('GET /stations:', JSON.stringify(d2));
        // Output: GET /stations: {"stations":["Rajiv Chowk","Kashmere Gate","Hauz Khas"],"requestNumber":2}

        const r3 = await fetch(`${base}/lines`);
        const d3 = await r3.json();
        console.log('GET /lines (2nd):', JSON.stringify(d3));
        // Output: GET /lines (2nd): {"lines":["Blue Line","Yellow Line"],"requestNumber":3}

        // ─── Verify stats ─────────────────────────────────────
        const r4 = await fetch(`${base}/stats`);
        const d4 = await r4.json();
        console.log('GET /stats:', JSON.stringify(d4));
        // Output: GET /stats: {"totalRequests":4,"logs":["GET /lines","GET /stations","GET /lines","GET /stats"]}

        // ─── Middleware order summary ──────────────────────────
        console.log('\n  Middleware execution order for each request:');
        console.log('  1. Logger  -> logs method + url');
        console.log('  2. Timer   -> records start time');
        console.log('  3. Counter -> increments count');
        console.log('  4. Route handler -> sends response');
      } catch (err) {
        console.error('Test error:', err.message);
      }

      server.close(() => {
        console.log('\nBlock 1 server closed.\n');
        resolve();
      });
    });
  });
}

// ════════════════════════════════════════════════════════════════
// BLOCK 2 — Auth Middleware, Conditional Middleware, Multi-stack
// ════════════════════════════════════════════════════════════════

function block2_authAndConditional() {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    // ─── Auth middleware — checks for a token header ──────────
    function authMiddleware(req, res, next) {
      // WHY: Auth middleware inspects credentials.  If invalid, it
      // stops the pipeline by sending a response (no next() call).
      // If valid, it attaches user info to req and calls next().
      const token = req.headers['x-auth-token'];

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
        // WHY: NOT calling next() here — the request stops.
        // The commuter was turned away at the checkpoint.
      }

      if (token !== 'secret-123') {
        return res.status(403).json({ error: 'Invalid token' });
      }

      // Attach user info for downstream handlers
      req.user = { id: 1, name: 'Inspector Sharma', role: 'admin' };
      next();
    }

    // ─── Role-check middleware (parameterised) ────────────────
    function requireRole(role) {
      // WHY: This is a middleware FACTORY — a function that RETURNS
      // a middleware function.  It lets you configure middleware
      // with parameters.  We'll explore this more in Block 3.
      return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
          return res.status(403).json({ error: `Role '${role}' required` });
        }
        next();
      };
    }

    // ─── Public route — no auth needed ────────────────────────
    app.get('/public', (req, res) => {
      res.json({ message: 'This is public — no auth required' });
    });

    // ─── Protected route — auth middleware inline ─────────────
    app.get('/profile', authMiddleware, (req, res) => {
      // WHY: Placing authMiddleware as the second argument makes it
      // a ROUTE-LEVEL middleware.  It only runs for this route,
      // not globally.  Multiple middleware on one route execute
      // left to right.
      res.json({ user: req.user });
    });

    // ─── Multiple middleware on one route ──────────────────────
    app.get('/admin', authMiddleware, requireRole('admin'), (req, res) => {
      // WHY: You can stack as many middleware as you need.
      // They run in order: authMiddleware first, then requireRole,
      // then the final handler.  If any stops, the rest don't run.
      res.json({ message: 'Welcome to the admin panel', user: req.user });
    });

    // ─── Conditional middleware — only log POST requests ──────
    app.use((req, res, next) => {
      // WHY: Middleware can choose to do work conditionally.
      // This is a pattern for request-type-specific logic
      // without creating separate middleware stacks.
      if (req.method === 'POST') {
        console.log(`  [CONDITIONAL] POST body keys: ${Object.keys(req.body || {}).join(', ')}`);
      }
      next();
    });

    app.post('/data', authMiddleware, (req, res) => {
      res.status(201).json({ received: req.body, by: req.user.name });
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log('=== BLOCK 2: Auth, Conditional, Multi-stack Middleware ===');
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test public route (no auth) ──────────────────────
        const pubRes = await fetch(`${base}/public`);
        const pubData = await pubRes.json();
        console.log('GET /public:', JSON.stringify(pubData));
        // Output: GET /public: {"message":"This is public — no auth required"}

        // ─── Test protected route — no token ──────────────────
        const noTokenRes = await fetch(`${base}/profile`);
        const noTokenData = await noTokenRes.json();
        console.log('GET /profile (no token):', noTokenRes.status, JSON.stringify(noTokenData));
        // Output: GET /profile (no token): 401 {"error":"No token provided"}

        // ─── Test protected route — bad token ─────────────────
        const badTokenRes = await fetch(`${base}/profile`, {
          headers: { 'x-auth-token': 'wrong' },
        });
        const badTokenData = await badTokenRes.json();
        console.log('GET /profile (bad token):', badTokenRes.status, JSON.stringify(badTokenData));
        // Output: GET /profile (bad token): 403 {"error":"Invalid token"}

        // ─── Test protected route — valid token ───────────────
        const goodRes = await fetch(`${base}/profile`, {
          headers: { 'x-auth-token': 'secret-123' },
        });
        const goodData = await goodRes.json();
        console.log('GET /profile (valid):', JSON.stringify(goodData));
        // Output: GET /profile (valid): {"user":{"id":1,"name":"Inspector Sharma","role":"admin"}}

        // ─── Test admin route — valid token + correct role ────
        const adminRes = await fetch(`${base}/admin`, {
          headers: { 'x-auth-token': 'secret-123' },
        });
        const adminData = await adminRes.json();
        console.log('GET /admin (valid admin):', JSON.stringify(adminData));
        // Output: GET /admin (valid admin): {"message":"Welcome to the admin panel","user":{"id":1,"name":"Inspector Sharma","role":"admin"}}

        // ─── Test POST with auth and conditional logging ──────
        const postRes = await fetch(`${base}/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': 'secret-123',
          },
          body: JSON.stringify({ line: 'Blue Line', station: 'Rajiv Chowk' }),
        });
        const postData = await postRes.json();
        console.log('POST /data:', postRes.status, JSON.stringify(postData));
        // Output: POST /data: 201 {"received":{"line":"Blue Line","station":"Rajiv Chowk"},"by":"Inspector Sharma"}
      } catch (err) {
        console.error('Test error:', err.message);
      }

      server.close(() => {
        console.log('\nBlock 2 server closed.\n');
        resolve();
      });
    });
  });
}

// ════════════════════════════════════════════════════════════════
// BLOCK 3 — next('route'), Middleware Factories, Order Matters
// ════════════════════════════════════════════════════════════════

// ─── next('route') explained ──────────────────────────────────
//
// Normal next() passes control to the next middleware/handler
// in the SAME route stack.
//
// next('route') skips ALL remaining handlers for the CURRENT
// route and jumps to the NEXT matching route definition.
//
// Think of it as "this checkpoint says: take a different lane."

function block3_nextRouteAndFactories() {
  return new Promise((resolve) => {
    const app = express();
    const executionLog = [];

    // ─── Middleware factory — creates configurable middleware ──
    function securityCheck(checkpointName) {
      // WHY: A middleware factory is a FUNCTION that RETURNS a
      // middleware function.  This lets you parameterise behavior.
      // Same pattern as requireRole() in Block 2, but more general.
      return (req, res, next) => {
        executionLog.push(`checkpoint:${checkpointName}`);
        console.log(`  [CHECKPOINT] Passing through: ${checkpointName}`);
        next();
      };
    }

    // ─── Middleware factory — rate limiter (simple version) ────
    function rateLimit(maxRequests) {
      let count = 0;
      // WHY: The factory closure captures `count` — each call to
      // rateLimit() creates a SEPARATE counter.  This is how you
      // create independent rate limiters for different routes.
      return (req, res, next) => {
        count++;
        if (count > maxRequests) {
          return res.status(429).json({ error: 'Too many requests', limit: maxRequests });
        }
        next();
      };
    }

    // ─── Demo: next('route') ──────────────────────────────────
    // First route definition for /entry
    app.get(
      '/entry',
      (req, res, next) => {
        executionLog.push('entry:check-pass');
        const hasPass = req.headers['x-metro-pass'] === 'true';

        if (hasPass) {
          // WHY: Metro pass holders skip the rest of THIS route's
          // handlers and go to the NEXT matching route definition.
          console.log('  [PASS] Skipping to express lane');
          return next('route');
        }
        next();
      },
      (req, res) => {
        // This handler only runs for NON-pass commuters
        executionLog.push('entry:regular-lane');
        res.json({ lane: 'regular', message: 'Standard entry via token' });
      }
    );

    // Second route definition for /entry — the pass lane
    app.get('/entry', (req, res) => {
      // WHY: next('route') from above jumps HERE — the next
      // matching route definition for the same method + path.
      executionLog.push('entry:pass-lane');
      res.json({ lane: 'metro-pass', message: 'Priority entry!' });
    });

    // ─── Demo: middleware execution order matters ──────────────
    // This route uses the security check factory to show order
    app.get(
      '/security',
      securityCheck('bag-scan'),
      securityCheck('metal-detector'),
      securityCheck('cisf-officer'),
      (req, res) => {
        executionLog.push('security:cleared');
        res.json({
          status: 'cleared',
          checkpoints: ['bag-scan', 'metal-detector', 'cisf-officer'],
        });
      }
    );

    // ─── Demo: middleware factory — rate limiter ───────────────
    const limitedEndpoint = rateLimit(3);

    app.get('/limited', limitedEndpoint, (req, res) => {
      res.json({ message: 'Request allowed' });
    });

    // ─── Demo: execution log endpoint ─────────────────────────
    app.get('/log', (req, res) => {
      res.json({ executionLog });
    });

    // ─── Demo: middleware order matters ────────────────────────
    // If you put a "catch-all" BEFORE specific routes, it wins.
    // We'll demonstrate with a specific pattern.

    const orderApp = express();
    const orderLog = [];

    // This middleware runs first for /order-test
    orderApp.use('/order-test', (req, res, next) => {
      orderLog.push('middleware-1');
      next();
    });

    // This middleware runs second
    orderApp.use('/order-test', (req, res, next) => {
      orderLog.push('middleware-2');
      next();
    });

    // Route handler runs last
    orderApp.get('/order-test', (req, res) => {
      orderLog.push('handler');
      res.json({ orderLog: [...orderLog] });
    });

    // Mount the sub-app
    app.use(orderApp);

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log('=== BLOCK 3: next(\'route\'), Factories, Order Matters ===');
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test next('route') — regular commuter ────────────
        const regRes = await fetch(`${base}/entry`);
        const regData = await regRes.json();
        console.log('GET /entry (regular):', JSON.stringify(regData));
        // Output: GET /entry (regular): {"lane":"regular","message":"Standard entry via token"}

        // ─── Test next('route') — metro pass holder ───────────
        const passRes = await fetch(`${base}/entry`, {
          headers: { 'x-metro-pass': 'true' },
        });
        const passData = await passRes.json();
        console.log('GET /entry (metro pass):', JSON.stringify(passData));
        // Output: GET /entry (metro pass): {"lane":"metro-pass","message":"Priority entry!"}

        // ─── Test middleware factories — security checks ───────
        const secRes = await fetch(`${base}/security`);
        const secData = await secRes.json();
        console.log('GET /security:', JSON.stringify(secData));
        // Output: GET /security: {"status":"cleared","checkpoints":["bag-scan","metal-detector","cisf-officer"]}

        // ─── Test rate limiter factory ─────────────────────────
        let limitResults = [];
        for (let i = 1; i <= 4; i++) {
          const r = await fetch(`${base}/limited`);
          const d = await r.json();
          limitResults.push({ attempt: i, status: r.status, body: d });
        }
        console.log('Rate limit test (4 attempts, limit 3):');
        limitResults.forEach((r) => {
          console.log(`  Attempt ${r.attempt}: ${r.status} ${JSON.stringify(r.body)}`);
        });
        // Output:   Attempt 1: 200 {"message":"Request allowed"}
        // Output:   Attempt 2: 200 {"message":"Request allowed"}
        // Output:   Attempt 3: 200 {"message":"Request allowed"}
        // Output:   Attempt 4: 429 {"error":"Too many requests","limit":3}

        // ─── Test middleware order ─────────────────────────────
        const orderRes = await fetch(`${base}/order-test`);
        const orderData = await orderRes.json();
        console.log('GET /order-test:', JSON.stringify(orderData));
        // Output: GET /order-test: {"orderLog":["middleware-1","middleware-2","handler"]}

        // ─── Verify execution log ─────────────────────────────
        const logRes = await fetch(`${base}/log`);
        const logData = await logRes.json();
        console.log('Execution log:', JSON.stringify(logData.executionLog));
        // Output: Execution log: ["entry:check-pass","entry:regular-lane","entry:check-pass","entry:pass-lane","checkpoint:bag-scan","checkpoint:metal-detector","checkpoint:cisf-officer","security:cleared"]
      } catch (err) {
        console.error('Test error:', err.message);
      }

      server.close(() => {
        console.log('\nBlock 3 server closed.');
        resolve();
      });
    });
  });
}

// ════════════════════════════════════════════════════════════════
// Run all blocks sequentially, then exit
// ════════════════════════════════════════════════════════════════

async function main() {
  await block1_basicMiddleware();
  await block2_authAndConditional();
  await block3_nextRouteAndFactories();

  console.log('\n=== KEY TAKEAWAYS ===');
  console.log('1. Middleware is any function with (req, res, next) — it IS Express\'s core pattern.');
  console.log('2. app.use() mounts application-level middleware; inline args mount route-level.');
  console.log('3. next() passes control forward; WITHOUT it the request hangs forever.');
  console.log('4. next(\'route\') skips remaining handlers on the current route to the next match.');
  console.log('5. Middleware order matters — they execute in the order they are defined.');
  console.log('6. Middleware factories (functions returning middleware) let you parameterise behavior.');
  console.log('7. Auth pattern: check credentials -> reject or attach user -> call next().');
  console.log('8. Middleware can modify req (add properties) and res (set headers) for downstream use.');

  process.exit(0);
}

main();
