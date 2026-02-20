// ============================================================
// FILE 13: Object Methods — The Curator's Toolkit
// Topic: Built-in Object static methods for inspection,
//        transformation, protection, and cloning
// Why: These methods turn raw objects into controlled, inspectable,
//      immutable data — essential for state management, APIs,
//      and defensive programming.
// ============================================================

// =============================================
// STORY: The National Museum of Delhi
// Curator Mehra ji manages a collection of priceless
// artifacts. He must catalog them, lock display
// cases, define access rules, and create perfect
// replicas. Each Object method is a tool in his
// curator's toolkit.
// =============================================


// =======================================================
// EXAMPLE BLOCK 1: Inspecting, Transforming & Protecting
// =======================================================

// WHY: Object.keys/values/entries are the standard way to iterate
// objects in modern JS. assign/freeze/seal control mutability.

const artifact = {
  name: "Kohinoor Replica",
  era: "Mughal",
  value: 500000,
  material: "carved ivory",
};

// --- Object.keys() — array of property names ---
console.log("--- Object.keys() ---");
const keys = Object.keys(artifact);
console.log(keys);
// Output: [ 'name', 'era', 'value', 'material' ]

// --- Object.values() — array of property values ---
console.log("\n--- Object.values() ---");
const values = Object.values(artifact);
console.log(values);
// Output: [ 'Kohinoor Replica', 'Mughal', 500000, 'carved ivory' ]

// --- Object.entries() — array of [key, value] pairs ---
console.log("\n--- Object.entries() ---");
const entries = Object.entries(artifact);
console.log(entries);
// Output: [
//   [ 'name', 'Kohinoor Replica' ],
//   [ 'era', 'Mughal' ],
//   [ 'value', 500000 ],
//   [ 'material', 'carved ivory' ]
// ]

// Great with for...of destructuring:
console.log("\nMuseum catalog card:");
for (const [key, val] of Object.entries(artifact)) {
  console.log(`  ${key}: ${val}`);
}
// Output:
//   name: Kohinoor Replica
//   era: Mughal
//   value: 500000
//   material: carved ivory

// --- Object.fromEntries() — reverse of Object.entries() ---
// WHY: Convert arrays of [key, value] pairs back into an object.
// Essential for transforming objects via map/filter on entries.
console.log("\n--- Object.fromEntries() ---");
const priceList = [
  ["Kohinoor Replica", 500000],
  ["Chola Bronze Nataraja", 300000],
  ["Ashoka Pillar Miniature", 50000],
];
const priceObject = Object.fromEntries(priceList);
console.log(priceObject);
// Output: { 'Kohinoor Replica': 500000, 'Chola Bronze Nataraja': 300000, 'Ashoka Pillar Miniature': 50000 }

// Transform: double all artifact values
const inflated = Object.fromEntries(
  Object.entries(artifact).map(([key, val]) =>
    key === "value" ? [key, val * 2] : [key, val]
  )
);
console.log(inflated);
// Output: { name: 'Kohinoor Replica', era: 'Mughal', value: 1000000, material: 'carved ivory' }

// Filter: keep only string-valued properties
const stringOnly = Object.fromEntries(
  Object.entries(artifact).filter(([, val]) => typeof val === "string")
);
console.log(stringOnly);
// Output: { name: 'Kohinoor Replica', era: 'Mughal', material: 'carved ivory' }


// --- Object.assign(target, ...sources) — merge objects ---
// WHY: Copies properties from source objects into a target.
// Commonly used for merging configs or creating shallow copies.
console.log("\n--- Object.assign() ---");

const baseStats = { rarity: "common", condition: "restored" };
const updatedArtifact = Object.assign({}, artifact, baseStats);
console.log(updatedArtifact);
// Output: {
//   name: 'Kohinoor Replica', era: 'Mughal', value: 500000,
//   material: 'carved ivory', rarity: 'common', condition: 'restored'
// }

// Note: later sources override earlier ones:
const override = Object.assign({}, { a: 1 }, { a: 2, b: 3 });
console.log(override);
// Output: { a: 2, b: 3 }

// CAUTION: assign mutates the target. Use {} as target to avoid this:
const target = { x: 1 };
Object.assign(target, { y: 2 });
console.log(target);
// Output: { x: 1, y: 2 }   <-- target was mutated


