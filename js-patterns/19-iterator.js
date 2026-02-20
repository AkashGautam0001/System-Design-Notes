/**
 * ============================================================
 *  FILE 19 : The Mumbai Dabbawala — Iterator Pattern
 *  Topic   : Iterator, ES6 Iterables, Generator-based Iteration
 *  WHY THIS MATTERS:
 *    Iterators provide a universal way to traverse collections
 *    without exposing internal structure. ES6 baked this into
 *    JavaScript with Symbol.iterator, for...of, spread, and
 *    destructuring. Generators make custom iterators trivial.
 * ============================================================
 */

// STORY: Dabbawala Ganesh walks his delivery route one tiffin at a time,
// left to right through the train compartment. He doesn't care if tiffins
// are in crates, stacks, or hanging racks — the iterator protocol handles
// traversal for him.

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Custom Iterator (Symbol.iterator, next(), done)
// ────────────────────────────────────────────────────────────

// WHY: The protocol defines { next() } returning { value, done }.
// Any object with Symbol.iterator works with for...of.

console.log("=== BLOCK 1: Custom Iterator ===");

class TiffinRoute {
  constructor(name) { this.name = name; this.tiffins = []; }
  add(label) { this.tiffins.push(label); return this; }
  // WHY: Symbol.iterator enables for...of, spread, destructuring
  [Symbol.iterator]() {
    let i = 0;
    const tiffins = this.tiffins;
    return { next() {
      return i < tiffins.length ? { value: tiffins[i++], done: false } : { value: undefined, done: true };
    }};
  }
}

const route = new TiffinRoute("Churchgate Line");
route.add("Tiffin-Sharma-110001").add("Tiffin-Gupta-110002").add("Tiffin-Patel-110003");

console.log(`Ganesh walks ${route.name}:`);
for (const tiffin of route) console.log(`  Delivered: ${tiffin}`);
// Output: Ganesh walks Churchgate Line:
// Output:   Delivered: Tiffin-Sharma-110001
// Output:   Delivered: Tiffin-Gupta-110002
// Output:   Delivered: Tiffin-Patel-110003

console.log("Spread:", [...route].join(", ")); // Output: Spread: Tiffin-Sharma-110001, Tiffin-Gupta-110002, Tiffin-Patel-110003
const [first, second] = route;
console.log(`First two: ${first}, ${second}`); // Output: First two: Tiffin-Sharma-110001, Tiffin-Gupta-110002

// Manual iteration
console.log("\nManual iteration:");
const iter = route[Symbol.iterator]();
let step = iter.next();
while (!step.done) { console.log(`  next() -> ${step.value}`); step = iter.next(); }
// Output: Manual iteration:
// Output:   next() -> Tiffin-Sharma-110001
// Output:   next() -> Tiffin-Gupta-110002
// Output:   next() -> Tiffin-Patel-110003

// WHY: Same interface, different internal structure (linked list)
class LinkedTiffinRack {
  constructor() { this.head = null; }
  add(label) { this.head = { label, next: this.head }; return this; }
  [Symbol.iterator]() {
    let cur = this.head;
    return { next() {
      if (cur) { const v = cur.label; cur = cur.next; return { value: v, done: false }; }
      return { value: undefined, done: true };
    }};
  }
}

const linked = new LinkedTiffinRack();
linked.add("Tiffin-Iyer-400001").add("Tiffin-Desai-400002").add("Tiffin-Kulkarni-400003");
console.log("\nLinked rack (same for...of):");
for (const tiffin of linked) console.log(`  Delivered: ${tiffin}`);
// Output: Linked rack (same for...of):
// Output:   Delivered: Tiffin-Kulkarni-400003
// Output:   Delivered: Tiffin-Desai-400002
// Output:   Delivered: Tiffin-Iyer-400001

// ────────────────────────────────────────────────────────────
// BLOCK 2 — Generator Functions as Iterators
// ────────────────────────────────────────────────────────────

// WHY: Generators (function*) auto-implement the iterator protocol.
// yield pauses and returns a value — dramatically simpler.

console.log("\n=== BLOCK 2: Generators ===");

function* walkRoute(tiffins) { for (const t of tiffins) yield t; }

const morningBatch = ["Tiffin-Churchgate", "Tiffin-Marine-Lines", "Tiffin-Charni-Road"];
console.log("Generator walk:");
for (const tiffin of walkRoute(morningBatch)) console.log(`  Ganesh picks up: ${tiffin}`);
// Output: Generator walk:
// Output:   Ganesh picks up: Tiffin-Churchgate
// Output:   Ganesh picks up: Tiffin-Marine-Lines
// Output:   Ganesh picks up: Tiffin-Charni-Road

// WHY: Generators enable LAZY evaluation — infinite sequences are safe
function* fibonacci() {
  let a = 0, b = 1;
  while (true) { yield a; [a, b] = [b, a + b]; }
}

console.log("\nLazy Fibonacci:");
const fib = fibonacci();
const first8 = [];
for (let i = 0; i < 8; i++) first8.push(fib.next().value);
console.log("  " + first8.join(", ")); // Output:   0, 1, 1, 2, 3, 5, 8, 13

