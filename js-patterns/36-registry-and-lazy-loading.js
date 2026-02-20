/**
 * ============================================================
 *  FILE 36 : Registry & Lazy Loading
 *  Topic   : Registry, Lazy Loading, Code Splitting
 *  WHY THIS MATTERS:
 *  Large applications need a central place to register and
 *  look up services, components, or handlers — the Registry
 *  pattern. Lazy Loading defers expensive work until needed,
 *  keeping startup fast and memory low. Together they form the
 *  backbone of plugin architectures and service containers.
 * ============================================================
 */
// STORY: Harbor Master Meenakshi manages Chennai Port — she registers
// every vessel that docks with IMO numbers, dispatches crane operators
// only when cargo arrives, and keeps the port running without wasting a single hand.

// ────────────────────────────────────────────────────────────
//  BLOCK 1 — Registry Pattern: Central Lookup
// ────────────────────────────────────────────────────────────
// WHY: A registry gives you one authoritative map of name -> value.
//      Any module can register; any module can look up.
class VesselRegistry {
  constructor() { this._vessels = new Map(); }
  register(name, info) {
    if (this._vessels.has(name)) throw new Error(`Vessel "${name}" is already docked.`);
    this._vessels.set(name, info);
  }
  get(name) {
    if (!this._vessels.has(name)) throw new Error(`Vessel "${name}" not found at Chennai Port.`);
    return this._vessels.get(name);
  }
  has(name) { return this._vessels.has(name); }
  unregister(name) { return this._vessels.delete(name); }
  listAll() { return [...this._vessels.keys()]; }
}

console.log("=== BLOCK 1: Registry Pattern ===");
const chennaiPort = new VesselRegistry();
chennaiPort.register("MV Chennai Express", { type: "container", capacity: 5000 });
chennaiPort.register("INS Vikrant", { type: "naval", capacity: 1200 });
chennaiPort.register("MT Kamarajar", { type: "tanker", capacity: 80000 });
// WHY: Meenakshi can look up any vessel by name without knowing who registered it.
console.log("Has MV Chennai Express:", chennaiPort.has("MV Chennai Express")); // Output: Has MV Chennai Express: true
console.log("Has Ghost Ship:", chennaiPort.has("Ghost Ship"));                 // Output: Has Ghost Ship: false
const express = chennaiPort.get("MV Chennai Express");
console.log("MV Chennai Express type:", express.type);       // Output: MV Chennai Express type: container
console.log("MV Chennai Express capacity:", express.capacity); // Output: MV Chennai Express capacity: 5000
console.log("All docked vessels:", chennaiPort.listAll().join(", ")); // Output: All docked vessels: MV Chennai Express, INS Vikrant, MT Kamarajar
chennaiPort.unregister("INS Vikrant");
console.log("After departure:", chennaiPort.listAll().join(", ")); // Output: After departure: MV Chennai Express, MT Kamarajar
// WHY: Duplicate registration is blocked — prevents silent overwrites.
try {
  chennaiPort.register("MV Chennai Express", { type: "bulk", capacity: 200 });
} catch (e) {
  console.log("Duplicate error:", e.message); // Output: Duplicate error: Vessel "MV Chennai Express" is already docked.
}

// ────────────────────────────────────────────────────────────
//  BLOCK 2 — Service Registry with Auto-Discovery
// ────────────────────────────────────────────────────────────
// WHY: A service registry extends the basic pattern with tags and
//      named resolution — query "give me all services tagged 'container'"
//      instead of knowing exact names.
console.log("\n=== BLOCK 2: Service Registry with Auto-Discovery ===");

class ServiceRegistry {
  constructor() { this._services = new Map(); this._tags = new Map(); }
  register(name, factory, tags = []) {
    this._services.set(name, { factory, instance: null, tags });
    // WHY: Tags allow grouping — Meenakshi asks "who handles containers?" and gets every tagged operator.
    for (const tag of tags) {
      if (!this._tags.has(tag)) this._tags.set(tag, new Set());
      this._tags.get(tag).add(name);
    }
  }
  resolve(name) {
    const entry = this._services.get(name);
    if (!entry) throw new Error(`Service "${name}" not registered.`);
    // WHY: Lazy singleton — the factory runs only on first resolve.
    if (!entry.instance) entry.instance = entry.factory();
    return entry.instance;
  }
  findByTag(tag) {
    const names = this._tags.get(tag);
    if (!names) return [];
    return [...names].map((n) => ({ name: n, service: this.resolve(n) }));
  }
  listTags() { return [...this._tags.keys()]; }
}

const services = new ServiceRegistry();
services.register("craneOperator", () => ({ operate: () => "Lifting containers from vessel" }), ["dock", "heavy"]);
services.register("stevedore", () => ({ inspect: () => "Checking cargo manifest" }), ["dock", "safety"]);
services.register("fuelBarge", () => ({ pump: () => "Pumping bunker fuel" }), ["heavy", "tanker"]);
console.log("Crane:", services.resolve("craneOperator").operate()); // Output: Crane: Lifting containers from vessel
console.log("Stevedore:", services.resolve("stevedore").inspect()); // Output: Stevedore: Checking cargo manifest
// WHY: Tag queries let Meenakshi dispatch all dock-tagged operators at once.
const dockCrew = services.findByTag("dock");
console.log("Dock crew:", dockCrew.map((w) => w.name).join(", ")); // Output: Dock crew: craneOperator, stevedore
const heavyOps = services.findByTag("heavy");
console.log("Heavy ops:", heavyOps.map((w) => w.name).join(", ")); // Output: Heavy ops: craneOperator, fuelBarge
console.log("All tags:", services.listTags().join(", ")); // Output: All tags: dock, heavy, safety, tanker

