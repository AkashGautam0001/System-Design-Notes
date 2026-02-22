/**
 * ============================================================
 *  FILE 33: Promises in JavaScript
 * ============================================================
 *  Topic  : Promise constructor, .then/.catch/.finally,
 *           chaining, error propagation, and combinators
 *           (all, allSettled, race, any).
 *
 *  Why it matters:
 *    JavaScript is single-threaded. Network calls, file reads,
 *    and timers don't block — they complete "later." Promises
 *    give you a clean way to say "when this finishes, do that"
 *    without descending into callback hell.
 * ============================================================
 *
 *  STORY — Zomato Food Delivery
 *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *  Every Zomato order is a Promise. You place an order
 *  (pending), the restaurant either prepares it (fulfilled)
 *  or cancels it (rejected). The delivery chain — kitchen →
 *  rider → doorstep — is a .then() chain. Multiple orders
 *  from different restaurants at once? That's Promise.all().
 * ============================================================
 */


// ============================================================
//  SECTION 1: THE PROBLEM — Callback Hell
// ============================================================
// WHAT: Before Promises, every async step was a nested callback.
// WHY:  Nesting makes code unreadable, error-prone, and
//       impossible to compose. This is called the "pyramid of
//       doom." Promises were invented to flatten this.

function prepareOrderCB(dish, cb) {
  setTimeout(() => cb(null, { dish, status: "prepared" }), 100);
}
function pickUpOrderCB(order, cb) {
  setTimeout(() => cb(null, { ...order, status: "picked-up" }), 100);
}
function deliverOrderCB(order, cb) {
  setTimeout(() => cb(null, { ...order, status: "delivered" }), 100);
}

// The Pyramid of Doom ↓
console.log("--- Section 1: Callback Hell (the problem) ---");
prepareOrderCB("Biryani", (err, order) => {
  if (err) return console.log(err);
  pickUpOrderCB(order, (err, order) => {        // ← nesting deeper
    if (err) return console.log(err);
    deliverOrderCB(order, (err, order) => {      // ← even deeper
      if (err) return console.log(err);
      console.log(`  [Callback] ${order.dish} → ${order.status}`);
    });
  });
});
// Each step nests deeper. Imagine 10 steps — unreadable!
// Promises flatten this into a clean chain. Let's see how.


// ============================================================
//  SECTION 2: CREATING A PROMISE
// ============================================================
// WHAT: new Promise((resolve, reject) => { ... }) wraps any
//       async operation into an object that represents a
//       future result.
//
// WHY:  Instead of passing callbacks, you return a Promise.
//       The consumer decides what to do with the result.
//
// A Promise has exactly 3 states:
//   pending   → operation still running
//   fulfilled → resolve(value) was called (success)
//   rejected  → reject(error) was called   (failure)
// Once settled (fulfilled or rejected), it NEVER changes.

function prepareOrder(dish) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!dish) {
        reject(new Error("No dish specified!"));
        return;
      }
      console.log(`    Kitchen: ${dish} is ready!`);
      resolve({ dish, status: "prepared" });
    }, 100);
  });
}

function pickUpOrder(order) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`    Rider: Picked up ${order.dish}`);
      resolve({ ...order, status: "picked-up" });
    }, 100);
  });
}

function deliverOrder(order) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (order.dish === "CANCEL_TEST") {
        reject(new Error(`${order.dish} — delivery cancelled!`));
        return;
      }
      console.log(`    Doorstep: ${order.dish} delivered!`);
      resolve({ ...order, status: "delivered" });
    }, 100);
  });
}


// ============================================================
//  SECTION 3: CONSUMING A PROMISE — .then(), .catch(), .finally()
// ============================================================
// WHAT: .then(fn)    → runs when the Promise fulfills (success)
//       .catch(fn)   → runs when the Promise rejects  (failure)
//       .finally(fn) → runs either way (cleanup)
//
// WHY:  Separates "do the work" from "handle the result."
//       Each method returns a NEW Promise, enabling chaining.

