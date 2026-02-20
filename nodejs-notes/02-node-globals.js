/**
 * ============================================================
 *  FILE 2: Node.js Global Objects
 * ============================================================
 *  Topic  : global, globalThis, __dirname, __filename,
 *           Buffer, URL, TextEncoder/TextDecoder,
 *           structuredClone, queueMicrotask, performance.
 *
 *  WHY THIS MATTERS:
 *  Node.js provides a set of globally available objects and
 *  functions that are always accessible without require().
 *  Knowing what's on the "dashboard" means you won't waste
 *  time importing things that are already at your fingertips.
 * ============================================================
 */

// ============================================================
// STORY: ISRO Satellite Dashboard
// Every mission scientist at ISRO's mission control has
// instrument panels that are always visible — propulsion
// telemetry, orbit parameters, comms status. They never have
// to "import" these panels; they are built into the control
// room. Node.js globals work the same way: they are always
// available, in every module, without require.
// ============================================================

// ============================================================
// EXAMPLE BLOCK 1 — The Built-In Instrument Panels
// ============================================================

console.log("=== BLOCK 1: Built-In Globals ===\n");

// ──────────────────────────────────────────────────────────
// SECTION 1 — global and globalThis
// ──────────────────────────────────────────────────────────
// WHY: In browsers the global object is `window`. In Node.js
// it is `global`. `globalThis` is the universal standard that
// works in both environments (ES2020+).

console.log("--- global vs globalThis ---");
console.log("  typeof global      :", typeof global);
// Output: typeof global      : object

console.log("  typeof globalThis  :", typeof globalThis);
// Output: typeof globalThis  : object

console.log("  globalThis === global :", globalThis === global);
// Output: globalThis === global : true

// WHY: Use `globalThis` in code that must run in Node AND browsers.
// Use `global` only in Node-specific code.

// ──────────────────────────────────────────────────────────
// SECTION 2 — __dirname and __filename
// ──────────────────────────────────────────────────────────
// WHY: These tell you exactly where the currently executing
// file lives on disk — essential for resolving relative paths
// to data files, templates, or config.
//
// NOTE: __dirname and __filename are available in CommonJS
// modules. In ES modules, use import.meta.dirname and
// import.meta.filename (Node 21.2+) or import.meta.url.

console.log("\n--- __dirname and __filename ---");
console.log("  __dirname  :", __dirname);
// Output: __dirname  : /absolute/path/to/nodejs-notes

console.log("  __filename :", __filename);
// Output: __filename : /absolute/path/to/nodejs-notes/02-node-globals.js

// ──────────────────────────────────────────────────────────
// SECTION 3 — Buffer (Binary Data Panel)
// ──────────────────────────────────────────────────────────
// WHY: JavaScript strings are UTF-16. When working with raw
// binary data (files, network packets, crypto), you need
// Buffer — Node's fixed-length byte array.

console.log("\n--- Buffer ---");

const buf = Buffer.from("hello");
console.log("  Buffer.from('hello') :", buf);
// Output: Buffer.from('hello') : <Buffer 68 65 6c 6c 6f>

console.log("  buf.toString()       :", buf.toString());
// Output: buf.toString()       : hello

console.log("  buf.length           :", buf.length);
// Output: buf.length           : 5

console.log("  buf.toJSON()         :", buf.toJSON());
// Output: buf.toJSON()         : { type: 'Buffer', data: [ 104, 101, 108, 108, 111 ] }

const buf2 = Buffer.alloc(4);
buf2.writeUInt32BE(0xdeadbeef);
console.log("  0xDEADBEEF as Buffer :", buf2);
// Output: 0xDEADBEEF as Buffer : <Buffer de ad be ef>

// ──────────────────────────────────────────────────────────
// SECTION 4 — URL (Navigation Panel)
// ──────────────────────────────────────────────────────────
// WHY: The WHATWG URL API is globally available in Node.js.
// It parses, constructs, and manipulates URLs reliably —
// far safer than string splitting.

console.log("\n--- URL ---");

