/**
 * ============================================================
 *  FILE 31 : Dependency Injection & Inversion of Control
 *  Topic  : Dependency Injection, Inversion of Control,
 *           Service Locator
 *  WHY THIS MATTERS:
 *    Hard-coded dependencies make code rigid, untestable,
 *    and painful to swap. DI flips the control so that
 *    dependencies flow IN from outside, keeping every piece
 *    loosely coupled and easy to mock in tests.
 * ============================================================
 */

// STORY: Urban Planner Sharma designs Naya Raipur. Each building needs
// water (Jal Board), electricity (CSPDCL), and internet (BSNL/Jio) —
// but Sharma never lets a building create its own supply. He injects
// municipal utilities from outside.

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Constructor Injection
// ────────────────────────────────────────────────────────────

// WHY: When a class receives its dependencies through the constructor,
// you can swap real services for test doubles without touching internals.

class JalBoardSupply {
  getWater() { return "filtered Jal Board water"; }
}

class CSPDCLGrid {
  getPower() { return "220V CSPDCL power"; }
}

// Sharma's building never creates its own utilities — they arrive via constructor
class NayaRaipurBuilding {
  constructor(water, electric) {
    this.water = water;
    this.electric = electric;
  }

  statusReport() {
    return `Building receives: ${this.water.getWater()} & ${this.electric.getPower()}`;
  }
}

// Production wiring
const realWater = new JalBoardSupply();
const realElectric = new CSPDCLGrid();
const collectorate = new NayaRaipurBuilding(realWater, realElectric);
console.log(collectorate.statusReport()); // Output: Building receives: filtered Jal Board water & 220V CSPDCL power

// WHY: Testing becomes trivial — inject fakes with no real infrastructure
const fakeWater = { getWater: () => "mock tanker water" };
const fakeElectric = { getPower: () => "mock 5V" };
const testBuilding = new NayaRaipurBuilding(fakeWater, fakeElectric);
console.log(testBuilding.statusReport()); // Output: Building receives: mock tanker water & mock 5V
console.log("Test passed:", testBuilding.statusReport().includes("mock")); // Output: Test passed: true

// WHY: Without DI the building would hard-code `new JalBoardSupply()` inside —
// making it impossible to test without a real water supply running.
class HardCodedBuilding {
  constructor() {
    this.water = new JalBoardSupply();   // tightly coupled!
    this.electric = new CSPDCLGrid();
  }
  report() {
    return `Hard-coded: ${this.water.getWater()} & ${this.electric.getPower()}`;
  }
}
const hardCoded = new HardCodedBuilding();
console.log(hardCoded.report()); // Output: Hard-coded: filtered Jal Board water & 220V CSPDCL power
console.log("Problem: cannot swap deps for testing ^"); // Output: Problem: cannot swap deps for testing ^

// ────────────────────────────────────────────────────────────
// BLOCK 2 — DI Container (Register / Resolve, Lifetimes)
// ────────────────────────────────────────────────────────────

// WHY: A container automates wiring so you register services once
// and resolve them anywhere. Singleton = one shared instance,
// Transient = fresh instance every time.

class MunicipalRegistry {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  register(name, factory, { singleton = false } = {}) {
    this.services.set(name, { factory, singleton });
    return this;
  }

  resolve(name) {
    const entry = this.services.get(name);
    if (!entry) throw new Error(`Service "${name}" not registered`);

    if (entry.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, entry.factory(this));
      }
      return this.singletons.get(name);
    }
    return entry.factory(this);
  }
}

// Sharma sets up Naya Raipur's municipal service registry
const nagarNigam = new MunicipalRegistry();

let internetCount = 0;
nagarNigam
  .register("water", () => new JalBoardSupply(), { singleton: true })
  .register("electric", () => new CSPDCLGrid(), { singleton: true })
  .register("internet", () => ({ id: ++internetCount, provider: "BSNL/Jio", speed: "100Mbps" }), { singleton: false })
  .register("building", (c) => new NayaRaipurBuilding(c.resolve("water"), c.resolve("electric")));

