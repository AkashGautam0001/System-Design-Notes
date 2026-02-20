/**
 * ============================================================
 *  FILE 4: Timers in Node.js
 * ============================================================
 *  Topic  : setTimeout, setImmediate, setInterval,
 *           process.nextTick, Promise.resolve().then(),
 *           event loop phases, timer.ref(), timer.unref(),
 *           clearImmediate, clearTimeout, clearInterval.
 *
 *  WHY THIS MATTERS:
 *  Node.js timer functions behave differently from browser
 *  timers because Node has extra event loop phases (check,
 *  poll) and extra APIs (setImmediate, process.nextTick).
 *  Understanding execution order prevents subtle race
 *  conditions and helps you write predictable async code.
 * ============================================================
 */

// ============================================================
// STORY: Indian Railway Dispatcher
// A railway control room at New Delhi station (NDLS) manages
// three types of trains:
// - RAJDHANI EXPRESS (process.nextTick) — highest priority,
//   departs before anything else, even if it was scheduled last.
// - SHATABDI (setImmediate) — runs in the "check" phase, right
//   after I/O polling completes.
// - LOCAL SCHEDULED (setTimeout) — departs only when its timer
//   expires, handled in the "timers" phase.
// The dispatcher (event loop) cycles through phases, and each
// train type has its designated departure window.
// ============================================================

// ============================================================
// EXAMPLE BLOCK 1 — Execution Order & Event Loop Phases
// ============================================================

console.log("=== BLOCK 1: Execution Order & Event Loop Phases ===\n");

// ──────────────────────────────────────────────────────────
// SECTION 1 — The Six Phases of the Node.js Event Loop
// ──────────────────────────────────────────────────────────
// WHY: The browser event loop has a simple model (macrotask,
// microtask, render). Node.js has SIX phases, and knowing
// them explains why setImmediate sometimes runs before
// setTimeout(fn, 0) and sometimes after.
//
// Phase 1: TIMERS
//   - Executes callbacks from setTimeout() and setInterval()
//     whose threshold has elapsed.
//
// Phase 2: PENDING CALLBACKS
//   - Executes I/O callbacks deferred to the next loop
//     iteration (e.g., TCP errors).
//
// Phase 3: IDLE, PREPARE
//   - Internal use only (libuv housekeeping).
//
// Phase 4: POLL
//   - Retrieves new I/O events. Executes I/O-related callbacks
//     (everything except close callbacks, timers, setImmediate).
//   - If the poll queue is empty, it will either wait for
//     callbacks or move to the check phase.
//
// Phase 5: CHECK
//   - Executes setImmediate() callbacks. This phase runs
//     AFTER poll, making setImmediate ideal for running code
//     right after I/O completes.
//
// Phase 6: CLOSE CALLBACKS
//   - Executes close event callbacks (e.g., socket.on('close')).
//
// BETWEEN EVERY PHASE:
//   Node drains the nextTick queue and then the microtask
//   (Promise) queue. This is why nextTick and Promise.then
//   always run between phases.

// ──────────────────────────────────────────────────────────
// SECTION 2 — The Classic Ordering Test
// ──────────────────────────────────────────────────────────
// WHY: This is the most common Node.js interview question.
// Predict the output, then verify.

console.log("--- Ordering Demo ---");
console.log("  1. Synchronous — always first");
// Output: 1. Synchronous — always first

setTimeout(() => {
  console.log("  5. setTimeout(fn, 0) — timers phase");
  // Output: 5. setTimeout(fn, 0) — timers phase
}, 0);

setImmediate(() => {
  console.log("  6. setImmediate(fn) — check phase");
  // Output: 6. setImmediate(fn) — check phase
});

process.nextTick(() => {
  console.log("  2. process.nextTick — before all microtasks");
  // Output: 2. process.nextTick — before all microtasks
});

Promise.resolve().then(() => {
  console.log("  3. Promise.then — after nextTick, before timers");
  // Output: 3. Promise.then — after nextTick, before timers
});

queueMicrotask(() => {
  console.log("  4. queueMicrotask — same queue as Promise.then");
  // Output: 4. queueMicrotask — same queue as Promise.then
});

console.log("  1b. Synchronous — still first (call stack)");
// Output: 1b. Synchronous — still first (call stack)

/*
 * Expected output order:
 *   1.  Synchronous — always first
 *   1b. Synchronous — still first (call stack)
 *   2.  process.nextTick — before all microtasks
 *   3.  Promise.then — after nextTick, before timers
 *   4.  queueMicrotask — same queue as Promise.then
 *   5.  setTimeout(fn, 0) — timers phase
 *   6.  setImmediate(fn) — check phase
 *
 * NOTE on 5 vs 6:
 *   When called from the main module (not inside an I/O callback),
 *   setTimeout(fn, 0) and setImmediate(fn) order is NON-DETERMINISTIC.
 *   It depends on how quickly the event loop starts. However, INSIDE
 *   an I/O callback, setImmediate ALWAYS fires before setTimeout(fn, 0).
 */

