/**
 * ============================================================
 * FILE 42: Memory Management & Performance Patterns
 * ============================================================
 * Topic: Garbage collection, memory leaks, benchmarking,
 *        memoization, debounce/throttle, object pools,
 *        allocation avoidance, and structuredClone.
 *
 * WHY IT MATTERS:
 * Performance isn't just about algorithms — it's about how you
 * manage memory, avoid unnecessary work, and respect the garbage
 * collector. In production apps, memory leaks cause crashes,
 * excessive allocations cause jank, and un-debounced handlers
 * cause UI freezes. These patterns are essential for real-world JS.
 * ============================================================
 */

// ============================================================
// STORY: THE MUMBAI BEST BUS
// Driver Raju commands BEST Bus No. 328 through Mumbai traffic.
// Diesel and CNG are finite. Every wasted byte of memory is
// leaked fuel; every unnecessary computation burns route time.
// Raju must manage resources wisely to keep the passengers safe
// and the bus running on schedule.
// ============================================================


// ============================================================
// SECTION 1 — GARBAGE COLLECTION BASICS (MARK-AND-SWEEP)
// ============================================================

// WHY: Understanding HOW GC works helps you write code that
// cooperates with it rather than fighting it.

// JavaScript uses MARK-AND-SWEEP garbage collection:
//
// Phase 1 — MARK: Starting from "roots" (global object, local
//   variables on the stack, closures), the GC traverses all
//   reachable objects and marks them as "alive."
//
// Phase 2 — SWEEP: Any object NOT marked is unreachable and
//   gets its memory reclaimed.
//
// Key insight: An object is garbage-collectible when NO reference
// chain from any root can reach it.

// Example: Object becomes unreachable

let fuelTank = { level: 100, unit: "liters" };
let backupRef = fuelTank; // two references to the same object

fuelTank = null; // one reference removed
// Object is still alive — backupRef still points to it

backupRef = null; // last reference removed
// Now the object is unreachable => eligible for GC

console.log("GC basics: objects with zero references are collected.");
// Output: GC basics: objects with zero references are collected.

// Circular references are handled by mark-and-sweep:
function circularExample() {
  let a = {};
  let b = {};
  a.partner = b;
  b.partner = a;
  // When this function returns, both a and b become unreachable
  // from any root, so GC collects them despite the circular refs.
}
circularExample();
console.log("Circular references: collected when unreachable from roots.");
// Output: Circular references: collected when unreachable from roots.


// ============================================================
// SECTION 2 — MEMORY LEAKS: THE PASSENGERS WHO NEVER GET OFF
// ============================================================

// WHY: A memory leak means objects that SHOULD be collected are
// accidentally kept alive. Over time, memory grows unbounded.

// --- Leak Type 1: Forgotten Timers ---

function leakyTimer() {
  const hugePayload = new Array(10000).fill("passenger-data");

  // This interval holds a closure over `hugePayload`
  const intervalId = setInterval(() => {
    // Even if we never read hugePayload, the closure keeps it alive
    // as long as the interval is running
  }, 1000);

  // FIX: Always clear timers when done
  clearInterval(intervalId);
  console.log("Leak 1 (timer): Fixed by clearInterval.");
}
leakyTimer();
// Output: Leak 1 (timer): Fixed by clearInterval.


// --- Leak Type 2: Closures Holding References ---

function createProcessor() {
  const massiveLog = new Array(50000).fill("trip-log-entry");

  // This returned function closes over massiveLog forever
  return function processItem(item) {
    // We never use massiveLog, but the closure still references it
    return item.toUpperCase();
  };
}

// FIX: Don't capture variables you don't need in the closure
function createProcessorFixed() {
  const massiveLog = new Array(50000).fill("trip-log-entry");
  // Process the log here if needed, then let it go
  const logSize = massiveLog.length; // extract only what you need

  return function processItem(item) {
    // Only captures `logSize` (a number), not the entire array
    return `${item.toUpperCase()} (log size: ${logSize})`;
  };
}