// --- Object.freeze() — make fully immutable (shallow) ---
// WHY: Prevents any changes — no adding, deleting, or modifying.
// Perfect for constants and config objects.
console.log("\n--- Object.freeze() ---");
const sealedDisplayCase = {
  artifact: "Kohinoor Replica",
  location: "Gallery A, Case 3",
  locked: true,
};

Object.freeze(sealedDisplayCase);

// Attempts to modify silently fail (or throw in strict mode):
sealedDisplayCase.location = "Gallery B";
sealedDisplayCase.newProp = "test";
delete sealedDisplayCase.locked;

console.log(sealedDisplayCase);
// Output: { artifact: 'Kohinoor Replica', location: 'Gallery A, Case 3', locked: true }
// Nothing changed!

console.log(Object.isFrozen(sealedDisplayCase));
// Output: true


// --- Object.seal() — can modify, but can't add/delete ---
// WHY: Seal when you want to allow edits to existing properties
// but prevent structural changes (new/deleted properties).
console.log("\n--- Object.seal() ---");
const catalogEntry = {
  id: "ART-001",
  description: "Mughal era ivory carving",
  verified: false,
};

Object.seal(catalogEntry);

// Can modify existing:
catalogEntry.verified = true;
console.log(catalogEntry.verified);
// Output: true

// Cannot add new:
catalogEntry.notes = "Needs restoration";
console.log(catalogEntry.notes);
// Output: undefined   (silently failed)

// Cannot delete:
delete catalogEntry.id;
console.log(catalogEntry.id);
// Output: ART-001   (still there)

console.log(Object.isSealed(catalogEntry));
// Output: true

// --- Object.is() — stricter equality ---
// WHY: Fixes the two edge cases where === lies:
// NaN === NaN is false (should be true)
// +0 === -0 is true (should be false for some math)
console.log("\n--- Object.is() ---");
console.log(NaN === NaN);
// Output: false
console.log(Object.is(NaN, NaN));
// Output: true

console.log(+0 === -0);
// Output: true
console.log(Object.is(+0, -0));
// Output: false

// For everything else, it works like ===:
console.log(Object.is(1, 1));
// Output: true
console.log(Object.is("hello", "hello"));
// Output: true
console.log(Object.is({}, {}));
// Output: false  (different references)


// =======================================================
// EXAMPLE BLOCK 2: Advanced — create, defineProperty,
//                  descriptors, structuredClone
// =======================================================

// WHY: Object.create sets up prototype chains manually.
// defineProperty gives fine-grained control over each property.
// structuredClone solves the deep copy problem once and for all.

// --- Object.create(proto) — create with a specific prototype ---
console.log("\n--- Object.create() ---");

const artifactPrototype = {
  describe() {
    return `${this.name} from the ${this.era} era (worth ₹${this.value})`;
  },
  appraise() {
    return this.value > 100000 ? "National treasure" : "Gallery piece";
  },
};

// Create a new artifact that inherits from artifactPrototype:
const dancingGirl = Object.create(artifactPrototype);
dancingGirl.name = "Dancing Girl of Mohenjo-daro";
dancingGirl.era = "Indus Valley";
dancingGirl.value = 750000;

console.log(dancingGirl.describe());
// Output: Dancing Girl of Mohenjo-daro from the Indus Valley era (worth ₹750000)
console.log(dancingGirl.appraise());
// Output: National treasure

// The methods live on the prototype, not the object itself:
console.log(dancingGirl.hasOwnProperty("describe"));
// Output: false
console.log(dancingGirl.hasOwnProperty("name"));
// Output: true


// --- Object.defineProperty() — fine-grained control ---
// WHY: Every property has hidden flags (descriptors) that control
// whether it can be written, enumerated, or deleted.
console.log("\n--- Object.defineProperty() ---");

const secureArtifact = { name: "Chola Bronze Nataraja" };

// Define a read-only property:
Object.defineProperty(secureArtifact, "catalogId", {
  value: "SEC-999",
  writable: false,      // cannot change the value
  enumerable: true,     // shows up in for...in and Object.keys()
  configurable: false,  // cannot delete or redefine
});

console.log(secureArtifact.catalogId);
// Output: SEC-999

secureArtifact.catalogId = "HACKED";
console.log(secureArtifact.catalogId);
// Output: SEC-999   (write silently failed)

// Define a hidden property (non-enumerable):
Object.defineProperty(secureArtifact, "_internalNotes", {
  value: "Suspected replica",
  writable: true,
  enumerable: false,     // hidden from keys/for...in
  configurable: true,
});

