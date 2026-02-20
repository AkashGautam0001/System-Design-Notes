/**
 * ============================================================
 *  FILE 3: The process Object
 * ============================================================
 *  Topic  : process.argv, process.env, process.cwd(), pid,
 *           ppid, uptime, exitCode, memoryUsage, hrtime,
 *           stdout.write, nextTick, signals, exit event.
 *
 *  WHY THIS MATTERS:
 *  The `process` object is your direct line to the operating
 *  system. It exposes command-line arguments, environment
 *  variables, memory statistics, precise timing, standard I/O
 *  streams, and lifecycle hooks. Every serious Node.js app
 *  interacts with `process` in some way.
 * ============================================================
 */

// ============================================================
// STORY: ISRO Launch Control
// Flight Director Meena monitors Chandrayaan telemetry from
// ISRO Sriharikota launch control. Every screen shows a
// different instrument:
// - argv panel — launch commands
// - env panel — launch parameters
// - memory gauge — system resource usage
// - comms console — stdout/stderr streams
// - lifecycle hooks — what to do on mission abort
// ============================================================

// ============================================================
// EXAMPLE BLOCK 1 — Identity & Environment
// ============================================================

console.log("=== BLOCK 1: Identity & Environment ===\n");

// ──────────────────────────────────────────────────────────
// SECTION 1 — process.argv (Launch Commands)
// ──────────────────────────────────────────────────────────
// WHY: process.argv is how CLI tools receive user input.
// argv[0] = path to node, argv[1] = path to script,
// argv[2+] = user-provided arguments.

console.log("--- process.argv ---");
console.log("  argv[0] (node binary) :", process.argv[0]);
// Output: argv[0] (node binary) : /usr/local/bin/node

console.log("  argv[1] (script path) :", process.argv[1]);
// Output: argv[1] (script path) : /path/to/03-process-object.js

console.log("  Full argv             :", process.argv);
// Output: Full argv             : [ '/usr/local/bin/node', '/path/to/script.js' ]

// WHY: Real CLI tools parse argv[2+] for flags like --port 3000.

// ──────────────────────────────────────────────────────────
// SECTION 2 — process.env (Launch Parameters)
// ──────────────────────────────────────────────────────────
// WHY: Environment variables configure apps without hardcoding
// secrets or settings. NODE_ENV, PORT, DATABASE_URL, etc.

console.log("\n--- process.env (selected) ---");
console.log("  NODE_ENV  :", process.env.NODE_ENV || "(not set)");
// Output: NODE_ENV  : (not set)  or  production / development

console.log("  SHELL     :", process.env.SHELL || "(not set)");
// Output: SHELL     : /bin/zsh  (or /bin/bash)

console.log("  HOME      :", process.env.HOME || process.env.USERPROFILE || "(not set)");
// Output: HOME      : /Users/username

// Show first 80 chars of PATH to keep output readable
const pathSnippet = (process.env.PATH || "").substring(0, 80);
console.log("  PATH (first 80 chars) :", pathSnippet + "...");
// Output: PATH (first 80 chars) : /usr/local/bin:/usr/bin:/bin:...

// WHY: Never log full env in production — it may contain secrets.

// ──────────────────────────────────────────────────────────
// SECTION 3 — Process Identity
// ──────────────────────────────────────────────────────────
// WHY: pid identifies this process to the OS (for signals,
// monitoring). ppid is the parent (usually your shell).

console.log("\n--- Process Identity ---");
console.log("  process.pid     :", process.pid);
// Output: process.pid     : <number, e.g. 12345>

console.log("  process.ppid    :", process.ppid);
// Output: process.ppid    : <parent process id>

console.log("  process.cwd()   :", process.cwd());
// Output: process.cwd()   : /current/working/directory

console.log("  process.title   :", process.title);
// Output: process.title   : node  (or custom title)

console.log("  process.uptime():", process.uptime().toFixed(4), "seconds");
// Output: process.uptime(): 0.0XXX seconds

console.log("  process.exitCode:", process.exitCode);
// Output: process.exitCode: undefined

// WHY: process.exitCode lets you set the exit code without
// calling process.exit() — the process exits naturally with
// that code when the event loop drains.

// ============================================================
// EXAMPLE BLOCK 2 — Memory & Precision Timing
// ============================================================