// ──────────────────────────────────────────────────────────
// SECTION 3 — Inside I/O: Deterministic Order
// ──────────────────────────────────────────────────────────
// WHY: Inside an I/O callback, we are in the poll phase.
// setImmediate (check phase) fires BEFORE setTimeout (timers
// phase of the NEXT iteration). This order is guaranteed.

const fs = require("fs");

fs.readFile(__filename, () => {
  // We are now inside an I/O callback (poll phase)
  console.log("\n--- Inside I/O callback (deterministic order) ---");

  setTimeout(() => {
    console.log("  B. setTimeout — timers phase (next iteration)");
    // Output: B. setTimeout — timers phase (next iteration)
  }, 0);

  setImmediate(() => {
    console.log("  A. setImmediate — check phase (ALWAYS first here)");
    // Output: A. setImmediate — check phase (ALWAYS first here)
  });

  process.nextTick(() => {
    console.log("  0. nextTick — before both (between phases)");
    // Output: 0. nextTick — before both (between phases)
  });

  /*
   * Guaranteed order inside I/O:
   *   0. nextTick  (between-phase microtask drain)
   *   A. setImmediate  (check phase — current iteration)
   *   B. setTimeout    (timers phase — next iteration)
   */
});

// ──────────────────────────────────────────────────────────
// SECTION 4 — Nested nextTick and Promise Interleaving
// ──────────────────────────────────────────────────────────
// WHY: nextTick queue drains completely (including newly added
// ticks) before moving to the Promise microtask queue. This
// can cause starvation if you recursively call nextTick.

setTimeout(() => {
  console.log("\n--- nextTick vs Promise interleaving ---");

  process.nextTick(() => {
    console.log("  tick 1");
    process.nextTick(() => {
      console.log("  tick 2 (nested — still runs before Promise)");
    });
  });

  Promise.resolve().then(() => {
    console.log("  promise 1 (runs after ALL nextTicks drain)");
  });

  // Output order:
  //   tick 1
  //   tick 2 (nested — still runs before Promise)
  //   promise 1 (runs after ALL nextTicks drain)
}, 50);

// ──────────────────────────────────────────────────────────
// SECTION 5 — The Complete Queue Reference
// ──────────────────────────────────────────────────────────
// WHY: Node.js has multiple queues, each with a different
// priority. Knowing them by name and order is the single
// most important mental model for async Node.js code.
//
// ┌──────────────────────────────────────────────────────┐
// │          NODE.JS QUEUE EXECUTION ORDER               │
// │  (highest priority at top, lowest at bottom)         │
// ├──────┬───────────────────────┬───────────────────────┤
// │  #   │ Queue Name            │ What Goes Here        │
// ├──────┼───────────────────────┼───────────────────────┤
// │  0   │ Call Stack             │ Synchronous code      │
// │      │ (not a queue, but     │ runs first, always.   │
// │      │  runs before all)     │                       │
// ├──────┼───────────────────────┼───────────────────────┤
// │  1   │ nextTick Queue        │ process.nextTick(fn)  │
// │      │ (microtask)           │ Drains completely     │
// │      │                       │ (including nested     │
// │      │                       │ ticks) before moving  │
// │      │                       │ to queue #2.          │
// ├──────┼───────────────────────┼───────────────────────┤
// │  2   │ Promise Microtask     │ Promise.then(fn),     │
// │      │ Queue                 │ queueMicrotask(fn),   │
// │      │                       │ async/await resume.   │
// │      │                       │ Drains completely     │
// │      │                       │ before moving on.     │
// ├──────┼───────────────────────┼───────────────────────┤
// │  3   │ Timer Queue           │ setTimeout(fn, delay) │
// │      │ (macrotask — phase 1) │ setInterval(fn, delay)│
// │      │                       │ Only fires when delay │
// │      │                       │ threshold is reached. │
// ├──────┼───────────────────────┼───────────────────────┤
// │  4   │ I/O Callback Queue    │ fs.readFile callback, │
// │      │ (macrotask — phase 2) │ net/http callbacks,   │
// │      │                       │ TCP error callbacks.  │
// ├──────┼───────────────────────┼───────────────────────┤
// │  5   │ I/O Poll Queue        │ New I/O events.       │
// │      │ (macrotask — phase 4) │ Waits here if idle    │
// │      │                       │ and no timers pending.│
// ├──────┼───────────────────────┼───────────────────────┤
// │  6   │ Check Queue           │ setImmediate(fn)      │
// │      │ (macrotask — phase 5) │ Always runs after     │
// │      │                       │ poll phase completes. │
// ├──────┼───────────────────────┼───────────────────────┤
// │  7   │ Close Queue           │ socket.on('close'),   │
// │      │ (macrotask — phase 6) │ server.on('close'),   │
// │      │                       │ process.on('exit').   │
// └──────┴───────────────────────┴───────────────────────┘
//
// CRITICAL RULE:
//   After EACH macrotask phase (3-7), Node drains ALL
//   pending items in queues #1 and #2 before moving to
//   the next macrotask phase. This is why nextTick and
//   Promise callbacks always "cut in line."
//
// MEMORY AID — "N P T I C C" (Nick Promises To Inspect
//   Coded Closures):
//   N = nextTick, P = Promise, T = Timer,
//   I = I/O, C = Check, C = Close

