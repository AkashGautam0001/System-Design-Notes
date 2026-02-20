// ============================================================
// FILE 10: Arrays — The Basics
// Topic: Creating, reading, modifying, and searching arrays
// Why: Arrays are the most-used data structure in JavaScript.
//      Almost every API response, DOM query, and dataset you
//      work with arrives as — or becomes — an array.
// ============================================================

// =============================================
// STORY: The Mumbai Local Train
// A packed local train pulls into Churchgate
// with numbered compartments. Passengers board,
// squeeze between compartments, and alight.
// Each compartment is an array index; each
// passenger is a value.
// =============================================


// =============================================
// SECTION 1: Creating Arrays
// =============================================

// WHY: There are multiple ways to create arrays. Knowing when
// to use each prevents common pitfalls (like the Array(5) trap).

// --- Literal syntax (preferred 99% of the time) ---
const compartment1 = ["Sharma Ji", "Gupta Ji", "Verma Ji"];
console.log(compartment1);
// Output: [ 'Sharma Ji', 'Gupta Ji', 'Verma Ji' ]

// --- Empty array ---
const emptyCompartment = [];
console.log(emptyCompartment);
// Output: []

// --- Array() constructor ---
// CAUTION: Array(3) does NOT create [3] — it creates 3 empty slots!
const threeEmptySeats = Array(3);
console.log(threeEmptySeats);
// Output: [ <3 empty items> ]
console.log(threeEmptySeats.length);
// Output: 3

// With multiple arguments, it creates the array as you'd expect:
const passengers = Array("Sharma Ji", "Gupta Ji", "Verma Ji");
console.log(passengers);
// Output: [ 'Sharma Ji', 'Gupta Ji', 'Verma Ji' ]

// --- Array.of() — avoids the single-number trap ---
const singlePassenger = Array.of(3);
console.log(singlePassenger);
// Output: [ 3 ]

const morePassengers = Array.of("Iyer Ji", "Patel Ji");
console.log(morePassengers);
// Output: [ 'Iyer Ji', 'Patel Ji' ]

// --- Array.from() — converts array-likes and iterables ---
// From a string (each character becomes an element):
const trainCode = Array.from("MUMBAI");
console.log(trainCode);
// Output: [ 'M', 'U', 'M', 'B', 'A', 'I' ]

// From a Set:
const uniquePassengers = Array.from(new Set(["Sharma Ji", "Gupta Ji", "Sharma Ji"]));
console.log(uniquePassengers);
// Output: [ 'Sharma Ji', 'Gupta Ji' ]

// With a mapping function:
const seatNumbers = Array.from({ length: 5 }, (_, i) => `Seat-${i + 1}`);
console.log(seatNumbers);
// Output: [ 'Seat-1', 'Seat-2', 'Seat-3', 'Seat-4', 'Seat-5' ]


// =============================================
// SECTION 2: Accessing, Modifying & .length
// =============================================

// WHY: Arrays are zero-indexed. Understanding index math and
// the mutable .length property avoids off-by-one errors.

const train = ["Sharma Ji", "Gupta Ji", "Verma Ji", "Iyer Ji", "Patel Ji"];

// --- Accessing by index (0-based) ---
console.log(train[0]);
// Output: Sharma Ji
console.log(train[2]);
// Output: Verma Ji
console.log(train[train.length - 1]);
// Output: Patel Ji

// Accessing out of bounds returns undefined (no error):
console.log(train[99]);
// Output: undefined

// --- Modifying by index ---
train[1] = "Gupta Ji (upgraded to first class)";
console.log(train[1]);
// Output: Gupta Ji (upgraded to first class)

// --- .length ---
console.log(train.length);
// Output: 5

// TRICK: Setting .length smaller truncates the array!
const tempTrain = ["A", "B", "C", "D", "E"];
tempTrain.length = 3;
console.log(tempTrain);
// Output: [ 'A', 'B', 'C' ]
// D and E are gone forever.

