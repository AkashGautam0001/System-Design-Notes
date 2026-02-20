/**
 * ============================================================
 *  FILE 6 : The Jaipur Block Printer — Prototype Pattern
 *  Topic : Prototype, Object.create, Prototypal Inheritance
 *  WHY THIS MATTERS:
 *    JavaScript is a prototype-based language at its core.
 *    Understanding prototypes unlocks how inheritance, cloning,
 *    and even ES6 classes really work under the hood. The
 *    Prototype pattern lets you create new objects by cloning
 *    existing ones, avoiding costly setup from scratch.
 * ============================================================
 */

// STORY: Artisan Meena runs a block-printing workshop in Jaipur where
// she carves master wooden blocks, then clones them to produce design
// variations — faster than carving each block from scratch every time.

"use strict";

// ────────────────────────────────────
// BLOCK 1: Prototype via Object.create and Manual Clone Methods
// ────────────────────────────────────

// WHY: Object.create lets you set up a prototype chain explicitly.
// Meena creates a master wooden block, then clones it to make variations.

const masterBlock = {
  material: "teak wood",
  ink: "none",
  describe() {
    return `${this.name || "Unnamed"} — material: ${this.material}, ink: ${this.ink}`;
  },
  // WHY: A clone method on the prototype lets any instance spawn copies
  clone() {
    const copy = Object.create(Object.getPrototypeOf(this));
    Object.getOwnPropertyNames(this).forEach((key) => {
      copy[key] = this[key];
    });
    return copy;
  },
};

// Meena carves the original paisley block
const originalBlock = Object.create(masterBlock);
originalBlock.name = "Meena's Paisley";
originalBlock.motifSize = 30;

console.log("--- Block 1: Prototype via Object.create ---");
console.log(originalBlock.describe()); // Output: Meena's Paisley — material: teak wood, ink: none

// WHY: clone() creates a new object with the same prototype and own properties
const clonedBlock = originalBlock.clone();
clonedBlock.name = "Cloned Paisley";
clonedBlock.ink = "indigo";

console.log(clonedBlock.describe()); // Output: Cloned Paisley — material: teak wood, ink: indigo
console.log("Original unchanged:", originalBlock.ink); // Output: Original unchanged: none

// WHY: The clone shares the prototype but has its own properties
console.log("Same prototype?", Object.getPrototypeOf(clonedBlock) === masterBlock); // Output: Same prototype? true
console.log("Are they same object?", originalBlock === clonedBlock); // Output: Are they same object? false

// Meena creates a floral block from the same master
const floralBlock = Object.create(masterBlock);
floralBlock.name = "Meena's Floral";
floralBlock.diameter = 20;
floralBlock.ink = "madder red";

console.log(floralBlock.describe()); // Output: Meena's Floral — material: teak wood, ink: madder red
console.log("Floral has motifSize?", floralBlock.motifSize); // Output: Floral has motifSize? undefined

// ────────────────────────────────────
// BLOCK 2: Deep Clone vs Shallow Clone
// ────────────────────────────────────

// WHY: Shallow clones only copy top-level properties. Nested objects
// are shared by reference. Meena learns this the hard way when editing
// a clone accidentally changes the original's embedded ink palette.

console.log("\n--- Block 2: Deep Clone vs Shallow Clone ---");

const blockDesign = {
  name: "Lotus Motif",
  dimensions: { width: 40, height: 60 },
  inkPalette: ["indigo", "turmeric yellow"],
};

// Shallow clone with Object.assign
const shallowCopy = Object.assign({}, blockDesign);
shallowCopy.name = "Lotus Copy";
shallowCopy.dimensions.height = 100; // Mutates the shared nested object!

console.log("Original height:", blockDesign.dimensions.height); // Output: Original height: 100
console.log("Shallow copy height:", shallowCopy.dimensions.height); // Output: Shallow copy height: 100
// WHY: Both point to the same dimensions object — this is the shallow clone trap

// Deep clone with JSON (simple but limited)
// WHY: JSON round-trip works for plain data but loses functions, Dates, undefined, etc.
const jsonClone = JSON.parse(JSON.stringify(blockDesign));
jsonClone.dimensions.height = 200;

console.log("After JSON clone mutation, original height:", blockDesign.dimensions.height); // Output: After JSON clone mutation, original height: 100
console.log("JSON clone height:", jsonClone.dimensions.height); // Output: JSON clone height: 200

// Deep clone with structuredClone (modern, built-in)
// WHY: structuredClone handles more types than JSON (Dates, Maps, Sets, etc.)
blockDesign.dimensions.height = 60; // reset for clarity
const structuredCopy = structuredClone(blockDesign);
structuredCopy.dimensions.height = 300;
structuredCopy.inkPalette.push("pomegranate red");

