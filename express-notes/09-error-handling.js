/** ============================================================
 *  FILE 09 — Error Handling in Express 5
 *  Topic: Error middleware, sync/async errors, custom error
 *         classes, 404 handlers, and production patterns
 *  WHY THIS MATTERS: Unhandled errors crash servers and leak
 *  internals to attackers. Express 5 dramatically improved
 *  error handling — async errors are caught automatically!
 *  Knowing the error middleware pattern is essential for
 *  building robust, production-ready APIs.
 *  ============================================================ */

// ─────────────────────────────────────────────────────────────
// STORY: AIIMS Emergency Ward
// ─────────────────────────────────────────────────────────────
// Dr. Mehra runs the emergency ward at AIIMS Delhi. Every
// patient (request) might arrive healthy or with an emergency
// (error). Minor issues get a bandage (400 response), serious
// ones go to ICU (500 + log). The triage nurse (error
// middleware) examines every case, classifies severity, logs
// what happened, and sends the appropriate response. No
// patient leaves without being seen.
// ─────────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');

// ─────────────────────────────────────────────────────────────
// Helper — make an HTTP request
// ─────────────────────────────────────────────────────────────
function request(port, method, urlPath, { body, headers } = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method,
      headers: { ...(headers || {}) },
    };

    if (body) {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      opts.headers['Content-Length'] = Buffer.byteLength(payload);
      if (typeof body === 'object' && !opts.headers['Content-Type']) {
        opts.headers['Content-Type'] = 'application/json';
      }
    }

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// =============================================================
// BLOCK 1 — Sync Errors, Async Errors, next(err)
// =============================================================
// "When a patient collapses in the corridor, the emergency
//  ward automatically catches them — that's Express 5."
//
// Express 5 BIG CHANGE: Both sync throws AND rejected promises
// are automatically caught and forwarded to error middleware.
// In Express 4, you had to manually wrap async handlers.
// (See nodejs-notes/12 for promise/async-await fundamentals)
// ─────────────────────────────────────────────────────────────

