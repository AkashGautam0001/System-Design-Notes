// ============================================================
// FILE 19: SCOPE & HOISTING
// Topic: Global scope, function scope, block scope, var hoisting,
//        TDZ, function hoisting, scope chain, and variable shadowing
// WHY: Scope determines where variables live and who can access them.
//      Hoisting determines when they become available. Misunderstanding
//      either leads to subtle, hard-to-trace bugs.
// ============================================================

// ============================================================
// EXAMPLE 1 — Rashtrapati Bhavan: Security Zones
// Story: Rashtrapati Bhavan has zones with different security
// clearances. Each zone represents a scope, and who can see what
// depends on where they stand.
// ============================================================

// WHY: Global scope is the "Mughal Garden" — everyone can see it.
// But leaking too much into global scope causes name collisions
// and makes code fragile.

// --- Global Scope ---

const bhavanName = "Rashtrapati Bhavan"; // Accessible everywhere
let securityZone = "PUBLIC GARDEN";      // Accessible everywhere

function enterBhavan() {
  // Global variables are visible inside any function
  console.log(`Welcome to ${bhavanName}. Current zone: ${securityZone}`);
}

enterBhavan();
// Output: Welcome to Rashtrapati Bhavan. Current zone: PUBLIC GARDEN


// WHY: Function scope creates a private room — variables declared
// inside a function are invisible outside. This is how we contain logic.

// --- Function Scope ---

function privateQuarters() {
  const quartersCode = "STAFF-7"; // Only exists inside this function
  var quartersAccess = "RESTRICTED";  // Also function-scoped (var)
  let quartersStatus = "ACTIVE";      // Also function-scoped (let inside function)

  console.log(`Quarters code: ${quartersCode}, Access: ${quartersAccess}, Status: ${quartersStatus}`);
}

privateQuarters();
// Output: Quarters code: STAFF-7, Access: RESTRICTED, Status: ACTIVE

// console.log(quartersCode);   // ReferenceError: quartersCode is not defined
// console.log(quartersAccess); // ReferenceError: quartersAccess is not defined
// console.log(quartersStatus); // ReferenceError: quartersStatus is not defined


// WHY: Block scope (let/const) limits visibility to { } blocks —
// if, for, while, etc. This is why let/const are preferred over var.

// --- Block Scope ---

const clearanceLevel = 3;

if (clearanceLevel >= 2) {
  const presidentialFile = "Nuclear Briefcase"; // Block-scoped — only inside this if
  let officerAssigned = "ADC Rajesh";           // Block-scoped
  var leakyInfo = "I escape blocks!";           // var ignores block scope!

  console.log(`Access granted: ${presidentialFile}, Officer: ${officerAssigned}`);
}
// Output: Access granted: Nuclear Briefcase, Officer: ADC Rajesh

// console.log(presidentialFile);  // ReferenceError
// console.log(officerAssigned);   // ReferenceError
console.log(leakyInfo);            // "I escape blocks!" — var leaked out!
// Output: I escape blocks!

// Block scope in a for loop
for (let i = 0; i < 3; i++) {
  // `i` exists only inside this block
}
// console.log(i); // ReferenceError: i is not defined

for (var j = 0; j < 3; j++) {
  // `j` is function/global scoped — it leaks!
}
console.log("Leaked j:", j); // 3
// Output: Leaked j: 3


// WHY: Understanding var hoisting prevents confusion when variables
// appear to exist before their declaration line — but hold `undefined`.

// --- var Hoisting ---
// With var, the DECLARATION is hoisted to the top of the function,
// but the INITIALIZATION stays where you wrote it.

console.log("\n=== var Hoisting ===");
console.log("VIP pass before declaration:", vipPass);
// Output: VIP pass before declaration: undefined   (declaration hoisted, value not yet assigned)

var vipPass = "Presidential-Suite";

console.log("VIP pass after declaration:", vipPass);
// Output: VIP pass after declaration: Presidential-Suite

// What the engine actually sees:
// var vipPass;              <-- hoisted to top
// console.log(vipPass);     <-- undefined
// vipPass = "Presidential-Suite";  <-- assignment stays here


