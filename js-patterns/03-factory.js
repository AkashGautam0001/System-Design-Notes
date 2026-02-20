/**
 * ============================================================
 *  FILE 3 : Ramesh Bhaiya's Chai Tapri - Factory Pattern
 *  Topic  : Simple Factory, Factory Method
 *  WHY THIS MATTERS:
 *    Factories decouple object creation from object use.
 *    The caller says WHAT it needs, not HOW to build it.
 *    This makes code easier to extend (add new types) without
 *    changing existing logic — the Open/Closed Principle.
 * ============================================================
 */

// STORY: Ramesh bhaiya makes different chai types at his legendary
//        tapri.  Customers simply name what they need — Ramesh
//        bhaiya handles the rest.

console.log("=== FILE 03: Ramesh Bhaiya's Chai Tapri ===\n");

// ────────────────────────────────────
// BLOCK 1 — Simple Factory Function
// ────────────────────────────────────

// WHY: A Simple Factory is just a function that returns different
//      objects based on a parameter.  No inheritance involved.
//      Great for eliminating scattered `if/else` or `switch`
//      blocks throughout your codebase.

function makeChai(type, name) {
  const base = { name, madeBy: "Ramesh bhaiya" };

  switch (type) {
    case "masala":
      return { ...base, type: "masala", strength: 8, sugar: 3, spice: 9, price: 15 };
    case "cutting":
      return { ...base, type: "cutting", strength: 7, sugar: 4, spice: 3, price: 10 };
    case "kulhad":
      return { ...base, type: "kulhad", strength: 9, sugar: 5, spice: 6, price: 20, vessel: "kulhad" };
    default:
      throw new Error(`Ramesh bhaiya cannot make unknown chai: ${type}`);
  }
}

const adrakWali = makeChai("masala", "Adrak Special");
const halfCup = makeChai("cutting", "Tapri Cutting");
const kulhadChai = makeChai("kulhad", "Banaras Kulhad");

console.log("Masala:", adrakWali.name, "| strength:", adrakWali.strength);      // Output: Masala: Adrak Special | strength: 8
console.log("Cutting:", halfCup.name, "| price: ₹" + halfCup.price);          // Output: Cutting: Tapri Cutting | price: ₹10
console.log("Kulhad:", kulhadChai.name, "| vessel:", kulhadChai.vessel);        // Output: Kulhad: Banaras Kulhad | vessel: kulhad

// WHY: The caller never worries about construction details.
//      Adding a "sulaimani" type only requires editing the factory.

// Handling unknown types gracefully
try {
  makeChai("bubble", "Mystery");
} catch (err) {
  console.log("Error:", err.message); // Output: Error: Ramesh bhaiya cannot make unknown chai: bubble
}

// ────────────────────────────────────
// BLOCK 2 — Factory Method Using Classes
// ────────────────────────────────────

// WHY: The Factory Method pattern uses inheritance so that
//      subclasses decide which class to instantiate.  The base
//      class defines the workflow; subclasses supply the product.

console.log("\n--- Factory Method (Class-Based) ---");

class Chai {
  constructor(name, strength, sugar, spice, price) {
    this.name = name;
    this.strength = strength;
    this.sugar = sugar;
    this.spice = spice;
    this.price = price;
  }

  describe() {
    return `${this.name} [str:${this.strength} sug:${this.sugar} spi:${this.spice} ₹${this.price}]`;
  }
}

class MasalaChai extends Chai {
  constructor(name) {
    super(name, 8, 3, 9, 15);
    this.type = "masala";
  }
}

class CuttingChai extends Chai {
  constructor(name) {
    super(name, 7, 4, 3, 10);
    this.type = "cutting";
  }
}

// WHY: The abstract tapri defines the template; each concrete
//      tapri overrides `createChai` — the Factory Method.

class ChaiTapri {
  // Factory Method — subclasses MUST override this
  createChai(name) {
    throw new Error("Subclass must implement createChai");
  }

  // Template method that uses the factory method
  order(name) {
    const chai = this.createChai(name);
    console.log(`Ramesh bhaiya brewed a ${chai.type}: ${chai.describe()}`);
    return chai;
  }
}