// Setting .length larger creates empty slots:
tempTrain.length = 5;
console.log(tempTrain);
// Output: [ 'A', 'B', 'C', <2 empty items> ]


// =============================================
// SECTION 3: Adding & Removing — push, pop, shift, unshift, splice
// =============================================

// WHY: These are the core mutating operations. push/pop work at the
// end (fast), shift/unshift at the start (slower), splice anywhere.

const compartmentA = ["Sharma Ji", "Gupta Ji", "Verma Ji"];

// --- push() — add to the END ---
// A new passenger squeezes into the last compartment.
compartmentA.push("Iyer Ji");
console.log(compartmentA);
// Output: [ 'Sharma Ji', 'Gupta Ji', 'Verma Ji', 'Iyer Ji' ]

// push returns the new length:
const newLength = compartmentA.push("Patel Ji", "Khan Sahab");
console.log(newLength);
// Output: 6
console.log(compartmentA);
// Output: [ 'Sharma Ji', 'Gupta Ji', 'Verma Ji', 'Iyer Ji', 'Patel Ji', 'Khan Sahab' ]

// --- pop() — remove from the END ---
// Last passenger alights at the station.
const lastOff = compartmentA.pop();
console.log(lastOff);
// Output: Khan Sahab
console.log(compartmentA);
// Output: [ 'Sharma Ji', 'Gupta Ji', 'Verma Ji', 'Iyer Ji', 'Patel Ji' ]

// --- unshift() — add to the BEGINNING ---
// A TC boards at the front.
compartmentA.unshift("TC Pandey");
console.log(compartmentA);
// Output: [ 'TC Pandey', 'Sharma Ji', 'Gupta Ji', 'Verma Ji', 'Iyer Ji', 'Patel Ji' ]

// --- shift() — remove from the BEGINNING ---
// The first passenger exits.
const firstOff = compartmentA.shift();
console.log(firstOff);
// Output: TC Pandey
console.log(compartmentA);
// Output: [ 'Sharma Ji', 'Gupta Ji', 'Verma Ji', 'Iyer Ji', 'Patel Ji' ]

// --- splice(start, deleteCount, ...items) — the Swiss Army knife ---
// Removes and/or inserts elements at any position. MUTATES the array.

const compartmentB = ["Sharma Ji", "Gupta Ji", "Verma Ji", "Iyer Ji", "Patel Ji"];

// Remove 1 element at index 2 (Verma Ji alights):
const removed = compartmentB.splice(2, 1);
console.log(removed);
// Output: [ 'Verma Ji' ]
console.log(compartmentB);
// Output: [ 'Sharma Ji', 'Gupta Ji', 'Iyer Ji', 'Patel Ji' ]

// Insert without removing (at index 1, delete 0, add "Khan Sahab"):
compartmentB.splice(1, 0, "Khan Sahab");
console.log(compartmentB);
// Output: [ 'Sharma Ji', 'Khan Sahab', 'Gupta Ji', 'Iyer Ji', 'Patel Ji' ]

// Replace: remove 2, insert 1 (at index 3):
compartmentB.splice(3, 2, "Chaiwala");
console.log(compartmentB);
// Output: [ 'Sharma Ji', 'Khan Sahab', 'Gupta Ji', 'Chaiwala' ]


// =============================================
// SECTION 4: Non-Mutating Combinations — concat, slice, flat, flatMap
// =============================================

// WHY: These return NEW arrays without touching the originals.
// Immutability is crucial in modern JS (React state, Redux, etc.).

// --- concat() — merge arrays ---
const generalCoach = ["Sharma Ji", "Gupta Ji"];
const ladiesCoach = ["Verma Ji", "Iyer Ji"];
const wholeTrain = generalCoach.concat(ladiesCoach, ["Patel Ji"]);
console.log(wholeTrain);
// Output: [ 'Sharma Ji', 'Gupta Ji', 'Verma Ji', 'Iyer Ji', 'Patel Ji' ]
console.log(generalCoach);
// Output: [ 'Sharma Ji', 'Gupta Ji' ]   (unchanged!)

