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
 *  STORY: Welcome to the Indian Army Regiment. Every jawan
 *  (soldier) who joins the regiment is enrolled through the
 *  Regiment's class blueprint. They get a name, a rank, and
 *  shared regimental methods — all stamped from the same template
 *  but each jawan is a unique instance.
 * ============================================================
 */

// ============================================================
//  EXAMPLE 1 — The Indian Army Regiment
// ============================================================

// WHY: The `class` keyword provides a clean, readable way to
// define constructors, methods, and (later) inheritance. Under
// the hood it's still prototypes — but the syntax is far
// friendlier for humans.

class Jawan {
  // The constructor runs when you call `new Jawan(...)`.
  constructor(name, rank) {
    // These are instance properties — each jawan gets their own.
    this.name = name;
    this.rank = rank;
    this.yearsOfService = 1;
    this.fitnessScore = 100;
  }

  // Methods defined here go on Jawan.prototype — shared.
  introduce() {
    return `${this.name} the ${this.rank} (Yrs:${this.yearsOfService}, Fitness: ${this.fitnessScore})`;
  }

  drill(hours) {
    const pointsGained = hours * 10;
    this.yearsOfService += Math.floor(pointsGained / 50);
    return `${this.name} drilled ${hours}h, gained ${pointsGained} pts. Now Yrs:${this.yearsOfService}`;
  }

  takeFatigue(amount) {
    this.fitnessScore = Math.max(0, this.fitnessScore - amount);
    return this.fitnessScore > 0
      ? `${this.name} took ${amount} fatigue. Fitness: ${this.fitnessScore}`
      : `${this.name} has collapsed from exhaustion!`;
  }
}

console.log("--- The Indian Army Regiment ---");

const soldier1 = new Jawan("Vikram", "Sepoy");
const soldier2 = new Jawan("Arjun", "Havildar");

console.log(soldier1.introduce());
// Output: Vikram the Sepoy (Yrs:1, Fitness: 100)

console.log(soldier2.introduce());
// Output: Arjun the Havildar (Yrs:1, Fitness: 100)

console.log(soldier1.drill(10));
// Output: Vikram drilled 10h, gained 100 pts. Now Yrs:3

console.log(soldier2.takeFatigue(35));
// Output: Arjun took 35 fatigue. Fitness: 65

// ----- Proof: methods live on the prototype, not the instance -----
console.log("\n--- Methods are on prototype ---");
console.log(soldier1.hasOwnProperty("name"));       // Output: true  (own property)
console.log(soldier1.hasOwnProperty("introduce"));   // Output: false (on prototype)
console.log(soldier1.introduce === soldier2.introduce); // Output: true (shared)

// WHY: Putting methods on the prototype means 1000 instances
// share ONE copy of each method, saving memory. Only data
// (name, rank, fitnessScore) is duplicated per instance.

// ----- Under the hood: class === function -----
console.log("\n--- class is syntactic sugar ---");
console.log(typeof Jawan);
// Output: function

console.log(Jawan.prototype.constructor === Jawan);
// Output: true

// The class body's methods are on Jawan.prototype:
console.log(Object.getOwnPropertyNames(Jawan.prototype));
// Output: [ 'constructor', 'introduce', 'drill', 'takeFatigue' ]


// ============================================================
//  EXAMPLE 2 — Class Expressions & `this` in Methods
// ============================================================

// WHY: Classes can also be assigned to variables (class
// expressions), and `this` in class methods follows the exact
// same rules as `this` everywhere else in JS.

// ----- Class expression -----
console.log("\n--- Class expression ---");

const DutyRoster = class {
  constructor() {
    this.duties = [];
  }

  post(dutyName, location) {
    this.duties.push({ dutyName, location });
    return `Duty posted: "${dutyName}" — Location: ${location}`;
  }

  list() {
    if (this.duties.length === 0) return "No duties assigned.";
    return this.duties
      .map((d, i) => `  ${i + 1}. ${d.dutyName} (${d.location})`)
      .join("\n");
  }
};

const roster = new DutyRoster();
console.log(roster.post("Border Patrol", "Siachen"));
// Output: Duty posted: "Border Patrol" — Location: Siachen

console.log(roster.post("Supply Escort", "Rajasthan"));
// Output: Duty posted: "Supply Escort" — Location: Rajasthan

console.log("Assigned duties:\n" + roster.list());
// Output: Assigned duties:
// Output:   1. Border Patrol (Siachen)
// Output:   2. Supply Escort (Rajasthan)

// ----- `this` gotcha: detaching a method -----
console.log("\n--- this in class methods (gotcha) ---");

const introduceVikram = soldier1.introduce;
// Detached from soldier1 — `this` is now undefined (strict mode,
// which classes enforce).
try {
  console.log(introduceVikram());
} catch (e) {
  console.log(`Error: ${e.message}`);
  // Output: Error: Cannot read properties of undefined (reading 'name')
}

// Fix 1: bind the method
const boundIntroduce = soldier1.introduce.bind(soldier1);
console.log(boundIntroduce());
// Output: Vikram the Sepoy (Yrs:3, Fitness: 100)

// Fix 2: Use an arrow function in the constructor (common in React)
class NewRecruit {
  constructor(name) {
    this.name = name;
    // Arrow function captures `this` from the constructor.
    this.salute = () => `${this.name} reporting for duty, Sir!`;
  }
}

const recruit = new NewRecruit("Deepak");
const detachedSalute = recruit.salute;
console.log(detachedSalute());
// Output: Deepak reporting for duty, Sir!

// Note: arrow-in-constructor means each instance gets its OWN
// copy of the method — not shared via prototype. Trade-off!
const recruit2 = new NewRecruit("Suresh");
console.log(recruit.salute === recruit2.salute);
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
