// ============================================================
// FILE 17: LOOPS
// Topic: Iteration — for, while, do...while, for...in, for...of,
//        break, continue, labeled statements, and performance
// WHY: Loops are how programs process collections, repeat tasks,
//      and traverse data structures. Picking the right loop matters
//      for both clarity and performance.
// ============================================================

// ============================================================
// EXAMPLE 1 — Dabbawala Delivery Route: Visiting Every Stop
// Story: Dabbawala Ganesh delivers tiffins door to door in Mumbai.
// Each loop type represents a different way to cover his route.
// ============================================================

// WHY: The classic `for` loop gives you total control over start,
// stop, and step — ideal when you need an index or custom iteration.

// --- for Loop ---

const deliveryFlats = ["Flat 101", "Flat 202", "Flat 303", "Flat 404", "Flat 505"];

console.log("=== Delivering tiffins (for loop) ===");
for (let flat = 0; flat < deliveryFlats.length; flat++) {
  console.log(`Stop ${flat + 1}: ${deliveryFlats[flat]}`);
}
// Output: Stop 1: Flat 101
// Output: Stop 2: Flat 202
// Output: Stop 3: Flat 303
// Output: Stop 4: Flat 404
// Output: Stop 5: Flat 505

// Counting down (reverse iteration)
console.log("\n=== Collecting empty dabbas on the way back ===");
for (let flat = deliveryFlats.length - 1; flat >= 0; flat--) {
  console.log(`Picking up from: ${deliveryFlats[flat]}`);
}
// Output: Picking up from: Flat 505
// Output: Picking up from: Flat 404
// Output: Picking up from: Flat 303
// Output: Picking up from: Flat 202
// Output: Picking up from: Flat 101


// WHY: `while` loops run as long as a condition is true — perfect when
// you don't know in advance how many iterations you need.

// --- while Loop ---

let tiffinsInBag = 10;
let tiffinsDelivered = 0;

console.log("\n=== Delivering until bag is empty (while) ===");
while (tiffinsInBag > 3) {
  tiffinsDelivered++;
  const consumed = Math.floor(Math.random() * 3) + 1; // 1-3 tiffins per stop
  tiffinsInBag -= consumed;
  console.log(`Stop ${tiffinsDelivered}: Delivered ${consumed} tiffins. Left in bag: ${Math.max(tiffinsInBag, 0)}`);
}
console.log(`Ganesh stopped after ${tiffinsDelivered} stops.`);


// WHY: `do...while` guarantees at least one execution — use it when
// the first iteration must always happen (e.g., prompting a user).

// --- do...while Loop ---

let ringAttempts = 0;
let doorOpened = false;

console.log("\n=== Ringing the doorbell (do...while) ===");
do {
  ringAttempts++;
  // 40% chance someone opens
  doorOpened = Math.random() < 0.4;
  console.log(`Ring ${ringAttempts}: ${doorOpened ? "Door opened!" : "No answer..."}`);
} while (!doorOpened && ringAttempts < 5);

if (doorOpened) {
  console.log(`Tiffin delivered after ${ringAttempts} ring(s).`);
} else {
  console.log("No one home. Ganesh leaves the tiffin at the door.");
}


// WHY: `for...in` iterates over an object's enumerable keys.
// Use it for objects, NOT arrays (it iterates keys as strings
// and includes inherited enumerable properties).

// --- for...in (Objects) ---

const buildingInfo = {
  name: "Shanti Niwas",
  floors: 5,
  flatsPerFloor: 4,
  liftAvailable: true,
  watchman: "Ramesh",
};

console.log("\n=== Building Info (for...in) ===");
for (const detail in buildingInfo) {
  console.log(`${detail}: ${buildingInfo[detail]}`);
}
// Output: name: Shanti Niwas
// Output: floors: 5
// Output: flatsPerFloor: 4
// Output: liftAvailable: true
// Output: watchman: Ramesh

// WARNING: for...in on arrays gives you string indices, not values
const tiffinTypes = ["dal-rice", "roti-sabzi", "biryani"];
for (const index in tiffinTypes) {
  console.log(`Index "${index}" (type: ${typeof index})`);
}
// Output: Index "0" (type: string)
// Output: Index "1" (type: string)
// Output: Index "2" (type: string)


