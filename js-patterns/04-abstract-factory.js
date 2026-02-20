/**
 * ============================================================
 *  FILE 4 : Gupta ji's Wedding Planner - Abstract Factory Pattern
 *  Topic  : Abstract Factory, Factory Families
 *  WHY THIS MATTERS:
 *    When you need families of related objects that must work
 *    together (e.g., all "North Indian wedding" items, or all
 *    "South Indian wedding" items), the Abstract Factory
 *    guarantees consistency.  You swap an entire family by
 *    changing one factory — no hunting through scattered `new` calls.
 * ============================================================
 */

// STORY: Gupta ji creates themed wedding kits for his clients.
//        Each kit contains matching Venue, Music, and Decoration
//        — but the theme can change with a single switch.

console.log("=== FILE 04: Gupta ji's Wedding Planner ===\n");

// ────────────────────────────────────
// BLOCK 1 — Abstract Factory for Themed Wedding Kits
// ────────────────────────────────────

// WHY: An Abstract Factory defines an interface for creating
//      families of related products.  Each concrete factory
//      produces a coherent set that belongs together.

class Venue {
  constructor(name, style) {
    this.name = name;
    this.style = style;
  }
  render() {
    return `[${this.style} Venue: ${this.name}]`;
  }
}

class Music {
  constructor(name, style) {
    this.name = name;
    this.style = style;
  }
  render() {
    return `[${this.style} Music: "${this.name}"]`;
  }
}

class Decoration {
  constructor(name, style) {
    this.name = name;
    this.style = style;
  }
  render() {
    return `[${this.style} Decoration: "${this.name}"]`;
  }
}

// WHY: Each factory produces a complete, consistent family.
//      Mixing a NorthIndian mandap with a SouthIndian nadaswaram
//      is impossible when you use the factory correctly.
class NorthIndianWeddingFactory {
  createVenue(name) {
    return new Venue(name, "NorthIndian");
  }
  createMusic(name) {
    return new Music(name, "NorthIndian");
  }
  createDecoration(name) {
    return new Decoration(name, "NorthIndian");
  }
}

class SouthIndianWeddingFactory {
  createVenue(name) {
    return new Venue(name, "SouthIndian");
  }
  createMusic(name) {
    return new Music(name, "SouthIndian");
  }
  createDecoration(name) {
    return new Decoration(name, "SouthIndian");
  }
}

function planWedding(factory) {
  const venue = factory.createVenue("Grand Mandap");
  const music = factory.createMusic("Shehnai Ensemble");
  const decoration = factory.createDecoration("Marigold Archway");
  return { venue, music, decoration };
}

// WHY: Switching the entire theme is a one-line change.
const northKit = planWedding(new NorthIndianWeddingFactory());
console.log(northKit.venue.render());       // Output: [NorthIndian Venue: Grand Mandap]
console.log(northKit.music.render());       // Output: [NorthIndian Music: "Shehnai Ensemble"]
console.log(northKit.decoration.render());  // Output: [NorthIndian Decoration: "Marigold Archway"]

console.log("");

const southKit = planWedding(new SouthIndianWeddingFactory());
console.log(southKit.venue.render());       // Output: [SouthIndian Venue: Grand Mandap]
console.log(southKit.music.render());       // Output: [SouthIndian Music: "Shehnai Ensemble"]
console.log(southKit.decoration.render());  // Output: [SouthIndian Decoration: "Marigold Archway"]

// ────────────────────────────────────
// BLOCK 2 — Abstract Factory for Catering Families
// ────────────────────────────────────

// WHY: This is a practical, non-venue example.  When your wedding
//      must support multiple cuisine styles, each "family" includes
//      a Starter, a MainCourse, and a Dessert that all follow the
//      same regional cuisine.

console.log("\n--- Catering Families ---");

class PunjabiStarter {
  serve() { return "Punjabi: Paneer Tikka and Amritsari Kulcha served"; }
}
class PunjabiMainCourse {
  serve() { return "Punjabi: Dal Makhani with Butter Naan served"; }
}
class PunjabiDessert {
  serve() { return "Punjabi: Gulab Jamun and Jalebi served"; }
}

class SouthIndianStarter {
  serve() { return "SouthIndian: Medu Vada and Sambar served"; }
}
class SouthIndianMainCourse {
  serve() { return "SouthIndian: Dosa with Coconut Chutney served"; }
}
class SouthIndianDessert {
  serve() { return "SouthIndian: Payasam and Mysore Pak served"; }
}