// ──────────────────────────────────────────────────────────
// SECTION 6 — Queue Demo: All 6 Queues in Action
// ──────────────────────────────────────────────────────────
// WHY: Seeing all queues fire in a single demo makes the
// execution order concrete and testable.

setTimeout(() => {
  console.log("\n--- All Queues Demo ---");

  // Wrap everything inside an I/O callback so we start
  // from a known phase (poll) and get deterministic order.
  fs.readFile(__filename, () => {
    // We are in the I/O POLL phase now.

    // Queue #6 — Check Queue (setImmediate)
    setImmediate(() => {
      console.log("  5. Check Queue       — setImmediate");
      // Output: 5. Check Queue       — setImmediate
    });

    // Queue #3 — Timer Queue (setTimeout)
    setTimeout(() => {
      console.log("  6. Timer Queue       — setTimeout(fn, 0)");
      // Output: 6. Timer Queue       — setTimeout(fn, 0)

      // NOTE on Close Queue (#7):
      // The close callbacks phase handles socket.on('close'),
      // server.on('close'), etc. It can't be shown in this
      // single-tick demo because closing a server requires
      // async setup first (listen, then close). It always
      // runs LAST in the event loop iteration, after check.
      // See 23-net-module.js for close event examples.
    }, 0);

    // Queue #2 — Promise Microtask Queue
    Promise.resolve().then(() => {
      console.log("  2. Promise Queue     — Promise.then");
      // Output: 2. Promise Queue     — Promise.then
    });

    queueMicrotask(() => {
      console.log("  3. Promise Queue     — queueMicrotask");
      // Output: 3. Promise Queue     — queueMicrotask
    });

    // Queue #1 — nextTick Queue (highest priority async)
    process.nextTick(() => {
      console.log("  1. nextTick Queue    — process.nextTick");
      // Output: 1. nextTick Queue    — process.nextTick
    });

    // Queue #0 — Call Stack (synchronous)
    console.log("  0. Call Stack        — synchronous code");
    // Output: 0. Call Stack        — synchronous code

    /*
     * Expected output order:
     *   0. Call Stack        — synchronous code
     *   1. nextTick Queue    — process.nextTick
     *   2. Promise Queue     — Promise.then
     *   3. Promise Queue     — queueMicrotask
     *   4. (I/O phase — we're already inside it)
     *   5. Check Queue       — setImmediate
     *   6. Timer Queue       — setTimeout(fn, 0)
     *
     * WHY this order:
     *   - Sync runs first (call stack)
     *   - nextTick drains before Promises (both are microtasks)
     *   - Promise.then and queueMicrotask share the same queue
     *     (FIFO order between them)
     *   - After microtasks drain, the event loop advances:
     *     Check phase (setImmediate) runs in current iteration,
     *     Timer phase (setTimeout) runs in NEXT iteration.
     *   - Inside I/O: setImmediate ALWAYS fires before
     *     setTimeout(fn, 0). This order is guaranteed.
     */
  });
}, 200);

// ============================================================
// EXAMPLE BLOCK 2 — Timer Control: ref, unref & Cleanup
// ============================================================

// ──────────────────────────────────────────────────────────
// SECTION 5 — timer.unref() and timer.ref()
// ──────────────────────────────────────────────────────────
// WHY: By default, active timers keep the process alive. Calling
// timer.unref() tells Node: "Don't keep the process running
// just for this timer." If the timer is the only thing left,
// the process can exit. timer.ref() reverses that.
//
// Use case: heartbeat intervals, background cleanup tasks
// that should NOT prevent graceful shutdown.