class MasalaChaiTapri extends ChaiTapri {
  createChai(name) {
    return new MasalaChai(name);
  }
}

class CuttingChaiTapri extends ChaiTapri {
  createChai(name) {
    return new CuttingChai(name);
  }
}

const masalaCounter = new MasalaChaiTapri();
const cuttingCounter = new CuttingChaiTapri();

masalaCounter.order("Elaichi Masala");    // Output: Ramesh bhaiya brewed a masala: Elaichi Masala [str:8 sug:3 spi:9 ₹15]
cuttingCounter.order("Mumbai Cutting");   // Output: Ramesh bhaiya brewed a cutting: Mumbai Cutting [str:7 sug:4 spi:3 ₹10]

// WHY: Adding a new chai type means adding a new subclass —
//      existing tapri code stays untouched (Open/Closed Principle).

// ────────────────────────────────────
// BLOCK 3 — Factory with Registration (Dynamic Types)
// ────────────────────────────────────

// WHY: A registration-based factory lets you add new types at
//      runtime without editing the factory itself.  Third-party
//      plugins can register their own product types.

console.log("\n--- Registered Factory ---");

class ChaiRegistry {
  constructor() {
    this.creators = new Map();
  }

  // WHY: `register` opens the factory to extension.
  //      Any code anywhere can add new chai types.
  register(type, creatorFn) {
    this.creators.set(type, creatorFn);
    console.log(`Ramesh bhaiya learned to brew: ${type}`);
  }

  create(type, name) {
    const creator = this.creators.get(type);
    if (!creator) {
      throw new Error(`Unknown chai type: ${type}`);
    }
    return creator(name);
  }

  listTypes() {
    return [...this.creators.keys()];
  }
}

const registry = new ChaiRegistry();

// Register built-in types
registry.register("masala", (name) => new MasalaChai(name));        // Output: Ramesh bhaiya learned to brew: masala
registry.register("cutting", (name) => new CuttingChai(name));      // Output: Ramesh bhaiya learned to brew: cutting

// Simulate a "plugin" adding a new type at runtime
registry.register("sulaimani", (name) => ({                          // Output: Ramesh bhaiya learned to brew: sulaimani
  name,
  type: "sulaimani",
  strength: 6,
  sugar: 2,
  spice: 4,
  price: 25,
  describe() {
    return `${this.name} [str:${this.strength} spi:${this.spice} ₹${this.price}]`;
  },
}));

const myMasala = registry.create("masala", "Kadak Masala");
const mySulaimani = registry.create("sulaimani", "Kerala Sulaimani");

console.log("Created:", myMasala.describe());      // Output: Created: Kadak Masala [str:8 sug:3 spi:9 ₹15]
console.log("Created:", mySulaimani.describe());   // Output: Created: Kerala Sulaimani [str:6 spi:4 ₹25]
console.log("Available:", registry.listTypes());   // Output: Available: [ 'masala', 'cutting', 'sulaimani' ]

// WHY: The registry never changed when we added "sulaimani".
//      This is the Open/Closed Principle in action.

// Demonstrate error on unregistered type
try {
  registry.create("latte", "Fancy Latte");
} catch (err) {
  console.log("Error:", err.message); // Output: Error: Unknown chai type: latte
}

// ────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────
// 1. A Simple Factory is a function that returns different objects
//    based on a parameter — the easiest factory to implement.
// 2. The Factory Method pattern uses inheritance: subclasses
//    override a creation method while the base defines workflow.
// 3. Registration-based factories allow runtime extension without
//    modifying factory source code (Open/Closed Principle).
// 4. Factories centralise creation logic, eliminating scattered
//    `new` calls and `switch` statements throughout the codebase.
// 5. When you find yourself writing `if type === 'x' new X()`
//    in multiple places, it is time for a factory.

console.log("\n=== Ramesh bhaiya washes the kettle. Another day of fine chai. ===");
// Output: === Ramesh bhaiya washes the kettle. Another day of fine chai. ===