class PunjabiCateringFactory {
  createStarter() { return new PunjabiStarter(); }
  createMainCourse() { return new PunjabiMainCourse(); }
  createDessert() { return new PunjabiDessert(); }
}

class SouthIndianCateringFactory {
  createStarter() { return new SouthIndianStarter(); }
  createMainCourse() { return new SouthIndianMainCourse(); }
  createDessert() { return new SouthIndianDessert(); }
}

// WHY: The application code works with ANY catering family
//      without knowing the concrete classes.

function serveFeast(factory) {
  const starter = factory.createStarter();
  const main = factory.createMainCourse();
  const dessert = factory.createDessert();

  console.log(starter.serve());
  console.log(main.serve());
  console.log(dessert.serve());
}

console.log("-- Punjabi Feast --");
serveFeast(new PunjabiCateringFactory());
// Output: Punjabi: Paneer Tikka and Amritsari Kulcha served
// Output: Punjabi: Dal Makhani with Butter Naan served
// Output: Punjabi: Gulab Jamun and Jalebi served

console.log("\n-- South Indian Feast --");
serveFeast(new SouthIndianCateringFactory());
// Output: SouthIndian: Medu Vada and Sambar served
// Output: SouthIndian: Dosa with Coconut Chutney served
// Output: SouthIndian: Payasam and Mysore Pak served

// ────────────────────────────────────
// BLOCK 3 — Combining Abstract Factory with Environment Detection
// ────────────────────────────────────

// WHY: In real apps, you choose the factory based on configuration
//      or environment.  This block shows how to wire it all together
//      with a factory-of-factories (a registry that returns the
//      right factory for a given environment key).

console.log("\n--- Region-Based Factory Selection ---");

const factoryRegistry = {
  northindian: NorthIndianWeddingFactory,
  southindian: SouthIndianWeddingFactory,
};

function getWeddingFactory(region) {
  const Factory = factoryRegistry[region];
  if (!Factory) {
    throw new Error(`Gupta ji has no kit for region: ${region}`);
  }
  // WHY: Returning a new instance means each consumer gets a
  //      fresh factory.  Combine with Singleton if needed.
  return new Factory();
}

// Simulate reading from client preference
const clientPreference = "northindian";
const selectedFactory = getWeddingFactory(clientPreference);
const wedding = planWedding(selectedFactory);

console.log("Selected:", wedding.venue.render());       // Output: Selected: [NorthIndian Venue: Grand Mandap]
console.log("Selected:", wedding.music.render());       // Output: Selected: [NorthIndian Music: "Shehnai Ensemble"]

// Adding a brand-new theme is non-breaking
class RajasthaniWeddingFactory {
  createVenue(name) { return new Venue(name, "Rajasthani"); }
  createMusic(name) { return new Music(name, "Rajasthani"); }
  createDecoration(name) { return new Decoration(name, "Rajasthani"); }
}

factoryRegistry.rajasthani = RajasthaniWeddingFactory;

const rajasthaniFactory = getWeddingFactory("rajasthani");
const rajasthaniWedding = planWedding(rajasthaniFactory);
console.log("Rajasthani theme:", rajasthaniWedding.venue.render());       // Output: Rajasthani theme: [Rajasthani Venue: Grand Mandap]
console.log("Rajasthani theme:", rajasthaniWedding.decoration.render());  // Output: Rajasthani theme: [Rajasthani Decoration: "Marigold Archway"]

// Error handling for unknown regions
try {
  getWeddingFactory("european");
} catch (err) {
  console.log("Error:", err.message); // Output: Error: Gupta ji has no kit for region: european
}

// WHY: The registry + factory combo means:
//   - Adding a theme = add one class + one registry entry
//   - No switch/case anywhere
//   - Client code never changes

// ────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────
// 1. Abstract Factory creates FAMILIES of related objects that
//    are designed to work together (venue + music + decoration).
// 2. Swapping an entire family requires changing just the factory
//    instance — client code remains untouched.
// 3. This pattern shines for themed weddings, multi-cuisine catering,
//    and regional style abstraction.
// 4. Combine with a registry/map for region-based selection
//    to avoid brittle switch statements.
// 5. Abstract Factory vs Factory Method: Factory Method creates
//    ONE product via inheritance; Abstract Factory creates a
//    FAMILY of products via composition.

console.log("\n=== Gupta ji ships the kits. Every item matches the theme perfectly. ===");
// Output: === Gupta ji ships the kits. Every item matches the theme perfectly. ===
