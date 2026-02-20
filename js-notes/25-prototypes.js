/**
 * ============================================================
 *  FILE 25: Prototypes and the Prototype Chain
 * ============================================================
 *  Topic: How JavaScript objects delegate property lookups
 *         through the prototype chain.
 *
 *  Why it matters: Prototypes are the backbone of JavaScript's
 *  object model. Every time you call a method on an array, a
 *  string, or any object, the engine walks the prototype chain
 *  to find it. Understanding this unlocks inheritance,
 *  performance tuning, and the ability to read any JS library.
 * ============================================================
 *
 *  STORY: The Kapoor Khandaan (family). Grandfather Prithviraj
 *  knows ancient family recipes. Father Raj inherits those
 *  recipes and adds his own business skills. Son Ranbir inherits
 *  everything and picks up filmmaking. When someone asks Ranbir
 *  to cook a traditional dish, he doesn't know it himself — he
 *  walks up the family tree until he finds Prithviraj, who does.
 * ============================================================
 */

// ============================================================
//  EXAMPLE 1 — The Kapoor Khandaan (Family Tree)
// ============================================================

// WHY: Property lookup in JS works by delegation. If an object
// doesn't have a property, the engine checks its prototype,
// then that prototype's prototype, and so on up to null.

const prithviraj = {
  name: "Prithviraj",
  generation: "grandfather",
  cookTraditionalDish() {
    return `${this.name} cooks an ancient family recipe!`;
  },
};

// Raj's prototype is Prithviraj.
const raj = Object.create(prithviraj);
raj.name = "Raj";
raj.generation = "father";
raj.runBusiness = function () {
  return `${this.name} runs the family business!`;
};

// Ranbir's prototype is Raj.
const ranbir = Object.create(raj);
ranbir.name = "Ranbir";
ranbir.generation = "son";
ranbir.makeFilm = function () {
  return `${this.name} directs a blockbuster film!`;
};

console.log("--- The Kapoor Khandaan (Family Tree) ---");

// Ranbir has his own skill:
console.log(ranbir.makeFilm());
// Output: Ranbir directs a blockbuster film!

// Ranbir doesn't have runBusiness — walks up to Raj:
console.log(ranbir.runBusiness());
// Output: Ranbir runs the family business!

// Ranbir doesn't have cookTraditionalDish — walks up past Raj to Prithviraj:
console.log(ranbir.cookTraditionalDish());
// Output: Ranbir cooks an ancient family recipe!

// The chain: ranbir -> raj -> prithviraj -> Object.prototype -> null
console.log(Object.getPrototypeOf(ranbir) === raj);
// Output: true
console.log(Object.getPrototypeOf(raj) === prithviraj);
// Output: true
console.log(Object.getPrototypeOf(prithviraj) === Object.prototype);
// Output: true
console.log(Object.getPrototypeOf(Object.prototype));
// Output: null


// ============================================================
//  EXAMPLE 2 — __proto__ vs .prototype, and Own vs Inherited
// ============================================================

// WHY: Confusing __proto__ with .prototype is the #1 prototype
// misconception. They are different things:
//   - __proto__    : exists on every object; points to its prototype
//   - .prototype   : exists only on functions; is the object that
//                    will become __proto__ of instances made with `new`

console.log("\n--- __proto__ vs .prototype ---");

function Pahalwan(name) {
  this.name = name;
}
Pahalwan.prototype.warCry = function () {
  return `${this.name}: "Jai Bajrang Bali!"`;
};

const bheem = new Pahalwan("Bheem");

// bheem.__proto__ points to Pahalwan.prototype
console.log(Object.getPrototypeOf(bheem) === Pahalwan.prototype);
// Output: true

// Pahalwan.prototype is the shared bag of methods:
console.log(bheem.warCry());
// Output: Bheem: "Jai Bajrang Bali!"

// ----- hasOwnProperty vs `in` -----
console.log("\n--- hasOwnProperty vs in ---");

console.log(bheem.hasOwnProperty("name"));       // Output: true  (own)
console.log(bheem.hasOwnProperty("warCry"));      // Output: false (inherited)

console.log("name" in bheem);                     // Output: true  (own)
console.log("warCry" in bheem);                   // Output: true  (found up the chain)
console.log("toString" in bheem);                 // Output: true  (from Object.prototype)

