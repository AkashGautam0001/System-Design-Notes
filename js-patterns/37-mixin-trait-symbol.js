/**
 * ============================================================
 *  FILE 37 : Mixin, Trait & Symbol-based Protocol
 *  Topic   : Mixin, Trait, Symbol-based Protocol
 *  WHY THIS MATTERS:
 *  JavaScript has single inheritance, but real objects often
 *  need behavior from multiple sources. Mixins compose abilities.
 *  Traits add conflict detection. Symbol-based protocols let
 *  objects participate in language-level contracts (iteration,
 *  coercion) while keeping internals private.
 * ============================================================
 */
// STORY: Vaidya Sharma the Ayurveda practitioner combines herbal essences —
// ashwagandha, tulsi, brahmi — into powerful medicines, and stamps them
// with hidden prescription marks (Symbols) that only the vaidya can read.

// ────────────────────────────────────────────────────────────
//  BLOCK 1 — Mixins
// ────────────────────────────────────────────────────────────
// WHY: Mixins inject shared behavior into classes without deep
//      inheritance chains. Sharma mixes dosha essences to create formulations.
console.log("=== BLOCK 1: Mixins ===");

// --- 1a. Object.assign-based mixin ---
const VataEssence = {
  balanceVata() { return `${this.name} calms vata dosha`; },
  warmth()      { return `${this.name} provides warming energy`; },
};
const PittaEssence = {
  coolPitta() { return `${this.name} soothes pitta dosha`; },
  detox()     { return `${this.name} promotes detoxification`; },
};
class Medicine { constructor(name) { this.name = name; } }
// WHY: Object.assign copies methods onto the prototype — simple, but no conflict detection.
Object.assign(Medicine.prototype, VataEssence, PittaEssence);
const ashwagandhaChurna = new Medicine("Ashwagandha Churna");
console.log(ashwagandhaChurna.balanceVata()); // Output: Ashwagandha Churna calms vata dosha
console.log(ashwagandhaChurna.coolPitta());   // Output: Ashwagandha Churna soothes pitta dosha

// --- 1b. Class mixin factories (functional mixin pattern) ---
// WHY: Factory functions let you build mixin chains that work with `extends`,
//      preserving `super` and `instanceof`.
const KaphaBalancing = (Base) => class extends Base {
  reduceKapha() { return `${this.name} reduces kapha congestion`; }
};
const Rejuvenating = (Base) => class extends Base {
  rejuvenate() { return `${this.name} promotes rasayana (rejuvenation)`; }
};
class BaseFormulation { constructor(name) { this.name = name; } }
// WHY: Compose mixins by chaining: each wraps the previous class.
class BrahmiRasayana extends Rejuvenating(KaphaBalancing(BaseFormulation)) {
  describe() { return `${this.name}: tridosha balancing rasayana`; }
}
const brahmi = new BrahmiRasayana("Brahmi Rasayana");
console.log(brahmi.reduceKapha()); // Output: Brahmi Rasayana reduces kapha congestion
console.log(brahmi.rejuvenate());  // Output: Brahmi Rasayana promotes rasayana (rejuvenation)
console.log(brahmi.describe());    // Output: Brahmi Rasayana: tridosha balancing rasayana

// --- 1c. Conflict resolution ---
// WHY: When two mixins define the same method, last-write-wins. Sharma must be deliberate.
const TulsiEssence = { heal() { return `${this.name} heals with tulsi`; } };
const GiloyEssence = { heal() { return `${this.name} heals with giloy`; } };
function mixWithResolution(target, ...sources) {
  const conflicts = [];
  for (const src of sources) {
    for (const key of Object.keys(src)) {
      if (typeof target[key] === "function" && typeof src[key] === "function") conflicts.push(key);
    }
    Object.assign(target, src);
  }
  return conflicts;
}
const kadha = { name: "Ayush Kadha" };
Object.assign(kadha, TulsiEssence);
const conflicts = mixWithResolution(kadha, GiloyEssence);
console.log("Conflicts detected:", conflicts.join(", ")); // Output: Conflicts detected: heal
console.log(kadha.heal()); // Output: Ayush Kadha heals with giloy

// ────────────────────────────────────────────────────────────
//  BLOCK 2 — Trait Pattern
// ────────────────────────────────────────────────────────────
// WHY: Traits are fine-grained behavior units that declare what they
//      *require* from the host. If requirements are unmet, composition
//      fails early rather than at runtime.
console.log("\n=== BLOCK 2: Trait Pattern ===");

class Trait {
  constructor(name, { requires = [], methods = {} } = {}) {
    this.name = name; this.requires = requires; this.methods = methods;
  }
}
function applyTraits(target, ...traits) {
  const errors = [];
  const allMethods = new Map();
  for (const trait of traits) {
    for (const req of trait.requires) {
      if (typeof target[req] !== "function") errors.push(`Trait "${trait.name}" requires method "${req}"`);
    }
    for (const [key] of Object.entries(trait.methods)) {
      if (allMethods.has(key)) errors.push(`Conflict: "${key}" provided by both "${allMethods.get(key)}" and "${trait.name}"`);
      allMethods.set(key, trait.name);
    }
  }
  if (errors.length) return { ok: false, errors };
  for (const trait of traits) {
    for (const [key, fn] of Object.entries(trait.methods)) target[key] = fn;
  }
  return { ok: true, errors: [] };
}
// WHY: Sharma defines each prakriti trait with explicit requirements.
const Diagnosable = new Trait("Diagnosable", {
  requires: ["getName"],
  methods: {
    diagnose() { return `${this.getName()} is being diagnosed for dosha imbalance`; },
    checkPrakriti() { return `${this.getName()} prakriti assessed`; },
  },
});
const Prescribable = new Trait("Prescribable", {
  requires: ["getName"],
  methods: { prescribe() { return `${this.getName()} prescription prepared`; } },
});
const patient = { _name: "Amla Compound", getName() { return this._name; } };
const result1 = applyTraits(patient, Diagnosable, Prescribable);
console.log("Traits applied:", result1.ok);  // Output: Traits applied: true
console.log(patient.diagnose());             // Output: Amla Compound is being diagnosed for dosha imbalance
console.log(patient.prescribe());            // Output: Amla Compound prescription prepared