console.log("\n=== BLOCK 2: Memory & Precision Timing ===\n");

// ──────────────────────────────────────────────────────────
// SECTION 4 — process.memoryUsage()
// ──────────────────────────────────────────────────────────
// WHY: Memory leaks are the #1 cause of Node.js crashes in
// production. memoryUsage() lets you monitor and diagnose.

console.log("--- process.memoryUsage() ---");

const mem = process.memoryUsage();
const toMB = (bytes) => (bytes / 1024 / 1024).toFixed(2) + " MB";

console.log("  rss          :", toMB(mem.rss));
// Output: rss          : XX.XX MB
// WHY: Resident Set Size — total memory allocated by the OS
// for this process (heap + stack + code + C++ objects).

console.log("  heapTotal    :", toMB(mem.heapTotal));
// Output: heapTotal    : XX.XX MB
// WHY: Total size of V8's heap (allocated memory pool).

console.log("  heapUsed     :", toMB(mem.heapUsed));
// Output: heapUsed     : XX.XX MB
// WHY: Actual memory used by JS objects. If this grows
// continuously, you likely have a memory leak.

console.log("  external     :", toMB(mem.external));
// Output: external     : XX.XX MB
// WHY: Memory used by C++ objects bound to JS objects
// (e.g., Buffers allocated outside V8's heap).

console.log("  arrayBuffers :", toMB(mem.arrayBuffers));
// Output: arrayBuffers : XX.XX MB
// WHY: Memory for ArrayBuffers and SharedArrayBuffers.

// ──────────────────────────────────────────────────────────
// SECTION 5 — process.hrtime.bigint() (Nanosecond Timer)
// ──────────────────────────────────────────────────────────
// WHY: Date.now() = ms. performance.now() = sub-ms.
// hrtime.bigint() = nanosecond precision. Use it for
// micro-benchmarks where every nanosecond counts.

console.log("\n--- process.hrtime.bigint() Benchmark ---");

const iterations = 1_000_000;
const hrStart = process.hrtime.bigint();

// Benchmark: simple loop summing numbers
let benchSum = 0;
for (let i = 0; i < iterations; i++) {
  benchSum += i;
}

const hrEnd = process.hrtime.bigint();
const hrElapsedNs = hrEnd - hrStart;
const hrElapsedMs = Number(hrElapsedNs) / 1_000_000;

console.log("  Iterations       :", iterations.toLocaleString());
// Output: Iterations       : 1,000,000

console.log("  Sum              :", benchSum);
// Output: Sum              : 499999500000

console.log("  Elapsed (ns)     :", hrElapsedNs.toString());
// Output: Elapsed (ns)     : <nanoseconds, e.g. 2345678>

console.log("  Elapsed (ms)     :", hrElapsedMs.toFixed(4));
// Output: Elapsed (ms)     : <milliseconds, e.g. 2.3457>

console.log("  Ns per iteration :", (Number(hrElapsedNs) / iterations).toFixed(2));
// Output: Ns per iteration : <nanoseconds per loop, e.g. 2.35>

// WHY: hrtime.bigint() returns a BigInt. Use Number() to
// convert for arithmetic, but beware of precision loss on
// very large values.

// ============================================================
// EXAMPLE BLOCK 3 — Streams, Lifecycle & Signals
// ============================================================

console.log("\n=== BLOCK 3: Streams, Lifecycle & Signals ===\n");

// ──────────────────────────────────────────────────────────
// SECTION 6 — process.stdout.write() vs console.log()
// ──────────────────────────────────────────────────────────
// WHY: console.log() adds a newline and calls util.format().
// process.stdout.write() gives you raw control — essential
// for progress bars, spinners, and streaming output.

console.log("--- stdout.write vs console.log ---");

process.stdout.write("  stdout.write: no newline added");
process.stdout.write(" — continues on same line\n");
// Output: stdout.write: no newline added — continues on same line

console.log("  console.log: newline added automatically");
// Output: console.log: newline added automatically

// WHY: console.log is built on top of process.stdout.write.
// console.log("x") is roughly process.stdout.write("x\n").

// ──────────────────────────────────────────────────────────
// SECTION 7 — process.nextTick() Ordering
// ──────────────────────────────────────────────────────────
// WHY: nextTick fires BEFORE Promise.then and BEFORE I/O.
// It has the highest priority in the microtask queue.
// Order: sync > nextTick > Promise.then > setTimeout