// --- slice(start, end) — extract a portion ---
// Does NOT mutate. end index is exclusive.
const middlePassengers = wholeTrain.slice(1, 4);
console.log(middlePassengers);
// Output: [ 'Gupta Ji', 'Verma Ji', 'Iyer Ji' ]

// Negative indices count from the end:
const lastTwo = wholeTrain.slice(-2);
console.log(lastTwo);
// Output: [ 'Iyer Ji', 'Patel Ji' ]

// Copy the entire array:
const trainCopy = wholeTrain.slice();
console.log(trainCopy);
// Output: [ 'Sharma Ji', 'Gupta Ji', 'Verma Ji', 'Iyer Ji', 'Patel Ji' ]

// --- flat(depth) — flatten nested arrays ---
// Some compartments have sub-sections:
const nestedTrain = [["Sharma Ji", "Gupta Ji"], ["Verma Ji", ["Iyer Ji", "Patel Ji"]]];

console.log(nestedTrain.flat());
// Output: [ 'Sharma Ji', 'Gupta Ji', 'Verma Ji', [ 'Iyer Ji', 'Patel Ji' ] ]  (1 level deep by default)

console.log(nestedTrain.flat(2));
// Output: [ 'Sharma Ji', 'Gupta Ji', 'Verma Ji', 'Iyer Ji', 'Patel Ji' ]  (2 levels)

console.log(nestedTrain.flat(Infinity));
// Output: [ 'Sharma Ji', 'Gupta Ji', 'Verma Ji', 'Iyer Ji', 'Patel Ji' ]  (all levels)

// --- flatMap() — map then flatten (1 level) ---
const compartments = ["Sharma Ji,Gupta Ji", "Verma Ji,Iyer Ji"];
const allPassengers = compartments.flatMap(comp => comp.split(","));
console.log(allPassengers);
// Output: [ 'Sharma Ji', 'Gupta Ji', 'Verma Ji', 'Iyer Ji' ]


// =============================================
// SECTION 5: Searching — indexOf, includes, find, findIndex, findLast, findLastIndex
// =============================================

// WHY: Searching is one of the most frequent operations. Each method
// has a distinct purpose — using the right one makes code cleaner.

const roster = ["Sharma Ji", "Gupta Ji", "Verma Ji", "Iyer Ji", "Gupta Ji", "Patel Ji"];

// --- indexOf(value) — returns first index, or -1 ---
console.log(roster.indexOf("Gupta Ji"));
// Output: 1

console.log(roster.indexOf("Chaiwala"));
// Output: -1

// Start searching from index 2:
console.log(roster.indexOf("Gupta Ji", 2));
// Output: 4

// --- includes(value) — returns boolean ---
console.log(roster.includes("Verma Ji"));
// Output: true

console.log(roster.includes("Chaiwala"));
// Output: false

// --- find(callback) — returns the FIRST element passing the test ---
const passengerList = [
  { name: "Sharma Ji", ticket: "First-Class" },
  { name: "Gupta Ji", ticket: "Second-Class" },
  { name: "Verma Ji", ticket: "First-Class" },
];

const firstClassPassenger = passengerList.find(p => p.ticket === "First-Class");
console.log(firstClassPassenger);
// Output: { name: 'Sharma Ji', ticket: 'First-Class' }

const noMatch = passengerList.find(p => p.ticket === "AC");
console.log(noMatch);
// Output: undefined

// --- findIndex(callback) — returns the INDEX of first match ---
const firstClassIndex = passengerList.findIndex(p => p.ticket === "First-Class");
console.log(firstClassIndex);
// Output: 0

