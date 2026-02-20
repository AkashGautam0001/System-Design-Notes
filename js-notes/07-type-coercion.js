/**
 * ============================================================
 *  FILE 7 : Type Coercion
 * ============================================================
 *  Topic  : Implicit vs explicit coercion. == vs ===.
 *           String, Number, Boolean coercion. Edge cases:
 *           [] + [], [] + {}, {} + [], null == undefined.
 *           Object.is() vs ===.
 *
 *  WHY THIS MATTERS:
 *  JavaScript is dynamically typed and will silently convert
 *  values from one type to another. If you don't understand
 *  the rules, you'll face baffling bugs like "why does [] + []
 *  equal an empty string?" Mastering coercion means you'll
 *  read code fearlessly and write comparisons that never lie.
 * ============================================================
 */

// ============================================================
// STORY: Pappu is a jugaadu electrician in Chandni Chowk — he
// converts anything to anything, sometimes on purpose (explicit)
// and sometimes by accident (implicit). A 3-pin plug becomes
// 2-pin, a wire becomes a fuse. Every coercion rule mirrors
// one of Pappu's jugaad conversions.
// ============================================================

// ************************************************************
// EXAMPLE BLOCK 1 — The Rules of Jugaad Conversion
// Understanding coercion types, equality, and conversion methods
// ************************************************************

// ────────────────────────────────────────────────────────────
// SECTION 1 — Implicit vs Explicit Coercion
// ────────────────────────────────────────────────────────────
// WHY: "Implicit" means JS converts types silently behind the
// scenes. "Explicit" means YOU do it on purpose. Knowing the
// difference is the key to predictable code.

// --- Implicit (Pappu accidentally shorts a wire) ---
const pappuRate = "25";
const nextRate = pappuRate + 1;     // + with a string triggers concatenation
console.log("Implicit + :", nextRate, typeof nextRate);
// Output: Implicit + : 251 string
// JS coerced 1 to "1" and concatenated!

const actualRate = pappuRate - 1;    // - only works with numbers, so JS coerces
console.log("Implicit - :", actualRate, typeof actualRate);
// Output: Implicit - : 24 number

// --- Explicit (Pappu deliberately converts a 3-pin to 2-pin) ---
const explicitRate = Number(pappuRate) + 1;
console.log("Explicit + :", explicitRate, typeof explicitRate);
// Output: Explicit + : 26 number

// ────────────────────────────────────────────────────────────
// SECTION 2 — == (Abstract Equality) vs === (Strict Equality)
// ────────────────────────────────────────────────────────────
// WHY: == coerces types before comparing; === does not.
// Using == invites surprises. Default to === always.

console.log("\n--- == vs === ---");

console.log('5 == "5"  :', 5 == "5");
// Output: 5 == "5"  : true    (string "5" coerced to number 5)

console.log('5 === "5" :', 5 === "5");
// Output: 5 === "5" : false   (different types, no coercion)

console.log("0 == false :", 0 == false);
// Output: 0 == false : true   (both coerce to 0)

console.log("0 === false:", 0 === false);
// Output: 0 === false: false  (number vs boolean)

console.log('"" == false:', "" == false);
// Output: "" == false: true   (both coerce to 0)

console.log('"" === false:', "" === false);
// Output: "" === false: false

// The one useful == rule: null and undefined
console.log("null == undefined:", null == undefined);
// Output: null == undefined: true   (by spec, they are == to each other)

console.log("null === undefined:", null === undefined);
// Output: null === undefined: false (different types)

// This is the ONLY place == is commonly considered acceptable,
// because it checks "is this value null-ish?" in one shot.

// ────────────────────────────────────────────────────────────
// SECTION 3 — String Coercion
// ────────────────────────────────────────────────────────────
// WHY: When you use + with a string, everything else becomes
// a string too. Understanding this prevents "12" + "3" = "123".

console.log("\n--- String Coercion ---");

// Implicit: + operator with a string
console.log("'Pappu' + 7     :", "Pappu" + 7);
// Output: 'Pappu' + 7     : Pappu7

console.log("1 + '2'        :", 1 + "2");
// Output: 1 + '2'        : 12

console.log("true + 'jugaad' :", true + "jugaad");
// Output: true + 'jugaad' : truejugaad

// Explicit: String() and .toString()
console.log("String(42)     :", String(42));
// Output: String(42)     : 42   (type: string)

console.log("String(null)   :", String(null));
// Output: String(null)   : null

console.log("String(undefined):", String(undefined));
// Output: String(undefined): undefined