async function block1() {
  console.log('=== BLOCK 1: Sync Errors, Async Errors, next(err) ===\n');

  const app = express();

  // ── Sync throw — Express 5 catches this! ───────────────────
  app.get('/sync-error', (req, res) => {
    // WHY: In Express 5, throwing in a sync handler is automatically
    // caught and forwarded to the error middleware.
    // In Express 4, this would crash the server!
    throw new Error('Sync collapse in the corridor');
  });

  // ── Async error — Express 5 catches rejected promises! ─────
  app.get('/async-error', async (req, res) => {
    // WHY: Express 5 detects that this handler returns a promise.
    // If the promise rejects, Express catches it and calls next(err).
    // In Express 4, this would be an unhandled rejection!
    const data = await simulateDbCall(false);
    res.json(data);   // This line never runs.
  });

  // ── Explicit next(err) — works in all Express versions ─────
  app.get('/next-error', (req, res, next) => {
    // WHY: Calling next() with an argument tells Express
    // "skip all remaining route handlers, go straight to
    // error middleware." This is the classic pattern.
    const err = new Error('Patient referred to specialist');
    err.status = 503;
    next(err);
  });

  // ── Async with next(err) — also valid ──────────────────────
  app.get('/async-next', async (req, res, next) => {
    try {
      await simulateDbCall(false);
    } catch (err) {
      // WHY: You can still use try/catch + next(err) if you
      // want to transform the error before forwarding.
      err.message = 'Database unreachable: ' + err.message;
      err.status = 503;
      next(err);
    }
  });

  // ── Successful async route — for contrast ──────────────────
  app.get('/async-success', async (req, res) => {
    const data = await simulateDbCall(true);
    res.json(data);
  });

  // ── Error-handling middleware — THE 4-PARAMETER SIGNATURE ──
  // WHY: Express identifies error middleware by its 4 parameters.
  // (err, req, res, next) — ALL FOUR are required!
  // It MUST be defined AFTER the routes it should catch.
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    res.status(status).json({
      error: err.message,
      status,
      caught: 'by error middleware',
    });
  });

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`  AIIMS Emergency Ward open on port ${port}\n`);

  // ── Test 1: Sync throw ─────────────────────────────────────
  console.log('  --- Test 1: GET /sync-error — sync throw (Express 5 catches) ---');
  const r1 = await request(port, 'GET', '/sync-error');
  console.log('  status:', r1.status);
  // Output: 500
  console.log('  error: ', r1.body.error);
  // Output: Sync collapse in the corridor
  console.log('  caught:', r1.body.caught);
  // Output: by error middleware
  console.log();

  // ── Test 2: Async rejected promise ─────────────────────────
  console.log('  --- Test 2: GET /async-error — rejected promise (Express 5 catches) ---');
  const r2 = await request(port, 'GET', '/async-error');
  console.log('  status:', r2.status);
  // Output: 500
  console.log('  error: ', r2.body.error);
  // Output: DB connection failed
  console.log();

  // ── Test 3: Explicit next(err) ─────────────────────────────
  console.log('  --- Test 3: GET /next-error — explicit next(err) ---');
  const r3 = await request(port, 'GET', '/next-error');
  console.log('  status:', r3.status);
  // Output: 503
  console.log('  error: ', r3.body.error);
  // Output: Patient referred to specialist
  console.log();

  // ── Test 4: Async try/catch + next(err) ────────────────────
  console.log('  --- Test 4: GET /async-next — async try/catch + next(err) ---');
  const r4 = await request(port, 'GET', '/async-next');
  console.log('  status:', r4.status);
  // Output: 503
  console.log('  error: ', r4.body.error);
  // Output: Database unreachable: DB connection failed
  console.log();

  // ── Test 5: Successful async (no error) ────────────────────
  console.log('  --- Test 5: GET /async-success — happy path ---');
  const r5 = await request(port, 'GET', '/async-success');
  console.log('  status:', r5.status);
  // Output: 200
  console.log('  body:  ', r5.body);
  // Output: { patient: 'stable', vitals: 'normal' }
  console.log();

  server.close();
}

// Simulates a database call
function simulateDbCall(succeed) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (succeed) {
        resolve({ patient: 'stable', vitals: 'normal' });
      } else {
        reject(new Error('DB connection failed'));
      }
    }, 10);
  });
}

// =============================================================
// BLOCK 2 — Custom Error Classes, Error Classification
// =============================================================
// "The emergency ward has specialized departments: cardiac,
//  burns, ortho. Dr. Mehra classifies each case so the right
//  team responds."
//
// Custom error classes let you carry structured metadata
// (status codes, error codes, details) through the error
// middleware chain.
// ─────────────────────────────────────────────────────────────

// ── Custom Error Classes ─────────────────────────────────────
// WHY: Plain Error objects only have a message. Custom classes
// let you attach status codes, error codes, and details — so
// your error middleware can respond precisely.

class AppError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;            // Machine-readable error code
    this.isOperational = true;   // WHY: Distinguishes expected errors
                                 // from programmer bugs.
  }
}

