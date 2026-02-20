/**
 * ============================================================
 *  FILE 4 : Numbers & Math
 * ============================================================
 *  Topic  : Integer, float, Infinity, -Infinity, NaN.
 *           Number methods: MAX_SAFE_INTEGER, isInteger(),
 *           isFinite(), isNaN() vs global isNaN().
 *           parseInt(), parseFloat(), .toFixed(), .toPrecision(),
 *           .toString(radix). Math object (round, floor, ceil,
 *           trunc, abs, max, min, pow, sqrt, random, sign, PI).
 *           BigInt basics.
 *
 *  WHY THIS MATTERS:
 *  Numbers are everywhere — prices, coordinates, scores, timers.
 *  JavaScript has a single Number type (64-bit float), which
 *  means decimal precision traps lurk around every corner.
 *  Mastering Number methods and Math utilities keeps your
 *  calculations accurate and your code robust.
 * ============================================================
 */

// ============================================================
// STORY: ISRO Mission Control at Sriharikota is prepping for
// the Chandrayaan lunar mission. Every calculation — fuel,
// distance, trajectory — depends on JavaScript numbers.
// ============================================================

// ────────────────────────────────────────────────────────────
// SECTION 1 — Number Basics: int, float, Infinity, NaN
// ────────────────────────────────────────────────────────────
// WHY: JS doesn't separate integers and floats — both are
// 64-bit IEEE 754 doubles. Knowing the special values
// (Infinity, NaN) prevents silent calculation errors.

const scientists = 6;                // integer
const fuelTons = 142.75;             // float
const escapeVelocity = 11_186;       // m/s, underscores for readability

console.log("Scientists:", scientists, "| Fuel:", fuelTons, "| Escape vel:", escapeVelocity);
// Output: Scientists: 6 | Fuel: 142.75 | Escape vel: 11186

// Special numeric values
const infiniteRange = Infinity;
const negInfinity = -Infinity;
const notANumber = NaN;

console.log("Infinity:", infiniteRange);       // Output: Infinity: Infinity
console.log("-Infinity:", negInfinity);         // Output: -Infinity: -Infinity
console.log("NaN:", notANumber);               // Output: NaN: NaN

// How Infinity and NaN arise naturally
console.log("1 / 0 =", 1 / 0);               // Output: 1 / 0 = Infinity
console.log("-1 / 0 =", -1 / 0);             // Output: -1 / 0 = -Infinity
console.log("'rocket' * 2 =", "rocket" * 2);  // Output: 'rocket' * 2 = NaN

// NaN is the only value not equal to itself
console.log("NaN === NaN?", NaN === NaN);      // Output: NaN === NaN? false

// ────────────────────────────────────────────────────────────
// SECTION 2 — Number Static Properties & Methods
// ────────────────────────────────────────────────────────────
// WHY: These helpers let you validate numbers before trusting
// them in critical calculations.

console.log("\n--- Number Properties ---");
console.log("MAX_SAFE_INTEGER:", Number.MAX_SAFE_INTEGER);
// Output: MAX_SAFE_INTEGER: 9007199254740991

console.log("MIN_SAFE_INTEGER:", Number.MIN_SAFE_INTEGER);
// Output: MIN_SAFE_INTEGER: -9007199254740991

console.log("MAX_VALUE:", Number.MAX_VALUE);
// Output: MAX_VALUE: 1.7976931348623157e+308

console.log("EPSILON:", Number.EPSILON);
// Output: EPSILON: 2.220446049250313e-16

// --- Checking methods ---
const distanceToMoon = 3.844; // lakh km

console.log("\n--- Number.isInteger() ---");
console.log("Is 6 integer?", Number.isInteger(scientists));
// Output: Is 6 integer? true
console.log("Is 3.844 integer?", Number.isInteger(distanceToMoon));
// Output: Is 3.844 integer? false

console.log("\n--- Number.isFinite() ---");
console.log("Is 142.75 finite?", Number.isFinite(fuelTons));
// Output: Is 142.75 finite? true
console.log("Is Infinity finite?", Number.isFinite(Infinity));
// Output: Is Infinity finite? false

console.log("\n--- Number.isNaN() vs global isNaN() ---");
// Number.isNaN only returns true for actual NaN
console.log("Number.isNaN(NaN):", Number.isNaN(NaN));
// Output: Number.isNaN(NaN): true
console.log("Number.isNaN('hello'):", Number.isNaN("hello"));
// Output: Number.isNaN('hello'): false  (string is not NaN)

