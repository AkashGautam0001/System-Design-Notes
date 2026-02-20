/**
 * ========================================================
 *  FILE 33: PROMISES
 * ========================================================
 *  Topic  : Callback hell, the Promise constructor, .then,
 *           .catch, .finally, chaining, combinators
 *           (all, allSettled, race, any), resolve/reject
 *           shortcuts, and error propagation.
 *
 *  Why it matters:
 *    Asynchronous operations are the heartbeat of JS —
 *    network requests, file I/O, timers. Promises tame
 *    the chaos of callbacks into flat, composable chains
 *    with built-in error handling, making async code
 *    readable, predictable, and resilient.
 * ========================================================
 *
 *  STORY — India Post Speed Post Delivery Service
 *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *  India Post runs the Speed Post service across the
 *  country. Each delivery is a Promise: it will either be
 *  fulfilled (parcel delivered) or rejected (returned to
 *  sender). The postmaster chains deliveries, coordinates
 *  multiple branches, and ensures every failure is logged
 *  — never silently lost.
 * ========================================================
 */

// ========================================================
//  EXAMPLE 1 — Callback Hell vs Promises
// ========================================================

// --------------------------------------------------------
// 1. THE CALLBACK HELL PROBLEM
// --------------------------------------------------------
// WHY: Nested callbacks quickly become unreadable, hard
//      to debug, and impossible to compose. Promises
//      flatten this "pyramid of doom" into a chain.

// Simulated async operations with callbacks (the old way)
function acceptParcelCB(trackingId, callback) {
  setTimeout(() => {
    console.log(`[CB] Accepted parcel #${trackingId} at post office`);
    callback(null, { trackingId, status: "accepted" });
  }, 100);
}

function dispatchParcelCB(parcel, callback) {
  setTimeout(() => {
    console.log(`[CB] Dispatching parcel #${parcel.trackingId} via mail van`);
    callback(null, { ...parcel, status: "in-transit" });
  }, 100);
}

function deliverParcelCB(parcel, callback) {
  setTimeout(() => {
    console.log(`[CB] Delivered parcel #${parcel.trackingId} to addressee`);
    callback(null, { ...parcel, status: "delivered" });
  }, 100);
}

// Callback hell — each step is nested deeper
acceptParcelCB("SP101", (err, parcel) => {
  if (err) return console.log("Error:", err);
  dispatchParcelCB(parcel, (err, parcel) => {
    if (err) return console.log("Error:", err);
    deliverParcelCB(parcel, (err, parcel) => {
      if (err) return console.log("Error:", err);
      console.log("[CB] Final status:", parcel.status);
    });
  });
});
// (Output arrives after timeouts — see below for Promise version)


// --------------------------------------------------------
// 2. THE PROMISE CONSTRUCTOR
// --------------------------------------------------------
// WHY: new Promise((resolve, reject) => { ... }) wraps an
//      async operation. Call resolve(value) on success, or
//      reject(reason) on failure. The Promise is pending
//      until one of these is called.

function acceptParcel(trackingId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!trackingId) {
        reject(new Error("Missing tracking ID"));
        return;
      }
      console.log(`Accepted parcel #${trackingId} at post office`);
      resolve({ trackingId, status: "accepted" });
    }, 150);
  });
}

function dispatchParcel(parcel) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Dispatching parcel #${parcel.trackingId} via mail van`);
      resolve({ ...parcel, status: "in-transit" });
    }, 150);
  });
}

function deliverParcel(parcel) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate occasional failure
      if (parcel.trackingId === "SP999") {
        reject(new Error(`Delivery failed for parcel #${parcel.trackingId} — address not found`));
        return;
      }
      console.log(`Delivered parcel #${parcel.trackingId}!`);
      resolve({ ...parcel, status: "delivered" });
    }, 150);
  });
}


// --------------------------------------------------------
// 3. .then(), .catch(), .finally() & CHAINING
// --------------------------------------------------------
// WHY: .then() handles success, .catch() handles rejection,
//      and .finally() runs cleanup regardless. Each returns
//      a NEW Promise, enabling flat chains.

console.log("\n--- Promise Chain (parcel #SP201) ---");

acceptParcel("SP201")
  .then(parcel => dispatchParcel(parcel))
  .then(parcel => deliverParcel(parcel))
  .then(parcel => {
    console.log(`Parcel #${parcel.trackingId} final status: ${parcel.status}`);
    // Output: Parcel #SP201 final status: delivered
  })
  .catch(error => {
    console.log(`Delivery error: ${error.message}`);
  })
  .finally(() => {
    console.log("Delivery attempt for #SP201 complete.\n");
  });


// --------------------------------------------------------
// 4. ERROR PROPAGATION IN CHAINS
// --------------------------------------------------------
// WHY: A rejection at any point in a chain skips forward
//      to the nearest .catch(). You don't need error
//      handling at every step — one catch covers the chain.

