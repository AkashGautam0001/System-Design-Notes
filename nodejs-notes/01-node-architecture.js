/**
 * ============================================================
 *  FILE 1: Node.js Architecture
 * ============================================================
 *  Topic  : V8 engine, libuv, single-threaded event-driven
 *           model, blocking vs non-blocking I/O.
 *
 *  WHY THIS MATTERS:
 *  Node.js is NOT just "JavaScript on the server." It pairs
 *  Google's V8 engine with libuv's asynchronous I/O layer to
 *  handle thousands of concurrent connections on a single
 *  thread. Understanding this architecture is the key to
 *  writing fast, scalable server-side code.
 * ============================================================
 */

// ============================================================
// STORY: NTPC Thermal Power Plant
// Operator Sharma ji (the single JS thread) sits at the control
// desk at NTPC Singrauli Plant. Sharma ji never leaves the
// desk — instead, he dispatches work orders to turbines (libuv's
// thread pool) and generators (OS async primitives). When a
// turbine finishes, it sends a signal back, and Sharma ji
// processes the result. This is how one operator can run an
// entire NTPC Singrauli Plant.
// ============================================================

const fs = require("fs");
const path = require("path");
const os = require("os");

// ============================================================
// EXAMPLE BLOCK 1 — Under the Hood: V8, libuv & the Runtime
// ============================================================

// ──────────────────────────────────────────────────────────
// SECTION 1 — The Three Pillars of Node.js
// ──────────────────────────────────────────────────────────
// WHY: Knowing what runs your code helps you understand its
// capabilities and limitations.
//
// 1. V8 ENGINE (Google)
//    - Compiles JavaScript to machine code (JIT compilation).
//    - Manages the heap (memory) and call stack.
//    - Knows nothing about files, networks, or timers.
//
// 2. LIBUV (C library)
//    - Provides the event loop, thread pool (default 4 threads),
//      and OS-level async I/O (epoll, kqueue, IOCP).
//    - Handles file system ops, DNS lookups, compression, etc.
//
// 3. NODE.JS BINDINGS (C++ glue)
//    - Bridge between JS-land and C/C++ libraries.
//    - When you call fs.readFile(), the binding hands it to
//      libuv, which dispatches it to a thread pool worker.
//
// SINGLE-THREADED MODEL:
//    Your JavaScript runs on ONE thread. Libuv does the heavy
//    lifting on background threads. Callbacks return results
//    to the single JS thread via the event loop.

console.log("=== BLOCK 1: Node.js Architecture Internals ===\n");

// ──────────────────────────────────────────────────────────
// SECTION 2 — process.versions: What Powers Your Runtime
// ──────────────────────────────────────────────────────────
// WHY: These version strings tell you exactly which engines
// and libraries your Node.js build was compiled with.

console.log("--- Component Versions ---");
console.log("  Node.js :", process.versions.node);
// Output: Node.js : <your node version, e.g. 20.11.0>

console.log("  V8      :", process.versions.v8);
// Output: V8      : <V8 version, e.g. 11.3.244.8>

console.log("  libuv   :", process.versions.uv);
// Output: libuv   : <libuv version, e.g. 1.46.0>

console.log("  OpenSSL :", process.versions.openssl);
// Output: OpenSSL : <openssl version, e.g. 3.0.12>

console.log("  zlib    :", process.versions.zlib);
// Output: zlib    : <zlib version>

console.log("  ICU     :", process.versions.icu);
// Output: ICU     : <ICU version for internationalisation>

// ──────────────────────────────────────────────────────────
// SECTION 3 — Platform & Architecture
// ──────────────────────────────────────────────────────────
// WHY: Server code must be platform-aware. File paths, line
// endings, and available system calls differ across OSes.

console.log("\n--- Platform Info ---");
console.log("  process.arch     :", process.arch);
// Output: process.arch     : x64  (or arm64 on Apple Silicon)

console.log("  process.platform :", process.platform);
// Output: process.platform : darwin  (or linux, win32)

console.log("  os.cpus().length :", os.cpus().length);
// Output: os.cpus().length : <number of logical CPU cores>

console.log("  os.type()        :", os.type());
// Output: os.type()        : Darwin  (or Linux, Windows_NT)

console.log("  os.totalmem() MB :", Math.round(os.totalmem() / 1024 / 1024));
// Output: os.totalmem() MB : <total system memory in MB>

// ============================================================
// EXAMPLE BLOCK 2 — Blocking vs Non-Blocking I/O
// ============================================================

