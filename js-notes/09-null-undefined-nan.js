// ============================================================
// FILE 09: null, undefined & NaN
// Topic: JavaScript's three "nothing" values and how they differ
// Why: Confusing these three causes the majority of runtime
//      errors in JavaScript — understanding them is survival.
// ============================================================

// =============================================
// STORY: Welcome to the Abandoned Haveli in Old Delhi
// Once a grand mansion, now mostly deserted.
// Some rooms were never furnished (undefined),
// some were intentionally emptied (null),
// and some have broken locks with no number (NaN).
// Caretaker Munna explores every corridor.
// =============================================


// =============================================
// PART 1: undefined — "Never Furnished"
// =============================================

// WHY: undefined means a value was expected but never provided.
// JavaScript itself assigns undefined in several situations.
// Recognizing each one prevents "undefined is not a function" errors.

// --- Situation 1: Declared but not assigned ---
let emptyRoom;
console.log(emptyRoom);
// Output: undefined
// The room was marked on the map (declared) but never furnished (no value).

// --- Situation 2: Missing function parameters ---
function inspectRoom(roomName, inspector) {
  console.log(`Room: ${roomName}, Inspector: ${inspector}`);
}
inspectRoom("Sheesh Mahal");
// Output: Room: Sheesh Mahal, Inspector: undefined
// The inspector parameter was never sent — it defaults to undefined.

// --- Situation 3: Missing object properties ---
const mainHall = { name: "Diwan-e-Khas", built: 1648 };
console.log(mainHall.caretaker);
// Output: undefined
// The property was never defined on this object.

// --- Situation 4: Function with no return statement ---
function walkThroughHaveli() {
  // looks around but returns nothing
}
const discovery = walkThroughHaveli();
console.log(discovery);
// Output: undefined

// --- Situation 5: The void operator ---
// void always evaluates its expression and returns undefined.
console.log(void 0);
// Output: undefined
console.log(void "anything here");
// Output: undefined

// --- typeof undefined ---
console.log(typeof undefined);
// Output: "undefined"
// This is the ONLY value whose typeof is "undefined".


// =============================================
// PART 2: null — "Intentionally Emptied"
// =============================================

// WHY: null is an INTENTIONAL signal that "there is no value here."
// Developers assign null deliberately; JavaScript never assigns it on its own.

// The treasure room once had valuables.
let treasureRoom = { name: "Khazana Room", items: 42 };
console.log(treasureRoom);
// Output: { name: 'Khazana Room', items: 42 }

// The zamindar emptied it intentionally:
treasureRoom = null;
console.log(treasureRoom);
// Output: null

// --- The infamous typeof null bug ---
// WHY: This is a 30-year-old bug in JavaScript that will never be fixed.
// null is NOT an object, but typeof says it is.
console.log(typeof null);
// Output: "object"   <-- BUG! null is a primitive, not an object.

// Safe way to check for null:
console.log(treasureRoom === null);
// Output: true

// --- null vs undefined comparison ---
console.log(null == undefined);
// Output: true   (loose equality — they are "similar nothings")

console.log(null === undefined);
// Output: false  (strict equality — they are different types)

// --- null in arithmetic ---
// null becomes 0 in numeric contexts:
console.log(null + 5);
// Output: 5
console.log(null * 10);
// Output: 0

// undefined becomes NaN in numeric contexts:
console.log(undefined + 5);
// Output: NaN


// =============================================
// PART 3: NaN — "The Room with a Broken Lock"
// =============================================

// WHY: NaN ("Not a Number") appears when a math operation fails.
// It's technically a number type, which confuses everyone.
// The biggest trap: NaN is NOT equal to itself.

// Munna tries to read a room number from a faded nameplate:
const roomNumber = Number("Baithak");
console.log(roomNumber);
// Output: NaN
// You can't turn a room name into a number.

// --- typeof NaN ---
console.log(typeof NaN);
// Output: "number"   <-- Yes, "Not a Number" is a number. Welcome to JS.

// --- NaN is not equal to itself ---
// This is the single most surprising fact in JavaScript for beginners.
console.log(NaN === NaN);
// Output: false

console.log(NaN == NaN);
// Output: false

// Even comparing a NaN variable to itself:
const brokenLock = NaN;
console.log(brokenLock === brokenLock);
// Output: false

// --- How to properly check for NaN ---

// BAD: the global isNaN() coerces first — misleading results
console.log(isNaN("hello"));
// Output: true   (coerces "hello" to NaN, then checks)
console.log(isNaN("42"));
// Output: false  (coerces "42" to 42, which is a number)

// GOOD: Number.isNaN() — no coercion, strict check
console.log(Number.isNaN("hello"));
// Output: false  ("hello" is a string, not NaN)
console.log(Number.isNaN(NaN));
// Output: true   (this IS actually NaN)
console.log(Number.isNaN(0 / 0));
// Output: true   (0/0 produces NaN)

// --- Common ways NaN appears ---
console.log("\n--- Ways NaN sneaks into the Haveli ---");
console.log(0 / 0);                  // Output: NaN
console.log(Math.sqrt(-1));           // Output: NaN
console.log(parseInt("haveli"));      // Output: NaN
console.log(Number(undefined));       // Output: NaN
console.log("paan" * 3);             // Output: NaN

// --- NaN is contagious ---
// Any math with NaN produces NaN:
console.log(NaN + 100);    // Output: NaN
console.log(NaN * 0);      // Output: NaN
console.log(NaN > 5);      // Output: false
console.log(NaN < 5);      // Output: false
console.log(NaN === 0);    // Output: false