// WHY: let and const are NOT hoisted in the way var is — they exist in a
// "Temporal Dead Zone" from the start of the block until the declaration
// line. Accessing them before that throws a ReferenceError.

// --- let/const Temporal Dead Zone (TDZ) ---

console.log("\n=== Temporal Dead Zone ===");

// Uncomment to see the TDZ error:
// console.log(classified); // ReferenceError: Cannot access 'classified' before initialization

let classified = "EYES ONLY - PRESIDENT";
console.log("After declaration:", classified);
// Output: After declaration: EYES ONLY - PRESIDENT

// The TDZ exists from the start of the enclosing block:
{
  // TDZ for `codeword` starts here
  // console.log(codeword); // ReferenceError!
  const codeword = "CHANAKYA";
  console.log("Codeword:", codeword);
  // Output: Codeword: CHANAKYA
  // TDZ ends at the declaration line
}

// TDZ also applies inside function parameters and default values
// function broken(a = b, b = 1) {} // ReferenceError: `b` is in TDZ when `a` is evaluated


// WHY: Function declarations are hoisted ENTIRELY — you can call
// them before they appear in the source code. Function expressions
// follow the hoisting rules of their variable keyword.

// --- Function Declaration Hoisting ---

console.log("\n=== Function Hoisting ===");

// This works — the entire function is hoisted
const accessResult = checkClearance("Officer Mehra", 4);
console.log(accessResult);
// Output: Officer Mehra: Access GRANTED (Level 4)

function checkClearance(officerName, level) {
  return level >= 3
    ? `${officerName}: Access GRANTED (Level ${level})`
    : `${officerName}: Access DENIED (Level ${level})`;
}


// --- Function Expression Hoisting ---

// With var: the variable is hoisted (as undefined), but the function is NOT
// console.log(scanAadhaar); // undefined (if var)
// scanAadhaar("Officer");   // TypeError: scanAadhaar is not a function

// With const/let: the variable is in the TDZ
// scanIDCard("Officer");    // ReferenceError: Cannot access before initialization

var scanAadhaar = function (person) {
  return `Scanning Aadhaar for ${person}...`;
};

const scanIDCard = function (person) {
  return `Scanning ID card for ${person}...`;
};

// After the declarations, both work fine
console.log(scanAadhaar("Officer Mehra"));
// Output: Scanning Aadhaar for Officer Mehra...
console.log(scanIDCard("ADC Rajesh"));
// Output: Scanning ID card for ADC Rajesh...


// ============================================================
// EXAMPLE 2 — The Scope Chain & Variable Shadowing
// Story: A visitor travels through nested security checkpoints
// inside Rashtrapati Bhavan. At each checkpoint, names can be
// "shadowed" by local IDs.
// ============================================================

// WHY: When a variable is referenced, JS walks UP the scope chain —
// from the innermost scope to the outermost — and uses the first
// match it finds. This is called "lexical scoping" because scope
// is determined by where code is WRITTEN, not where it is called.

// --- Scope Chain / Lexical Scope ---

const mainBuilding = "RASHTRAPATI BHAVAN HQ"; // Global scope

function outerGate() {
  const wing = "North Wing - Staff Quarters"; // Outer function scope

  function innerChamber() {
    const room = "President's Study Room"; // Inner function scope

    // JS looks for each variable starting from innermost scope
    console.log(`Room: ${room}`);             // Found in inner
    console.log(`Wing: ${wing}`);             // Found in outer
    console.log(`Building: ${mainBuilding}`); // Found in global
  }

  innerChamber();
  // console.log(room); // ReferenceError — inner scope is not accessible from outer
}

console.log("\n=== Scope Chain ===");
outerGate();
// Output: Room: President's Study Room
// Output: Wing: North Wing - Staff Quarters
// Output: Building: RASHTRAPATI BHAVAN HQ


// --- Lexical Scope in Action ---

function createPassPermit(visitorName) {
  const prefix = "PERMIT";

  // This inner function "remembers" the scope where it was DEFINED
  return function () {
    return `${prefix}-${visitorName}-${Date.now()}`;
  };
}

