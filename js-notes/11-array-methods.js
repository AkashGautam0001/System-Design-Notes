// ============================================================
// FILE 11: Array Methods — The Full Kitchen
// Topic: Iterating, transforming, reducing, sorting, and
//        chaining array methods
// Why: These methods replace messy for-loops with declarative,
//      readable, chainable operations — they are the backbone
//      of modern JavaScript data processing.
// ============================================================

// =============================================
// STORY: Amma's Tiffin Service Kitchen
// Amma runs a bustling tiffin delivery service
// in Chennai. Orders flow in, get filtered,
// transformed, sorted, and packed into tiffin
// boxes. Each array method is a station in
// her kitchen.
// =============================================


// =======================================================
// EXAMPLE BLOCK 1: Core Iteration & Transformation Methods
// =======================================================

// WHY: forEach, map, filter, and reduce handle 90% of all
// array processing. Master these and you rarely need for-loops.

const orders = [
  { dish: "Curd Rice",         price: 60,  isVeg: true,  qty: 2 },
  { dish: "Chicken Biryani",   price: 150, isVeg: false, qty: 1 },
  { dish: "Masala Dosa",       price: 80,  isVeg: true,  qty: 3 },
  { dish: "Mutton Curry",      price: 200, isVeg: false, qty: 2 },
  { dish: "Paneer Butter Masala", price: 180, isVeg: true, qty: 1 },
];

// --- forEach() — do something for each item (returns undefined) ---
console.log("--- forEach: Print each order ---");
orders.forEach((order, index) => {
  console.log(`  #${index + 1}: ${order.qty}x ${order.dish}`);
});
// Output:
//   #1: 2x Curd Rice
//   #2: 1x Chicken Biryani
//   #3: 3x Masala Dosa
//   #4: 2x Mutton Curry
//   #5: 1x Paneer Butter Masala

// --- map() — transform each item into a new array ---
// WHY: map is for transformation. It ALWAYS returns a new array
// of the same length. Never use map when you don't need the result.
console.log("\n--- map: Create receipt lines ---");
const receiptLines = orders.map(o => `${o.dish}: \u20B9${o.price * o.qty}`);
console.log(receiptLines);
// Output: [
//   'Curd Rice: \u20B9120',
//   'Chicken Biryani: \u20B9150',
//   'Masala Dosa: \u20B9240',
//   'Mutton Curry: \u20B9400',
//   'Paneer Butter Masala: \u20B9180'
// ]

// --- filter() — keep only elements passing a test ---
console.log("\n--- filter: Non-veg orders only ---");
const nonVegOrders = orders.filter(o => !o.isVeg);
console.log(nonVegOrders.map(o => o.dish));
// Output: [ 'Chicken Biryani', 'Mutton Curry' ]

// --- reduce(callback, initialValue) — boil down to a single value ---
// WHY: reduce is the most powerful array method. Any other method
// (map, filter, find) can be reimplemented with reduce.
console.log("\n--- reduce: Total bill ---");
const totalBill = orders.reduce((sum, order) => {
  return sum + (order.price * order.qty);
}, 0);
console.log(`Total bill: \u20B9${totalBill}`);
// Output: Total bill: \u20B91090

// reduce to build an object — group orders by veg/non-veg:
const grouped = orders.reduce((acc, order) => {
  const category = order.isVeg ? "veg" : "nonVeg";
  acc[category].push(order.dish);
  return acc;
}, { veg: [], nonVeg: [] });
console.log("\n--- reduce: Group by veg/non-veg ---");
console.log(grouped);
// Output: {
//   veg: [ 'Curd Rice', 'Masala Dosa', 'Paneer Butter Masala' ],
//   nonVeg: [ 'Chicken Biryani', 'Mutton Curry' ]
// }

// --- reduceRight() — same as reduce but starts from the end ---
console.log("\n--- reduceRight: Build string from end ---");
const reverseDishes = orders.reduceRight((str, o) => str + o.dish[0], "");
console.log(reverseDishes);
// Output: PMMCC  (first letter of each dish, right-to-left)

// --- every() and some() — boolean tests ---
// WHY: Use these instead of filter(...).length > 0 for cleaner intent.
console.log("\n--- every & some ---");
const allVeg = orders.every(o => o.isVeg);
console.log(`All veg? ${allVeg}`);
// Output: All veg? false

const someVeg = orders.some(o => o.isVeg);
console.log(`Any veg? ${someVeg}`);
// Output: Any veg? true

const allUnder500 = orders.every(o => o.price < 500);
console.log(`All under \u20B9500? ${allUnder500}`);
// Output: All under \u20B9500? true


// =======================================================
// EXAMPLE BLOCK 2: Sorting, Reversing & Immutable Variants
// =======================================================

// WHY: sort() MUTATES the original array and defaults to string
// comparison. These two facts cause more bugs than any other method.