// ──────────────────────────────────────────────────────────
// SECTION 4 — The NTPC Singrauli Plant Analogy in Action
// ──────────────────────────────────────────────────────────
// WHY: The #1 rule of Node.js is "don't block the event loop."
// Blocking calls freeze the single thread — no other request
// can be served until the blocking call returns.
//
// BLOCKING (Synchronous):
//   Operator Sharma ji walks to the turbine, stands there until
//   it finishes, then walks back to the desk. Nothing else
//   happens while he waits.
//
// NON-BLOCKING (Asynchronous):
//   Operator Sharma ji sends a work order, immediately handles
//   the next task, and processes the result when the turbine
//   signals completion.

console.log("\n=== BLOCK 2: Blocking vs Non-Blocking I/O ===\n");

// Create a temporary file for our demo
const tmpDir = os.tmpdir();
const tmpFile = path.join(tmpDir, "node-arch-demo.txt");
const demoContent = "Operator Sharma ji dispatched this work order to turbine.\n".repeat(500);

// Write the temp file synchronously (setup step)
fs.writeFileSync(tmpFile, demoContent);
console.log("Temp file created:", tmpFile);
console.log("File size:", Buffer.byteLength(demoContent), "bytes\n");

// ──────────────────────────────────────────────────────────
// SECTION 5 — Synchronous Read (Blocking)
// ──────────────────────────────────────────────────────────
// WHY: fs.readFileSync blocks the entire thread. Nothing else
// can execute — no timers fire, no callbacks run, no requests
// are served — until the read completes.

console.log("--- Synchronous (Blocking) Read ---");

const syncStart = Date.now();
const syncData = fs.readFileSync(tmpFile, "utf-8");
const syncEnd = Date.now();

console.log("  Bytes read  :", syncData.length);
console.log("  Time taken  :", syncEnd - syncStart, "ms");
console.log("  Thread was BLOCKED for the entire duration.");
// Output: Thread was BLOCKED for the entire duration.

// ──────────────────────────────────────────────────────────
// SECTION 6 — Asynchronous Read (Non-Blocking)
// ──────────────────────────────────────────────────────────
// WHY: fs.readFile hands work to libuv and returns immediately.
// The JS thread is free to do other things while the file is
// being read in the background.

console.log("\n--- Asynchronous (Non-Blocking) Read ---");

const asyncStart = Date.now();

console.log("  [before] Dispatching async read...");
// Output: [before] Dispatching async read...

fs.readFile(tmpFile, "utf-8", (err, data) => {
  if (err) throw err;
  const asyncEnd = Date.now();
  console.log("  [callback] Async read complete!");
  console.log("  Bytes read  :", data.length);
  console.log("  Time taken  :", asyncEnd - asyncStart, "ms");
  // Output: Time taken  : <small number> ms

  // ──────────────────────────────────────────────────────
  // SECTION 7 — Interleaving Proof
  // ──────────────────────────────────────────────────────
  // WHY: This proves the async read did NOT block. The
  // "interleaved" log below ran WHILE the file was being
  // read — Operator Sharma ji handled another task while
  // the turbine was working.

  console.log("\n--- Interleaving Summary ---");
  console.log("  The 'interleaved work' message printed BEFORE");
  console.log("  the async callback — proof that the thread was");
  console.log("  free to handle other tasks during the read.\n");

  // ──────────────────────────────────────────────────────
  // Clean up temp file
  // ──────────────────────────────────────────────────────
  fs.unlink(tmpFile, (unlinkErr) => {
    if (unlinkErr) console.error("  Cleanup error:", unlinkErr.message);
    else console.log("  Temp file cleaned up:", tmpFile);

    // ============================================================
    // KEY TAKEAWAYS
    // ============================================================
    // 1. Node.js = V8 (JS engine) + libuv (async I/O) + C++ bindings.
    // 2. JavaScript runs on a SINGLE THREAD — the event loop.
    // 3. libuv provides a thread pool (default 4) for file I/O,
    //    DNS lookups, and other blocking OS operations.
    // 4. process.versions reveals which V8, libuv, and OpenSSL
    //    your Node.js was built with.
    // 5. process.arch and process.platform help write cross-
    //    platform code.
    // 6. BLOCKING (sync) calls freeze the thread — no other work
    //    happens until they return. Avoid in server code.
    // 7. NON-BLOCKING (async) calls dispatch to libuv and return
    //    immediately — the thread stays free to serve other requests.
    // 8. Always prefer async APIs in production Node.js code.
    //    Sync versions are acceptable only during startup or in
    //    CLI scripts where concurrency is irrelevant.
    //
    // Operator Sharma ji at NTPC Singrauli says: "Never leave the
    // control desk — dispatch the work and wait for the signal."
    // ============================================================
  });
});

// This runs IMMEDIATELY after dispatching the async read —
// it does NOT wait for the file read to complete.
console.log("  [after]  Interleaved work while file is being read!");
// Output: [after]  Interleaved work while file is being read!

// WHY: This line executes before the callback because fs.readFile
// is non-blocking. Operator Sharma ji returned to the desk and
// handled the next task while libuv's thread pool read the file.