const processor = createProcessorFixed();
console.log("Leak 2 (closure):", processor("fuel-check"));
// Output: Leak 2 (closure): FUEL-CHECK (log size: 50000)


// --- Leak Type 3: Detached DOM Nodes (Conceptual) ---

// In browsers:
// const button = document.getElementById('my-btn');
// document.body.removeChild(button);
// If `button` variable still exists, the DOM node can't be GC'd!
// FIX: Set the variable to null after removing from DOM.

console.log("Leak 3 (detached DOM): Nullify references after removal.");
// Output: Leak 3 (detached DOM): Nullify references after removal.


// --- Leak Type 4: Accidental Global Variables ---

function faultyNavigation() {
  // Missing `let/const/var` creates a global variable (sloppy mode)
  // routeData = { destination: "Dadar" };
  // FIX: Always use strict mode or declare variables properly
  const routeData = { destination: "Dadar" };
  return routeData.destination;
}

console.log("Leak 4 (globals):", faultyNavigation());
// Output: Leak 4 (globals): Dadar

console.log("Prevention: 'use strict', let/const, and linters.");
// Output: Prevention: 'use strict', let/const, and linters.


// ============================================================
// SECTION 3 — BENCHMARKING WITH performance.now()
// ============================================================

// WHY: You can't optimize what you can't measure. performance.now()
// gives sub-millisecond precision for timing code execution.

const { performance } = require("perf_hooks"); // Node.js import

function calculateRouteTiming(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i) * Math.sin(i);
  }
  return result;
}

// --- Benchmarking a function ---

const startTime = performance.now();
const routeETA = calculateRouteTiming(1_000_000);
const endTime = performance.now();

const elapsed = (endTime - startTime).toFixed(3);
console.log(`Route ETA calculated: ${routeETA.toFixed(2)}`);
console.log(`Time: ${elapsed}ms for 1,000,000 iterations`);
// Output: Route ETA calculated: [varies]
// Output: Time: [varies]ms for 1,000,000 iterations

// --- Reusable benchmark utility ---

function benchmark(label, fn, runs = 5) {
  const times = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  const avg = (times.reduce((a, b) => a + b, 0) / runs).toFixed(3);
  const min = Math.min(...times).toFixed(3);
  const max = Math.max(...times).toFixed(3);
  console.log(`[${label}] avg: ${avg}ms | min: ${min}ms | max: ${max}ms`);
}

benchmark("Route Timing (100K)", () => calculateRouteTiming(100_000));
// Output: [Route Timing (100K)] avg: [varies]ms | min: [varies]ms | max: [varies]ms


// ============================================================
// SECTION 4 — MEMOIZATION PATTERNS
// ============================================================

// WHY: Memoization trades memory for speed by caching the results
// of expensive function calls. Driver Raju doesn't recalculate
// a route he's already driven.

// --- Basic memoize function ---

