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
 *    of concurrent operations. Understanding the event loop
 *    is the key to predicting execution order, avoiding UI
 *    freezes, and writing performant async code.
 * ============================================================
 *
 *  STORY — The Railway Station Enquiry Counter
 *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *  Imagine a busy Indian railway station with one enquiry
 *  counter:
 *    - ENQUIRY CLERK (call stack) — handles one query at a
 *      time. Must finish the current query before taking the
 *      next.
 *    - VIP TOKEN holders (microtasks — Promises, queueMicrotask)
 *      — get priority. The clerk handles ALL VIP tokens before
 *      calling any general token.
 *    - GENERAL TOKEN holders (macrotasks — setTimeout,
 *      setInterval, I/O) — wait in the regular queue. Only
 *      served after the clerk is free AND all VIP tokens are
 *      done.
 *
 *  The event loop is this cycle:
 *    Clerk finishes → serve ALL VIP tokens → call ONE general
 *    token → serve ALL VIP tokens → call ONE general token → ...
 * ============================================================
 */


// ============================================================
//  SECTION 1: THE THREE QUEUES
// ============================================================
// WHAT: Every piece of JS code falls into one of three buckets:
//       1. Call stack  — synchronous code, runs immediately
//       2. Microtask queue — Promise .then/.catch/.finally,
//          queueMicrotask(), MutationObserver
//       3. Macrotask queue — setTimeout, setInterval,
//          setImmediate (Node), I/O callbacks
//
// WHY:  The event loop processes them in a strict order:
//       call stack empties → drain ALL microtasks → pick ONE
//       macrotask → drain ALL microtasks → pick ONE macrotask...
//
//       This is why a setTimeout(fn, 0) runs AFTER a
//       Promise.resolve().then(fn) — microtasks always go first.

console.log("=== Section 1: The Three Queues ===\n");

console.log("1. Clerk opens the enquiry window");          // sync — call stack

setTimeout(() => {
  console.log("5. General Token: Rajdhani timing? (setTimeout)");  // macrotask
}, 0);

Promise.resolve().then(() => {
  console.log("3. VIP Token: Platform change! (Promise.then)");    // microtask
});

queueMicrotask(() => {
  console.log("4. VIP Token: Wheelchair request (queueMicrotask)");// microtask
});

console.log("2. Clerk finishes current passenger");        // sync — call stack

/*
 * Output order:
 *   1. Clerk opens the enquiry window           — sync (call stack)
 *   2. Clerk finishes current passenger          — sync (call stack)
 *   3. VIP Token: Platform change!               — microtask (Promise)
 *   4. VIP Token: Wheelchair request             — microtask (queueMicrotask)
 *   5. General Token: Rajdhani timing?           — macrotask (setTimeout)
 *
 * WHY this order?
 *   1 & 2 run first — they're synchronous (on the call stack).
 *   3 & 4 run next  — microtasks drain BEFORE any macrotask.
 *   5 runs last     — macrotasks wait until the microtask queue is empty.
 */


// ============================================================
//  SECTION 2: MICROTASKS SPAWNING MICROTASKS
// ============================================================
// WHAT: When a microtask schedules another microtask, the new
//       one also runs BEFORE any macrotask. The event loop
//       keeps draining microtasks until the queue is empty.
//
// WHY:  This is how .then() chains work — each .then() adds a
//       new microtask when the previous one resolves. But it
//       also means microtasks can starve macrotasks if they
//       keep spawning more microtasks forever.

console.log("\n=== Section 2: Microtasks Spawning Microtasks ===\n");

setTimeout(() => {
  console.log("D. General Token: finally served! (setTimeout)");
}, 0);

Promise.resolve().then(() => {
  console.log("A. VIP Token #1: train arrival query");

  // This microtask spawns ANOTHER microtask via .then()
  Promise.resolve().then(() => {
    console.log("B. VIP Token #1: follow-up about platform");
  });
});

queueMicrotask(() => {
  console.log("C. VIP Token #2: ticket refund enquiry");
});