const b1 = nagarNigam.resolve("building");
console.log(b1.statusReport()); // Output: Building receives: filtered Jal Board water & 220V CSPDCL power

// WHY: Singleton returns the same instance
const w1 = nagarNigam.resolve("water");
const w2 = nagarNigam.resolve("water");
console.log("Singleton same ref:", w1 === w2); // Output: Singleton same ref: true

// WHY: Transient creates a new instance each time
const net1 = nagarNigam.resolve("internet");
const net2 = nagarNigam.resolve("internet");
console.log("Transient different:", net1.id, net2.id); // Output: Transient different: 1 2
console.log("Transient same ref:", net1 === net2); // Output: Transient same ref: false

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Service Locator & Express Handler Example
// ────────────────────────────────────────────────────────────

// WHY: A Service Locator is a global registry that objects pull from.
// It works, but hides dependencies — DI is usually preferred because
// dependencies are explicit in the constructor signature.

class NagarNigamLocator {
  constructor() {
    this.registry = new Map();
  }
  register(name, instance) { this.registry.set(name, instance); }
  get(name) {
    if (!this.registry.has(name)) throw new Error(`Unknown service: ${name}`);
    return this.registry.get(name);
  }
}

const locator = new NagarNigamLocator();
locator.register("logger", { log: (msg) => `[LOG] ${msg}` });
locator.register("db", { find: (id) => ({ id, name: "Sharma Bhawan" }) });

// WHY: The handler reaches into the locator — dependencies are hidden
function handleRequest(locator, reqId) {
  const logger = locator.get("logger");
  const db = locator.get("db");
  const record = db.find(reqId);
  return logger.log(`Found: ${record.name}`);
}

console.log(handleRequest(locator, 42)); // Output: [LOG] Found: Sharma Bhawan

// Practical Express-style handler using DI instead
function createHandler(logger, db) {
  // WHY: Dependencies are visible in the function signature
  return function handle(req) {
    const record = db.find(req.id);
    logger.log(record.name);
    return { status: 200, body: record };
  };
}

const handler = createHandler(
  { log: (msg) => console.log("Express LOG:", msg) },
  { find: (id) => ({ id, name: `Sector-${id}-Tower` }) }
);

const result = handler({ id: 7 }); // Output: Express LOG: Sector-7-Tower
console.log("Response:", JSON.stringify(result)); // Output: Response: {"status":200,"body":{"id":7,"name":"Sector-7-Tower"}}

// WHY: Setter injection — a third approach where deps arrive after construction
class HospitalBuilding {
  setWater(water) { this.water = water; }
  setElectric(electric) { this.electric = electric; }
  report() {
    return `Hospital: ${this.water.getWater()} & ${this.electric.getPower()}`;
  }
}

const hospital = new HospitalBuilding();
hospital.setWater(new JalBoardSupply());
hospital.setElectric(new CSPDCLGrid());
console.log(hospital.report()); // Output: Hospital: filtered Jal Board water & 220V CSPDCL power

// Sharma compares the approaches
console.log("\nSharma's comparison:"); // Output: Sharma's comparison:
console.log("  Nagar Nigam Locator: hides deps, harder to test"); // Output:   Nagar Nigam Locator: hides deps, harder to test
console.log("  Constructor DI: explicit deps, easy to mock"); // Output:   Constructor DI: explicit deps, easy to mock
console.log("  Setter DI: flexible order, risk of missing deps"); // Output:   Setter DI: flexible order, risk of missing deps

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Constructor Injection makes dependencies explicit and testable (Jal Board, CSPDCL injected into buildings).
// 2. A Municipal Registry (DI Container) automates wiring; singleton vs transient controls lifetime.
// 3. Nagar Nigam Locator (Service Locator) works but hides dependencies — prefer DI for clarity.
// 4. In Express/Koa, inject services into handler factories for clean testing.
// 5. Inversion of Control means the framework calls YOU, not the other way around.
