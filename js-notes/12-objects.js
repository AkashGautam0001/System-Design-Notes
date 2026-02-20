// ============================================================
// FILE 12: Objects — The Basics
// Topic: Creating, accessing, modifying, and iterating objects
// Why: Objects are THE fundamental building block in JavaScript.
//      Almost everything — arrays, functions, dates, errors —
//      is an object under the hood. Mastering them is non-negotiable.
// ============================================================

// =============================================
// STORY: The Cricket Player Profile Card
// You're building a player card for the IPL
// auction — every cricketer has stats, career
// records, and match history. Every player is
// an object; every stat is a property.
// =============================================


// =============================================
// SECTION 1: Object Literals & Computed Property Names
// =============================================

// WHY: Object literals {} are the most common way to create
// objects. Computed property names let you use dynamic keys.

// --- Basic object literal ---
const player = {
  name: "Virat Kohli",
  role: "Batsman",
  matches: 237,
  runs: 12000,
  average: 53.5,
  isActive: true,
};

console.log(player);
// Output: {
//   name: 'Virat Kohli',
//   role: 'Batsman',
//   matches: 237,
//   runs: 12000,
//   average: 53.5,
//   isActive: true
// }

// --- Computed property names ---
// Use brackets [] around a key to compute it from an expression.
const statName = "centuries";
const statValue = 43;

const dynamicStats = {
  [statName]: statValue,
  [`${statName}InTests`]: Math.floor(statValue / 2),
};

console.log(dynamicStats);
// Output: { centuries: 43, centuriesInTests: 21 }

// Useful for building objects from variables:
const format1 = "ODI";
const format2 = "T20I";
const formatMatches = {
  [format1]: 275,
  [format2]: 115,
};
console.log(formatMatches);
// Output: { ODI: 275, T20I: 115 }


// =============================================
// SECTION 2: Accessing Properties — Dot vs Bracket
// =============================================

// WHY: Dot notation is cleaner but limited. Bracket notation
// handles dynamic keys, special characters, and variables.

// --- Dot notation (preferred when key is a valid identifier) ---
console.log(player.name);
// Output: Virat Kohli
console.log(player.matches);
// Output: 237

// --- Bracket notation (required for dynamic keys) ---
console.log(player["role"]);
// Output: Batsman

// Dynamic access:
const prop = "runs";
console.log(player[prop]);
// Output: 12000

// Keys with spaces or special characters need brackets:
const specialRecord = {
  "full name": "Mahendra Singh Dhoni",
  "strike-rate": 135.2,
  7: "jersey number",
};
console.log(specialRecord["full name"]);
// Output: Mahendra Singh Dhoni
console.log(specialRecord["strike-rate"]);
// Output: 135.2
console.log(specialRecord[7]);
// Output: jersey number


// =============================================
// SECTION 3: Adding & Deleting Properties
// =============================================

// WHY: JavaScript objects are dynamic — you can add or remove
// properties at any time. This flexibility is both powerful and risky.

const allRounder = { name: "Hardik Pandya", role: "All-Rounder", matches: 92 };

// --- Adding properties ---
allRounder.battingAvg = 29.5;
allRounder["bowlingAvg"] = 33.1;
console.log(allRounder);
// Output: {
//   name: 'Hardik Pandya',
//   role: 'All-Rounder',
//   matches: 92,
//   battingAvg: 29.5,
//   bowlingAvg: 33.1
// }

// --- Deleting properties ---
delete allRounder.bowlingAvg;
console.log(allRounder.bowlingAvg);
// Output: undefined
console.log(allRounder);
// Output: { name: 'Hardik Pandya', role: 'All-Rounder', matches: 92, battingAvg: 29.5 }

// delete returns true even if the property didn't exist:
console.log(delete allRounder.nonExistent);
// Output: true


// =============================================
// SECTION 4: Shorthand Properties & Methods
// =============================================

// WHY: ES6 shorthands reduce boilerplate when property names
// match variable names, and when defining methods on objects.

