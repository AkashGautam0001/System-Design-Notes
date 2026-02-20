/** ============================================================
    FILE 26: Error Handling in Node.js
    ============================================================
    Topic: Callbacks, global handlers, abort, graceful shutdown
    WHY THIS MATTERS:
    Node.js has error patterns unique to its async nature.
    Error-first callbacks, unhandled rejections, and uncaught
    exceptions each need different handling. Getting this wrong
    means silent failures or crashed servers at 3 AM.
    ============================================================ */

// ============================================================
// STORY: AIIMS Hospital Error Handling
// Dr. Sharma runs the Emergency Ward at AIIMS Delhi. Every
// patient (error) gets triaged: known conditions like fever
// or fracture get standard callbacks, serious complications
// trigger global alarms, and when code blue strikes
// (uncaught exception), the entire ward evacuates gracefully.
// ============================================================

const fs = require('fs');
const path = require('path');

// ============================================================
// EXAMPLE BLOCK 1 — Error-First Callback Pattern
// ============================================================

console.log('=== Dr. Sharma opens the AIIMS Emergency Ward ===\n');

// ──────────────────────────────────────────────────────────
// The error-first callback convention: (err, result)
// ──────────────────────────────────────────────────────────
// WHY: Node's original async pattern. The first argument is
// always the error (or null if success).

function divideAsync(a, b, callback) {
  setImmediate(() => {
    if (typeof a !== 'number' || typeof b !== 'number') {
      return callback(new TypeError('Arguments must be numbers'));
    }
    if (b === 0) return callback(new RangeError('Division by zero'));
    callback(null, a / b);
    // WHY: null as first arg means "no error — patient stable!"
  });
}

divideAsync(10, 3, (err, result) => {
  if (err) { console.log(`Error: ${err.message}`); return; }
  console.log(`10 / 3 = ${result.toFixed(4)}`);
  // Output: 10 / 3 = 3.3333
});

divideAsync(10, 0, (err, result) => {
  if (err) {
    console.log(`Error (expected): ${err.constructor.name}: ${err.message}`);
    // Output: Error (expected): RangeError: Division by zero
    return;
  }
  console.log(`Result: ${result}`);
});

// ──────────────────────────────────────────────────────────
// Node.js error codes — system errors from the OS
// ──────────────────────────────────────────────────────────
// ENOENT — No such file or directory
// ECONNREFUSED — Connection refused (server not running)
// EACCES — Permission denied    EADDRINUSE — Port taken
// ECONNRESET — Connection reset ETIMEDOUT — Timed out

const fakeFile = path.join(__dirname, 'this-file-does-not-exist.txt');
try {
  fs.readFileSync(fakeFile);
} catch (err) {
  console.log(`\nTriggered: ${err.code} — ${err.message.split(',')[0]}`);
  // Output: Triggered: ENOENT — ENOENT: no such file or directory
  console.log(`  err.code: ${err.code}, err.syscall: ${err.syscall}`);
  // Output:   err.code: ENOENT, err.syscall: open
  // WHY: Use err.code (not err.message) for programmatic handling.
  if (err.code === 'ENOENT') {
    console.log('  -> Dr. Sharma diagnoses: missing patient file, check the record path.');
  }
}

// ──────────────────────────────────────────────────────────
// Custom errors with codes
// ──────────────────────────────────────────────────────────

class MedicalError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = 'MedicalError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const patientNotFound = new MedicalError('Patient record not found', 'PATIENT_NOT_FOUND', 404);
console.log(`\nCustom error: [${patientNotFound.code}] ${patientNotFound.message} (${patientNotFound.statusCode})`);
// Output: Custom error: [PATIENT_NOT_FOUND] Patient record not found (404)

// ============================================================
// EXAMPLE BLOCK 2 — Global Error Handlers
// ============================================================

console.log('\n--- BLOCK 2: Global Error Handlers ---\n');

// ──────────────────────────────────────────────────────────
// process.on('unhandledRejection') — uncaught promise errors
// ──────────────────────────────────────────────────────────
// WHY: If a Promise rejects without .catch(), Node emits
// 'unhandledRejection'. In Node 15+, this crashes by default.

let rejectionCaught = false;

const rejectionHandler = (reason) => {
  rejectionCaught = true;
  console.log('[Global] Unhandled Rejection caught!');
  console.log(`  Reason: ${reason}`);
  // Output: [Global] Unhandled Rejection caught!
  // Output:   Reason: OPD registration system failed
};

const exceptionHandler = (err) => {
  console.log(`[Global] Uncaught Exception: ${err.message}`);
  // WHY: After uncaughtException, process state is UNRELIABLE.
  // You should: log, flush, exit, let PM2/systemd restart.
  // NEVER try to "recover" from uncaughtException!
};

process.on('unhandledRejection', rejectionHandler);
process.on('uncaughtException', exceptionHandler);

// Trigger an unhandled rejection (promise without .catch)
Promise.reject('OPD registration system failed');

