/**
 * ============================================================
 *  FILE 29 : Throttle, Debounce & Saga Patterns
 *  Topic   : Throttle, Debounce, Saga
 *  WHY THIS MATTERS:
 *    Debounce and throttle control how often expensive work
 *    runs in response to rapid events. Saga coordinates
 *    multi-step transactions with automatic rollback —
 *    essential for reliable distributed workflows.
 * ============================================================
 */

// STORY: Guard Ravi manages platform crowd flow on the Mumbai
// local train and coordinates the Churchgate-Virar journey —
// no whistle blows too fast, no journey continues if a leg fails.

(async () => {

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Debounce
// ────────────────────────────────────────────────────────────
console.log("=== BLOCK 1: Debounce ===");

// WHY: Debounce delays execution until events stop firing.
// Classic use: don't blow whistle for every passenger — wait for the last one.
function debounce(fn, delay, { leading = false } = {}) {
  let timer = null;
  let leadingFired = false;
  function debounced(...args) {
    // WHY: Leading edge fires immediately on the first passenger
    if (leading && !leadingFired) { leadingFired = true; fn(...args); }
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!leading) fn(...args);
      leadingFired = false;
    }, delay);
  }
  debounced.cancel = () => { clearTimeout(timer); leadingFired = false; };
  return debounced;
}

// Simulate passengers rushing onto platform before whistle
const whistleResults = await new Promise(resolve => {
  const results = [];
  const blowWhistle = debounce(passenger => results.push(passenger), 30);
  // Ravi sees passengers: "Amit", "Priya", "Rahul", "Sneha" rushing in
  blowWhistle("Amit"); blowWhistle("Priya"); blowWhistle("Rahul"); blowWhistle("Sneha");
  // Only blows whistle after last passenger "Sneha" (trailing edge)
  setTimeout(() => resolve(results), 60);
});
console.log("Ravi's debounced whistle:", whistleResults);
// Output: Ravi's debounced whistle: [ 'Sneha' ]

// Leading edge debounce
const leadResults = await new Promise(resolve => {
  const results = [];
  const action = debounce(val => results.push(val), 30, { leading: true });
  action("first-passenger");   // whistle fires immediately (leading)
  action("second-passenger");  // resets timer
  action("third-passenger");   // resets timer
  setTimeout(() => resolve(results), 60);
});
console.log("Ravi's leading debounce:", leadResults);
// Output: Ravi's leading debounce: [ 'first-passenger' ]

// Cancel demonstration
const logged = [];
const debouncedLog = debounce(v => logged.push(v), 30);
debouncedLog("will cancel");
debouncedLog.cancel();
await new Promise(r => setTimeout(r, 50));
console.log("Ravi's cancelled debounce:", logged);
// Output: Ravi's cancelled debounce: []

// ────────────────────────────────────────────────────────────
// BLOCK 2 — Throttle
// ────────────────────────────────────────────────────────────
console.log("\n=== BLOCK 2: Throttle ===");

// WHY: Throttle ensures station announcements happen at most once
// per interval — no matter how many stations pass quickly.
function throttle(fn, interval, { trailing = true } = {}) {
  let lastRun = 0;
  let timer = null;
  return function throttled(...args) {
    const now = Date.now();
    if (now - lastRun >= interval) {
      lastRun = now;
      fn(...args);
    } else if (trailing) {
      // WHY: Trailing ensures the last announcement isn't lost
      clearTimeout(timer);
      timer = setTimeout(() => {
        lastRun = Date.now();
        fn(...args);
      }, interval - (now - lastRun));
    }
  };
}

// Demonstrate throttle: burst of station announcements, then wait for trailing
const announcements = [];
const announceStation = throttle(station => announcements.push(station), 50);
// Burst: first call runs immediately (leading), rest are throttled
announceStation("Churchgate"); announceStation("Marine Lines"); announceStation("Charni Road"); announceStation("Grant Road");
console.log("Ravi's throttle — immediate:", [...announcements]);
// Output: Ravi's throttle — immediate: [ 'Churchgate' ]

await new Promise(r => setTimeout(r, 70));
// WHY: Trailing edge captures the last announcement after interval expires
console.log("Ravi's throttle — after wait:", announcements);
// Output: Ravi's throttle — after wait: [ 'Churchgate', 'Grant Road' ]

// WHY: requestAnimationFrame throttle — in browsers, rAF is
// the ideal throttle for visual updates (~16ms). Simulated here.
function rafThrottle(fn) {
  let scheduled = false;
  return function (...args) {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { fn(...args); scheduled = false; }, 16);
  };
}