/*
 * Output order:
 *   A. VIP Token #1: train arrival query
 *   C. VIP Token #2: ticket refund enquiry
 *   B. VIP Token #1: follow-up about platform
 *   D. General Token: finally served!
 *
 * WHY this order?
 *   When the call stack clears, the microtask queue has: [A, C]
 *
 *   A runs → logs "A", schedules B (added to END of microtask queue)
 *   Queue is now: [C, B]
 *
 *   C runs → logs "C"
 *   Queue is now: [B]
 *
 *   B runs → logs "B"
 *   Queue is now: [] (empty — microtasks fully drained)
 *
 *   NOW the event loop picks macrotask D → logs "D"
 *
 *   Key insight: B was spawned by A, but C was already queued,
 *   so C runs before B. Microtasks are FIFO (first in, first out).
 */


// ============================================================
//  SECTION 3: THE CLASSIC INTERVIEW QUIZ
// ============================================================
// WHAT: Predict the output — this exact question appears in
//       JS interviews. Tests your understanding of sync code,
//       Promise executor, microtasks, and macrotasks.
//
// WHY:  If you can predict this, you understand the event loop.

console.log("\n=== Section 3: The Classic Interview Quiz ===\n");

console.log("1");                                          // sync

setTimeout(() => {
  console.log("2");                                        // macrotask (10ms)
}, 10);

setTimeout(() => {
  console.log("3");                                        // macrotask (0ms)
}, 0);

new Promise((resolve) => {
  console.log("4");   // Promise executor is SYNCHRONOUS — runs immediately!
  resolve();
})
  .then(() => {
    console.log("5");                                      // microtask
  })
  .then(() => {
    console.log("6");                                      // microtask (chained)
  });

queueMicrotask(() => {
  console.log("7");                                        // microtask
});

console.log("8");                                          // sync

/*
 * Output order:  1, 4, 8, 5, 7, 6, 3, 2
 *
 * Step-by-step:
 *
 *   CALL STACK (sync):
 *     1 — console.log("1")
 *     4 — Promise executor runs immediately (it's sync!)
 *     8 — console.log("8")
 *
 *   MICROTASK QUEUE (drained next):
 *     5 — first .then() handler
 *     7 — queueMicrotask handler
 *         (5 resolves, so 6 gets queued NOW)
 *     6 — second .then() handler
 *
 *   MACROTASK QUEUE (one at a time):
 *     3 — setTimeout(fn, 0)   — queued first among macrotasks
 *     2 — setTimeout(fn, 10)  — 10ms later
 *
 * KEY TRAP: "4" prints during sync phase because the Promise
 * constructor callback (the executor) runs immediately — only
 * .then()/.catch() callbacks are microtasks.
 */


// ============================================================
//  SECTION 4: MICROTASK STARVATION
// ============================================================
// WHAT: If microtasks keep scheduling more microtasks endlessly,
//       macrotasks NEVER get a turn. In browsers, the page
//       freezes because rendering (a macrotask-like step) also
//       starves.
//
// WHY:  This is a real production bug. Infinite microtask
//       loops lock up the entire application. Always ensure
//       microtask chains terminate.

console.log("\n=== Section 4: Microtask Starvation ===\n");

let floodCount = 0;

function floodMicrotasks() {
  if (floodCount < 5) {                // safety cap for demo!
    floodCount++;
    console.log(`  Microtask flood #${floodCount}`);
    queueMicrotask(floodMicrotasks);   // schedules another microtask
  }
}

setTimeout(() => {
  console.log("  General Token FINALLY gets a turn after flood");
}, 0);

queueMicrotask(floodMicrotasks);

/*
 * Output:
 *   Microtask flood #1
 *   Microtask flood #2
 *   Microtask flood #3
 *   Microtask flood #4
 *   Microtask flood #5
 *   General Token FINALLY gets a turn after flood
 *
 * The setTimeout callback waited for ALL 5 microtasks to finish.
 * Without the cap (if floodCount < Infinity), the setTimeout
 * callback would NEVER run — that's starvation.
 */


// ============================================================
//  SECTION 5: THE return Promise.resolve() NUANCE
// ============================================================
// WHAT: When you return a thenable (like Promise.resolve())
//       from inside a .then(), the spec adds an extra microtask
//       tick to unwrap it. This delays the next .then().
//
// WHY:  This catches people off guard. It's why the ordering
//       of chained .then() vs queueMicrotask() can be
//       surprising. Understanding this prevents debugging
//       headaches with complex Promise chains.

console.log("\n=== Section 5: return Promise.resolve() Nuance ===\n");

Promise.resolve()
  .then(() => {
    console.log("  A — first .then()");
    return Promise.resolve();  // ← returns a thenable (extra tick!)
  })
  .then(() => {
    console.log("  C — second .then() (delayed by extra tick)");
  });