function memoize(fn) {
  const cache = new Map();

  return function (...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      console.log(`  [Memo] Cache hit for args: ${key}`);
      return cache.get(key);
    }

    console.log(`  [Memo] Computing for args: ${key}`);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Expensive route-fare calculation
function calculateFare(routeName, distanceKm) {
  // Simulate expensive computation
  let hash = 0;
  for (let i = 0; i < 100000; i++) {
    hash += (distanceKm * i) % 997;
  }
  return { route: routeName, hash, fare: distanceKm * 2.5 };
}

const memoizedFare = memoize(calculateFare);

console.log("\n--- Memoization Demo ---");

const fare1 = memoizedFare("Andheri-Dadar", 18);
// Output:   [Memo] Computing for args: ["Andheri-Dadar",18]
console.log("Fare 1:", fare1.route, "- fare: \u20B9" + fare1.fare);
// Output: Fare 1: Andheri-Dadar - fare: ₹45

const fare2 = memoizedFare("Andheri-Dadar", 18); // same args => cached
// Output:   [Memo] Cache hit for args: ["Andheri-Dadar",18]
console.log("Fare 2:", fare2.route, "- fare: \u20B9" + fare2.fare);
// Output: Fare 2: Andheri-Dadar - fare: ₹45

const fare3 = memoizedFare("Borivali-Churchgate", 35); // different args
// Output:   [Memo] Computing for args: ["Borivali-Churchgate",35]
console.log("Fare 3:", fare3.route, "- fare: \u20B9" + fare3.fare);
// Output: Fare 3: Borivali-Churchgate - fare: ₹87.5

// Benchmark memoized vs non-memoized
console.log("\n--- Memoization Benchmark ---");
benchmark("Non-memoized", () => calculateFare("Bandra-Worli", 12));
benchmark("Memoized (cold)", () => {
  const m = memoize(calculateFare);
  m("Bandra-Worli", 12);
});
benchmark("Memoized (warm)", () => memoizedFare("Andheri-Dadar", 18));
// The warm cache should be orders of magnitude faster.


// ============================================================
// EXAMPLE 1: BEST BUS ROUTE MANAGEMENT
// ============================================================

// WHY: Demonstrates debounce and throttle in the context of
// managing how often systems report to the driver.

// --- DEBOUNCE: Wait until input stops, then execute once ---

// Scenario: The route display receives rapid destination changes.
// We only recalculate the route after the conductor stops updating.

function debounce(fn, delayMs) {
  let timerId = null;

  return function (...args) {
    // Clear any pending execution
    if (timerId !== null) {
      clearTimeout(timerId);
    }

    // Schedule a new execution after the delay
    timerId = setTimeout(() => {
      fn.apply(this, args);
      timerId = null;
    }, delayMs);
  };
}

function recalculateRoute(destination) {
  console.log(`[ROUTE] Route recalculated to: ${destination}`);
}

const debouncedRoute = debounce(recalculateRoute, 300);

// Simulate rapid input: only the last call executes (after 300ms)
debouncedRoute("Dadar");
debouncedRoute("Parel");
debouncedRoute("Worli"); // only this one fires after 300ms

// (In Node.js, the timeout will fire before the process exits)
// Output (after 300ms): [ROUTE] Route recalculated to: Worli


// --- THROTTLE: Execute at most once per interval ---

// Scenario: Fuel sensors report every millisecond, but we only
// want to update the display at most once per second.

function throttle(fn, intervalMs) {
  let lastCallTime = 0;
  let timerId = null;

  return function (...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= intervalMs) {
      // Enough time has passed — execute immediately
      lastCallTime = now;
      fn.apply(this, args);
    } else if (timerId === null) {
      // Schedule a trailing call for the remaining time
      timerId = setTimeout(() => {
        lastCallTime = Date.now();
        timerId = null;
        fn.apply(this, args);
      }, intervalMs - timeSinceLastCall);
    }
    // If a timer is already scheduled, ignore this call
  };
}

function updateFuelDisplay(level) {
  console.log(`[FUEL] Display updated: ${level}%`);
}

const throttledFuel = throttle(updateFuelDisplay, 1000);

// Simulate rapid sensor readings
throttledFuel(98); // fires immediately (first call)
// Output: [FUEL] Display updated: 98%
throttledFuel(97); // ignored or scheduled
throttledFuel(96); // ignored or scheduled

console.log("\nDebounce: fires AFTER silence. Throttle: fires AT MOST once per interval.");
// Output: Debounce: fires AFTER silence. Throttle: fires AT MOST once per interval.


// ============================================================
// EXAMPLE 2: FUEL CONSERVATION — POOLS AND ALLOCATION
// ============================================================

// WHY: Creating and destroying objects rapidly (e.g., in game loops
// or particle systems) triggers frequent GC pauses. Object pools
// recycle objects to minimize allocation.

// --- Object Pool ---

class ObjectPool {
  constructor(factory, reset, initialSize = 10) {
    this.factory = factory; // function to create a new object
    this.reset = reset; // function to reset an object for reuse
    this.pool = [];

    // Pre-allocate objects
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
    console.log(`[Pool] Initialized with ${initialSize} objects`);
  }