setTimeout(() => {
  console.log("--- Error Propagation (parcel #SP999) ---");

  acceptParcel("SP999")
    .then(parcel => dispatchParcel(parcel))
    .then(parcel => deliverParcel(parcel))   // this rejects for #SP999
    .then(parcel => {
      // This is skipped because of the rejection above
      console.log("This will NOT run.");
    })
    .catch(error => {
      console.log(`Caught: ${error.message}`);
      // Output: Caught: Delivery failed for parcel #SP999 — address not found
    })
    .finally(() => {
      console.log("Delivery attempt for #SP999 complete.\n");
    });
}, 700);


// --------------------------------------------------------
// 5. Promise.resolve() & Promise.reject()
// --------------------------------------------------------
// WHY: Shortcuts to create already-settled Promises — useful
//      in tests, caches, and normalising sync values.

const instantDelivery = Promise.resolve({
  trackingId: "SP300",
  status: "delivered"
});

instantDelivery.then(parcel =>
  console.log(`Instant: Parcel #${parcel.trackingId} is ${parcel.status}`)
);
// Output: Instant: Parcel #SP300 is delivered

const instantFail = Promise.reject(new Error("Parcel damaged in sorting hub!"));
instantFail.catch(err => console.log(`Instant fail: ${err.message}`));
// Output: Instant fail: Parcel damaged in sorting hub!


// ========================================================
//  EXAMPLE 2 — Promise Combinators
// ========================================================

// Helper: simulate a branch office delivery with a given delay
function branchDelivery(branchName, trackingId, delayMs, shouldFail = false) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error(`${branchName} failed parcel #${trackingId}`));
      } else {
        resolve({
          branch: branchName,
          trackingId,
          status: "delivered"
        });
      }
    }, delayMs);
  });
}

// --------------------------------------------------------
// 6. Promise.all() — ALL must succeed
// --------------------------------------------------------
// WHY: Wait for multiple async tasks in parallel. If ANY
//      one rejects, the entire result rejects immediately.

setTimeout(() => {
  console.log("--- Promise.all() ---");

  const morningBatch = Promise.all([
    branchDelivery("Connaught Place Branch", "SP401", 200),
    branchDelivery("Lajpat Nagar Branch", "SP402", 300),
    branchDelivery("Sarojini Nagar Branch", "SP403", 100)
  ]);

  morningBatch
    .then(results => {
      console.log("All parcels delivered:");
      results.forEach(r =>
        console.log(`  ${r.branch} -> parcel #${r.trackingId}`)
      );
      // Output:
      //   Connaught Place Branch -> parcel #SP401
      //   Lajpat Nagar Branch -> parcel #SP402
      //   Sarojini Nagar Branch -> parcel #SP403
    })
    .catch(err => console.log("Batch failed:", err.message));
}, 1400);

// When one fails:
setTimeout(() => {
  console.log("\n--- Promise.all() with a failure ---");

  Promise.all([
    branchDelivery("Karol Bagh Branch", "SP501", 100),
    branchDelivery("Chandni Chowk Branch", "SP502", 200, true), // fails
    branchDelivery("Nehru Place Branch", "SP503", 300)
  ])
    .then(() => console.log("This won't run"))
    .catch(err => console.log(`Batch failed: ${err.message}`));
    // Output: Batch failed: Chandni Chowk Branch failed parcel #SP502
}, 2100);


// --------------------------------------------------------
// 7. Promise.allSettled() — WAIT for all, never short-circuit
// --------------------------------------------------------
// WHY: Sometimes you need every result regardless of
//      success or failure — for logging, reports, retries.

setTimeout(() => {
  console.log("\n--- Promise.allSettled() ---");

  Promise.allSettled([
    branchDelivery("Mylapore Branch", "SP601", 100),
    branchDelivery("T Nagar Branch", "SP602", 200, true), // fails
    branchDelivery("Anna Nagar Branch", "SP603", 150)
  ]).then(results => {
    results.forEach(result => {
      if (result.status === "fulfilled") {
        console.log(`  OK: ${result.value.branch} delivered #${result.value.trackingId}`);
      } else {
        console.log(`  FAIL: ${result.reason.message}`);
      }
    });
    // Output:
    //   OK: Mylapore Branch delivered #SP601
    //   FAIL: T Nagar Branch failed parcel #SP602
    //   OK: Anna Nagar Branch delivered #SP603
  });
}, 2700);


// --------------------------------------------------------
// 8. Promise.race() — FIRST to settle wins
// --------------------------------------------------------
// WHY: Useful for timeouts, fastest-response caching, and
//      choosing the quickest route.

setTimeout(() => {
  console.log("\n--- Promise.race() ---");

  Promise.race([
    branchDelivery("Slow Dak Ghar",  "SP701", 500),
    branchDelivery("Fast Dak Ghar",  "SP702", 50),
    branchDelivery("Mid Dak Ghar",   "SP703", 200)
  ]).then(winner => {
    console.log(`Race winner: ${winner.branch} (parcel #${winner.trackingId})`);
    // Output: Race winner: Fast Dak Ghar (parcel #SP702)
  });
}, 3200);