setTimeout(() => {
  console.log("\n=== BLOCK 2: Timer Control — ref, unref & Cleanup ===\n");

  console.log("--- timer.unref() Demo ---");

  // Create an interval that would normally keep the process alive
  let unrefCount = 0;
  const heartbeat = setInterval(() => {
    unrefCount++;
    console.log("  Heartbeat tick #" + unrefCount);
  }, 30);

  // unref it — if this is the only active handle, process CAN exit
  heartbeat.unref();
  console.log("  Interval created and unref'd — process won't hang for it.");
  // Output: Interval created and unref'd — process won't hang for it.

  // WHY: Without unref(), this setInterval would keep the process
  // alive forever. With unref(), the process exits when all other
  // work is done, regardless of whether the interval is still active.

  // ──────────────────────────────────────────────────────
  // SECTION 6 — timer.ref() (Re-enable Keep-Alive)
  // ──────────────────────────────────────────────────────

  console.log("\n--- timer.ref() Demo ---");

  const bgTimer = setTimeout(() => {
    console.log("  bgTimer fired (was ref'd again).");
  }, 20);

  bgTimer.unref();
  console.log("  bgTimer unref'd — process could exit before it fires.");
  // Output: bgTimer unref'd — process could exit before it fires.

  bgTimer.ref();
  console.log("  bgTimer ref'd again — process WILL wait for it.");
  // Output: bgTimer ref'd again — process WILL wait for it.

  // WHY: ref() reverses unref(). The process will now wait for
  // bgTimer to fire before exiting.

  // ──────────────────────────────────────────────────────
  // SECTION 7 — clearImmediate, clearTimeout, clearInterval
  // ──────────────────────────────────────────────────────
  // WHY: Cancelling timers prevents memory leaks and unwanted
  // callbacks. Always clear timers you no longer need.

  console.log("\n--- Clearing Timers ---");

  const myImmediate = setImmediate(() => {
    console.log("  This will NEVER print — cleared before check phase.");
  });
  clearImmediate(myImmediate);
  console.log("  setImmediate created and immediately cleared.");
  // Output: setImmediate created and immediately cleared.

  const myTimeout = setTimeout(() => {
    console.log("  This will NEVER print — timeout was cleared.");
  }, 100);
  clearTimeout(myTimeout);
  console.log("  setTimeout created and immediately cleared.");
  // Output: setTimeout created and immediately cleared.

  // Clean up the heartbeat interval
  clearInterval(heartbeat);
  console.log("  Heartbeat interval cleared.");
  // Output: Heartbeat interval cleared.

  // ──────────────────────────────────────────────────────
  // SECTION 8 — Practical Pattern: Self-Cancelling Timer
  // ──────────────────────────────────────────────────────
  // WHY: In production, you often want an interval that runs
  // N times then stops, or a timeout that auto-cancels on a
  // condition.

  console.log("\n--- Self-Cancelling Interval ---");

  let tickCount = 0;
  const maxTicks = 3;

  const selfCancelling = setInterval(() => {
    tickCount++;
    console.log("  Controlled tick #" + tickCount + " of " + maxTicks);
    // Output: Controlled tick #1 of 3
    // Output: Controlled tick #2 of 3
    // Output: Controlled tick #3 of 3

    if (tickCount >= maxTicks) {
      clearInterval(selfCancelling);
      console.log("  Interval self-cancelled after " + maxTicks + " ticks.");
      // Output: Interval self-cancelled after 3 ticks.

      // Print final summary after all demos complete
      printSummary();
    }
  }, 25);
}, 100);

// ──────────────────────────────────────────────────────────
// Summary and Key Takeaways
// ──────────────────────────────────────────────────────────

function printSummary() {
  console.log("");

  // ============================================================
  // KEY TAKEAWAYS
  // ============================================================
  // 1. Node.js has 7 queues in priority order:
  //      #0 Call Stack (sync) > #1 nextTick > #2 Promise/microtask
  //      > #3 Timer > #4 I/O Callback > #5 I/O Poll
  //      > #6 Check (setImmediate) > #7 Close
  // 2. Microtask queues (#1 nextTick, #2 Promise) drain completely
  //    BETWEEN every macrotask phase. They always "cut in line."
  // 3. nextTick drains before Promises — even nested nextTicks run
  //    before any Promise.then gets a turn (starvation risk!).
  // 4. setImmediate runs in the CHECK phase (after poll).
  //    setTimeout(fn, 0) runs in the TIMERS phase.
  // 5. Inside an I/O callback: setImmediate ALWAYS fires before
  //    setTimeout(fn, 0). Outside I/O, the order is non-deterministic.
  // 6. timer.unref() — lets the process exit even if the timer is active.
  //    timer.ref() — reverses unref, process waits for the timer.
  // 7. clearTimeout, clearInterval, clearImmediate — always clean up
  //    timers you no longer need to prevent leaks.
  // 8. Memory aid: "N P T I C C" — nextTick, Promise, Timer,
  //    I/O, Check, Close.
  //
  // The Indian Railway Dispatcher at NDLS says: "Know which
  // platform each train departs from — Rajdhani, Shatabdi,
  // or local — and the schedule will never surprise you."
  // ============================================================
}