const mehraPermit = createPassPermit("Mehra");
// Even though createPassPermit has returned, the inner function still
// has access to `prefix` and `visitorName` through lexical scope
console.log(mehraPermit());
// Output: PERMIT-Mehra-<timestamp>


// WHY: Variable shadowing occurs when a variable in an inner scope
// has the same name as one in an outer scope. The inner one "shadows"
// (hides) the outer one within that block.

// --- Variable Shadowing ---

console.log("\n=== Variable Shadowing ===");

const visitor = "Public Garden Visitor";

function staffQuarters() {
  const visitor = "Staff Member Sharma"; // Shadows the global `visitor`

  function presidentsOffice() {
    const visitor = "President's Secretary"; // Shadows staff quarters' `visitor`
    console.log("President's Office sees:", visitor);
  }

  console.log("Staff Quarters sees:", visitor);
  presidentsOffice();
}

console.log("Public Garden sees:", visitor);
staffQuarters();
console.log("Back in Public Garden:", visitor); // Global `visitor` was never modified

// Output: Public Garden sees: Public Garden Visitor
// Output: Staff Quarters sees: Staff Member Sharma
// Output: President's Office sees: President's Secretary
// Output: Back in Public Garden: Public Garden Visitor


// Shadowing with different keywords
let zoneAccess = "PUBLIC";

{
  let zoneAccess = "CLASSIFIED"; // Shadows the outer `zoneAccess`
  console.log("Inside block:", zoneAccess);
  // Output: Inside block: CLASSIFIED
}

console.log("Outside block:", zoneAccess);
// Output: Outside block: PUBLIC


// --- Dangerous Shadowing: Accidental Mutation ---

console.log("\n=== Accidental Mutation (no shadowing) ===");

var eventStatus = "pending"; // var in global scope

function updateEvent() {
  // Without `var`, `let`, or `const`, this modifies the GLOBAL variable!
  eventStatus = "complete";  // No declaration keyword = NOT shadowing
}

console.log("Before:", eventStatus);
// Output: Before: pending
updateEvent();
console.log("After:", eventStatus);
// Output: After: complete   <-- Global was mutated!


// Contrast with proper shadowing:
var eventPriority = "low";

function reclassify() {
  var eventPriority = "HIGH"; // `var` creates a NEW local variable — shadows global
  console.log("Inside reclassify:", eventPriority);
}

reclassify();
// Output: Inside reclassify: HIGH
console.log("Global priority:", eventPriority);
// Output: Global priority: low   <-- Global was NOT affected


// --- Summary Diagram ---

console.log("\n=== Scope Summary ===");
console.log(`
  +------------------------------------------------+
  |  GLOBAL SCOPE (bhavanName, etc.) - Mughal Garden|
  |  +--------------------------------------------+|
  |  |  FUNCTION SCOPE (privateQuarters, etc.)    ||
  |  |  Staff Quarters - only staff access        ||
  |  |  +----------------------------------------+||
  |  |  |  BLOCK SCOPE (if, for, etc.)           |||
  |  |  |  President's Office - special clearance |||
  |  |  |  let/const stay here                   |||
  |  |  |  var escapes to function/global        |||
  |  |  +----------------------------------------+||
  |  +--------------------------------------------+|
  +------------------------------------------------+
`);


// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. GLOBAL SCOPE: Variables accessible everywhere. Minimize what
//    you put here to avoid collisions.
// 2. FUNCTION SCOPE: Variables declared inside a function are
//    invisible outside — applies to var, let, and const.
// 3. BLOCK SCOPE: let and const are confined to { } blocks.
//    var ignores block scope and leaks to the enclosing function.
// 4. var HOISTING: Declaration hoisted, initialization is NOT.
//    Accessing before assignment gives `undefined`, not an error.
// 5. let/const TDZ: They exist from block start but cannot be
//    accessed until the declaration line — ReferenceError if you try.
// 6. Function declarations are fully hoisted (callable before
//    their line). Function expressions follow their variable's rules.
// 7. SCOPE CHAIN: JS resolves variables by walking up the lexical
//    scope chain — inner to outer, stopping at the first match.
// 8. SHADOWING: An inner variable with the same name hides the
//    outer one. Always use let/const to avoid accidental mutation.
// ============================================================