// --- Requirement failure ---
const rawHerb = { label: "Plain Neem Leaf" };
const result2 = applyTraits(rawHerb, Diagnosable);
console.log("Plain herb errors:", result2.errors[0]); // Output: Plain herb errors: Trait "Diagnosable" requires method "getName"

// --- Conflict detection ---
const Preparable = new Trait("Preparable", { requires: [], methods: { diagnose() { return "quick check"; } } });
const formulation = { getName() { return "Triphala"; } };
const result3 = applyTraits(formulation, Diagnosable, Preparable);
console.log("Conflict error:", result3.errors[0]);
// Output: Conflict error: Conflict: "diagnose" provided by both "Diagnosable" and "Preparable"

// ────────────────────────────────────────────────────────────
//  BLOCK 3 — Symbol-based Protocols
// ────────────────────────────────────────────────────────────
// WHY: Symbols are unique, non-string keys. JavaScript uses well-known
//      Symbols to define protocols (iteration, coercion). They also
//      serve as truly private-like property keys.
console.log("\n=== BLOCK 3: Symbol-based Protocols ===");

// --- 3a. Symbol.iterator — make Sharma's herb pouch iterable ---
class HerbPouch {
  constructor() { this._herbs = ["Ashwagandha", "Tulsi", "Brahmi"]; }
  [Symbol.iterator]() {
    let i = 0; const herbs = this._herbs;
    return { next() { return i < herbs.length ? { value: herbs[i++], done: false } : { done: true }; } };
  }
}
const pouch = new HerbPouch();
const herbList = [];
for (const herb of pouch) herbList.push(herb);
console.log("Herbs:", herbList.join(", ")); // Output: Herbs: Ashwagandha, Tulsi, Brahmi
// WHY: Spread also uses Symbol.iterator.
console.log("Count:", [...pouch].length); // Output: Count: 3

// --- 3b. Symbol.toPrimitive — control how an object converts ---
class PotencyPool {
  constructor(amount) { this.amount = amount; }
  [Symbol.toPrimitive](hint) {
    if (hint === "number")  return this.amount;
    if (hint === "string")  return `PotencyPool(${this.amount})`;
    return this.amount;
  }
}
const potency = new PotencyPool(42);
console.log("Potency + 8 =", +potency + 8); // Output: Potency + 8 = 50
console.log("Potency str:", `${potency}`);   // Output: Potency str: PotencyPool(42)

// --- 3c. Symbol.hasInstance — custom instanceof ---
// WHY: Sharma can define what "is ayurvedic" means without inheritance.
class AyurvedicCheck {
  static [Symbol.hasInstance](obj) { return obj && typeof obj.doshaType === "string"; }
}
const tulsiKadha = { doshaType: "kapha", potency: 30 };
const plainWater = { volume: 500 };
console.log("tulsiKadha is Ayurvedic:", tulsiKadha instanceof AyurvedicCheck); // Output: tulsiKadha is Ayurvedic: true
console.log("plainWater is Ayurvedic:", plainWater instanceof AyurvedicCheck); // Output: plainWater is Ayurvedic: false

// --- 3d. Symbol as private-like property keys ---
// WHY: Symbols are not enumerable in for...in and won't collide with string keys.
const BATCH_NUMBER = Symbol("batchNumber");
const POTENCY_GRADE = Symbol("potencyGrade");
class StampedMedicine {
  constructor(name, batch, grade) { this.name = name; this[BATCH_NUMBER] = batch; this[POTENCY_GRADE] = grade; }
  revealMark() { return `${this.name} bears batch: ${this[BATCH_NUMBER]}`; }
}
const medicine = new StampedMedicine("Chyawanprash", "AYU-2024-0731", "A+");
console.log(medicine.revealMark()); // Output: Chyawanprash bears batch: AYU-2024-0731
// WHY: Object.keys only sees string keys — the symbols are hidden.
console.log("Visible keys:", Object.keys(medicine).join(", ")); // Output: Visible keys: name
const syms = Object.getOwnPropertySymbols(medicine);
console.log("Symbol count:", syms.length); // Output: Symbol count: 2

// ────────────────────────────────────────────────────────────
//  KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Mixins compose shared behavior via Object.assign or class
//    factories — avoiding deep inheritance chains.
// 2. Class mixin factories preserve `super` and `instanceof`
//    while allowing multiple behavior sources.
// 3. Traits add rigor: they declare requirements and detect
//    conflicts at composition time, not at runtime.
// 4. Symbol.iterator / toPrimitive / hasInstance let objects
//    participate in language-level protocols.
// 5. Symbol keys act as hidden, collision-free properties —
//    Sharma's secret prescription marks that only the vaidya can read.
console.log("\nVaidya Sharma's formulations are complete. Essences combined, marks stamped.");
// Output: Vaidya Sharma's formulations are complete. Essences combined, marks stamped.