function* take(n, it) {
  let c = 0;
  for (const item of it) { if (c >= n) return; yield item; c++; }
}
function* range(start, end, step = 1) {
  for (let i = start; i < end; i += step) yield i;
}

console.log("Range(1,10,2):", [...range(1, 10, 2)].join(", "));
// Output: Range(1,10,2): 1, 3, 5, 7, 9
console.log("Take 5 from Fibonacci:", [...take(5, fibonacci())].join(", "));
// Output: Take 5 from Fibonacci: 0, 1, 1, 2, 3

// Composing generators — Ganesh filters while delivering
function* filter(it, pred) { for (const x of it) if (pred(x)) yield x; }
function* map(it, fn) { for (const x of it) yield fn(x); }

const allTiffins = ["Tiffin-Churchgate", "Tiffin-Marine-Lines", "Tiffin-Grant-Road", "Tiffin-Churchgate-Express", "Tiffin-Mumbai-Central"];
const churchgateUpper = map(filter(allTiffins, t => t.startsWith("Tiffin-Churchgate")), t => t.toUpperCase());
console.log("Composed generators (filter+map):", [...churchgateUpper].join(", "));
// Output: Composed generators (filter+map): TIFFIN-CHURCHGATE, TIFFIN-CHURCHGATE-EXPRESS

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Async Iterators & for await...of
// ────────────────────────────────────────────────────────────

// WHY: Async iterators consume data that arrives over time —
// tracking deliveries across stations. Uses Symbol.asyncIterator.

console.log("\n=== BLOCK 3: Async Iterators ===");

async function* fetchTiffinBatches(total, batchSize) {
  let batch = 1, fetched = 0;
  while (fetched < total) {
    await new Promise(r => setTimeout(r, 20));
    const count = Math.min(batchSize, total - fetched);
    const tiffins = [];
    for (let i = 0; i < count; i++) tiffins.push(`Tiffin-${fetched + i + 1}`);
    console.log(`  [Station] Batch ${batch} loaded (${count} tiffins)`);
    yield tiffins;
    fetched += count; batch++;
  }
}

async function* stationStream(stations, ms) {
  for (const station of stations) { await new Promise(r => setTimeout(r, ms)); yield station; }
}

async function main() {
  console.log("Ganesh fetches batched tiffin route:");
  const all = [];
  for await (const batch of fetchTiffinBatches(7, 3)) all.push(...batch);
  console.log(`  Total collected: ${all.length} tiffins`);
  console.log(`  Last tiffin: ${all[all.length - 1]}`);
  // Output: Ganesh fetches batched tiffin route:
  // Output:   [Station] Batch 1 loaded (3 tiffins)
  // Output:   [Station] Batch 2 loaded (3 tiffins)
  // Output:   [Station] Batch 3 loaded (1 tiffins)
  // Output:   Total collected: 7 tiffins
  // Output:   Last tiffin: Tiffin-7

  console.log("\nStreaming station stops:");
  for await (const station of stationStream(["Churchgate", "Marine Lines", "Charni Road"], 15)) {
    console.log(`  Ganesh delivered at: ${station}`);
  }
  // Output: Streaming station stops:
  // Output:   Ganesh delivered at: Churchgate
  // Output:   Ganesh delivered at: Marine Lines
  // Output:   Ganesh delivered at: Charni Road

  // Custom async iterable object
  const liveUpdates = {
    updates: ["Picked up: Tiffin-Grant-Road", "Delivered: Tiffin-Mumbai-Central", "Returned: Tiffin-Dadar"],
    [Symbol.asyncIterator]() {
      let i = 0; const u = this.updates;
      return { async next() {
        if (i < u.length) { await new Promise(r => setTimeout(r, 10)); return { value: u[i++], done: false }; }
        return { value: undefined, done: true };
      }};
    }
  };

  console.log("\nLive dabbawala updates:");
  for await (const update of liveUpdates) console.log(`  ${update}`);
  // Output: Live dabbawala updates:
  // Output:   Picked up: Tiffin-Grant-Road
  // Output:   Delivered: Tiffin-Mumbai-Central
  // Output:   Returned: Tiffin-Dadar

  // ────────────────────────────────────────────────────────────
  // KEY TAKEAWAYS
  // ────────────────────────────────────────────────────────────
  console.log("\n=== KEY TAKEAWAYS ===");
  console.log("1. Symbol.iterator lets any TiffinRoute work with for...of, spread, destructuring"); // Output: 1. Symbol.iterator lets any TiffinRoute work with for...of, spread, destructuring
  console.log("2. Generators (function*) simplify iterator creation — Ganesh yields next tiffin"); // Output: 2. Generators (function*) simplify iterator creation — Ganesh yields next tiffin
  console.log("3. Lazy evaluation means infinite delivery sequences are safe — compute on demand"); // Output: 3. Lazy evaluation means infinite delivery sequences are safe — compute on demand
  console.log("4. Async generators + for await...of track deliveries across stations in real time"); // Output: 4. Async generators + for await...of track deliveries across stations in real time
  console.log("5. Compose generators (map, filter, take) to build dabbawala data pipelines"); // Output: 5. Compose generators (map, filter, take) to build dabbawala data pipelines
}
main();