setTimeout(() => {
  console.log("\n--- Section 3: .then / .catch / .finally ---");

  prepareOrder("Butter Chicken")
    .then(order => {
      console.log(`  .then → ${order.dish} is ${order.status}`);
    })
    .catch(err => {
      console.log(`  .catch → ${err.message}`);
    })
    .finally(() => {
      console.log(`  .finally → cleanup runs no matter what`);
    });
}, 600);


// ============================================================
//  SECTION 4: CHAINING — The Real Power of Promises
// ============================================================
// WHAT: Return a value (or another Promise) from .then() and
//       the next .then() receives it. This builds a flat
//       pipeline of sequential steps.
//
// WHY:  This is the whole point of Promises — flat chains
//       instead of the nested callbacks we saw in Section 1.
//       Compare the two patterns side by side:
//
//   Callbacks:                    Promises:
//   prepare(dish, (err, o) => {   prepare(dish)
//     pickup(o, (err, o) => {       .then(o => pickup(o))
//       deliver(o, (err, o) => {    .then(o => deliver(o))
//         done(o);                  .then(o => done(o))
//       })                          .catch(handleError)
//     })
//   })
//
//   Nested pyramid.               Flat chain. Night and day!

setTimeout(() => {
  console.log("\n--- Section 4: Chaining (flat pipeline) ---");

  prepareOrder("Paneer Tikka")
    .then(order => pickUpOrder(order))     // returns Promise → chain waits
    .then(order => deliverOrder(order))     // returns Promise → chain waits
    .then(order => {
      console.log(`  Final: ${order.dish} is ${order.status}!`);
    })
    .catch(err => {
      console.log(`  Error: ${err.message}`);
    })
    .finally(() => {
      console.log("  Order complete.");
    });
}, 1200);


// ============================================================
//  SECTION 5: ERROR PROPAGATION
// ============================================================
// WHAT: If any step in a chain rejects, the error skips all
//       following .then()s and jumps to the nearest .catch().
//
// WHY:  You don't need error checks at every step. One
//       .catch() at the end covers the entire chain — just
//       like a try/catch block wrapping multiple statements.

setTimeout(() => {
  console.log("\n--- Section 5: Error Propagation ---");

  prepareOrder(null)   // ← null dish → reject happens here!
    .then(order => {
      console.log("  SKIPPED — this won't run");
      return pickUpOrder(order);
    })
    .then(order => {
      console.log("  SKIPPED — this also won't run");
      return deliverOrder(order);
    })
    .catch(err => {
      // The rejection from prepareOrder(null) jumps here,
      // skipping both .then()s above.
      console.log(`  Caught: ${err.message}`);
      // Output: Caught: No dish specified!
    })
    .finally(() => {
      console.log("  .finally runs even after errors.");
    });
}, 1900);


// ============================================================
//  SECTION 6: SHORTCUTS — Promise.resolve() & Promise.reject()
// ============================================================
// WHAT: Create already-settled Promises in one line.
// WHY:  Useful for caches ("I already have the result"),
//       testing, and normalising sync values into chains.

setTimeout(() => {
  console.log("\n--- Section 6: Promise.resolve & Promise.reject ---");

  // Already fulfilled — no waiting
  const cached = Promise.resolve({ dish: "Dal Makhani", status: "delivered" });
  cached.then(o => console.log(`  Cached: ${o.dish} → ${o.status}`));

  // Already rejected — instant error
  const failed = Promise.reject(new Error("Restaurant closed"));
  failed.catch(err => console.log(`  Instant fail: ${err.message}`));
}, 2500);


// ============================================================
//  SECTION 7: RUNNING PROMISES IN PARALLEL — Combinators
// ============================================================
// WHAT: Fire multiple promises at the same time, combine results.
// WHY:  Real apps fire many async calls at once — API calls,
//       DB queries, file reads. Combinators coordinate them.