// --- findLast(callback) — returns the LAST element passing the test ---
const lastFirstClass = passengerList.findLast(p => p.ticket === "First-Class");
console.log(lastFirstClass);
// Output: { name: 'Verma Ji', ticket: 'First-Class' }

// --- findLastIndex(callback) ---
const lastFirstClassIndex = passengerList.findLastIndex(p => p.ticket === "First-Class");
console.log(lastFirstClassIndex);
// Output: 2


// =============================================
// SECTION 6: Array.isArray()
// =============================================

// WHY: typeof [] returns "object". Array.isArray() is the only
// reliable way to check if something is truly an array.

console.log(typeof []);
// Output: "object"   <-- not helpful

console.log(Array.isArray([]));
// Output: true

console.log(Array.isArray("Sharma Ji"));
// Output: false

console.log(Array.isArray({ length: 3 }));
// Output: false   (array-like objects are NOT arrays)


// =============================================
// SECTION 7: Multi-Dimensional Arrays
// =============================================

// WHY: Grids, matrices, tables, and game boards all use nested
// arrays. Understanding indexing into them is essential.

// The train has 3 compartments, each with 4 seats:
const trainSeating = [
  ["Sharma Ji", "Gupta Ji",  "Verma Ji",  "Iyer Ji"],   // Compartment 0
  ["Patel Ji",  "Khan Sahab", "Reddy Ji", "Joshi Ji"],   // Compartment 1
  ["Chaiwala",  "empty",      "empty",    "TC Pandey"],  // Compartment 2
];

// Access compartment 1, seat 2:
console.log(trainSeating[1][2]);
// Output: Reddy Ji

// Access compartment 2, seat 3:
console.log(trainSeating[2][3]);
// Output: TC Pandey

// Modify a seat:
trainSeating[2][1] = "Late Passenger";
console.log(trainSeating[2]);
// Output: [ 'Chaiwala', 'Late Passenger', 'empty', 'TC Pandey' ]

// Iterate through all seats:
console.log("\n--- All passengers on the Mumbai Local ---");
trainSeating.forEach((compartment, cIdx) => {
  compartment.forEach((passenger, sIdx) => {
    if (passenger !== "empty") {
      console.log(`  Compartment ${cIdx}, Seat ${sIdx}: ${passenger}`);
    }
  });
});
// Output:
//   Compartment 0, Seat 0: Sharma Ji
//   Compartment 0, Seat 1: Gupta Ji
//   Compartment 0, Seat 2: Verma Ji
//   Compartment 0, Seat 3: Iyer Ji
//   Compartment 1, Seat 0: Patel Ji
//   Compartment 1, Seat 1: Khan Sahab
//   Compartment 1, Seat 2: Reddy Ji
//   Compartment 1, Seat 3: Joshi Ji
//   Compartment 2, Seat 0: Chaiwala
//   Compartment 2, Seat 1: Late Passenger
//   Compartment 2, Seat 3: TC Pandey


// ============================================================
// KEY TAKEAWAYS
// ------------------------------------------------------------
// 1. Use array literals [] for creation. Avoid Array(n) with a
//    single number — it creates empty slots, not [n].
//    Use Array.of(n) if you want [n].
//
// 2. Arrays are zero-indexed. Out-of-bounds access returns
//    undefined (no error thrown).
//
// 3. Mutating methods: push/pop (end), shift/unshift (start),
//    splice (anywhere). These CHANGE the original array.
//
// 4. Non-mutating methods: concat, slice, flat, flatMap.
//    These return NEW arrays — originals stay intact.
//
// 5. Searching: indexOf/includes for simple values;
//    find/findIndex for objects with conditions;
//    findLast/findLastIndex for searching from the end.
//
// 6. Use Array.isArray() — typeof [] is "object" and useless.
//
// 7. Multi-dimensional arrays use chained bracket notation:
//    grid[row][col].
// ============================================================