const myUrl = new URL("https://isro.gov.in:8080/api/satellites?active=true&mission=chandrayaan#section1");
console.log("  href     :", myUrl.href);
// Output: href     : https://isro.gov.in:8080/api/satellites?active=true&mission=chandrayaan#section1

console.log("  protocol :", myUrl.protocol);
// Output: protocol : https:

console.log("  hostname :", myUrl.hostname);
// Output: hostname : isro.gov.in

console.log("  port     :", myUrl.port);
// Output: port     : 8080

console.log("  pathname :", myUrl.pathname);
// Output: pathname : /api/satellites

console.log("  search   :", myUrl.search);
// Output: search   : ?active=true&mission=chandrayaan

console.log("  hash     :", myUrl.hash);
// Output: hash     : #section1

// URLSearchParams is also global
const params = myUrl.searchParams;
console.log("  active   :", params.get("active"));
// Output: active   : true

console.log("  mission  :", params.get("mission"));
// Output: mission  : chandrayaan

// ──────────────────────────────────────────────────────────
// SECTION 5 — TextEncoder and TextDecoder
// ──────────────────────────────────────────────────────────
// WHY: Convert between strings and Uint8Array (byte arrays).
// Useful for streams, WebSocket messages, and crypto operations.

console.log("\n--- TextEncoder / TextDecoder ---");

const encoder = new TextEncoder();
const encoded = encoder.encode("ISRO Chandrayaan");
console.log("  Encoded bytes    :", encoded);
// Output: Encoded bytes    : Uint8Array(16) [ 73, 83, 82, ... ]

console.log("  Byte length      :", encoded.byteLength);
// Output: Byte length      : 16

const decoder = new TextDecoder();
const decoded = decoder.decode(encoded);
console.log("  Decoded string   :", decoded);
// Output: Decoded string   : ISRO Chandrayaan

// UTF-8 multi-byte characters
const emojiEncoded = encoder.encode("Hi");
console.log("  'Hi' byte length :", emojiEncoded.byteLength);
// Output: 'Hi' byte length : 2

// ============================================================
// EXAMPLE BLOCK 2 — Advanced Global Utilities
// ============================================================

console.log("\n=== BLOCK 2: Advanced Global Utilities ===\n");

// ──────────────────────────────────────────────────────────
// SECTION 6 — structuredClone (Deep Copy Panel)
// ──────────────────────────────────────────────────────────
// WHY: JSON.parse(JSON.stringify(obj)) fails on Dates, Maps,
// Sets, RegExps, circular refs, etc. structuredClone handles
// them all correctly, and it's a global — no library needed.

console.log("--- structuredClone ---");

const original = {
  name: "Chandrayaan-3 Propulsion Module",
  readings: [98.2, 97.8, 99.1],
  lastChecked: new Date("2025-06-15T10:30:00Z"),
  metadata: { sensor: "PROP-Alpha", nested: { deep: true } },
};

const clone = structuredClone(original);

// Mutate the clone — original should be unaffected
clone.name = "Aditya-L1 Solar Module";
clone.readings.push(100.0);
clone.metadata.nested.deep = false;

console.log("  original.name               :", original.name);
// Output: original.name               : Chandrayaan-3 Propulsion Module

console.log("  clone.name                  :", clone.name);
// Output: clone.name                  : Aditya-L1 Solar Module

console.log("  original.readings           :", original.readings);
// Output: original.readings           : [ 98.2, 97.8, 99.1 ]

console.log("  clone.readings              :", clone.readings);
// Output: clone.readings              : [ 98.2, 97.8, 99.1, 100 ]

console.log("  original.metadata.nested    :", original.metadata.nested);
// Output: original.metadata.nested    : { deep: true }

console.log("  clone.metadata.nested       :", clone.metadata.nested);
// Output: clone.metadata.nested       : { deep: false }

console.log("  lastChecked is still a Date :", clone.lastChecked instanceof Date);
// Output: lastChecked is still a Date : true

// WHY: structuredClone preserved the Date as a Date object.
// JSON.parse(JSON.stringify()) would have turned it into a string.

