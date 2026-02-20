/**
 * ============================================================
 *  FILE 2 : Variables — var, let, const
 * ============================================================
 *  Topic  : var, let, const — scope, hoisting, reassignment.
 *           Naming rules & conventions (camelCase).
 *           const with objects/arrays (reference vs value).
 *
 *  WHY THIS MATTERS:
 *  Variables are the containers that hold every piece of data
 *  your program works with. Choosing the right keyword (var,
 *  let, or const) determines where the variable lives, whether
 *  it can change, and how predictable your code behaves.
 * ============================================================
 */

// ============================================================
// STORY: Dadi (grandmother) owns a steel almirah. The almirah
// itself is constant (const) — she can't swap it for a different
// one — but the valuables inside can be added or removed. Along
// the way she teaches us why "let" replaced "var" as the modern
// way to store things.
// ============================================================

// ────────────────────────────────────────────────────────────
// SECTION 1 — Declaring Variables: var, let, const
// ────────────────────────────────────────────────────────────
// WHY: Understanding the three keywords is the foundation of
// every JavaScript program. Pick the wrong one and you invite
// hard-to-find bugs.

// --- var (the old way) ---
var familyName = "The Sharma Parivaar";
console.log("Family:", familyName);
// Output: Family: The Sharma Parivaar

// --- let (block-scoped, reassignable) ---
let totalValuables = 12;
console.log("Valuables:", totalValuables);
// Output: Valuables: 12

totalValuables = 14; // Reassignment is fine with let
console.log("Valuables after adding gifts:", totalValuables);
// Output: Valuables after adding gifts: 14

// --- const (block-scoped, NOT reassignable) ---
const dadiName = "Kamla Devi";
console.log("Dadi:", dadiName);
// Output: Dadi: Kamla Devi

// dadiName = "Savitri Devi"; // TypeError: Assignment to constant variable.

// ────────────────────────────────────────────────────────────
// SECTION 2 — Scope Differences
// ────────────────────────────────────────────────────────────
// WHY: Scope controls where a variable is visible. var is
// function-scoped, while let and const are block-scoped.
// Block scope is almost always what you want.

// --- var is function-scoped (leaks out of blocks) ---
if (true) {
  var leakyValuable = "Gold coin";
}
console.log("var leaks:", leakyValuable);
// Output: var leaks: Gold coin
// The variable escaped the if-block!

// --- let is block-scoped (stays inside the block) ---
if (true) {
  let secureValuable = "Gold mangalsutra";
}
// console.log(secureValuable); // ReferenceError: secureValuable is not defined

// --- const is also block-scoped ---
if (true) {
  const lockedJewel = "Silver payal";
  console.log("Inside block:", lockedJewel);
  // Output: Inside block: Silver payal
}
// console.log(lockedJewel); // ReferenceError

// --- Loop example showing the var trap ---
for (var i = 0; i < 3; i++) {
  // i is visible everywhere in this function
}
console.log("var i after loop:", i);
// Output: var i after loop: 3

for (let j = 0; j < 3; j++) {
  // j is locked inside the loop body
}
// console.log(j); // ReferenceError: j is not defined

// ────────────────────────────────────────────────────────────
// SECTION 3 — Hoisting
// ────────────────────────────────────────────────────────────
// WHY: JavaScript moves declarations to the top of their scope
// before execution. With var, the value is undefined until the
// assignment line. With let/const, you get a "Temporal Dead Zone"
// error if you try to use them before declaration.

console.log("Hoisted var:", hoistedItem);
// Output: Hoisted var: undefined
var hoistedItem = "Property papers";

// console.log(hoistedLet);
// ReferenceError: Cannot access 'hoistedLet' before initialization
// let hoistedLet = "Old photographs";    // <-- would cause the error above

// ────────────────────────────────────────────────────────────
// SECTION 4 — Variable Naming Rules & Conventions
// ────────────────────────────────────────────────────────────
// WHY: Clear, consistent names make code self-documenting and
// prevent cryptic bugs.