// Helper: simulate a restaurant with variable prep time
function restaurantOrder(name, dish, delayMs, willFail = false) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (willFail) reject(new Error(`${name} cancelled ${dish}`));
      else resolve({ restaurant: name, dish, status: "ready" });
    }, delayMs);
  });
}


// ---------- 7a. Promise.all() — ALL must succeed ----------
// WHAT: Takes an array of Promises, resolves with array of results.
// WHY:  When you need ALL data before proceeding (e.g., load
//       user profile + orders + notifications before rendering).
// GOTCHA: If ANY one rejects, the entire Promise.all rejects!

setTimeout(() => {
  console.log("\n--- 7a: Promise.all() — all must succeed ---");

  Promise.all([
    restaurantOrder("Haldiram's",  "Chole Bhature", 200),
    restaurantOrder("Bikanervala", "Rasgulla",      150),
    restaurantOrder("Sagar Ratna", "Dosa",          100),
  ])
    .then(results => {
      console.log("  All ready:");
      results.forEach(r => console.log(`    ${r.restaurant}: ${r.dish}`));
    })
    .catch(err => console.log(`  Failed: ${err.message}`));
}, 3000);

// Promise.all with one failure — the whole batch fails:
setTimeout(() => {
  console.log("\n--- 7a: Promise.all() — one failure breaks it ---");

  Promise.all([
    restaurantOrder("Paradise",   "Biryani",  100),
    restaurantOrder("Aditi",      "Naan",     200, true),  // ← cancels!
    restaurantOrder("Moti Mahal", "Tandoori", 300),
  ])
    .then(() => console.log("  This won't run"))
    .catch(err => console.log(`  Batch failed: ${err.message}`));
    // Output: Batch failed: Aditi cancelled Naan
}, 3600);


// ---------- 7b. Promise.allSettled() — wait for ALL ----------
// WHAT: Waits for every Promise, never short-circuits. Returns
//       array of { status, value } or { status, reason }.
// WHY:  When you need every result regardless of success or
//       failure — for logging, dashboards, retry queues.

setTimeout(() => {
  console.log("\n--- 7b: Promise.allSettled() — get every result ---");

  Promise.allSettled([
    restaurantOrder("Punjab Grill",    "Lassi",  100),
    restaurantOrder("Cafe Delhi",      "Samosa", 200, true),  // fails
    restaurantOrder("Chennai Express", "Idli",   150),
  ]).then(results => {
    results.forEach(r => {
      if (r.status === "fulfilled") {
        console.log(`    OK:   ${r.value.restaurant} → ${r.value.dish}`);
      } else {
        console.log(`    FAIL: ${r.reason.message}`);
      }
    });
  });
}, 4200);


// ---------- 7c. Promise.race() — first to SETTLE wins ----------
// WHAT: Returns the result of whichever Promise settles first,
//       whether it fulfilled or rejected.
// WHY:  Timeouts, fastest-mirror selection, "show me the
//       quickest response."

setTimeout(() => {
  console.log("\n--- 7c: Promise.race() — fastest wins ---");

  Promise.race([
    restaurantOrder("Slow Kitchen",   "Thali",   500),
    restaurantOrder("Fast Kitchen",   "Maggi",    50),   // ← fastest!
    restaurantOrder("Medium Kitchen", "Paratha", 200),
  ]).then(winner => {
    console.log(`  Winner: ${winner.restaurant} with ${winner.dish}`);
    // Output: Winner: Fast Kitchen with Maggi
  });
}, 4800);


// ---------- 7d. Promise.any() — first to FULFILL wins ----------
// WHAT: Like race(), but ignores rejections. Only rejects
//       (with AggregateError) if ALL promises reject.
// WHY:  "Give me the first working result, I don't care about
//       failures." E.g., try 3 CDN mirrors, use first success.