const rafResults = await new Promise(resolve => {
  const hits = [];
  const update = rafThrottle(v => hits.push(v));
  update("Dadar"); update("Bandra"); update("Andheri"); // Bandra & Andheri skipped
  setTimeout(() => {
    update("Borivali"); // new frame
    setTimeout(() => resolve(hits), 30);
  }, 25);
});
console.log("Ravi's rAF throttle:", rafResults);
// Output: Ravi's rAF throttle: [ 'Dadar', 'Borivali' ]

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Saga Pattern
// ────────────────────────────────────────────────────────────
console.log("\n=== BLOCK 3: Saga Pattern ===");

// WHY: When a multi-leg train journey spans stations, you can't
// undo travel in one step. A saga runs legs in order and applies
// compensating refunds on cancellation.
const delay = ms => new Promise(r => setTimeout(r, ms));

class Saga {
  constructor(name) { this._name = name; this._steps = []; }

  addStep(name, execute, compensate) {
    this._steps.push({ name, execute, compensate });
    return this;
  }

  async run() {
    const completed = [];
    const log = [];
    for (const step of this._steps) {
      try {
        const result = await step.execute();
        log.push(`[OK] ${step.name}: ${result}`);
        completed.push(step);
      } catch (err) {
        log.push(`[FAIL] ${step.name}: ${err.message}`);
        // WHY: Compensate in reverse order — refund completed legs
        for (const done of completed.reverse()) {
          try {
            const undoResult = await done.compensate();
            log.push(`[REFUND] ${done.name}: ${undoResult}`);
          } catch (undoErr) {
            log.push(`[REFUND-FAIL] ${done.name}: ${undoErr.message}`);
          }
        }
        return { success: false, log };
      }
    }
    return { success: true, log };
  }
}

// Ravi's successful Churchgate-to-Virar journey
const journeyOk = new Saga("Churchgate-Virar Express")
  .addStep("Churchgate to Dadar",
    async () => { await delay(5); return "Leg 1 — ₹20 ticket booked"; },
    async () => { await delay(5); return "₹20 refunded for Churchgate-Dadar"; })
  .addStep("Dadar to Borivali",
    async () => { await delay(5); return "Leg 2 — ₹15 ticket booked"; },
    async () => { await delay(5); return "₹15 refunded for Dadar-Borivali"; })
  .addStep("Borivali to Virar",
    async () => { await delay(5); return "Leg 3 — ₹10 ticket booked"; },
    async () => { await delay(5); return "₹10 refunded for Borivali-Virar"; });

const okResult = await journeyOk.run();
console.log("Ravi's successful journey:", okResult.success);
// Output: Ravi's successful journey: true
console.log("Steps:", okResult.log);
// Output: Steps: [ '[OK] Churchgate to Dadar: Leg 1 — ₹20 ticket booked', '[OK] Dadar to Borivali: Leg 2 — ₹15 ticket booked', '[OK] Borivali to Virar: Leg 3 — ₹10 ticket booked' ]

// Failed journey — Dadar to Borivali leg cancelled, Churchgate-Dadar refunded
const journeyFail = new Saga("Churchgate-Virar Express")
  .addStep("Churchgate to Dadar",
    async () => { await delay(5); return "Leg 1 — ₹20 ticket booked"; },
    async () => { await delay(5); return "₹20 refunded for Churchgate-Dadar"; })
  .addStep("Dadar to Borivali",
    async () => { await delay(5); throw new Error("Train cancelled due to waterlogging"); },
    async () => { await delay(5); return "Dadar-Borivali fare reversed"; })
  .addStep("Borivali to Virar",
    async () => { await delay(5); return "Leg 3 — ₹10 ticket booked"; },
    async () => { await delay(5); return "₹10 refunded for Borivali-Virar"; });

const failResult = await journeyFail.run();
console.log("\nRavi's failed journey:", failResult.success);
// Output: Ravi's failed journey: false
console.log("Steps:", failResult.log);
// Output: Steps: [ '[OK] Churchgate to Dadar: Leg 1 — ₹20 ticket booked', '[FAIL] Dadar to Borivali: Train cancelled due to waterlogging', '[REFUND] Churchgate to Dadar: ₹20 refunded for Churchgate-Dadar' ]

// WHY: Saga guarantees eventual consistency — either all
// journey legs succeed or all completed legs are refunded.

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Debounce waits for the last passenger — ideal for whistle
//    timing, search input, form validation.
// 2. Leading-edge debounce fires immediately on first trigger.
// 3. Throttle enforces a max frequency — ideal for station
//    announcements, scroll, and rate-limited API calls.
// 4. rAF throttle syncs with browser paint cycles (~60fps).
// 5. Saga coordinates multi-leg train journeys with
//    compensating refunds (rollback) on cancellation.
// 6. Compensation runs in reverse order of completed legs.

})();