// VALID names
let almiraShelfCount = 22;         // camelCase (recommended)
let _privateLocker = "secret";     // leading underscore (convention for "private")
let $dowryValue = 500;             // dollar sign is allowed
let shelf2ndRow = 5;               // digits allowed (but not as the first char)
let GOLD_PRICE_PER_GRAM = 0.15;   // UPPER_SNAKE for true constants by convention

// INVALID names (uncomment to see errors)
// let 2ndShelf = 5;               // SyntaxError: can't start with a digit
// let my-almirah = "steel";       // SyntaxError: hyphens not allowed
// let class = "locker";           // SyntaxError: 'class' is a reserved word

console.log("Shelves:", almiraShelfCount, "| Dowry:", $dowryValue);
// Output: Shelves: 22 | Dowry: 500

// ────────────────────────────────────────────────────────────
// SECTION 5 — const with Objects & Arrays (Reference vs Value)
// ────────────────────────────────────────────────────────────
// WHY: A const variable can't be reassigned, but the *contents*
// of an object or array it points to CAN change. This confuses
// many beginners.

// Dadi's steel almirah is const — she can't replace the almirah
// itself, but she CAN add or remove valuables inside.

const steelAlmirah = {
  goldMangalsutra: 1,
  silverPayal: 5,
  propertyPapers: 2,
};

// Mutating the contents — this is ALLOWED
steelAlmirah.goldMangalsutra = 2;       // change a property
steelAlmirah.fixedDeposits = 3;         // add a new property
delete steelAlmirah.propertyPapers;     // remove a property

console.log("Almirah contents:", steelAlmirah);
// Output: Almirah contents: { goldMangalsutra: 2, silverPayal: 5, fixedDeposits: 3 }

// Reassigning the variable — this is BLOCKED
// steelAlmirah = { goldMangalsutra: 0 };    // TypeError: Assignment to constant variable.

// Same concept with arrays
const familyMembers = ["Dadi", "Papa", "Mummy"];
familyMembers.push("Chhotu");              // Adding to the array — ALLOWED
familyMembers[0] = "Kamla Devi";           // Replacing an element — ALLOWED

console.log("Family:", familyMembers);
// Output: Family: [ 'Kamla Devi', 'Papa', 'Mummy', 'Chhotu' ]

// familyMembers = ["Someone else"];   // TypeError: Assignment to constant variable.

// ────────────────────────────────────────────────────────────
// SECTION 6 — Practical Guidelines
// ────────────────────────────────────────────────────────────
// WHY: Knowing the theory is good. Knowing what to *default to*
// in real code is better.

// RULE OF THUMB:
// 1. Default to `const` — if the binding won't be reassigned.
// 2. Use `let` when you *need* to reassign (loops, accumulators).
// 3. Avoid `var` in modern code — its function-scoping and
//    hoisting behaviour cause subtle bugs.

const MAX_VALUABLES = 9999;         // constant value — const
let currentValuables = 0;           // will change in a loop — let

for (let festival = 1; festival <= 3; festival++) {
  currentValuables += festival * 100;
  console.log(`Festival ${festival}: valuables = ${currentValuables}`);
}
// Output:
// Festival 1: valuables = 100
// Festival 2: valuables = 300
// Festival 3: valuables = 600

console.log("Total valuables:", currentValuables);
// Output: Total valuables: 600

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. var   — function-scoped, hoisted (value = undefined),
//            can be redeclared. Avoid in modern code.
// 2. let   — block-scoped, hoisted but in Temporal Dead Zone,
//            can be reassigned, cannot be redeclared in same scope.
// 3. const — block-scoped, hoisted but in Temporal Dead Zone,
//            CANNOT be reassigned, but object/array *contents*
//            can still be mutated.
// 4. Use camelCase for variables, UPPER_SNAKE for true constants.
// 5. Start with const; switch to let only when you need
//    reassignment. Forget var exists.
// 6. const on an object/array locks the *reference*, not the
//    *contents* — like Dadi's almirah: same almirah, new valuables.
// ============================================================