console.log(Object.keys(secureArtifact));
// Output: [ 'name', 'catalogId' ]   (_internalNotes is hidden!)

console.log(secureArtifact._internalNotes);
// Output: Suspected replica   (can still access directly)

// --- Object.defineProperties() — define multiple at once ---
console.log("\n--- Object.defineProperties() ---");

const vault = {};
Object.defineProperties(vault, {
  code: {
    value: "X-42-Z",
    writable: false,
    enumerable: true,
  },
  contents: {
    value: ["Pashupati Seal", "Gold Ornament"],
    writable: false,
    enumerable: true,
  },
  _secretChamber: {
    value: "Behind the Gandhara sculpture",
    enumerable: false,
  },
});

console.log(vault);
// Output: { code: 'X-42-Z', contents: [ 'Pashupati Seal', 'Gold Ornament' ] }
// _secretChamber is hidden


// --- Object.getOwnPropertyDescriptor() ---
console.log("\n--- Object.getOwnPropertyDescriptor() ---");
const desc = Object.getOwnPropertyDescriptor(secureArtifact, "catalogId");
console.log(desc);
// Output: {
//   value: 'SEC-999',
//   writable: false,
//   enumerable: true,
//   configurable: false
// }

// --- Object.getOwnPropertyNames() ---
// WHY: Unlike Object.keys(), this includes NON-ENUMERABLE own properties.
console.log("\n--- Object.getOwnPropertyNames() ---");
console.log(Object.keys(secureArtifact));
// Output: [ 'name', 'catalogId' ]

console.log(Object.getOwnPropertyNames(secureArtifact));
// Output: [ 'name', 'catalogId', '_internalNotes' ]
// Now we can see the hidden property!


// --- structuredClone() — deep copy ---
// WHY: Spread ({...obj}) and Object.assign() only do shallow copies.
// structuredClone() copies EVERYTHING deeply — no shared references.
console.log("\n--- structuredClone() ---");

const masterArtifact = {
  name: "Sarnath Buddha",
  properties: {
    material: "sandstone",
    weight: 9000,
    features: ["meditation pose", "dharma chakra mudra"],
  },
  discovery: new Date("1905-01-15"),
};

// Deep clone:
const replica = structuredClone(masterArtifact);

// Modify the replica's nested data:
replica.properties.weight = 1;
replica.properties.features.push("replica mark");
replica.name = "Sarnath Buddha (Replica)";

console.log("Original:", masterArtifact.name, masterArtifact.properties.weight);
// Output: Original: Sarnath Buddha 9000

console.log("Replica:", replica.name, replica.properties.weight);
// Output: Replica: Sarnath Buddha (Replica) 1

console.log("Original features:", masterArtifact.properties.features);
// Output: Original features: [ 'meditation pose', 'dharma chakra mudra' ]

console.log("Replica features:", replica.properties.features);
// Output: Replica features: [ 'meditation pose', 'dharma chakra mudra', 'replica mark' ]
// Completely independent!

// structuredClone handles dates, maps, sets, arrays, nested objects.
// It does NOT handle functions, DOM nodes, or symbols.
console.log(replica.discovery instanceof Date);
// Output: true   (dates are properly cloned!)


// ============================================================
// KEY TAKEAWAYS
// ------------------------------------------------------------
// 1. Object.keys/values/entries — the standard trio for
//    iterating objects. Returns arrays you can map/filter.
//
// 2. Object.fromEntries() reverses entries() — essential for
//    object transformation pipelines via entries().map().
//
// 3. Object.assign() merges objects (shallow, mutates target).
//    Use {} as target to avoid mutation: Object.assign({}, a, b).
//
// 4. Object.freeze() = fully immutable (no add/edit/delete).
//    Object.seal() = can edit existing, no add/delete.
//    Both are SHALLOW — nested objects are not affected.
//
// 5. Object.create(proto) creates objects with a specific
//    prototype — the manual way to set up inheritance.
//
// 6. defineProperty() gives per-property control:
//    writable (can change?), enumerable (visible in loops?),
//    configurable (can delete/redefine?).
//
// 7. Object.getOwnPropertyNames() includes non-enumerable
//    properties. Object.keys() only shows enumerable ones.
//
// 8. Object.is() is like === but correctly handles NaN and -0.
//
// 9. structuredClone() is THE answer for deep copying. No more
//    JSON.parse(JSON.stringify()) hacks. Handles dates, maps,
//    sets — but not functions or DOM nodes.
// ============================================================
