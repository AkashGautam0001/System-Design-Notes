/**
 * ============================================================
 *  FILE 24: The `new` Keyword and Constructor Functions
 * ============================================================
 *  Topic: How JavaScript creates objects using constructor
 *         functions and the `new` operator.
 *
 *  Why it matters: Before ES6 classes, constructors + `new`
 *  were THE way to create object blueprints. Understanding
 *  what `new` does under the hood helps you debug prototype
 *  chains, avoid accidental global pollution, and see that
 *  classes are just syntactic sugar over this mechanism.
 * ============================================================
 *
 *  STORY: Imagine a Tata Motors Factory. The constructor function
 *  is the assembly blueprint. Every time you press the big red
 *  `new` button, the factory stamps out a shiny new car with
 *  its own chassis number, but all cars share the same workshop
 *  tools (prototype methods).
 * ============================================================
 */

// ============================================================
//  EXAMPLE 1 — The Tata Motors Factory
// ============================================================

// WHY: Constructor functions are regular functions invoked
// with `new`. By convention they use PascalCase to signal
// "I'm a constructor — call me with new!"

// ----- The Blueprint -----
function TataCar(chassisNumber, modelName) {
  // Step 2 of `new`: `this` is bound to the fresh empty object.
  this.chassisNumber = chassisNumber;
  this.modelName = modelName;
  this.fuelLevel = 100;
  // Step 4: The object is returned automatically (no explicit return needed).
}

// Shared workshop tools — lives on the prototype, NOT on each instance.
TataCar.prototype.status = function () {
  return `Tata ${this.modelName} #${this.chassisNumber} | Fuel: ${this.fuelLevel}%`;
};

TataCar.prototype.drive = function (hours) {
  this.fuelLevel = Math.max(0, this.fuelLevel - hours * 10);
  return `Tata ${this.modelName} #${this.chassisNumber} driven ${hours}h. Fuel now ${this.fuelLevel}%`;
};

console.log("--- The Tata Motors Factory ---");
const car1 = new TataCar("MH-101", "Nexon");
const car2 = new TataCar("DL-202", "Harrier");

console.log(car1.status());
// Output: Tata Nexon #MH-101 | Fuel: 100%

console.log(car2.drive(3));
// Output: Tata Harrier #DL-202 driven 3h. Fuel now 70%

console.log(car1.status());
// Output: Tata Nexon #MH-101 | Fuel: 100%

// Both cars share the same `drive` method from the prototype.
console.log(car1.drive === car2.drive);
// Output: true

// ----- What `new` does — the 4 steps -----
// 1. Creates a brand-new empty object: {}
// 2. Links that object's [[Prototype]] to TataCar.prototype
// 3. Calls TataCar() with `this` bound to the new object
// 4. If the constructor doesn't explicitly return an object,
//    the new object is returned automatically.

// Manual simulation of `new TataCar("GJ-303", "Tiago")`:
console.log("\n--- Manual simulation of `new` ---");
const manualCar = Object.create(TataCar.prototype);   // Steps 1 & 2
TataCar.call(manualCar, "GJ-303", "Tiago");            // Step 3
// Step 4: we just use manualCar directly.
console.log(manualCar.status());
// Output: Tata Tiago #GJ-303 | Fuel: 100%


// ============================================================
//  EXAMPLE 2 — Gotchas, Guards, and Alternatives
// ============================================================

// WHY: Forgetting `new` causes `this` to be the global object
// (sloppy mode) or undefined (strict mode). That means your
// properties leak onto the global scope — or you get a crash.

// ----- 2a. Without `new` — accidental global pollution -----
console.log("\n--- Without `new` (sloppy mode) ---");

function FaultyCar(id) {
  // If called without `new`, `this` is global/undefined.
  this.id = id; // In sloppy mode: pollutes global!
}

// Simulating the mistake (we catch it so it doesn't pollute).
// FaultyCar("OOPS"); // DON'T do this in real code.
console.log("If called without `new`, this.id would leak to global scope.");
// Output: If called without `new`, this.id would leak to global scope.

// ----- 2b. Guarding with new.target -----
console.log("\n--- new.target guard ---");

function SafeCar(id, model) {
  if (!new.target) {
    // Caller forgot `new` — fix it for them.
    console.log("Warning: SafeCar called without `new`. Auto-correcting...");
    return new SafeCar(id, model);
  }
  this.id = id;
  this.model = model;
}

const oops = SafeCar("RJ-404", "Punch"); // no `new`!
// Output: Warning: SafeCar called without `new`. Auto-correcting...
console.log(oops.id, oops.model);
// Output: RJ-404 Punch

// ----- 2c. instanceof operator -----
console.log("\n--- instanceof ---");
console.log(car1 instanceof TataCar);
// Output: true
console.log(oops instanceof SafeCar);
// Output: true
console.log(car1 instanceof SafeCar);
// Output: false

// instanceof checks if TataCar.prototype exists anywhere in
// car1's prototype chain.

// ----- 2d. Factory functions vs constructors -----
console.log("\n--- Factory function alternative ---");

// WHY: Factory functions return plain objects — no `new`, no
// `this` confusion, no prototype gotchas. Trade-off: each
// instance gets its own copy of methods (more memory).

function createAutoRickshaw(id, route) {
  return {
    id,
    route,
    run() {
      return `Auto ${this.id} running on ${this.route} route`;
    },
  };
}

const auto1 = createAutoRickshaw("UP-1", "Lucknow-Kanpur");
const auto2 = createAutoRickshaw("UP-2", "Agra-Mathura");

console.log(auto1.run());
// Output: Auto UP-1 running on Lucknow-Kanpur route
console.log(auto2.run());
// Output: Auto UP-2 running on Agra-Mathura route

// No `new` needed, no `this` binding issues.
// But each auto has its OWN run() — not shared via prototype.
console.log(auto1.run === auto2.run);
// Output: false

// ----- Comparison table -----
//
//  Feature             | Constructor + new     | Factory function
//  --------------------|-----------------------|------------------
//  Invocation          | new TataCar()         | createAutoRickshaw()
//  `this` binding      | auto-bound by `new`   | not involved
//  Prototype methods   | shared (memory-lean)  | per-instance
//  instanceof works?   | yes                   | no
//  Forgetting `new`    | bugs!                 | no issue
// ------------------------------------------------------------


// ============================================================
//  KEY TAKEAWAYS
// ============================================================
// 1. Constructor functions are regular functions called with
//    `new`. Name them in PascalCase by convention.
// 2. `new` does 4 things: create empty obj, link prototype,
//    bind this, return the object.
// 3. Forgetting `new` causes global pollution (sloppy) or a
//    TypeError (strict). Use new.target to guard against it.
// 4. `instanceof` checks the prototype chain to verify if an
//    object was created by a particular constructor.
// 5. Factory functions are a simpler alternative — no `new`,
//    no `this`, but methods aren't shared via prototype.
// 6. ES6 classes are syntactic sugar over constructor + new;
//    the mechanics underneath are identical.
// ============================================================