// global isNaN coerces first — 'hello' becomes NaN, then true
console.log("isNaN('hello'):", isNaN("hello"));
// Output: isNaN('hello'): true  (coercion trap!)
// ALWAYS prefer Number.isNaN() to avoid this gotcha.

// ────────────────────────────────────────────────────────────
// SECTION 3 — Parsing & Conversion
// ────────────────────────────────────────────────────────────
// WHY: Data from user input, APIs, and files arrives as strings.
// You need to parse it into usable numbers.

const fuelReading = "142.75 tons";
const sensorCode = "0xA3";
const countdown = "007";

console.log("\n--- parseInt() ---");
console.log("parseInt('142.75 tons'):", parseInt(fuelReading));
// Output: parseInt('142.75 tons'): 142
console.log("parseInt('0xA3'):", parseInt(sensorCode));
// Output: parseInt('0xA3'): 163       (hex auto-detected)
console.log("parseInt('007'):", parseInt(countdown));
// Output: parseInt('007'): 7
console.log("parseInt('111', 2):", parseInt("111", 2));
// Output: parseInt('111', 2): 7       (binary to decimal)

console.log("\n--- parseFloat() ---");
console.log("parseFloat('142.75 tons'):", parseFloat(fuelReading));
// Output: parseFloat('142.75 tons'): 142.75

console.log("\n--- .toFixed() ---");
const pi = 3.141592653589793;
console.log("PI to 2 decimals:", pi.toFixed(2));
// Output: PI to 2 decimals: 3.14
console.log("PI to 5 decimals:", pi.toFixed(5));
// Output: PI to 5 decimals: 3.14159
// NOTE: .toFixed() returns a STRING

console.log("\n--- .toPrecision() ---");
const moonDistanceKm = 40208000000000; // km (hypothetical large distance)
console.log("4 significant digits:", moonDistanceKm.toPrecision(4));
// Output: 4 significant digits: 4.021e+13

console.log("\n--- .toString(radix) ---");
const missionId = 255;
console.log("Decimal:", missionId.toString(10));
// Output: Decimal: 255
console.log("Binary:", missionId.toString(2));
// Output: Binary: 11111111
console.log("Octal:", missionId.toString(8));
// Output: Octal: 377
console.log("Hex:", missionId.toString(16));
// Output: Hex: ff

// ────────────────────────────────────────────────────────────
// SECTION 4 — The Math Object
// ────────────────────────────────────────────────────────────
// WHY: Math provides all the standard mathematical operations
// you'd reach for on a scientific calculator.

console.log("\n--- Rounding ---");
const thrusterForce = 4.567;
console.log("Math.round(4.567):", Math.round(thrusterForce));   // Output: Math.round(4.567): 5
console.log("Math.floor(4.567):", Math.floor(thrusterForce));   // Output: Math.floor(4.567): 4
console.log("Math.ceil(4.567):",  Math.ceil(thrusterForce));    // Output: Math.ceil(4.567): 5
console.log("Math.trunc(4.567):", Math.trunc(thrusterForce));   // Output: Math.trunc(4.567): 4

console.log("\n--- Rounding negatives (key difference) ---");
console.log("Math.floor(-4.3):", Math.floor(-4.3));   // Output: Math.floor(-4.3): -5
console.log("Math.trunc(-4.3):", Math.trunc(-4.3));   // Output: Math.trunc(-4.3): -4
// floor goes toward -Infinity; trunc chops toward zero.

console.log("\n--- Absolute Value ---");
const trajectoryCorrection = -12.8;
console.log("Math.abs(-12.8):", Math.abs(trajectoryCorrection));
// Output: Math.abs(-12.8): 12.8

console.log("\n--- Min & Max ---");
const sensorReadings = [-120, 45, 300, 0, -50];
console.log("Math.max:", Math.max(...sensorReadings));    // Output: Math.max: 300
console.log("Math.min:", Math.min(...sensorReadings));    // Output: Math.min: -120

console.log("\n--- Power & Square Root ---");
const acceleration = 9.8;
console.log("Math.pow(9.8, 2):", Math.pow(acceleration, 2));
// Output: Math.pow(9.8, 2): 96.04000000000002
console.log("9.8 ** 2:", acceleration ** 2);
// Output: 9.8 ** 2: 96.04000000000002
console.log("Math.sqrt(96.04):", Math.sqrt(96.04));
// Output: Math.sqrt(96.04): 9.800000000000002