console.log("\n--- sort: Default string sort (DANGER!) ---");
const orderNumbers = [100, 25, 3, 42, 8];
const sortedWrong = [...orderNumbers].sort();  // copy first to preserve original
console.log(sortedWrong);
// Output: [ 100, 25, 3, 42, 8 ]   <-- WRONG! Sorted as strings: "100" < "25" < "3"

// --- Correct numeric sort with a comparator ---
console.log("\n--- sort: Numeric comparator ---");
const sortedRight = [...orderNumbers].sort((a, b) => a - b);
console.log(sortedRight);
// Output: [ 3, 8, 25, 42, 100 ]

// Descending:
const descending = [...orderNumbers].sort((a, b) => b - a);
console.log(descending);
// Output: [ 100, 42, 25, 8, 3 ]

// --- Sorting objects ---
console.log("\n--- sort: Orders by price (ascending) ---");
const byPrice = [...orders].sort((a, b) => a.price - b.price);
console.log(byPrice.map(o => `${o.dish}: \u20B9${o.price}`));
// Output: [
//   'Curd Rice: \u20B960',
//   'Masala Dosa: \u20B980',
//   'Chicken Biryani: \u20B9150',
//   'Paneer Butter Masala: \u20B9180',
//   'Mutton Curry: \u20B9200'
// ]

// --- reverse() — MUTATES ---
console.log("\n--- reverse ---");
const deliveryOrder = ["first", "second", "third"];
deliveryOrder.reverse();
console.log(deliveryOrder);
// Output: [ 'third', 'second', 'first' ]

// --- toSorted() and toReversed() — IMMUTABLE variants (ES2023) ---
// WHY: These return new arrays instead of mutating. Preferred in
// functional/React code where immutability matters.
console.log("\n--- toSorted & toReversed (immutable) ---");
const prices = [60, 150, 80, 200, 180];
const sortedPrices = prices.toSorted((a, b) => a - b);
console.log(sortedPrices);
// Output: [ 60, 80, 150, 180, 200 ]
console.log(prices);
// Output: [ 60, 150, 80, 200, 180 ]   (original unchanged!)

const reversedPrices = prices.toReversed();
console.log(reversedPrices);
// Output: [ 180, 200, 80, 150, 60 ]
console.log(prices);
// Output: [ 60, 150, 80, 200, 180 ]   (still unchanged!)

// --- fill(value, start, end) ---
// WHY: Quickly set a range of elements to the same value.
console.log("\n--- fill ---");
const tiffinSlots = Array(5).fill("Reserved");
console.log(tiffinSlots);
// Output: [ 'Reserved', 'Reserved', 'Reserved', 'Reserved', 'Reserved' ]

// Fill slots 2-4 with "SOLD OUT":
const slots = ["A", "B", "C", "D", "E"];
slots.fill("SOLD OUT", 2, 4);
console.log(slots);
// Output: [ 'A', 'B', 'SOLD OUT', 'SOLD OUT', 'E' ]

// --- copyWithin(target, start, end) ---
// WHY: Copies part of an array to another position within the same array.
// Rare but powerful for buffer-style operations.
console.log("\n--- copyWithin ---");
const deliveryQueue = ["Sharma Ji", "Gupta Ji", "Verma Ji", "Iyer Ji", "Patel Ji"];
deliveryQueue.copyWithin(0, 3);  // Copy from index 3 to start
console.log(deliveryQueue);
// Output: [ 'Iyer Ji', 'Patel Ji', 'Verma Ji', 'Iyer Ji', 'Patel Ji' ]


// =======================================================
// EXAMPLE BLOCK 3: Iterators, at(), with(), Array.from(),
//                  and Method Chaining
// =======================================================

// WHY: Modern JS gives arrays iterator methods and immutable
// replacement. Chaining lets you build data pipelines.

// --- keys(), values(), entries() ---
console.log("\n--- keys, values, entries ---");
const menuItems = ["Dosa", "Idli", "Upma"];

console.log([...menuItems.keys()]);
// Output: [ 0, 1, 2 ]

console.log([...menuItems.values()]);
// Output: [ 'Dosa', 'Idli', 'Upma' ]

console.log([...menuItems.entries()]);
// Output: [ [ 0, 'Dosa' ], [ 1, 'Idli' ], [ 2, 'Upma' ] ]

// Useful in for...of loops:
for (const [index, item] of menuItems.entries()) {
  console.log(`  Menu #${index}: ${item}`);
}
// Output:
//   Menu #0: Dosa
//   Menu #1: Idli
//   Menu #2: Upma

// --- at() — modern indexing with negative support ---
// WHY: at(-1) is much cleaner than arr[arr.length - 1].
console.log("\n--- at() ---");
const waitlist = ["Sharma Ji", "Gupta Ji", "Verma Ji", "Iyer Ji"];
console.log(waitlist.at(0));
// Output: Sharma Ji
console.log(waitlist.at(-1));
// Output: Iyer Ji
console.log(waitlist.at(-2));
// Output: Verma Ji