class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} with id '${id}' not found`, 404, 'RESOURCE_NOT_FOUND');
    this.name = 'NotFoundError';
    this.resource = resource;
    this.resourceId = id;
  }
}

class ValidationError extends AppError {
  constructor(fields) {
    super('Validation failed', 422, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.fields = fields;        // WHY: Carry per-field error details.
  }
}

class AuthError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTH_REQUIRED');
    this.name = 'AuthError';
  }
}

async function block2() {
  console.log('=== BLOCK 2: Custom Error Classes, Classification ===\n');

  const app = express();
  app.use(express.json());

  // ── Routes that throw custom errors ────────────────────────
  app.get('/patients/:id', (req, res) => {
    const validIds = ['1', '2', '3'];
    if (!validIds.includes(req.params.id)) {
      // WHY: Throw a structured error — the error middleware
      // knows exactly what happened and how to respond.
      throw new NotFoundError('Patient', req.params.id);
    }
    res.json({ id: req.params.id, name: 'Patient ' + req.params.id });
  });

  app.post('/patients', (req, res) => {
    const errors = {};
    if (!req.body.name) errors.name = 'Name is required';
    if (!req.body.age) errors.age = 'Age is required';
    if (req.body.age && req.body.age < 0) errors.age = 'Age must be positive';

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors);
    }

    res.status(201).json({ created: req.body });
  });

  app.get('/restricted', (req, res) => {
    if (!req.get('Authorization')) {
      throw new AuthError();
    }
    res.json({ secret: 'ICU access code: 42' });
  });

  app.get('/unexpected', (req, res) => {
    // WHY: This simulates a programmer bug — not operational.
    // The error middleware should treat this differently.
    const obj = null;
    obj.property;   // TypeError: Cannot read properties of null
  });

  // ── Error Classification Middleware ────────────────────────
  // WHY: This middleware inspects the error type and builds
  // a structured response. It distinguishes operational errors
  // (expected) from programmer bugs (unexpected).
  app.use((err, req, res, next) => {
    // ── Operational errors (we threw these on purpose) ────────
    if (err instanceof AppError) {
      const response = {
        error: {
          message: err.message,
          code: err.code,
          status: err.status,
        },
      };

      // WHY: Add extra details for specific error types.
      if (err instanceof ValidationError) {
        response.error.fields = err.fields;
      }
      if (err instanceof NotFoundError) {
        response.error.resource = err.resource;
        response.error.resourceId = err.resourceId;
      }

      return res.status(err.status).json(response);
    }

    // ── Unexpected errors (programmer bugs) ──────────────────
    // WHY: Don't expose internal details — just log and send 500.
    console.log(`  [AIIMS LOG] Unexpected error: ${err.message}`);
    res.status(500).json({
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        status: 500,
      },
    });
  });

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`  Specialized wards on port ${port}\n`);

  // ── Test 1: NotFoundError ──────────────────────────────────
  console.log('  --- Test 1: GET /patients/99 — NotFoundError ---');
  const r1 = await request(port, 'GET', '/patients/99');
  console.log('  status:  ', r1.status);
  // Output: 404
  console.log('  code:    ', r1.body.error.code);
  // Output: RESOURCE_NOT_FOUND
  console.log('  resource:', r1.body.error.resource);
  // Output: Patient
  console.log('  message: ', r1.body.error.message);
  // Output: Patient with id '99' not found
  console.log();

  // ── Test 2: ValidationError ────────────────────────────────
  console.log('  --- Test 2: POST /patients (empty body) — ValidationError ---');
  const r2 = await request(port, 'POST', '/patients', { body: {} });
  console.log('  status:', r2.status);
  // Output: 422
  console.log('  code:  ', r2.body.error.code);
  // Output: VALIDATION_ERROR
  console.log('  fields:', r2.body.error.fields);
  // Output: { name: 'Name is required', age: 'Age is required' }
  console.log();

  // ── Test 3: AuthError ──────────────────────────────────────
  console.log('  --- Test 3: GET /restricted (no auth) — AuthError ---');
  const r3 = await request(port, 'GET', '/restricted');
  console.log('  status:', r3.status);
  // Output: 401
  console.log('  code:  ', r3.body.error.code);
  // Output: AUTH_REQUIRED
  console.log();

  // ── Test 4: Auth success ───────────────────────────────────
  console.log('  --- Test 4: GET /restricted (with auth) — success ---');
  const r4 = await request(port, 'GET', '/restricted', {
    headers: { 'Authorization': 'Bearer token123' },
  });
  console.log('  status:', r4.status);
  // Output: 200
  console.log('  secret:', r4.body.secret);
  // Output: ICU access code: 42
  console.log();

  // ── Test 5: Unexpected error (programmer bug) ──────────────
  console.log('  --- Test 5: GET /unexpected — programmer bug ---');
  const r5 = await request(port, 'GET', '/unexpected');
  console.log('  status: ', r5.status);
  // Output: 500
  console.log('  code:   ', r5.body.error.code);
  // Output: INTERNAL_ERROR
  console.log('  message:', r5.body.error.message);
  // Output: Internal server error
  console.log('  (Notice: no internal details leaked to client)');
  console.log();

  // ── Test 6: Successful validation ──────────────────────────
  console.log('  --- Test 6: POST /patients (valid) — success ---');
  const r6 = await request(port, 'POST', '/patients', {
    body: { name: 'Anita Verma', age: 30 },
  });
  console.log('  status:', r6.status);
  // Output: 201
  console.log('  body:  ', r6.body);
  // Output: { created: { name: 'Anita Verma', age: 30 } }
  console.log();

  server.close();
}

// =============================================================
// BLOCK 3 — 404 Handler, Multiple Error Handlers, Prod vs Dev
// =============================================================
// "After every ward has been checked, if no one claimed the
//  patient, they get a 404 wristband. Then the logger records
//  the visit, and the responder sends them home."
//
// Express processes middleware in ORDER. The 404 handler must
// come AFTER all routes, and error handlers must come AFTER
// the 404 handler.
// ─────────────────────────────────────────────────────────────

async function block3() {
  console.log('=== BLOCK 3: 404, Multiple Error Handlers, Prod vs Dev ===\n');

  const errorLog = [];   // WHY: Collect logged errors for testing

  const app = express();

  // ── Some normal routes ─────────────────────────────────────
  app.get('/api/status', (req, res) => {
    res.json({ status: 'operational' });
  });

  app.get('/api/fail', (req, res) => {
    throw new AppError('Scheduled maintenance', 503, 'MAINTENANCE');
  });

  app.get('/api/crash', async (req, res) => {
    // WHY: Simulates an unexpected async error.
    await new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Memory overflow')), 10);
    });
  });

  // ── 404 Handler — MUST come after all routes ───────────────
  // WHY: If the request reaches here, no route matched.
  // This is NOT an error handler (only 3 params) — it's a
  // regular middleware that creates a 404 error and forwards it.
  app.use((req, res, next) => {
    const err = new AppError(
      `Route not found: ${req.method} ${req.originalUrl}`,
      404,
      'NOT_FOUND'
    );
    next(err);
  });

  // ── Error Handler 1: Logger ────────────────────────────────
  // WHY: You can chain multiple error handlers. The first logs
  // the error, then passes it along with next(err).
  app.use((err, req, res, next) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      status: err.status || 500,
      message: err.message,
      // WHY: In production you'd also log err.stack for debugging.
    };
    errorLog.push(logEntry);
    console.log(`  [ERROR LOG] ${logEntry.status} ${logEntry.method} ${logEntry.url} — ${logEntry.message}`);

    // WHY: Pass the error to the next error handler.
    // Without next(err), the chain stops here.
    next(err);
  });

  // ── Error Handler 2: Responder (prod vs dev) ───────────────
  // WHY: Separate logging from responding. The responder
  // decides what the CLIENT sees — which varies by environment.
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    const isDev = process.env.NODE_ENV !== 'production';

    const response = {
      error: {
        message: err.isOperational ? err.message : 'Internal server error',
        code: err.code || 'INTERNAL_ERROR',
        status,
      },
    };

    // WHY: In development, include the stack trace for debugging.
    // In production, NEVER leak internal details.
    if (isDev) {
      response.error.stack = err.stack ? err.stack.split('\n').slice(0, 3).join('\n') : undefined;
      response.error.detail = err.message;
    }

    res.status(status).json(response);
  });

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`  Full emergency pipeline on port ${port}\n`);

  // ── Test 1: Normal route works ─────────────────────────────
  console.log('  --- Test 1: GET /api/status — normal route ---');
  const r1 = await request(port, 'GET', '/api/status');
  console.log('  status:', r1.status);
  // Output: 200
  console.log('  body:  ', r1.body);
  // Output: { status: 'operational' }
  console.log();

  // ── Test 2: 404 for unknown route ──────────────────────────
  console.log('  --- Test 2: GET /api/nonexistent — 404 handler ---');
  const r2 = await request(port, 'GET', '/api/nonexistent');
  console.log('  status: ', r2.status);
  // Output: 404
  console.log('  code:   ', r2.body.error.code);
  // Output: NOT_FOUND
  console.log('  message:', r2.body.error.message);
  // Output: Route not found: GET /api/nonexistent
  console.log();

  // ── Test 3: Operational error (503) ────────────────────────
  console.log('  --- Test 3: GET /api/fail — operational error ---');
  const r3 = await request(port, 'GET', '/api/fail');
  console.log('  status: ', r3.status);
  // Output: 503
  console.log('  code:   ', r3.body.error.code);
  // Output: MAINTENANCE
  console.log('  message:', r3.body.error.message);
  // Output: Scheduled maintenance
  console.log();

  // ── Test 4: Unexpected async error ─────────────────────────
  console.log('  --- Test 4: GET /api/crash — unexpected async error ---');
  const r4 = await request(port, 'GET', '/api/crash');
  console.log('  status: ', r4.status);
  // Output: 500
  console.log('  message:', r4.body.error.message);
  // Output: Internal server error
  console.log('  (Has stack in dev?', r4.body.error.stack !== undefined, ')');
  // Output: (Has stack in dev? true )
  console.log();

  // ── Test 5: 404 for POST to unknown route ──────────────────
  console.log('  --- Test 5: POST /api/unknown — 404 for any method ---');
  const r5 = await request(port, 'POST', '/api/unknown');
  console.log('  status: ', r5.status);
  // Output: 404
  console.log('  message:', r5.body.error.message);
  // Output: Route not found: POST /api/unknown
  console.log();

  // ── Test 6: Verify error log ───────────────────────────────
  console.log('  --- Test 6: Error log review ---');
  console.log('  Total errors logged:', errorLog.length);
  // Output: 4
  errorLog.forEach((entry, i) => {
    console.log(`    ${i + 1}. [${entry.status}] ${entry.method} ${entry.url}`);
  });
  console.log();

  server.close();
}

// =============================================================
// RUN ALL BLOCKS
// =============================================================
async function main() {
  console.log('============================================================');
  console.log(' FILE 09 — Error Handling (AIIMS Emergency Ward)');
  console.log('============================================================\n');

  await block1();
  await block2();
  await block3();

  // ─────────────────────────────────────────────────────────────
  // KEY TAKEAWAYS
  // ─────────────────────────────────────────────────────────────
  console.log('=== KEY TAKEAWAYS ===\n');
  console.log('  1. Error middleware has FOUR parameters: (err, req, res, next).');
  console.log('     Express identifies it by the parameter count — all 4 required!');
  console.log('  2. Express 5 auto-catches sync throws AND rejected promises —');
  console.log('     no more wrapper functions needed for async handlers.');
  console.log('  3. next(err) explicitly forwards errors to error middleware,');
  console.log('     skipping all remaining non-error middleware.');
  console.log('  4. Custom error classes (AppError, NotFoundError, etc.) carry');
  console.log('     status, code, and details for structured error responses.');
  console.log('  5. isOperational distinguishes expected errors from programmer');
  console.log('     bugs — never leak internal details for unexpected errors.');
  console.log('  6. The 404 handler is a REGULAR middleware (3 params) placed');
  console.log('     AFTER all routes — it creates an error and calls next(err).');
  console.log('  7. Chain multiple error handlers: logger -> responder.');
  console.log('     Each calls next(err) to pass to the next one.');
  console.log('  8. In production, hide stack traces and internal messages.');
  console.log('     In development, include them for debugging.\n');

  console.log('Done. All servers closed cleanly.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