console.log("(255).toString(16):", (255).toString(16));
// Output: (255).toString(16): ff

// ────────────────────────────────────────────────────────────
// SECTION 4 — Number Coercion
// ────────────────────────────────────────────────────────────
// WHY: Math operators (except +) and comparisons like < > will
// try to convert operands to numbers.

console.log("\n--- Number Coercion ---");

// Implicit: math operators
console.log('"6" - 2   :', "6" - 2);
// Output: "6" - 2   : 4

console.log('"6" * 2   :', "6" * 2);
// Output: "6" * 2   : 12

console.log('"6" / 2   :', "6" / 2);
// Output: "6" / 2   : 3

// Unary + (quick number conversion)
console.log('+"42"     :', +"42");
// Output: +"42"     : 42

console.log('+true     :', +true);
// Output: +true     : 1

console.log('+false    :', +false);
// Output: +false    : 0

console.log('+null     :', +null);
// Output: +null     : 0

console.log('+undefined:', +undefined);
// Output: +undefined: NaN

console.log('+"hello"  :', +"hello");
// Output: +"hello"  : NaN

// Explicit: Number()
console.log("Number('')    :", Number(""));
// Output: Number('')    : 0

console.log("Number(' 42 '):", Number(" 42 "));
// Output: Number(' 42 '): 42

console.log("Number(true)  :", Number(true));
// Output: Number(true)  : 1

console.log("Number(null)  :", Number(null));
// Output: Number(null)  : 0

console.log("Number(undefined):", Number(undefined));
// Output: Number(undefined): NaN

// ────────────────────────────────────────────────────────────
// SECTION 5 — Boolean Coercion
// ────────────────────────────────────────────────────────────
// WHY: Every value in JS is either "truthy" or "falsy". This
// drives if-statements, ternaries, and logical operators.

console.log("\n--- Falsy Values (all 8 of them) ---");
// These are ALL the falsy values in JS:
const falsyValues = [false, 0, -0, 0n, "", null, undefined, NaN];
falsyValues.forEach(val => {
  console.log(`Boolean(${String(val).padEnd(10)}) =>`, Boolean(val));
});
// Output:
// Boolean(false     ) => false
// Boolean(0         ) => false
// Boolean(0         ) => false  (-0)
// Boolean(0         ) => false  (0n)
// Boolean(          ) => false  ("")
// Boolean(null      ) => false
// Boolean(undefined ) => false
// Boolean(NaN       ) => false

console.log("\n--- Truthy Examples ---");
// Everything else is truthy — including some surprises:
console.log('Boolean("0")   :', Boolean("0"));
// Output: Boolean("0")   : true     <-- non-empty string!

console.log('Boolean("false"):', Boolean("false"));
// Output: Boolean("false"): true    <-- non-empty string!

console.log("Boolean([])    :", Boolean([]));
// Output: Boolean([])    : true     <-- empty array is truthy!

console.log("Boolean({})    :", Boolean({}));
// Output: Boolean({})    : true     <-- empty object is truthy!

// Double-bang shortcut: !!value
console.log('!!"Pappu"  :', !!"Pappu");
// Output: !!"Pappu"  : true

console.log("!!0       :", !!0);
// Output: !!0       : false


// ************************************************************
// EXAMPLE BLOCK 2 — The Edge Cases & Object.is()
// The strange conversions even Pappu didn't expect
// ************************************************************

// ────────────────────────────────────────────────────────────
// SECTION 6 — Coercion Edge Cases
// ────────────────────────────────────────────────────────────
// WHY: These are classic interview questions AND real-world
// gotchas. Knowing them saves hours of debugging.

console.log("\n--- Edge Cases ---");

// [] + [] — both coerced to "" via .toString()
console.log("[] + []  :", [] + []);
// Output: [] + []  :          (empty string)
console.log("type    :", typeof ([] + []));
// Output: type    : string

// [] + {} — [] becomes "", {} becomes "[object Object]"
console.log('[] + {} :', [] + {});
// Output: [] + {} : [object Object]

// {} + [] — depends on context!
// In a script (not at start of line), it's same as [] + {}
console.log('{} + [] :', {} + []);
// Output: {} + [] : [object Object]
// NOTE: In a browser console, {} at the START of a line is
// parsed as an empty block, so {} + [] can equal 0. But in
// a script/Node.js context, it's "[object Object]".

// More edge cases
console.log("[] + 0      :", [] + 0);
// Output: [] + 0      : 0     ([] -> "", "" + 0 -> "0") ...wait
// Actually: [] -> "" then "" + 0 -> "0" (string)
console.log("type        :", typeof ([] + 0));
// Output: type        : string

