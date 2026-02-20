/**
 * ============================================================
 *  FILE 35: THE EVENT LOOP
 * ============================================================
 *  Topic: Call stack, microtasks, macrotasks, and the event
 *         loop cycle that orchestrates all asynchronous
 *         JavaScript execution.
 *
 *  Why it matters:
 *    JavaScript is single-threaded, yet it handles thousands
 *    of concurrent operations.  Understanding the event loop
 *    is the key to predicting execution order, avoiding UI
 *    freezes, and writing performant async code.
 * ============================================================
 *
 *  STORY — "The Railway Station Enquiry Counter"
 *  Imagine a busy Indian railway station:
 *    - The ENQUIRY CLERK (call stack) can only answer one
 *      passenger at a time, and every query must finish
 *      before the next begins.
 *    - VIP TOKEN HOLDERS (microtasks — Promises, queueMicrotask)
 *      cut in with urgent queries directly to the clerk between
 *      every regular passenger.
 *    - GENERAL TOKEN HOLDERS (macrotasks — setTimeout, setInterval,
 *      I/O callbacks) wait in the general queue; the clerk
 *      only calls them once VIP tokens are all served AND the
 *      counter is clear.
 * ============================================================
 */

// ============================================================
//  EXAMPLE 1 — THE ENQUIRY COUNTER HIERARCHY
//  (Call stack, microtasks, and macrotasks in action)
// ============================================================

// WHY: The call stack is JavaScript's single thread of execution.
// Synchronous code always runs to completion before ANY async
// callback is ever considered.

console.log("=== EXAMPLE 1: The Enquiry Counter Hierarchy ===\n");

console.log("1. Clerk opens the enquiry window");
// Output: 1. Clerk opens the enquiry window

// --- Macrotask: a general token holder waiting in the queue ---
setTimeout(() => {
  console.log("5. General Token holder asks about Rajdhani Express (setTimeout 0)");
  // Output: 5. General Token holder asks about Rajdhani Express (setTimeout 0)
}, 0);

// --- Microtask: VIP token holder with an urgent query ---
Promise.resolve().then(() => {
  console.log("3. VIP Token: Platform change announcement (Promise.then)");
  // Output: 3. VIP Token: Platform change announcement (Promise.then)
});

// --- Microtask: another VIP token (queueMicrotask) ---
queueMicrotask(() => {
  console.log("4. VIP Token: Wheelchair assistance request (queueMicrotask)");
  // Output: 4. VIP Token: Wheelchair assistance request (queueMicrotask)
});

console.log("2. Clerk finishes answering the current passenger");
// Output: 2. Clerk finishes answering the current passenger

/*
 * Full output order:
 *   1. Clerk opens the enquiry window
 *   2. Clerk finishes answering the current passenger
 *   3. VIP Token: Platform change announcement (Promise.then)
 *   4. VIP Token: Wheelchair assistance request (queueMicrotask)
 *   5. General Token holder asks about Rajdhani Express (setTimeout 0)
 *
 * WHY this order?
 *   Step 1 & 2 — synchronous, on the call stack, run first.
 *   Step 3 & 4 — microtasks, run after the call stack empties
 *                but BEFORE any macrotask.
 *   Step 5     — macrotask (setTimeout), runs only after ALL
 *                microtasks are drained.
 */

// ============================================================
//  EXAMPLE 2 — THE FULL EVENT LOOP CYCLE
//  (Deeper dive: nested microtasks, macrotask ordering)
// ============================================================

// WHY: Microtasks spawned INSIDE other microtasks still run
// before the next macrotask.  This is how "microtask starvation"
// of macrotasks can happen.

console.log("\n=== EXAMPLE 2: The Full Event Loop Cycle ===\n");

setTimeout(() => {
  console.log("E. General Token: first query (setTimeout #1)");
  // Output: E. General Token: first query (setTimeout #1)
}, 0);

setTimeout(() => {
  console.log("F. General Token: second query (setTimeout #2)");
  // Output: F. General Token: second query (setTimeout #2)
}, 0);

Promise.resolve()
  .then(() => {
    console.log("B. VIP Token #1: train arrival query");
    // Output: B. VIP Token #1: train arrival query

    // A microtask spawned inside a microtask
    return Promise.resolve();
  })
  .then(() => {
    console.log("C. VIP Token #1: follow-up about platform (chained)");
    // Output: C. VIP Token #1: follow-up about platform (chained)
  });

queueMicrotask(() => {
  console.log("D. VIP Token #2: ticket refund enquiry (queueMicrotask)");
  // Output: D. VIP Token #2: ticket refund enquiry (queueMicrotask)
});

console.log("A. Clerk: checking today's train schedule (sync)");
// Output: A. Clerk: checking today's train schedule (sync)

/*
 * Full output order:
 *   A. Clerk: checking today's train schedule (sync)
 *   B. VIP Token #1: train arrival query
 *   C. VIP Token #1: follow-up about platform (chained)   <-- still microtask phase!
 *   D. VIP Token #2: ticket refund enquiry (queueMicrotask)
 *   E. General Token: first query (setTimeout #1)
 *   F. General Token: second query (setTimeout #2)
 *
 * NOTE on B, C, D ordering:
 *   B runs first (Promise microtask queued first).
 *   C is a chained .then() — it creates a NEW microtask when B
 *   resolves, but that microtask is queued AFTER D (which was
 *   already in the microtask queue).  So the actual order is
 *   B -> D -> C.  Let's verify below...
 */

// Let's do an explicit verification of that nuance:
console.log("\n--- Microtask queue ordering nuance ---");