  acquire() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    // Pool is empty — create a new object (expansion)
    console.log("[Pool] Expanding — creating new object");
    return this.factory();
  }

  release(obj) {
    this.reset(obj); // clean the object for reuse
    this.pool.push(obj);
  }

  get available() {
    return this.pool.length;
  }
}

// Create a pool of "bus token" objects for BEST Bus ticket system
const tokenPool = new ObjectPool(
  () => ({ seat: 0, stop: 0, fare: 0, distance: 0, trip: 0, active: false }),
  (t) => { t.seat = 0; t.stop = 0; t.fare = 0; t.distance = 0; t.trip = 0; t.active = false; },
  5
);
// Output: [Pool] Initialized with 5 objects

console.log("Available tokens:", tokenPool.available);
// Output: Available tokens: 5

// Acquire and configure a token
const t1 = tokenPool.acquire();
t1.seat = 12;
t1.stop = 7;
t1.fare = 15;
t1.distance = 8;
t1.trip = 60;
t1.active = true;
console.log("Token in use:", t1);
// Output: Token in use: { seat: 12, stop: 7, fare: 15, distance: 8, trip: 60, active: true }

console.log("Available after acquire:", tokenPool.available);
// Output: Available after acquire: 4

// Return it to the pool
tokenPool.release(t1);
console.log("Available after release:", tokenPool.available);
// Output: Available after release: 5

// The token was RESET, not destroyed and re-created
console.log("Released token state:", t1);
// Output: Released token state: { seat: 0, stop: 0, fare: 0, distance: 0, trip: 0, active: false }


// --- Avoiding Unnecessary Allocations ---

// BAD: Creating a new array every stop
function processPassengersBad(readings) {
  const filtered = readings.filter((r) => r > 50); // new array every call
  const mapped = filtered.map((r) => r * 1.1); // another new array
  return mapped;
}

// GOOD: Reuse a pre-allocated buffer
const passengerBuffer = new Float64Array(1000);
let bufferLength = 0;

function processPassengersGood(readings) {
  bufferLength = 0;
  for (let i = 0; i < readings.length; i++) {
    if (readings[i] > 50) {
      passengerBuffer[bufferLength++] = readings[i] * 1.1;
    }
  }
  // Return a view into the buffer (no new allocation)
  return passengerBuffer.subarray(0, bufferLength);
}

const testReadings = [30, 60, 45, 80, 55, 20, 90];
const processed = processPassengersGood(testReadings);
console.log("Processed passengers:", Array.from(processed));
// Output: Processed passengers: [ 66, 88, 60.50000000000001, 99 ]

// In tight loops, avoiding .filter() and .map() and using
// pre-allocated typed arrays can dramatically reduce GC pressure.


// ============================================================
// SECTION 5 — structuredClone() vs JSON.parse(JSON.stringify())
// ============================================================

// WHY: Deep cloning objects is common but tricky. The old JSON hack
// has limitations. structuredClone() is the modern, correct solution.

const busState = {
  name: "BEST Bus 328",
  crew: ["Raju", "Shyam", "Pappu"],
  systems: {
    engine: { status: "nominal", fuel: 85.5 },
    brakes: { status: "worn", pressure: 42 },
  },
  serviceDate: new Date("2024-08-15"),
  coordinates: new Float64Array([19.076, 72.877, 0.0]),
};

// --- JSON method (old way) ---
const jsonClone = JSON.parse(JSON.stringify(busState));
console.log("\n--- JSON Clone ---");
console.log("Date type:", typeof jsonClone.serviceDate);
// Output: Date type: string   <-- Date became a string!
console.log("TypedArray:", jsonClone.coordinates);
// Output: TypedArray: { '0': 19.076, '1': 72.877, '2': 0 }  <-- plain object!

// JSON limitations:
// - Dates become strings
// - TypedArrays become plain objects
// - undefined values are dropped
// - Functions are dropped
// - RegExp becomes {}
// - Map/Set become {}
// - Circular references throw an error