console.log("After structuredClone mutation, original height:", blockDesign.dimensions.height); // Output: After structuredClone mutation, original height: 60
console.log("Structured copy height:", structuredCopy.dimensions.height); // Output: Structured copy height: 300
console.log("Original ink palette:", blockDesign.inkPalette.join(", ")); // Output: Original ink palette: indigo, turmeric yellow
console.log("Structured copy ink palette:", structuredCopy.inkPalette.join(", ")); // Output: Structured copy ink palette: indigo, turmeric yellow, pomegranate red

// Manual recursive deep clone
// WHY: Full control — handles edge cases you define yourself
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => deepClone(item));
  const clone = {};
  for (const key of Object.keys(obj)) {
    clone[key] = deepClone(obj[key]);
  }
  return clone;
}

const manualClone = deepClone(blockDesign);
manualClone.name = "Manual Lotus";
manualClone.dimensions.width = 999;

console.log("Manual clone name:", manualClone.name); // Output: Manual clone name: Manual Lotus
console.log("Original name:", blockDesign.name); // Output: Original name: Lotus Motif
console.log("Original width:", blockDesign.dimensions.width); // Output: Original width: 40

// ────────────────────────────────────
// BLOCK 3: Prototype Chain, __proto__, Class as Syntactic Sugar
// ────────────────────────────────────

// WHY: ES6 classes are syntactic sugar over prototypes. Understanding
// the chain helps debug inheritance issues and use JavaScript idiomatically.

console.log("\n--- Block 3: Prototype Chain & Classes ---");

// Meena builds a hierarchy: FabricArt -> BlockPrint -> PaisleyPrint
function FabricArt(title) {
  this.title = title;
}
FabricArt.prototype.getTitle = function () {
  return `Art: ${this.title}`;
};

function BlockPrint(title, material) {
  FabricArt.call(this, title); // WHY: Borrow the parent constructor
  this.material = material;
}
// WHY: Setting up the prototype chain manually — this is what `extends` does
BlockPrint.prototype = Object.create(FabricArt.prototype);
BlockPrint.prototype.constructor = BlockPrint;
BlockPrint.prototype.getMaterial = function () {
  return `Material: ${this.material}`;
};

const meenaPaisley = new BlockPrint("Meena's Paisley", "teak wood");
console.log(meenaPaisley.getTitle()); // Output: Art: Meena's Paisley
console.log(meenaPaisley.getMaterial()); // Output: Material: teak wood
console.log("Is FabricArt?", meenaPaisley instanceof FabricArt); // Output: Is FabricArt? true
console.log("Is BlockPrint?", meenaPaisley instanceof BlockPrint); // Output: Is BlockPrint? true

// The exact same thing using ES6 class syntax
// WHY: class is syntactic sugar — the prototype chain underneath is identical
class FabricArtClass {
  constructor(title) {
    this.title = title;
  }
  getTitle() {
    return `Art: ${this.title}`;
  }
}

class BlockPrintClass extends FabricArtClass {
  constructor(title, material) {
    super(title);
    this.material = material;
  }
  getMaterial() {
    return `Material: ${this.material}`;
  }
}

const lakshmiFloral = new BlockPrintClass("Lakshmi's Floral", "sheesham wood");
console.log(lakshmiFloral.getTitle()); // Output: Art: Lakshmi's Floral
console.log(lakshmiFloral.getMaterial()); // Output: Material: sheesham wood

// Prove that class and function-based prototypes work the same way
console.log("Class-based proto chain:");
console.log("  Has own getTitle?", lakshmiFloral.hasOwnProperty("getTitle")); // Output:   Has own getTitle? false
console.log("  getTitle on prototype?", typeof BlockPrintClass.prototype.getTitle); // Output:   getTitle on prototype? function
console.log("  Proto of proto:", Object.getPrototypeOf(BlockPrintClass.prototype) === FabricArtClass.prototype); // Output:   Proto of proto: true

// Walking the prototype chain
// WHY: Every object's chain ends at null, passing through Object.prototype
let proto = Object.getPrototypeOf(lakshmiFloral);
const chain = [];
while (proto !== null) {
  chain.push(proto.constructor.name);
  proto = Object.getPrototypeOf(proto);
}
console.log("Prototype chain:", chain.join(" -> ")); // Output: Prototype chain: BlockPrintClass -> FabricArtClass -> Object

// ────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────
// 1. The Prototype pattern clones existing objects instead of constructing new ones
// 2. Object.create sets up prototype chains without calling a constructor
// 3. Shallow clones share nested references (ink palettes) — use deep clone for independence
// 4. structuredClone is the modern, built-in deep clone (handles most types)
// 5. ES6 classes are syntactic sugar over JavaScript's prototype-based inheritance
// 6. Every prototype chain ends at Object.prototype -> null
// 7. Understanding prototypes is essential for debugging instanceof and inheritance