Promise.resolve()
  .then(() => {
    console.log("  micro-1a");
    // Output:   micro-1a
    return Promise.resolve(); // resolving a Promise wraps in an extra microtask tick
  })
  .then(() => {
    console.log("  micro-1b (chained after resolved Promise)");
    // Output:   micro-1b (chained after resolved Promise)
  });

queueMicrotask(() => {
  console.log("  micro-2 (queueMicrotask)");
  // Output:   micro-2 (queueMicrotask)
});

/*
 * Actual output:
 *   micro-1a
 *   micro-2 (queueMicrotask)
 *   micro-1b (chained after resolved Promise)
 *
 * Because `return Promise.resolve()` inside a .then() adds
 * an extra tick before the next .then() is scheduled.
 */

// ============================================================
//  EXAMPLE 3 — THE CLASSIC QUIZ & STARVATION WARNING
//  (Predict the output, then understand starvation)
// ============================================================

// WHY: Interview-style "predict the output" questions test
// event loop knowledge.  Starvation is a real production bug.

console.log("\n=== EXAMPLE 3: Classic Quiz & Starvation ===\n");

// --- Part A: The Classic Quiz ---
console.log("Quiz — predict the order:\n");

console.log("1");
// Output: 1

setTimeout(() => {
  console.log("2");
  // Output: 2
}, 10);

setTimeout(() => {
  console.log("3");
  // Output: 3
}, 0);

new Promise((resolve) => {
  console.log("4");     // Promise executor is SYNCHRONOUS!
  // Output: 4
  resolve();
})
  .then(() => {
    console.log("5");
    // Output: 5
  })
  .then(() => {
    console.log("6");
    // Output: 6
  });

queueMicrotask(() => {
  console.log("7");
  // Output: 7
});

console.log("8");
// Output: 8

/*
 * Answer:
 *   1            — sync
 *   4            — sync (Promise constructor runs immediately)
 *   8            — sync
 *   5            — microtask (first .then)
 *   7            — microtask (queueMicrotask)
 *   6            — microtask (second .then, queued after 5 resolves)
 *   3            — macrotask (setTimeout 0ms)
 *   2            — macrotask (setTimeout 10ms)
 *
 * The event loop cycle:
 *   [call stack clears] -> drain ALL microtasks -> pick ONE macrotask
 *   -> drain ALL microtasks -> pick ONE macrotask -> ...
 */

// --- Part B: Microtask Starvation ---
// WHY: If microtasks keep scheduling MORE microtasks, the
// macrotask queue (and the UI in browsers) NEVER gets a turn.

console.log("\n--- Starvation demonstration (safe version) ---");

let starvationCount = 0;

function floodMicrotasks() {
  if (starvationCount < 5) {
    starvationCount++;
    console.log(`  Microtask flood #${starvationCount}`);
    // Each microtask schedules ANOTHER microtask
    queueMicrotask(floodMicrotasks);
  }
}

setTimeout(() => {
  console.log("  General Token holder FINALLY gets a turn after flood");
  // Output:  General Token holder FINALLY gets a turn after flood
}, 0);

queueMicrotask(floodMicrotasks);
// Output:
//   Microtask flood #1
//   Microtask flood #2
//   Microtask flood #3
//   Microtask flood #4
//   Microtask flood #5
//   General Token holder FINALLY gets a turn after flood

/*
 * In real code, if the flood had no limit (e.g., while(true)
 * scheduling queueMicrotask), the setTimeout callback would
 * NEVER run — that's starvation.  In a browser, the page
 * would freeze because requestAnimationFrame (a macrotask-like
 * mechanism) would also starve.
 */

// --- requestAnimationFrame note (browser-only) ---
// WHY: In browsers, requestAnimationFrame fires before the next
// paint, roughly once per frame (~16ms at 60fps).  It's NOT
// available in Node.js, but it's crucial for smooth animations.
//
// Execution order in browsers:
//   1. Call stack clears
//   2. Microtasks drain
//   3. requestAnimationFrame callbacks run (if it's time to paint)
//   4. Browser paints
//   5. Macrotasks (setTimeout/setInterval) run
//
// Example (browser-only, won't run in Node):
//
//   requestAnimationFrame(() => {
//     console.log("rAF: update the departure board display");
//   });

// ============================================================
//  KEY TAKEAWAYS
// ============================================================
/*
 * 1. CALL STACK — JavaScript has ONE call stack.  Synchronous
 *    code always runs to completion first.
 *
 * 2. MICROTASK QUEUE — Promise.then(), .catch(), .finally(),
 *    queueMicrotask(), and MutationObserver callbacks go here.
 *    The entire microtask queue is drained BEFORE any macrotask.
 *
 * 3. MACROTASK QUEUE — setTimeout, setInterval, setImmediate
 *    (Node), I/O callbacks, and UI rendering tasks go here.
 *    Only ONE macrotask runs per event loop iteration.
 *
 * 4. EVENT LOOP CYCLE:
 *      call stack empties
 *        -> drain ALL microtasks (including newly added ones)
 *        -> pick ONE macrotask
 *        -> repeat
 *
 * 5. setTimeout(fn, 0) vs Promise.resolve().then(fn):
 *    The Promise callback ALWAYS runs first because microtasks
 *    have priority over macrotasks.
 *
 * 6. STARVATION — If microtasks endlessly schedule more
 *    microtasks, macrotasks (and browser paints) never execute.
 *    Always ensure microtask chains terminate.
 *
 * 7. requestAnimationFrame (browser) — Runs before the next
 *    repaint, after microtasks, making it ideal for animations.
 *
 * 8. RAILWAY STATION ANALOGY:
 *    Enquiry Clerk (call stack) -> VIP Tokens (microtasks) ->
 *    General Tokens (macrotasks).  The clerk always handles
 *    VIP token requests before calling the next general token.
 */