console.log("\n--- process.nextTick() Ordering Demo ---");

console.log("  1. Synchronous — first");
// Output: 1. Synchronous — first

setTimeout(() => {
  console.log("  4. setTimeout — last (macrotask)");
  // Output: 4. setTimeout — last (macrotask)

  // All async demos are complete at this point.
  // Print the signal and exit sections here.
  printSignalDemo();
}, 0);

Promise.resolve().then(() => {
  console.log("  3. Promise.then — third (microtask)");
  // Output: 3. Promise.then — third (microtask)
});

process.nextTick(() => {
  console.log("  2. process.nextTick — second (before Promise)");
  // Output: 2. process.nextTick — second (before Promise)
});

/*
 * WHY this order?
 *   nextTick queue drains BEFORE the Promise microtask queue.
 *   Both drain BEFORE any macrotask (setTimeout).
 *
 *   Priority ladder:
 *     1. Synchronous call stack
 *     2. process.nextTick queue
 *     3. Promise microtask queue
 *     4. Macrotask queue (timers, I/O callbacks)
 */

// ──────────────────────────────────────────────────────────
// SECTION 8 — Signal Handling & Exit Hook
// ──────────────────────────────────────────────────────────

function printSignalDemo() {
  console.log("\n--- Signal Handling ---");

  // WHY: In production, you need graceful shutdown — close DB
  // connections, flush logs, finish in-flight requests.

  // Register a SIGINT handler (Ctrl+C)
  const sigintHandler = () => {
    console.log("  Caught SIGINT! Initiating mission abort sequence...");
  };

  process.on("SIGINT", sigintHandler);
  console.log("  SIGINT handler registered.");
  // Output: SIGINT handler registered.

  // Immediately remove it so the process doesn't hang
  process.removeListener("SIGINT", sigintHandler);
  console.log("  SIGINT handler removed (process won't hang).");
  // Output: SIGINT handler removed (process won't hang).

  // WHY: If you leave a SIGINT handler registered, Node.js will
  // NOT exit on Ctrl+C — it assumes you want to handle it. Always
  // call process.exit() inside your handler or remove it.

  // ──────────────────────────────────────────────────────
  // SECTION 9 — process.on('exit')
  // ──────────────────────────────────────────────────────
  // WHY: The 'exit' event fires when the event loop has nothing
  // left to do. Only SYNCHRONOUS code runs here — you cannot
  // start async operations in this callback.

  console.log("\n--- process.on('exit') ---");

  process.on("exit", (code) => {
    // This runs right before the process exits
    console.log("  [exit hook] Process exiting with code:", code);
    console.log("  [exit hook] Final uptime:", process.uptime().toFixed(4), "seconds");
    // Output: [exit hook] Process exiting with code: 0
    // Output: [exit hook] Final uptime: X.XXXX seconds

    // ============================================================
    // KEY TAKEAWAYS
    // ============================================================
    // 1. process.argv — launch commands; argv[2+] for user input.
    // 2. process.env — launch parameters; never log secrets.
    // 3. process.cwd() — current working directory (can change via chdir).
    // 4. process.pid/ppid — OS process identifiers.
    // 5. process.uptime() — seconds since the process started.
    // 6. process.exitCode — set to exit with a code without calling exit().
    // 7. process.memoryUsage() — rss, heapTotal, heapUsed, external,
    //    arrayBuffers. Monitor heapUsed for leak detection.
    // 8. process.hrtime.bigint() — nanosecond-precision timing for benchmarks.
    // 9. process.stdout.write() — raw output without trailing newline.
    // 10. process.nextTick() — fires before Promise.then, before I/O.
    //     Priority: sync > nextTick > Promise > setTimeout.
    // 11. process.on('SIGINT') — graceful shutdown on Ctrl+C. Remember to
    //     call process.exit() or remove the handler, or the process hangs.
    // 12. process.on('exit') — last-chance synchronous cleanup. No async
    //     operations allowed here.
    //
    // Flight Director Meena at ISRO Sriharikota says: "Know your
    // telemetry. A flight director who ignores the instruments
    // doesn't launch for long."
    // ============================================================
  });

  console.log("  Exit hook registered. Process will exit cleanly.\n");
  // Output: Exit hook registered. Process will exit cleanly.
}