// --- structuredClone (modern way) ---
const properClone = structuredClone(busState);
console.log("\n--- structuredClone ---");
console.log("Date type:", Object.prototype.toString.call(properClone.serviceDate));
// Output: Date type: [object Date]   <-- Date is preserved!
console.log("TypedArray:", properClone.coordinates);
// Output: TypedArray: Float64Array(3) [ 19.076, 72.877, 0 ]  <-- preserved!

// Verify it's a deep clone
properClone.systems.engine.fuel = 0;
console.log("Original fuel:", busState.systems.engine.fuel);
// Output: Original fuel: 85.5
console.log("Clone fuel:", properClone.systems.engine.fuel);
// Output: Clone fuel: 0

// structuredClone handles:
// - Dates, RegExp, Map, Set, ArrayBuffer, TypedArrays
// - Circular references (!)
// - Blob, File, ImageData (in browsers)
// Does NOT clone: Functions, DOM nodes, Symbols, Proxies

// --- Circular reference test ---
const circularBus = { name: "BEST Bus 328" };
circularBus.self = circularBus;

const circularClone = structuredClone(circularBus);
console.log("Circular clone name:", circularClone.name);
// Output: Circular clone name: BEST Bus 328
console.log("Circular ref works:", circularClone.self === circularClone);
// Output: Circular ref works: true
console.log("Not same object:", circularClone !== circularBus);
// Output: Not same object: true

// JSON would throw: JSON.stringify(circularBus) => TypeError


// ============================================================
// SECTION 6 — QUICK REFERENCE: COMMON PERFORMANCE PATTERNS
// ============================================================

// --- 1. Batch DOM reads/writes (browser context) ---
// BAD:  read, write, read, write (causes layout thrashing)
// GOOD: read all, then write all

// --- 2. Use for-loops over .forEach() in hot paths ---
benchmark("for loop", () => {
  const arr = new Array(100000);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += i;
});
benchmark("forEach", () => {
  const arr = new Array(100000);
  let sum = 0;
  arr.forEach((_, i) => { sum += i; });
});

// --- 3. Cache array.length in older engines ---
// Modern engines optimize this, but it's still a good habit in
// extremely hot loops.

// --- 4. Avoid creating closures inside loops ---
// BAD:
// for (let i = 0; i < 1000; i++) {
//   arr.push(() => i);  // 1000 closure objects created
// }
// GOOD: Move the closure factory outside if possible.

console.log("\nPerformance is about reducing waste — fewer allocations,");
console.log("fewer GC pauses, and fewer redundant computations.");
// Output: Performance is about reducing waste — fewer allocations,
// Output: fewer GC pauses, and fewer redundant computations.


// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Mark-and-sweep GC: objects unreachable from roots are freed.
//    Circular references alone don't cause leaks in modern JS.
//
// 2. Common memory leaks: forgotten timers, closures capturing
//    large data, detached DOM nodes, accidental globals.
//    Fix: clear timers, minimize closure scope, nullify refs.
//
// 3. performance.now() gives sub-ms timing. Always benchmark
//    before optimizing — measure, don't guess.
//
// 4. Memoization caches results of pure functions. Use Map or
//    WeakMap for cache storage. JSON.stringify(args) for keys.
//
// 5. Debounce: delays execution until input stops (search bars).
//    Throttle: limits execution to once per interval (scroll).
//
// 6. Object pools prevent GC churn by recycling objects instead
//    of creating/destroying them. Essential for games/animations.
//
// 7. structuredClone() > JSON hack. It preserves Dates, Maps,
//    Sets, TypedArrays, and handles circular references.
//
// 8. Avoid allocations in hot paths: reuse buffers, prefer
//    for-loops, and minimize closure creation.
//
// Driver Raju's rule: "Har boond diesel ka hisaab hai.
// Kuch bhi waste mat karo. Pehle naap, phir chalao. Smart chalo."
// ============================================================