// =============================================
// PART 4: Nullish Coalescing (??) — Intro
// =============================================

// WHY: The || operator treats 0 and "" as "missing" because they're falsy.
// ?? only treats null and undefined as "missing" — much safer for defaults.
// (Deep dive in File 39)

console.log("\n--- Nullish coalescing (??) ---");

// Scenario: Each room in the Haveli has a visitor count.
const baithakVisitors = 0;       // Open but nobody came today
const khazanaVisitors = null;    // Khazana room is sealed (null)
const zenanVisitors = undefined; // Zenana wing was never opened (undefined)
const diwanVisitors = 7;

// Using || (WRONG for 0):
console.log(baithakVisitors || "No data");
// Output: No data   <-- BUG! 0 is a valid count!

// Using ?? (CORRECT):
console.log(baithakVisitors ?? "No data");
// Output: 0   <-- Correct! 0 is not null or undefined.

console.log(khazanaVisitors ?? "No data");
// Output: No data   (null triggers the default)

console.log(zenanVisitors ?? "No data");
// Output: No data   (undefined triggers the default)

console.log(diwanVisitors ?? "No data");
// Output: 7   (a truthy value, used as-is)

// ?? only activates for null and undefined — NOT for 0, "", false, NaN
console.log(false ?? "default");    // Output: false
console.log("" ?? "default");       // Output: ""
console.log(0 ?? "default");        // Output: 0


// =============================================
// PART 5: Optional Chaining (?.) — Intro
// =============================================

// WHY: Accessing nested properties on null/undefined throws an error.
// ?. short-circuits and returns undefined instead of crashing.
// (Deep dive in File 39)

console.log("\n--- Optional chaining (?.) ---");

// The Haveli's registry — some rooms have data, some don't.
const haveliRegistry = {
  baithak: {
    owner: { name: "Nawab Sahab", age: 65 },
    floors: 2,
  },
  khazana: null,              // sealed off
  // zenana doesn't exist at all
};

// Without optional chaining — CRASHES:
// console.log(haveliRegistry.khazana.owner.name);
// TypeError: Cannot read properties of null

// With optional chaining — safe:
console.log(haveliRegistry.khazana?.owner?.name);
// Output: undefined   (khazana is null, so it stops and returns undefined)

console.log(haveliRegistry.zenana?.owner?.name);
// Output: undefined   (zenana doesn't exist on the object)

console.log(haveliRegistry.baithak?.owner?.name);
// Output: Nawab Sahab   (everything exists, works normally)

// Combining ?. with ?? for a default:
const khazanaOwner = haveliRegistry.khazana?.owner?.name ?? "No owner on record";
console.log(khazanaOwner);
// Output: No owner on record

// Optional chaining with methods:
const baithakGreeting = haveliRegistry.baithak?.owner?.greet?.();
console.log(baithakGreeting);
// Output: undefined   (greet method doesn't exist, no crash)

// Optional chaining with bracket notation:
const propertyToCheck = "floors";
console.log(haveliRegistry.baithak?.[propertyToCheck]);
// Output: 2


// =============================================
// SIDE-BY-SIDE COMPARISON
// =============================================

console.log("\n--- Comparison table ---");

console.log("Value      | typeof      | Boolean()  | Number()  | == null | === null | === undefined");
console.log("-----------|-------------|------------|-----------|---------|---------|---------------");
console.log(`undefined  | ${"undefined".padEnd(11)} | ${String(Boolean(undefined)).padEnd(10)} | ${String(Number(undefined)).padEnd(9)} | ${String(undefined == null).padEnd(7)} | ${String(undefined === null).padEnd(7)} | ${String(undefined === undefined)}`);
console.log(`null       | ${"object".padEnd(11)} | ${String(Boolean(null)).padEnd(10)} | ${String(Number(null)).padEnd(9)} | ${String(null == null).padEnd(7)} | ${String(null === null).padEnd(7)} | ${String(null === undefined)}`);
console.log(`NaN        | ${"number".padEnd(11)} | ${String(Boolean(NaN)).padEnd(10)} | ${String(Number(NaN)).padEnd(9)} | ${String(NaN == null).padEnd(7)} | ${String(NaN === null).padEnd(7)} | ${String(NaN === undefined)}`);
// Output:
// Value      | typeof      | Boolean()  | Number()  | == null | === null | === undefined
// -----------|-------------|------------|-----------|---------|---------|---------------
// undefined  | undefined   | false      | NaN       | true    | false   | true
// null       | object      | false      | 0         | true    | true    | false
// NaN        | number      | false      | NaN       | false   | false   | false


// ============================================================
// KEY TAKEAWAYS
// ------------------------------------------------------------
// 1. undefined = "never assigned" — JS sets this automatically
//    for missing values, params, properties, and return values.
//
// 2. null = "intentionally empty" — developers set this on
//    purpose. Beware: typeof null === "object" is a historic bug.
//
// 3. NaN = "failed math" — it's technically type "number" and
//    it is NOT equal to itself. Use Number.isNaN() to detect it.
//
// 4. null == undefined is true (loose), but null === undefined
//    is false (strict). Always prefer === to avoid confusion.
//
// 5. Use ?? (nullish coalescing) instead of || for defaults
//    when 0, "", or false are valid values.
//
// 6. Use ?. (optional chaining) to safely access nested
//    properties without crashing on null/undefined.
//
// 7. Combine them: obj?.deeply?.nested?.value ?? "fallback"
// ============================================================