// ──────────────────────────────────────────────────────────
// SECTION 7 — global.myVar vs Module Scope
// ──────────────────────────────────────────────────────────
// WHY: In browsers, `var x = 5` at the top level adds x to
// `window`. In Node.js CommonJS modules, it does NOT go on
// `global` — each file is wrapped in a function scope.

console.log("\n--- Module Scope vs Global ---");

var satelliteName = "Chandrayaan";
console.log("  var satelliteName            :", satelliteName);
// Output: var satelliteName            : Chandrayaan

console.log("  global.satelliteName         :", global.satelliteName);
// Output: global.satelliteName         : undefined

// WHY: Node wraps each module in (function(exports, require, module, __filename, __dirname) { ... })
// so `var` is scoped to that wrapper function, NOT the global object.

// Explicit global assignment
global.missionStatus = "Active";
console.log("  global.missionStatus         :", global.missionStatus);
// Output: global.missionStatus         : Active

// WHY: Only use global.X when you truly need a cross-module
// singleton. Prefer module.exports for sharing values.

// Clean up
delete global.missionStatus;

// ──────────────────────────────────────────────────────────
// SECTION 8 — queueMicrotask
// ──────────────────────────────────────────────────────────
// WHY: Schedules a callback to run after the current call
// stack empties but BEFORE any I/O or timer callbacks.
// It is a global function — no import required.

console.log("\n--- queueMicrotask ---");

console.log("  1. Sync — before queueMicrotask");
// Output: 1. Sync — before queueMicrotask

queueMicrotask(() => {
  console.log("  3. Microtask — runs after sync, before timers");
  // Output: 3. Microtask — runs after sync, before timers
});

console.log("  2. Sync — after queueMicrotask");
// Output: 2. Sync — after queueMicrotask

// ──────────────────────────────────────────────────────────
// SECTION 9 — performance.now() (Precision Timer Panel)
// ──────────────────────────────────────────────────────────
// WHY: Date.now() gives millisecond precision. performance.now()
// gives sub-millisecond (microsecond) precision, ideal for
// benchmarking tight loops.

// Use setTimeout to let microtask demo complete first
setTimeout(() => {
  console.log("\n--- performance.now() ---");

  const perfStart = performance.now();

  // Simulate work: sum 1 million numbers
  let sum = 0;
  for (let i = 0; i < 1_000_000; i++) {
    sum += i;
  }

  const perfEnd = performance.now();
  const elapsed = (perfEnd - perfStart).toFixed(4);

  console.log("  Sum of 0..999999       :", sum);
  // Output: Sum of 0..999999       : 499999500000

  console.log("  performance.now() time :", elapsed, "ms");
  // Output: performance.now() time : <sub-ms precision> ms

  console.log("  Precision              : microsecond-level (vs Date.now() ms)");
  // Output: Precision              : microsecond-level (vs Date.now() ms)

  // ============================================================
  // KEY TAKEAWAYS
  // ============================================================
  // 1. `global` is Node's global object; `globalThis` is the
  //    cross-environment standard (globalThis === global in Node).
  // 2. __dirname and __filename are module-level globals in CJS.
  //    In ESM, use import.meta.dirname / import.meta.filename.
  // 3. Buffer handles raw binary data — essential for files, net,
  //    and crypto. No require() needed.
  // 4. URL and URLSearchParams parse URLs safely — no string hacks.
  // 5. TextEncoder/TextDecoder convert between strings and bytes.
  // 6. structuredClone performs true deep clones, preserving Dates,
  //    Maps, Sets, RegExps, and even circular references.
  // 7. `var x` at module top level does NOT attach to `global` in
  //    Node — modules are function-wrapped.
  // 8. queueMicrotask schedules a callback in the microtask queue
  //    (after sync, before I/O and timers).
  // 9. performance.now() provides sub-millisecond timing precision
  //    for accurate benchmarking.
  //
  // The ISRO Satellite Dashboard: everything you need is already
  // on the panel — learn the instruments before reaching for imports.
  // ============================================================
}, 0);