// ────────────────────────────────────────────────────────────
//  BLOCK 3 — Lazy Loading Patterns
// ────────────────────────────────────────────────────────────
// WHY: Loading everything upfront wastes time and memory. Lazy loading
//      defers work until actually needed — Meenakshi doesn't hire crane
//      operators at dawn if no vessel docks until noon.
console.log("\n=== BLOCK 3: Lazy Loading Patterns ===");

// --- 3a. Dynamic import() simulation ---
// WHY: Real dynamic import() returns a Promise. We simulate it here.
const moduleStore = {
  "tracking": () => ({ render: (data) => `Vessel tracker with ${data.length} ships` }),
  "manifest": () => ({ generate: (title) => `Manifest: ${title}` }),
  "portmap":  () => ({ show: (loc) => `Port map at ${loc}` }),
};
function dynamicImport(moduleName) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const factory = moduleStore[moduleName];
      if (!factory) return reject(new Error(`Module "${moduleName}" not found`));
      resolve({ default: factory() });
    }, 10);
  });
}

// --- 3b. Route-based splitting ---
// WHY: Each route loads only its own module — users who never visit
//      "/portmap" never pay the cost of loading the port map bundle.
class LazyRouter {
  constructor() { this._routes = new Map(); this._cache = new Map(); }
  addRoute(path, loaderFn) { this._routes.set(path, loaderFn); }
  async navigate(path) {
    if (this._cache.has(path)) return { path, module: this._cache.get(path), cached: true };
    const loader = this._routes.get(path);
    if (!loader) throw new Error(`No route for "${path}"`);
    const mod = await loader();
    this._cache.set(path, mod.default);
    return { path, module: mod.default, cached: false };
  }
}

// --- 3c. Intersection Observer concept (lazy component loading) ---
// WHY: Components below the fold load only when the user scrolls near them.
class LazyComponent {
  constructor(name, loaderFn) { this._name = name; this._loaderFn = loaderFn; this._loaded = false; this._content = null; }
  async onVisible() {
    if (!this._loaded) { this._content = await this._loaderFn(); this._loaded = true; }
    return this._content;
  }
  get isLoaded() { return this._loaded; }
}

// --- Run the async demos ---
async function lazyLoadingDemo() {
  const trackingMod = await dynamicImport("tracking");
  console.log("Dynamic import:", trackingMod.default.render([1, 2, 3])); // Output: Dynamic import: Vessel tracker with 3 ships

  const router = new LazyRouter();
  router.addRoute("/tracking", () => dynamicImport("tracking"));
  router.addRoute("/manifest", () => dynamicImport("manifest"));
  router.addRoute("/portmap", () => dynamicImport("portmap"));
  const r1 = await router.navigate("/manifest");
  console.log("Route /manifest:", r1.module.generate("Chennai Port Report"), "| cached:", r1.cached);
  // Output: Route /manifest: Manifest: Chennai Port Report | cached: false
  const r2 = await router.navigate("/manifest");
  console.log("Route /manifest again:", r2.module.generate("Chennai Port Report"), "| cached:", r2.cached);
  // Output: Route /manifest again: Manifest: Chennai Port Report | cached: true
  const r3 = await router.navigate("/portmap");
  console.log("Route /portmap:", r3.module.show("Berth 7"), "| cached:", r3.cached);
  // Output: Route /portmap: Port map at Berth 7 | cached: false

  const lazyMap = new LazyComponent("PortMap", async () => ({ display: () => "Full Chennai Port map rendered" }));
  console.log("Before scroll — loaded:", lazyMap.isLoaded); // Output: Before scroll — loaded: false
  const mapContent = await lazyMap.onVisible();
  console.log("After scroll — loaded:", lazyMap.isLoaded);   // Output: After scroll — loaded: true
  console.log("Map content:", mapContent.display());          // Output: Map content: Full Chennai Port map rendered

  // ────────────────────────────────────────────────────────────
  //  KEY TAKEAWAYS
  // ────────────────────────────────────────────────────────────
  // 1. Registry pattern provides a central, decoupled lookup —
  //    register once, resolve anywhere.
  // 2. Tag-based service discovery lets you query by capability
  //    rather than exact name — great for plugin systems.
  // 3. Lazy loading defers expensive work until actually needed.
  // 4. Route-based code splitting + caching ensures each page
  //    only loads what it needs, never loads the same thing twice.
  // 5. Meenakshi's Chennai Port runs lean: register vessels when
  //    they dock, dispatch crane operators only when cargo arrives.
  console.log("\nHarbor Master Meenakshi's registry is ship-shape!");
  // Output: Harbor Master Meenakshi's registry is ship-shape!
}
lazyLoadingDemo();