queueMicrotask(() => {
  console.log("  B — queueMicrotask");
});

/*
 * Output:  A, B, C
 *
 * You might expect A, C, B — but returning Promise.resolve()
 * inside .then() adds an extra microtask tick before C is
 * scheduled. By that time, B is already in the queue.
 *
 * If line 3 were `return "plain value"` instead of
 * `return Promise.resolve()`, the output would be A, C, B
 * (because plain values don't add the extra tick).
 */


// ============================================================
//  SECTION 6: MACROTASKS BETWEEN EACH OTHER
// ============================================================
// WHAT: The event loop picks only ONE macrotask per iteration,
//       then drains microtasks, then picks the next macrotask.
//
// WHY:  This means microtasks scheduled INSIDE a macrotask
//       run before the next macrotask — not after all macrotasks.
//       This is critical for understanding setTimeout + Promise
//       interactions.

setTimeout(() => {
  console.log("\n=== Section 6: Macrotasks + Microtasks Interleaving ===\n");

  setTimeout(() => {
    console.log("  1. First macrotask (setTimeout)");

    Promise.resolve().then(() => {
      console.log("  2. Microtask inside first macrotask");
    });
  }, 0);

  setTimeout(() => {
    console.log("  3. Second macrotask (setTimeout)");
  }, 0);

  /*
   * Output:
   *   1. First macrotask (setTimeout)
   *   2. Microtask inside first macrotask
   *   3. Second macrotask (setTimeout)
   *
   * NOT 1, 3, 2!
   *
   * After macrotask 1 runs, its microtask (2) drains before
   * the event loop picks macrotask 3. One macrotask → drain
   * all microtasks → one macrotask → drain all microtasks...
   */
}, 500);


// ============================================================
//  SECTION 7: BROWSER-SPECIFIC — requestAnimationFrame
// ============================================================
// WHAT: In browsers, requestAnimationFrame (rAF) callbacks
//       run before the next paint, roughly once per frame
//       (~16ms at 60fps). Not available in Node.js.
//
// WHY:  rAF is the right tool for animations and visual
//       updates. It runs AFTER microtasks but BEFORE the
//       next macrotask's render step.
//
// Browser event loop (simplified):
//   1. Call stack clears
//   2. Drain microtasks
//   3. requestAnimationFrame callbacks (if paint is due)
//   4. Browser paints
//   5. Pick one macrotask
//   6. Repeat
//
// Example (browser-only, won't run in Node):
//
//   setTimeout(() => console.log("macrotask"), 0);
//   requestAnimationFrame(() => console.log("rAF — before paint"));
//   Promise.resolve().then(() => console.log("microtask"));
//
//   Output: microtask → rAF — before paint → macrotask


/**
 * ============================================================
 *  KEY TAKEAWAYS
 * ============================================================
 *  1. CALL STACK — JavaScript has ONE call stack. Synchronous
 *     code always runs to completion before anything async.
 *
 *  2. MICROTASK QUEUE — Promise .then/.catch/.finally,
 *     queueMicrotask(), MutationObserver. The ENTIRE queue
 *     drains before any macrotask gets a turn.
 *
 *  3. MACROTASK QUEUE — setTimeout, setInterval, setImmediate
 *     (Node), I/O callbacks. Only ONE macrotask per loop
 *     iteration.
 *
 *  4. THE EVENT LOOP CYCLE:
 *       call stack empties
 *         → drain ALL microtasks
 *         → pick ONE macrotask
 *         → drain ALL microtasks
 *         → pick ONE macrotask
 *         → repeat
 *
 *  5. Promise EXECUTOR is synchronous — the callback passed
 *     to `new Promise(fn)` runs immediately on the call stack.
 *     Only .then/.catch/.finally handlers are microtasks.
 *
 *  6. Microtasks spawning microtasks — new microtasks are
 *     appended to the queue and drain before macrotasks.
 *     Infinite microtask loops = starvation (page freeze).
 *
 *  7. return Promise.resolve() inside .then() adds an extra
 *     microtask tick. Return plain values when you don't need
 *     to return a Promise.
 *
 *  8. RAILWAY STATION ANALOGY:
 *     Enquiry Clerk (call stack) → VIP Tokens (microtasks) →
 *     General Tokens (macrotasks). The clerk always handles
 *     ALL VIP tokens before calling the next general token.
 * ============================================================
 */