console.log("true + true :", true + true);
// Output: true + true : 2     (1 + 1)

console.log("true + false:", true + false);
// Output: true + false: 1     (1 + 0)

console.log('"5" - 3     :', "5" - 3);
// Output: "5" - 3     : 2

console.log('"5" + 3     :', "5" + 3);
// Output: "5" + 3     : 53    (string concatenation wins)

// The null/undefined asymmetry
console.log("null + 1       :", null + 1);
// Output: null + 1       : 1       (null -> 0)

console.log("undefined + 1  :", undefined + 1);
// Output: undefined + 1  : NaN     (undefined -> NaN)

// == quirks
console.log("null == 0      :", null == 0);
// Output: null == 0      : false   (null only == null or undefined)

console.log("null == false  :", null == false);
// Output: null == false  : false

console.log('"" == false    :', "" == false);
// Output: "" == false    : true    (both coerce to 0)

console.log('"0" == false   :', "0" == false);
// Output: "0" == false   : true    ("0" -> 0, false -> 0)

console.log('"" == 0        :', "" == 0);
// Output: "" == 0        : true    ("" -> 0)

console.log('"0" == ""      :', "0" == "");
// Output: "0" == ""      : false   (both strings, compared as strings)

// ────────────────────────────────────────────────────────────
// SECTION 7 — Object.is() vs ===
// ────────────────────────────────────────────────────────────
// WHY: === has two edge cases where it behaves unexpectedly.
// Object.is() fixes both. It's the "truly strict" comparison.

console.log("\n--- Object.is() vs === ---");

// Edge case 1: NaN
console.log("NaN === NaN        :", NaN === NaN);
// Output: NaN === NaN        : false  (=== says NaN is not itself!)

console.log("Object.is(NaN, NaN):", Object.is(NaN, NaN));
// Output: Object.is(NaN, NaN): true   (Object.is fixes this)

// Edge case 2: +0 and -0
console.log("+0 === -0          :", +0 === -0);
// Output: +0 === -0          : true   (=== treats them as equal)

console.log("Object.is(+0, -0)  :", Object.is(+0, -0));
// Output: Object.is(+0, -0)  : false  (Object.is distinguishes them)

// For everything else, Object.is() behaves like ===
console.log("Object.is(1, 1)    :", Object.is(1, 1));
// Output: Object.is(1, 1)    : true

console.log('Object.is(1, "1")  :', Object.is(1, "1"));
// Output: Object.is(1, "1")  : false

// ────────────────────────────────────────────────────────────
// SECTION 8 — Pappu's Coercion Cheat Sheet
// ────────────────────────────────────────────────────────────

console.log("\n--- Pappu's Cheat Sheet ---");
const cheatSheet = [
  { expression: '"5" + 3',      result: "53",               why: "String concat wins" },
  { expression: '"5" - 3',      result: "2",                why: "- forces number" },
  { expression: "true + true",  result: "2",                why: "1 + 1" },
  { expression: "[] + []",      result: '""',               why: "Both toString -> empty" },
  { expression: "[] + {}",      result: '"[object Object]"', why: '{}.toString()' },
  { expression: "null + 1",     result: "1",                why: "null -> 0" },
  { expression: "undefined + 1", result: "NaN",             why: "undefined -> NaN" },
  { expression: 'null == undefined', result: "true",        why: "Spec says so" },
  { expression: "NaN === NaN",  result: "false",            why: "NaN !== anything" },
];
console.table(cheatSheet);

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. IMPLICIT coercion: JS converts types automatically (and
//    often unexpectedly). EXPLICIT coercion: you do it yourself
//    with Number(), String(), Boolean(), !!.
// 2. ALWAYS use === (strict equality) unless you have a specific
//    reason for ==. The only common exception: null == undefined.
// 3. The + operator is overloaded: with a string on either side,
//    it concatenates. All other math operators (- * / %) force
//    number coercion.
// 4. There are exactly 8 falsy values: false, 0, -0, 0n, "",
//    null, undefined, NaN. Everything else is truthy — including
//    "0", "false", [], and {}.
// 5. Edge cases: [] + [] = "", [] + {} = "[object Object]",
//    null + 1 = 1, undefined + 1 = NaN.
// 6. Object.is() is the strictest comparison:
//    - Object.is(NaN, NaN) is true  (=== gives false)
//    - Object.is(+0, -0) is false   (=== gives true)
// 7. Pappu's golden rule: "When in doubt, convert explicitly.
//    A visible jugaad is always safer than a silent one."
// ============================================================