// --- Shorthand properties ---
const name = "Jasprit Bumrah";
const playerRole = "Bowler";
const wickets = 145;

// Old way:
// const bowler = { name: name, playerRole: playerRole, wickets: wickets };

// Shorthand (when variable name matches property name):
const bowler = { name, playerRole, wickets };
console.log(bowler);
// Output: { name: 'Jasprit Bumrah', playerRole: 'Bowler', wickets: 145 }

// --- Shorthand methods ---
const batsman = {
  name: "Virat",
  stamina: 100,

  // Old way:
  // playShot: function(shotType) { ... }

  // Shorthand method syntax:
  playShot(shotType) {
    this.stamina -= 10;
    return `${this.name} plays ${shotType}! (Stamina: ${this.stamina})`;
  },

  // Getter — accessed like a property, not a function call
  get form() {
    return this.stamina > 50 ? "In Form" : "Tired";
  },
};

console.log(batsman.playShot("Cover Drive"));
// Output: Virat plays Cover Drive! (Stamina: 90)
console.log(batsman.form);
// Output: In Form


// =============================================
// SECTION 5: Property Existence Checks
// =============================================

// WHY: Checking if a property exists prevents "undefined" bugs.
// There are two ways, and they behave differently with inherited properties.

const fielder = {
  name: "Ravindra Jadeja",
  catches: 85,
  runOuts: undefined,  // explicitly set to undefined
};

// --- "in" operator — checks own AND inherited properties ---
console.log("name" in fielder);
// Output: true
console.log("runOuts" in fielder);
// Output: true   (it exists, even though value is undefined!)
console.log("wickets" in fielder);
// Output: false

// "in" also finds inherited properties:
console.log("toString" in fielder);
// Output: true   (inherited from Object.prototype)

// --- .hasOwnProperty() — checks OWN properties only ---
console.log(fielder.hasOwnProperty("name"));
// Output: true
console.log(fielder.hasOwnProperty("toString"));
// Output: false  (inherited, not own)

// Safer modern alternative: Object.hasOwn() (ES2022)
console.log(Object.hasOwn(fielder, "catches"));
// Output: true
console.log(Object.hasOwn(fielder, "toString"));
// Output: false

// --- Comparing to undefined (NOT recommended) ---
// This fails when a property is explicitly set to undefined:
console.log(fielder.runOuts !== undefined);
// Output: false   <-- WRONG! The property exists!
console.log("runOuts" in fielder);
// Output: true    <-- Correct!


// =============================================
// SECTION 6: for...in Loop
// =============================================

// WHY: for...in iterates over all ENUMERABLE properties (own + inherited).
// Useful for objects, but be careful with inherited properties.

const captain = {
  name: "Rohit Sharma",
  role: "Opener",
  matches: 264,
  centuries: 48,
};

console.log("\n--- for...in loop ---");
for (const key in captain) {
  console.log(`  ${key}: ${captain[key]}`);
}
// Output:
//   name: Rohit Sharma
//   role: Opener
//   matches: 264
//   centuries: 48

// Filter to own properties only (best practice):
console.log("\n--- for...in with hasOwnProperty guard ---");
for (const key in captain) {
  if (Object.hasOwn(captain, key)) {
    console.log(`  [own] ${key}: ${captain[key]}`);
  }
}
// Output: same as above (captain has no inherited enumerable props)

// NOTE: for...in does NOT guarantee order for numeric keys.
// For arrays, always use for...of, forEach, or standard for loops.


// =============================================
// SECTION 7: Nested Objects
// =============================================

// WHY: Real-world data is deeply nested. Player profiles, API
// responses, config files — all have objects inside objects.

const playerCard = {
  name: "Virat Kohli",
  jerseyNumber: 18,
  career: {
    ODI: {
      matches: 275,
      runs: 13848,
      average: 57.32,
    },
    Test: {
      matches: 113,
      runs: 8848,
      average: 48.03,
    },
  },
  iplTeam: {
    name: "Royal Challengers Bengaluru",
    seasons: 17,
    awards: ["Orange Cap 2016", "MVP 2016", "IPL Icon"],
  },
  skills: ["Cover Drive", "Flick", "Chase Master"],
};