console.log("\n--- Math.sign() ---");
console.log("Math.sign(-42):", Math.sign(-42));   // Output: Math.sign(-42): -1
console.log("Math.sign(0):",   Math.sign(0));     // Output: Math.sign(0): 0
console.log("Math.sign(42):",  Math.sign(42));    // Output: Math.sign(42): 1

console.log("\n--- Math.PI ---");
const orbitRadius = 5000; // km
const orbitCircumference = 2 * Math.PI * orbitRadius;
console.log("Orbit circumference:", orbitCircumference.toFixed(2), "km");
// Output: Orbit circumference: 31415.93 km

console.log("\n--- Math.random() ---");
// Random float in [0, 1)
const randomFloat = Math.random();
console.log("Random 0-1:", randomFloat);
// Output: Random 0-1: <some float like 0.7391...>

// Random integer between min and max (inclusive)
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
const debrisCount = randomBetween(1, 100);
console.log("Space debris in sector:", debrisCount);
// Output: Space debris in sector: <random number 1-100>

// ────────────────────────────────────────────────────────────
// SECTION 5 — Floating Point Precision Gotcha
// ────────────────────────────────────────────────────────────
// WHY: The most infamous JS number bug. 0.1 + 0.2 !== 0.3
// because of IEEE 754 binary representation.

console.log("\n--- Floating Point Precision ---");
console.log("0.1 + 0.2 =", 0.1 + 0.2);
// Output: 0.1 + 0.2 = 0.30000000000000004

console.log("0.1 + 0.2 === 0.3?", 0.1 + 0.2 === 0.3);
// Output: 0.1 + 0.2 === 0.3? false

// Safe comparison using EPSILON
function almostEqual(a, b) {
  return Math.abs(a - b) < Number.EPSILON;
}
console.log("Almost equal?", almostEqual(0.1 + 0.2, 0.3));
// Output: Almost equal? true

// ────────────────────────────────────────────────────────────
// SECTION 6 — BigInt Basics
// ────────────────────────────────────────────────────────────
// WHY: When numbers exceed Number.MAX_SAFE_INTEGER, precision
// is silently lost. BigInt handles arbitrarily large integers.

console.log("\n--- BigInt ---");
const maxSafe = Number.MAX_SAFE_INTEGER;
console.log("MAX_SAFE_INTEGER:", maxSafe);
// Output: MAX_SAFE_INTEGER: 9007199254740991

console.log("maxSafe + 1:", maxSafe + 1);
// Output: maxSafe + 1: 9007199254740992

console.log("maxSafe + 2:", maxSafe + 2);
// Output: maxSafe + 2: 9007199254740992   <-- WRONG! Same as +1

// BigInt to the rescue
const bigDistance = 9007199254740991n;
console.log("BigInt + 1:", bigDistance + 1n);
// Output: BigInt + 1: 9007199254740992n
console.log("BigInt + 2:", bigDistance + 2n);
// Output: BigInt + 2: 9007199254740993n   <-- correct!

// BigInt caveats
// console.log(bigDistance + 1);  // TypeError: Cannot mix BigInt and other types
// Use explicit conversion when needed:
console.log("Mixed math:", Number(bigDistance) + 1);
// Output: Mixed math: 9007199254740992
// (loses precision because it's back to a regular Number)

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. JS has ONE number type: 64-bit IEEE 754 double. Both
//    integers and floats share it.
// 2. Special values: Infinity, -Infinity, NaN. Always check
//    with Number.isFinite() and Number.isNaN().
// 3. Use Number.isNaN() (not global isNaN()) to avoid coercion.
// 4. parseInt/parseFloat parse strings; .toFixed() formats
//    decimals (returns a string!).
// 5. Math object covers rounding, abs, min/max, pow, sqrt,
//    random, PI, and more.
// 6. 0.1 + 0.2 !== 0.3 — use Number.EPSILON for safe float
//    comparisons.
// 7. BigInt (suffix n) handles integers beyond MAX_SAFE_INTEGER
//    but cannot be mixed with regular Numbers without conversion.
// 8. As ISRO Mission Control says: "Trust your instruments
//    (Number methods), not your gut (loose comparisons)."
// ============================================================