setTimeout(() => {
  console.log("\n--- 7d: Promise.any() — first success wins ---");

  Promise.any([
    restaurantOrder("Shop A", "Chai", 300, true),  // fails
    restaurantOrder("Shop B", "Chai", 200, true),  // fails
    restaurantOrder("Shop C", "Chai", 400),         // ← only success!
  ]).then(winner => {
    console.log(`  First success: ${winner.restaurant}`);
    // Output: First success: Shop C
  });

  // When ALL fail → AggregateError
  Promise.any([
    restaurantOrder("X", "Chai", 100, true),
    restaurantOrder("Y", "Chai", 200, true),
  ]).catch(err => {
    console.log(`  All failed: ${err.constructor.name} (${err.errors.length} errors)`);
    // Output: All failed: AggregateError (2 errors)
  });
}, 5400);


// ============================================================
//  SECTION 8: REAL-WORLD PATTERN — Timeout with Promise.race()
// ============================================================
// WHAT: Race the real operation against a timer Promise.
// WHY:  APIs and databases can hang forever. A timeout
//       rejects if the operation takes too long — essential
//       in production code.

function withTimeout(promise, ms) {
  const timer = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timer]);
}

setTimeout(() => {
  console.log("\n--- Section 8: Timeout Pattern ---");

  const slowOrder = restaurantOrder("Slow Dhaba", "Thali", 5000);

  withTimeout(slowOrder, 300)
    .then(result => console.log("  Delivered:", result))
    .catch(err => console.log(`  ${err.message}`));
    // Output: Timed out after 300ms
}, 6000);


// ============================================================
//  SECTION 9: CHAINING WITH DATA TRANSFORMATION
// ============================================================
// WHAT: .then() can return plain values (not just Promises).
//       The next .then() receives that value wrapped in a
//       fulfilled Promise automatically.
// WHY:  Lets you transform data step-by-step in a pipeline,
//       mixing sync transforms with async operations.

setTimeout(() => {
  console.log("\n--- Section 9: Data Transformation in Chains ---");

  prepareOrder("Chole Bhature")
    .then(order => {
      // Sync transform — add delivery fee (returns plain object)
      return { ...order, fee: 49, rating: null };
    })
    .then(order => {
      // Another sync transform — assign a rider
      return { ...order, rider: "Rahul" };
    })
    .then(order => deliverOrder(order))    // async step (returns Promise)
    .then(order => {
      // Final sync transform
      return { ...order, rating: 4.5 };
    })
    .then(order => {
      console.log(`  ${order.dish}: ₹${order.fee}, rider ${order.rider}, rating ${order.rating}`);
      // Output: Chole Bhature: ₹49, rider Rahul, rating 4.5
    })
    .catch(err => console.log(`  Error: ${err.message}`));
}, 6600);


/**
 * ============================================================
 *  KEY TAKEAWAYS
 * ============================================================
 *  1. A Promise = a future value. Three states: pending →
 *     fulfilled (success) or rejected (failure). Once settled,
 *     it never changes.
 *
 *  2. new Promise((resolve, reject) => { ... }) wraps any
 *     async operation. Call resolve(value) or reject(error).
 *
 *  3. .then() handles success, .catch() handles failure,
 *     .finally() runs cleanup. Each returns a NEW Promise.
 *
 *  4. Chaining flattens callbacks: return values or Promises
 *     from .then() to build readable, flat pipelines.
 *
 *  5. Error propagation: a rejection anywhere in the chain
 *     skips to the nearest .catch() — one catch covers all.
 *
 *  6. Four combinators for parallel work:
 *       all()        → all must succeed (fail-fast)
 *       allSettled() → wait for all, report each outcome
 *       race()       → first to settle wins
 *       any()        → first to fulfill wins
 *
 *  7. Promise.resolve() / Promise.reject() create pre-settled
 *     Promises — handy for caches, tests, normalisation.
 *
 *  8. Timeout pattern: Promise.race([operation, timer]) is
 *     essential for production reliability.
 * ============================================================
 */