// WHY: `for...of` iterates over iterable VALUES (arrays, strings,
// Maps, Sets, etc.) — it's the cleanest loop for collections.

// --- for...of (Iterables) ---

console.log("\n=== Going through each tiffin (for...of) ===");
for (const flat of deliveryFlats) {
  console.log(`Delivered to: ${flat}`);
}
// Output: Delivered to: Flat 101
// Output: Delivered to: Flat 202
// Output: Delivered to: Flat 303
// Output: Delivered to: Flat 404
// Output: Delivered to: Flat 505

// for...of with a string
const dabbaCode = "MUMBAI01";
console.log("\n=== Reading dabba code letter by letter ===");
for (const letter of dabbaCode) {
  process.stdout.write(letter + " ");
}
console.log("");
// Output: M U M B A I 0 1

// for...of with a Map
const flatToCustomer = new Map([
  ["Flat 101", "Sharma ji"],
  ["Flat 202", "Gupta ji"],
  ["Flat 303", "Patel bhai"],
]);

console.log("\n=== Flat-Customer Map (for...of with Map) ===");
for (const [flat, customer] of flatToCustomer) {
  console.log(`${flat} — tiffin for: ${customer}`);
}
// Output: Flat 101 — tiffin for: Sharma ji
// Output: Flat 202 — tiffin for: Gupta ji
// Output: Flat 303 — tiffin for: Patel bhai

// for...of with a Set
const deliveredFlats = new Set(["Flat 101", "Flat 202", "Flat 303"]);
console.log("\n=== Delivered Flats (for...of with Set) ===");
for (const flat of deliveredFlats) {
  console.log(`Already delivered: ${flat}`);
}
// Output: Already delivered: Flat 101
// Output: Already delivered: Flat 202
// Output: Already delivered: Flat 303


// ============================================================
// EXAMPLE 2 — Advanced Dabbawala Mechanics: break, continue,
// Labels, Performance, and Data Structure Iteration
// ============================================================

// WHY: `break` exits a loop immediately; `continue` skips to the
// next iteration. Together they give you fine-grained control.

// --- break ---

const routeStops = ["delivered", "delivered", "heavy rain!", "delivered", "last stop"];

console.log("\n=== Walking the route (break on heavy rain) ===");
for (const stop of routeStops) {
  if (stop === "heavy rain!") {
    console.log("HEAVY RAIN! Taking lunch break early.");
    break;
  }
  console.log(`Stop: ${stop}`);
}
// Output: Stop: delivered
// Output: Stop: delivered
// Output: HEAVY RAIN! Taking lunch break early.

// --- continue ---

const customersOnRoute = [
  { name: "Sharma ji", available: false },
  { name: "Gupta ji", available: true },
  { name: "Patel bhai", available: false },
  { name: "Iyer aunty", available: true },
  { name: "Khan sahab", available: false },
];

console.log("\n=== Deliver only to available customers (continue) ===");
for (const customer of customersOnRoute) {
  if (!customer.available) {
    continue; // Skip unavailable customers
  }
  console.log(`Delivering to: ${customer.name}!`);
}
// Output: Delivering to: Gupta ji!
// Output: Delivering to: Iyer aunty!


// WHY: Labeled statements let you break or continue an OUTER loop
// from inside a nested loop — rare but invaluable when needed.

// --- Labeled Statements ---

const buildingFloors = [
  ["Sharma ji", "empty", "tiffin here"],
  ["empty", "wrong address", "empty"],
  ["tiffin here", "empty", "last delivery"],
];

console.log("\n=== Searching buildings for wrong address (labeled break) ===");
buildingSearch:
for (let floor = 0; floor < buildingFloors.length; floor++) {
  for (let flat = 0; flat < buildingFloors[floor].length; flat++) {
    const content = buildingFloors[floor][flat];
    console.log(`Floor ${floor + 1}, Flat ${flat + 1}: ${content}`);
    if (content === "wrong address") {
      console.log("WRONG ADDRESS FOUND! Returning to depot to check!");
      break buildingSearch; // Breaks out of BOTH loops
    }
  }
}
// Output: Floor 1, Flat 1: Sharma ji
// Output: Floor 1, Flat 2: empty
// Output: Floor 1, Flat 3: tiffin here
// Output: Floor 2, Flat 1: empty
// Output: Floor 2, Flat 2: wrong address
// Output: WRONG ADDRESS FOUND! Returning to depot to check!


