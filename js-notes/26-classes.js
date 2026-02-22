/**
 * ============================================================
 *  FILE 26: Classes in JavaScript
 * ============================================================
 *  Topic: The `class` syntax — syntactic sugar over
 *         prototypes and constructor functions.
 *
 *  Why it matters: Classes are the standard way to define
 *  blueprints for objects in modern JavaScript. They give you
 *  cleaner syntax for something JS has always done with
 *  prototypes, and they're the foundation for frameworks like
 *  React (class components) and every Node.js ORM.
 * ============================================================
 *
 *  STORY: Welcome to the IPL Cricket Academy. Every cricketer
 *  who joins the academy is enrolled through the Academy's
 *  class blueprint. They get a name, a role, and shared
 *  training methods — all stamped from the same template
 *  but each cricketer is a unique instance.
 * ============================================================
 */

// ============================================================
//  EXAMPLE 1 — The IPL Cricket Academy
// ============================================================

// WHY: The `class` keyword provides a clean, readable way to
// define constructors, methods, and (later) inheritance. Under
// the hood it's still prototypes — but the syntax is far
// friendlier for humans.

class Cricketer {
  // The constructor runs when you call `new Cricketer(...)`.
  constructor(name, role) {
    // These are instance properties — each cricketer gets their own.
    this.name = name;
    this.role = role;
    this.matchesPlayed = 0;
    this.stamina = 100;
  }

  // Methods defined here go on Cricketer.prototype — shared.
  introduce() {
    return `${this.name} the ${this.role} (Matches:${this.matchesPlayed}, Stamina: ${this.stamina})`;
  }

  practice(hours) {
    const runsScored = hours * 10;
    this.matchesPlayed += Math.floor(runsScored / 50);
    return `${this.name} practised ${hours}h, scored ${runsScored} runs. Now Matches:${this.matchesPlayed}`;
  }

  takeFatigue(amount) {
    this.stamina = Math.max(0, this.stamina - amount);
    return this.stamina > 0
      ? `${this.name} took ${amount} fatigue. Stamina: ${this.stamina}`
      : `${this.name} is completely exhausted — needs rest!`;
  }
}

console.log("--- The IPL Cricket Academy ---");

const player1 = new Cricketer("Virat", "Batsman");
const player2 = new Cricketer("Bumrah", "Bowler");

console.log(player1.introduce());
// Output: Virat the Batsman (Matches:0, Stamina: 100)

console.log(player2.introduce());
// Output: Bumrah the Bowler (Matches:0, Stamina: 100)

console.log(player1.practice(10));
// Output: Virat practised 10h, scored 100 runs. Now Matches:2

console.log(player2.takeFatigue(35));
// Output: Bumrah took 35 fatigue. Stamina: 65

// ----- Proof: methods live on the prototype, not the instance -----
console.log("\n--- Methods are on prototype ---");
console.log(player1.hasOwnProperty("name"));       // Output: true  (own property)
console.log(player1.hasOwnProperty("introduce"));   // Output: false (on prototype)
console.log(player1.introduce === player2.introduce); // Output: true (shared)

// WHY: Putting methods on the prototype means 1000 instances
// share ONE copy of each method, saving memory. Only data
// (name, role, stamina) is duplicated per instance.

// ----- Under the hood: class === function -----
console.log("\n--- class is syntactic sugar ---");
console.log(typeof Cricketer);
// Output: function

console.log(Cricketer.prototype.constructor === Cricketer);
// Output: true

// The class body's methods are on Cricketer.prototype:
console.log(Object.getOwnPropertyNames(Cricketer.prototype));
// Output: [ 'constructor', 'introduce', 'practice', 'takeFatigue' ]


// ============================================================
//  EXAMPLE 2 — Class Expressions & `this` in Methods
// ============================================================

// WHY: Classes can also be assigned to variables (class
// expressions), and `this` in class methods follows the exact
// same rules as `this` everywhere else in JS.

// ----- Class expression -----
console.log("\n--- Class expression ---");

const MatchSchedule = class {
  constructor() {
    this.matches = [];
  }

  add(opponent, venue) {
    this.matches.push({ opponent, venue });
    return `Match added: vs "${opponent}" — Venue: ${venue}`;
  }

  list() {
    if (this.matches.length === 0) return "No matches scheduled.";
    return this.matches
      .map((m, i) => `  ${i + 1}. vs ${m.opponent} (${m.venue})`)
      .join("\n");
  }
};

const schedule = new MatchSchedule();
console.log(schedule.add("Chennai Super Kings", "Wankhede"));
// Output: Match added: vs "Chennai Super Kings" — Venue: Wankhede

console.log(schedule.add("Kolkata Knight Riders", "Eden Gardens"));
// Output: Match added: vs "Kolkata Knight Riders" — Venue: Eden Gardens

console.log("Upcoming matches:\n" + schedule.list());
// Output: Upcoming matches:
// Output:   1. vs Chennai Super Kings (Wankhede)
// Output:   2. vs Kolkata Knight Riders (Eden Gardens)

// ----- `this` gotcha: detaching a method -----
console.log("\n--- this in class methods (gotcha) ---");

const introduceVirat = player1.introduce;
// Detached from player1 — `this` is now undefined (strict mode,
// which classes enforce).
try {
  console.log(introduceVirat());
} catch (e) {
  console.log(`Error: ${e.message}`);
  // Output: Error: Cannot read properties of undefined (reading 'name')
}

// Fix 1: bind the method
const boundIntroduce = player1.introduce.bind(player1);
console.log(boundIntroduce());
// Output: Virat the Batsman (Matches:2, Stamina: 100)

// Fix 2: Use an arrow function in the constructor (common in React)
class Debutant {
  constructor(name) {
    this.name = name;
    // Arrow function captures `this` from the constructor.
    this.walkOut = () => `${this.name} walks out to bat for the first time!`;
  }
}

const debutant1 = new Debutant("Shubman");
const detachedWalkOut = debutant1.walkOut;
console.log(detachedWalkOut());
// Output: Shubman walks out to bat for the first time!

// Note: arrow-in-constructor means each instance gets its OWN
// copy of the method — not shared via prototype. Trade-off!
const debutant2 = new Debutant("Yashasvi");
console.log(debutant1.walkOut === debutant2.walkOut);
// Output: false


// ============================================================
//  KEY TAKEAWAYS
// ============================================================
// 1. `class` is syntactic sugar over constructor functions and
//    prototypes. typeof MyClass === "function".
// 2. The constructor() method runs on `new MyClass(...)`. It
//    sets up instance-specific data.
// 3. Methods defined in the class body live on the prototype,
//    so all instances share them — memory efficient.
// 4. Classes always run in strict mode. Detaching a method
//    means `this` becomes undefined, not the global object.
// 5. Fix detached-method bugs with bind(), or define methods
//    as arrow functions in the constructor (at the cost of
//    per-instance copies).
// 6. Class expressions (const X = class { ... }) work just
//    like function expressions — useful for factories and
//    dynamic class creation.
// ============================================================