// --- with() — immutable replacement at index (ES2023) ---
// WHY: Replaces an element without mutating the original array.
console.log("\n--- with() (immutable replace) ---");
const originalOrder = ["Dosa", "Idli", "Upma"];
const updatedOrder = originalOrder.with(1, "Medu Vada");
console.log(updatedOrder);
// Output: [ 'Dosa', 'Medu Vada', 'Upma' ]
console.log(originalOrder);
// Output: [ 'Dosa', 'Idli', 'Upma' ]   (unchanged!)

// Negative index works too:
const fixedLast = originalOrder.with(-1, "Pongal");
console.log(fixedLast);
// Output: [ 'Dosa', 'Idli', 'Pongal' ]

// --- Array.from() with mapFn ---
// WHY: Create and transform in one step — no intermediate array.
console.log("\n--- Array.from() with mapFn ---");
const tiffinNumbers = Array.from({ length: 6 }, (_, i) => `Tiffin-${i + 1}`);
console.log(tiffinNumbers);
// Output: [ 'Tiffin-1', 'Tiffin-2', 'Tiffin-3', 'Tiffin-4', 'Tiffin-5', 'Tiffin-6' ]

// Convert a string and transform:
const shoutMenu = Array.from("dosa", char => char.toUpperCase());
console.log(shoutMenu);
// Output: [ 'D', 'O', 'S', 'A' ]

// --- METHOD CHAINING — The Assembly Line ---
// WHY: Chaining avoids temporary variables and reads like a recipe:
// "take orders, filter the veg ones, calculate their totals, sort them"

console.log("\n--- Method chaining: The full pipeline ---");

const kitchenOrders = [
  { dish: "Curd Rice",         price: 60,  isVeg: true,  qty: 2 },
  { dish: "Chicken Biryani",   price: 150, isVeg: false, qty: 1 },
  { dish: "Masala Dosa",       price: 80,  isVeg: true,  qty: 3 },
  { dish: "Mutton Curry",      price: 200, isVeg: false, qty: 2 },
  { dish: "Paneer Butter Masala", price: 180, isVeg: true, qty: 1 },
  { dish: "Fish Fry",          price: 120, isVeg: false, qty: 1 },
];

// Pipeline: Get veg orders (for Jain customers), compute totals, sort by total descending
const vegReport = kitchenOrders
  .filter(order => order.isVeg)                              // keep veg only
  .map(order => ({                                           // transform shape
    dish: order.dish,
    total: order.price * order.qty,
  }))
  .toSorted((a, b) => b.total - a.total)                    // sort descending
  .map(order => `${order.dish}: \u20B9${order.total}`);      // format strings

console.log(vegReport);
// Output: [ 'Masala Dosa: \u20B9240', 'Paneer Butter Masala: \u20B9180', 'Curd Rice: \u20B9120' ]

// Another pipeline: Total revenue from non-veg items
const nonVegRevenue = kitchenOrders
  .filter(o => !o.isVeg)
  .reduce((sum, o) => sum + o.price * o.qty, 0);

console.log(`Non-veg revenue: \u20B9${nonVegRevenue}`);
// Output: Non-veg revenue: \u20B9670

// Pipeline: Highest single-item price
const priciest = kitchenOrders
  .map(o => o.price)
  .toSorted((a, b) => b - a)
  .at(0);

console.log(`Most expensive dish: \u20B9${priciest}`);
// Output: Most expensive dish: \u20B9200

// Pipeline with every/some for validation
const allReady = kitchenOrders
  .filter(o => !o.isVeg)
  .every(o => o.qty <= 3);
console.log(`All non-veg orders manageable (qty <= 3)? ${allReady}`);
// Output: All non-veg orders manageable (qty <= 3)? true


// ============================================================
// KEY TAKEAWAYS
// ------------------------------------------------------------
// 1. forEach = side effects (logging, DOM updates). Returns undefined.
//    map = transformation. Returns new array of same length.
//    filter = selection. Returns new array (possibly shorter).
//    reduce = accumulation. Returns a single value (any type).
//
// 2. sort() MUTATES and sorts as STRINGS by default.
//    Always pass a comparator: (a, b) => a - b for numbers.
//    Use toSorted() / toReversed() for immutable alternatives.
//
// 3. every() = ALL must pass. some() = at least ONE must pass.
//    Both short-circuit for performance.
//
// 4. at(-1) is the modern way to get the last element.
//    with(index, value) is the immutable way to replace an element.
//
// 5. Chain methods to build clean data pipelines:
//    array.filter(...).map(...).toSorted(...).reduce(...)
//    Each step returns a new array for the next step.
//
// 6. Array.from({ length: n }, mapFn) creates and transforms
//    in one step — great for generating sequences.
//
// 7. keys(), values(), entries() return iterators — spread them
//    or use them in for...of loops.
// ============================================================
