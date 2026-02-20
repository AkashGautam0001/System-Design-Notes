/**
 * ============================================================
 *  FILE 27 : Promise Patterns
 *  Topic   : Promise.all, race, allSettled, any, Sequential, Pool
 *  WHY THIS MATTERS:
 *    Knowing which Promise combinator to reach for — and how
 *    to limit concurrency — is the difference between fast,
 *    resilient async code and code that overwhelms servers
 *    or silently drops errors.
 * ============================================================
 */

// STORY: Dispatch Manager Arjun coordinates parallel Swiggy food
// deliveries across Bangalore, choosing the right strategy for each batch.

// Simulate an async food delivery
function deliver(restaurant, ms, shouldFail = false) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) reject(new Error(`Order from ${restaurant} failed`));
      else resolve(`${restaurant} order delivered`);
    }, ms);
  });
}

(async () => {

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Promise.all & Promise.allSettled
// ────────────────────────────────────────────────────────────

console.log("=== BLOCK 1: Promise.all & Promise.allSettled ===");

// WHY: Promise.all runs tasks in parallel and fails fast —
// if ANY promise rejects, the whole batch rejects.
try {
  const batch = await Promise.all([
    deliver("Meghana's Biryani", 10),
    deliver("MTR Dosa", 20),
    deliver("Onesta Pizza", 15)
  ]);
  console.log("Arjun's all-success batch:", batch);
  // Output: Arjun's all-success batch: [ "Meghana's Biryani order delivered", 'MTR Dosa order delivered', 'Onesta Pizza order delivered' ]
} catch (e) {
  console.log("Batch failed:", e.message);
}

// Fail-fast demonstration
try {
  await Promise.all([
    deliver("Truffles Burger", 30),
    deliver("Empire Kebab", 10, true),  // this one fails
    deliver("Vidyarthi Bhavan", 20)
  ]);
} catch (e) {
  console.log("Arjun's fail-fast:", e.message);
  // Output: Arjun's fail-fast: Order from Empire Kebab failed
}

// WHY: allSettled never rejects — it reports every result.
const settled = await Promise.allSettled([
  deliver("Fanoos Shawarma", 10),
  deliver("Corner House Ice Cream", 20, true),
  deliver("Brahmin's Idli", 15)
]);
const summary = settled.map(r =>
  r.status === "fulfilled" ? r.value : `FAILED: ${r.reason.message}`
);
console.log("Arjun's allSettled:", summary);
// Output: Arjun's allSettled: [ 'Fanoos Shawarma order delivered', 'FAILED: Order from Corner House Ice Cream failed', "Brahmin's Idli order delivered" ]

// ────────────────────────────────────────────────────────────
// BLOCK 2 — Promise.race & Promise.any
// ────────────────────────────────────────────────────────────

console.log("\n=== BLOCK 2: Promise.race & Promise.any ===");

// WHY: Promise.race resolves/rejects with whichever settles first.
// Classic use: timeout pattern.
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), ms)
  );
  return Promise.race([promise, timeout]);
}

try {
  const fast = await withTimeout(deliver("Koramangala Biryani", 10), 50);
  console.log("Arjun's fast delivery:", fast);
  // Output: Arjun's fast delivery: Koramangala Biryani order delivered
} catch (e) {
  console.log("Timed out:", e.message);
}

try {
  await withTimeout(deliver("Whitefield Thali", 100), 20);
} catch (e) {
  console.log("Arjun's slow delivery:", e.message);
  // Output: Arjun's slow delivery: Timeout
}

// WHY: Promise.any resolves with the FIRST success, ignoring
// rejections unless ALL reject (AggregateError).
const winner = await Promise.any([
  deliver("HSR Layout Chai", 50, true),   // fails
  deliver("Indiranagar Dosa", 20),         // wins
  deliver("Jayanagar Chaat", 30)
]);
console.log("Arjun's any-winner:", winner);
// Output: Arjun's any-winner: Indiranagar Dosa order delivered

try {
  await Promise.any([
    deliver("Malleshwaram Puri", 10, true),
    deliver("Basavanagudi Roti", 10, true)
  ]);
} catch (e) {
  console.log("All failed — AggregateError:", e.constructor.name, "count:", e.errors.length);
  // Output: All failed — AggregateError: AggregateError count: 2
}

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Sequential Execution & Concurrency Pool
// ────────────────────────────────────────────────────────────

console.log("\n=== BLOCK 3: Sequential & Pool ===");

// WHY: Sometimes you need strict order — reduce chains
// promises one after another.
const areas = ["Koramangala", "Indiranagar", "HSR Layout", "Jayanagar"];

const sequential = await areas.reduce(async (prevPromise, area) => {
  const results = await prevPromise;
  const result = await deliver(`${area} Meal`, 10);
  results.push(result);
  return results;
}, Promise.resolve([]));

console.log("Arjun's sequential:", sequential);
// Output: Arjun's sequential: [ 'Koramangala Meal order delivered', 'Indiranagar Meal order delivered', 'HSR Layout Meal order delivered', 'Jayanagar Meal order delivered' ]

// WHY: A pool limits concurrency — process N at a time.
async function pool(tasks, concurrency) {
  const results = [];
  const executing = new Set();

  for (const [index, task] of tasks.entries()) {
    const p = task().then(result => {
      executing.delete(p);
      return result;
    });
    results[index] = p;
    executing.add(p);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

const tasks = [
  () => deliver("Meghana's Biryani", 30),
  () => deliver("MTR Masala Dosa", 10),
  () => deliver("Vidyarthi Bhavan Dosa", 20),
  () => deliver("Empire Fried Rice", 10),
  () => deliver("Brahmin's Filter Coffee", 15)
];

const pooled = await pool(tasks, 2);  // max 2 concurrent delivery partners
console.log("Arjun's pool (limit 2):", pooled);
// Output: Arjun's pool (limit 2): [ "Meghana's Biryani order delivered", 'MTR Masala Dosa order delivered', 'Vidyarthi Bhavan Dosa order delivered', 'Empire Fried Rice order delivered', "Brahmin's Filter Coffee order delivered" ]

// WHY: Real-world use — rate-limiting API calls
async function fetchOrderPages(pageCount, limit) {
  const pageTasks = Array.from({ length: pageCount }, (_, i) =>
    () => new Promise(resolve =>
      setTimeout(() => resolve({ page: i + 1, orders: 10 }), 10)
    )
  );
  return pool(pageTasks, limit);
}

const pages = await fetchOrderPages(4, 2);
console.log("Arjun's paginated fetch:", pages);
// Output: Arjun's paginated fetch: [ { page: 1, orders: 10 }, { page: 2, orders: 10 }, { page: 3, orders: 10 }, { page: 4, orders: 10 } ]

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Promise.all — parallel, fail-fast on first rejection.
// 2. Promise.allSettled — parallel, always returns all results.
// 3. Promise.race — first to settle wins (timeout pattern).
// 4. Promise.any — first to fulfill wins (redundancy pattern).
// 5. Sequential via reduce — strict ordering when needed.
// 6. Pool pattern — bounded concurrency to avoid overloading
//    delivery partners (max 3 riders dispatched at once).

})();