// WHY: Different loops have different performance characteristics.
// Choosing wisely matters in hot paths and large data sets.

// --- Loop Performance Considerations ---

console.log("\n=== Performance Comparison (rough timings) ===");

const bigArray = Array.from({ length: 1_000_000 }, (_, i) => i);

// 1. Classic for — fastest; no overhead of iterator protocol
let sumFor = 0;
console.time("for loop");
for (let i = 0; i < bigArray.length; i++) {
  sumFor += bigArray[i];
}
console.timeEnd("for loop");

// 2. for...of — slightly slower due to iterator protocol
let sumForOf = 0;
console.time("for...of");
for (const val of bigArray) {
  sumForOf += val;
}
console.timeEnd("for...of");

// 3. forEach — similar to for...of, but cannot use break/continue
let sumForEach = 0;
console.time("forEach");
bigArray.forEach((val) => {
  sumForEach += val;
});
console.timeEnd("forEach");

// TIP: Cache array.length in a variable if you modify the array
// inside the loop. For read-only iteration, modern engines optimize
// .length access, so caching is usually unnecessary.

console.log(`All sums equal: ${sumFor === sumForOf && sumForOf === sumForEach}`);
// Output: All sums equal: true

// Performance rule of thumb:
// - for loop: fastest, most control, best for hot paths
// - for...of: clean syntax, supports break/continue, slightly slower
// - .forEach(): clean, but no break/continue, no await support
// - for...in: use ONLY for objects (slow on arrays, includes prototype keys)
// - while/do...while: best when iteration count is unknown


// --- Iterating Different Data Structures ---

console.log("\n=== Iterating Various Structures ===");

// Object (not iterable — use Object.entries/keys/values)
const routeStats = { tiffinsDelivered: 500, kmCovered: 45, timeTaken: 30 };

console.log("Object.entries():");
for (const [key, value] of Object.entries(routeStats)) {
  console.log(`  ${key}: ${value}`);
}
// Output: Object.entries():
// Output:   tiffinsDelivered: 500
// Output:   kmCovered: 45
// Output:   timeTaken: 30

// Array of arrays (2D grid)
console.log("\nDelivery Grid:");
const grid = [
  ["D", ".", "D"],
  [".", ".", "."],
  ["D", ".", "X"],
];
for (const [rowIdx, row] of grid.entries()) {
  console.log(`  Row ${rowIdx}: ${row.join(" ")}`);
}
// Output: Delivery Grid:
// Output:   Row 0: D . D
// Output:   Row 1: . . .
// Output:   Row 2: D . X

// Generators (custom iterables)
function* tiffinGenerator() {
  yield "Dal Rice";
  yield "Roti Sabzi";
  yield "Biryani";
}

console.log("\nTiffins from generator:");
for (const item of tiffinGenerator()) {
  console.log(`  Packed: ${item}`);
}
// Output: Tiffins from generator:
// Output:   Packed: Dal Rice
// Output:   Packed: Roti Sabzi
// Output:   Packed: Biryani


// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. `for` — total control with index; fastest for large arrays.
// 2. `while` — when you don't know the iteration count upfront.
// 3. `do...while` — guarantees at least one iteration.
// 4. `for...in` — iterates object KEYS (strings); avoid on arrays.
// 5. `for...of` — iterates iterable VALUES (arrays, strings,
//    Maps, Sets, generators); clean and supports break/continue.
// 6. `break` exits the loop; `continue` skips to the next pass.
// 7. Labeled statements let break/continue target an OUTER loop.
// 8. Performance: for > for...of > forEach for raw speed;
//    choose readability first, optimize only if profiling demands it.
// 9. Use Object.entries()/keys()/values() to iterate plain objects
//    with for...of.
// ============================================================