// ----- Listing own vs all properties -----
console.log("\n--- Own keys vs all enumerable keys ---");
console.log("Object.keys(bheem):", Object.keys(bheem));
// Output: Object.keys(bheem): [ 'name' ]

const allKeys = [];
for (const key in bheem) {
  allKeys.push(key);
}
console.log("for...in bheem:", allKeys);
// Output: for...in bheem: [ 'name', 'warCry' ]


// ============================================================
//  EXAMPLE 3 — Prototype Inheritance in Practice
// ============================================================

// WHY: Object.create() gives you clean prototypal inheritance
// without the ceremony of constructor functions. It's the
// purest form of JavaScript's delegation model.

console.log("\n--- Prototype inheritance with Object.create() ---");

const familyTraditions = {
  greet() {
    return `${this.name} says Namaste from generation: ${this.generation}`;
  },
  describe() {
    return `${this.name} — known skills: ${(this.skills || []).join(", ")}`;
  },
};

const ancestor = Object.create(familyTraditions);
ancestor.name = "Kapoor Ancestor";
ancestor.generation = 1;
ancestor.skills = ["classical music"];

const descendant = Object.create(ancestor);
descendant.name = "Kapoor Descendant";
descendant.generation = 4;
descendant.skills = ["classical music", "acting", "filmmaking"];

console.log(ancestor.greet());
// Output: Kapoor Ancestor says Namaste from generation: 1
console.log(descendant.greet());
// Output: Kapoor Descendant says Namaste from generation: 4
console.log(descendant.describe());
// Output: Kapoor Descendant — known skills: classical music, acting, filmmaking

// ----- Property shadowing -----
console.log("\n--- Property shadowing ---");

// descendant has its own `name` which shadows ancestor's `name`.
console.log(descendant.name);
// Output: Kapoor Descendant
// Delete descendant's own `name` to reveal the inherited one:
delete descendant.name;
console.log(descendant.name);
// Output: Kapoor Ancestor
// Restore it:
descendant.name = "Kapoor Descendant";

// ----- Modifying built-in prototypes (DON'T) -----
console.log("\n--- Modifying built-in prototypes (warning) ---");

// You CAN do this:
// Array.prototype.last = function () { return this[this.length - 1]; };
// console.log([1, 2, 3].last()); // 3
//
// But you SHOULD NOT because:
// 1. It affects ALL arrays everywhere in your program.
// 2. It can clash with future JS features or other libraries.
// 3. It breaks for...in enumeration on arrays.
//
// The only acceptable case: polyfilling a standard method
// that older engines don't support.

console.log("Rule: Never modify built-in prototypes in production code.");
// Output: Rule: Never modify built-in prototypes in production code.

// ----- Object.setPrototypeOf() -----
console.log("\n--- Object.setPrototypeOf() ---");

const cookingSkills = {
  makeBiryani() {
    return `${this.name} makes Hyderabadi Biryani!`;
  },
};

const youngOne = { name: "Chhotu Kapoor" };

// Dynamically set youngOne's prototype to cookingSkills.
Object.setPrototypeOf(youngOne, cookingSkills);
console.log(youngOne.makeBiryani());
// Output: Chhotu Kapoor makes Hyderabadi Biryani!

// NOTE: Object.setPrototypeOf() works but is SLOW.
// Prefer Object.create() when possible.


// ============================================================
//  KEY TAKEAWAYS
// ============================================================
// 1. Every object has an internal [[Prototype]] link. Property
//    lookups walk this chain until the property is found or
//    null is reached.
// 2. __proto__ (or Object.getPrototypeOf) is the actual link
//    on an instance. .prototype is a property on functions
//    that becomes __proto__ of objects created with `new`.
// 3. hasOwnProperty() checks ONLY the object itself. The `in`
//    operator checks the entire prototype chain.
// 4. Object.create(proto) creates an object with `proto` as
//    its prototype — the cleanest way to set up inheritance.
// 5. Property shadowing: setting a property on a child hides
//    the inherited one without modifying the parent.
// 6. Never modify built-in prototypes (Array.prototype, etc.)
//    in production — it causes collisions and subtle bugs.
// 7. Object.setPrototypeOf() works but is slow; prefer
//    Object.create() or class extends.
// ============================================================