setTimeout(() => {
  console.log(`\n  rejectionCaught: ${rejectionCaught}`);
  // Output:   rejectionCaught: true

  // ──────────────────────────────────────────────────────────
  // process.on('uncaughtException') — synchronous throw escape
  // ──────────────────────────────────────────────────────────
  // WHY: If a throw escapes all try/catch, 'uncaughtException' fires.
  // Without this handler, the process crashes immediately.

  console.log('\n  Simulating code blue (uncaughtException) scenario...');
  try {
    throw new Error('Unexpected complication in surgery');
  } catch (err) {
    console.log(`  Caught locally: ${err.message}`);
    // In real code without try/catch, uncaughtException handler fires.
  }

  console.log('\n  Why uncaughtException should shut down (code blue protocol):');
  console.log('  1. Process state is unknown/corrupted');
  console.log('  2. Resources (DB, files) may be leaked');
  console.log('  3. Use process managers (PM2/systemd) to auto-restart');

  runBlock3();
}, 100);

// ============================================================
// EXAMPLE BLOCK 3 — AbortController and Graceful Shutdown
// ============================================================

function runBlock3() {
  console.log('\n--- BLOCK 3: AbortController and Graceful Shutdown ---\n');

  // ──────────────────────────────────────────────────────────
  // AbortController / AbortSignal — cancel async operations
  // ──────────────────────────────────────────────────────────
  // WHY: AbortController lets you cancel in-progress operations.

  const controller = new AbortController();
  const { signal } = controller;

  console.log('Starting a cancellable diagnostic timer...');
  const timeoutId = setTimeout(() => {
    console.log('  Timer fired (this should NOT appear)');
  }, 5000);

  signal.addEventListener('abort', () => {
    clearTimeout(timeoutId);
    console.log(`  Diagnostic cancelled! Reason: ${signal.reason}`);
    // Output:   Diagnostic cancelled! Reason: Patient discharged early
  });

  setTimeout(() => controller.abort('Patient discharged early'), 50);

  // ──────────────────────────────────────────────────────────
  // AbortSignal.timeout() — auto-cancel after duration
  // ──────────────────────────────────────────────────────────

  const autoSignal = AbortSignal.timeout(100);
  autoSignal.addEventListener('abort', () => {
    console.log(`  Auto-timeout aborted: ${autoSignal.reason.message}`);
    // Output:   Auto-timeout aborted: The operation was aborted due to timeout
  });

  // ──────────────────────────────────────────────────────────
  // Custom cancellable operation pattern
  // ──────────────────────────────────────────────────────────

  function cancellableWork(sig) {
    return new Promise((resolve, reject) => {
      if (sig.aborted) return reject(new Error('Already aborted'));
      const timer = setTimeout(() => resolve('Lab test completed'), 2000);
      sig.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error(`Aborted: ${sig.reason}`));
      }, { once: true });
    });
  }

  const ctrl2 = new AbortController();
  cancellableWork(ctrl2.signal)
    .then((r) => console.log(`  Result: ${r}`))
    .catch((e) => console.log(`  Cancelled work: ${e.message}`));
    // Output:   Cancelled work: Aborted: Test no longer needed
  setTimeout(() => ctrl2.abort('Test no longer needed'), 50);

  // ──────────────────────────────────────────────────────────
  // Graceful shutdown pattern — SIGTERM / SIGINT
  // ──────────────────────────────────────────────────────────
  // WHY: On kill signal, you must: stop accepting work, finish
  // in-flight requests, close DB, flush logs, exit cleanly.

  console.log('\n  Graceful shutdown pattern (AIIMS closing protocol):');
  const resources = {
    server: { close: () => console.log('    [Shutdown] OPD counter closed') },
    db:     { end:   () => console.log('    [Shutdown] Patient database closed') },
    cache:  { quit:  () => console.log('    [Shutdown] Lab report cache disconnected') },
  };

  function gracefulShutdown(sig) {
    console.log(`\n    [Shutdown] Received ${sig}. Initiating code blue protocol...`);
    resources.server.close();
    resources.db.end();
    resources.cache.quit();
    console.log('    [Shutdown] All hospital resources released.');
  }

  gracefulShutdown('SIGTERM');

  // In real code:
  // process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  // process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
  // setTimeout(() => { process.exit(1); }, 10000).unref();
  //   ^^ .unref() ensures timer won't keep process alive

  // ──────────────────────────────────────────────────────────
  // Clean up global handlers
  // ──────────────────────────────────────────────────────────
  setTimeout(() => {
    process.removeListener('unhandledRejection', rejectionHandler);
    process.removeListener('uncaughtException', exceptionHandler);
    console.log('\n=== Dr. Sharma clocks out. AIIMS Emergency Ward is stable. ===');
  }, 300);
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Error-first callbacks: always check err first, always
//    return after handling errors.
// 2. System errors have .code (ENOENT, ECONNREFUSED).
//    Use .code for programmatic checks, not .message.
// 3. unhandledRejection: log + consider shutdown.
//    In Node 15+, unhandled rejections crash by default.
// 4. uncaughtException: log + ALWAYS shut down.
//    The process state is unreliable after this.
// 5. AbortController cancels async ops cleanly via signal.
// 6. AbortSignal.timeout(ms) auto-cancels after delay.
// 7. Graceful shutdown: SIGTERM/SIGINT -> close server ->
//    close DB -> flush logs -> process.exit(0).
// 8. Use .unref() on shutdown timers so they don't keep
//    the process alive if cleanup finishes early.
// ============================================================