// --------------------------------------------------------
// 9. Promise.any() — FIRST to FULFILL wins
// --------------------------------------------------------
// WHY: Like race(), but ignores rejections. Only rejects
//      (with AggregateError) if ALL promises reject.

setTimeout(() => {
  console.log("\n--- Promise.any() ---");

  Promise.any([
    branchDelivery("Branch J", "SP801", 300, true),  // fails
    branchDelivery("Branch K", "SP802", 200, true),  // fails
    branchDelivery("Branch L", "SP803", 400)          // succeeds
  ]).then(winner => {
    console.log(`First success: ${winner.branch} (parcel #${winner.trackingId})`);
    // Output: First success: Branch L (parcel #SP803)
  });

  // When ALL fail:
  Promise.any([
    branchDelivery("Branch M", "SP901", 100, true),
    branchDelivery("Branch N", "SP902", 200, true)
  ]).catch(err => {
    console.log(`All failed: ${err.constructor.name}`);
    console.log(`Errors: ${err.errors.map(e => e.message).join("; ")}`);
    // Output: All failed: AggregateError
    // Output: Errors: Branch M failed parcel #SP901; Branch N failed parcel #SP902
  });
}, 3800);


// ========================================================
//  EXAMPLE 3 — Practical Patterns
// ========================================================

// --------------------------------------------------------
// 10. CHAINING WITH DATA TRANSFORMATION
// --------------------------------------------------------
// WHY: Each .then() can return a transformed value (not
//      necessarily a Promise). The next .then() receives
//      that transformed value — great for pipelines.

setTimeout(() => {
  console.log("\n--- Chaining with Transformation ---");

  acceptParcel("SP555")
    .then(parcel => {
      // Add tracking info
      return { ...parcel, tracking: "EE123456789IN" };
    })
    .then(parcel => {
      // Calculate delivery fee in rupees
      return { ...parcel, fee: 49 };
    })
    .then(parcel => dispatchParcel(parcel))
    .then(parcel => deliverParcel(parcel))
    .then(parcel => {
      console.log(`Final parcel:`, JSON.stringify(parcel));
      // Output: Final parcel: {"trackingId":"SP555","status":"delivered","tracking":"EE123456789IN","fee":49}
    })
    .catch(err => console.log("Error:", err.message));
}, 4500);


// --------------------------------------------------------
// 11. RETURNING PROMISES FROM .then() (FLATTENING)
// --------------------------------------------------------
// WHY: If .then() returns a Promise, the chain waits for
//      it to settle before proceeding. This is how
//      sequential async steps stay flat instead of nested.

function notifyRecipient(trackingId) {
  return new Promise(resolve => {
    setTimeout(() => {
      console.log(`SMS sent to recipient for parcel #${trackingId}`);
      resolve(`sms-sent-${trackingId}`);
    }, 100);
  });
}

setTimeout(() => {
  console.log("\n--- Returning Promises in .then() ---");

  acceptParcel("SP777")
    .then(parcel => deliverParcel(parcel))          // returns a Promise
    .then(parcel => notifyRecipient(parcel.trackingId))  // also returns a Promise
    .then(smsResult => {
      console.log(`Notification result: ${smsResult}`);
      // Output: Notification result: sms-sent-SP777
    })
    .catch(err => console.log("Error:", err.message));
}, 5200);


// --------------------------------------------------------
// 12. TIMEOUT PATTERN WITH Promise.race()
// --------------------------------------------------------
// WHY: Race a real operation against a timer to implement
//      a timeout — if the operation is too slow, reject.

function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
}

setTimeout(() => {
  console.log("\n--- Timeout Pattern ---");

  const slowDelivery = branchDelivery("Remote Hill Station Branch", "SP888", 5000);

  withTimeout(slowDelivery, 300)
    .then(result => console.log("Delivered:", result))
    .catch(err => console.log(`Timeout! ${err.message}`));
    // Output: Timeout! Timed out after 300ms
}, 5800);


/**
 * ========================================================
 *  KEY TAKEAWAYS
 * ========================================================
 *  1. A Promise represents a future value — pending,
 *     fulfilled, or rejected. It replaces nested callbacks
 *     with flat, readable chains.
 *
 *  2. new Promise((resolve, reject) => { ... }) wraps any
 *     async operation. resolve(val) fulfills; reject(err)
 *     rejects.
 *
 *  3. .then() handles fulfillment, .catch() handles
 *     rejection, .finally() always runs. Each returns a
 *     new Promise, enabling chaining.
 *
 *  4. Errors propagate down the chain until a .catch()
 *     intercepts them — one catch can cover many steps.
 *
 *  5. Promise.all()        — all must succeed (fail-fast)
 *     Promise.allSettled() — wait for all (never short-circuits)
 *     Promise.race()       — first to settle wins
 *     Promise.any()        — first to fulfill wins
 *
 *  6. Promise.resolve() and Promise.reject() create
 *     pre-settled Promises for caching and normalisation.
 *
 *  7. Returning a Promise inside .then() flattens the
 *     chain — no nesting needed for sequential steps.
 * ========================================================
 */