// Access nested values:
console.log("\n--- Nested access ---");
console.log(playerCard.career.ODI.average);
// Output: 57.32

console.log(playerCard.iplTeam.name);
// Output: Royal Challengers Bengaluru

console.log(playerCard.iplTeam.awards[1]);
// Output: MVP 2016

// Modify nested values:
playerCard.career.Test.runs += 200;  // Great series!
console.log(playerCard.career.Test.runs);
// Output: 9048

// Add nested properties:
playerCard.iplTeam.coach = { name: "Andy Flower", since: 2024 };
console.log(playerCard.iplTeam.coach);
// Output: { name: 'Andy Flower', since: 2024 }

// Safe access with optional chaining (preview from File 09):
console.log(playerCard.career.T20I?.average);
// Output: undefined   (T20I doesn't exist, no crash)


// =============================================
// SECTION 8: Object References & Comparison
// =============================================

// WHY: This is one of the BIGGEST gotchas in JavaScript.
// Objects are stored by REFERENCE, not by value. Two objects
// with identical content are NOT equal.

// --- Reference assignment (NOT a copy) ---
const originalPlayer = { name: "Virat", matches: 237 };
const playerAlias = originalPlayer;  // SAME object, different variable name

playerAlias.matches = 240;
console.log("\n--- References ---");
console.log(originalPlayer.matches);
// Output: 240   <-- BOTH changed because they point to the SAME object!

// --- Comparison ---
const playerA = { name: "Virat", matches: 237 };
const playerB = { name: "Virat", matches: 237 };
const playerC = playerA;

console.log(playerA === playerB);
// Output: false  (different objects in memory, even with same content)

console.log(playerA === playerC);
// Output: true   (same reference)

console.log(playerA == playerB);
// Output: false  (== doesn't help either for objects)

// --- Shallow copy with spread ---
const playerCopy = { ...originalPlayer };
playerCopy.matches = 300;
console.log(originalPlayer.matches);
// Output: 240   (original NOT affected — it's a separate object now)
console.log(playerCopy.matches);
// Output: 300

// CAUTION: Spread only copies one level deep (shallow copy).
// Nested objects are still shared references:
const deepPlayer = {
  name: "Virat",
  career: { ODIRuns: 13848, testRuns: 8848 },
};
const shallowCopy = { ...deepPlayer };
shallowCopy.career.testRuns = 0;
console.log(deepPlayer.career.testRuns);
// Output: 0   <-- Both changed! The nested object is shared.

// For deep copies, use structuredClone() (covered in File 13):
const deepCopy = structuredClone(deepPlayer);
deepCopy.career.ODIRuns = 99999;
console.log(deepPlayer.career.ODIRuns);
// Output: 13848   (original preserved — truly independent copy)


// ============================================================
// KEY TAKEAWAYS
// ------------------------------------------------------------
// 1. Object literals {} are the standard way to create objects.
//    Computed property names [expr] allow dynamic keys.
//
// 2. Dot notation (obj.key) is cleaner; bracket notation
//    (obj["key"]) is needed for dynamic/special keys.
//
// 3. Objects are dynamic — add properties with assignment,
//    remove with delete.
//
// 4. ES6 shorthands: { name } instead of { name: name },
//    and method() {} instead of method: function() {}.
//
// 5. Property existence: use "in" (own + inherited) or
//    Object.hasOwn() (own only). Don't compare to undefined.
//
// 6. for...in iterates enumerable properties. Guard with
//    Object.hasOwn() for own-only iteration.
//
// 7. Objects are stored BY REFERENCE. Assignment copies the
//    reference, not the data. Two identical objects are NOT
//    equal (=== compares references, not content).
//
// 8. Spread { ...obj } is a shallow copy. For deep copies,
//    use structuredClone().
// ============================================================
