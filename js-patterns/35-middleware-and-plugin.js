/**
 * ============================================================
 *  FILE 35 : Middleware, Plugin Architecture & Hook System
 *  Topic  : Middleware Pipeline, Plugin Registry, Hook System
 *  WHY THIS MATTERS:
 *    Middleware lets you compose processing steps without coupling
 *    them. Plugins let third parties extend your system safely.
 *    Hooks let code tap into lifecycle events — the backbone of
 *    Express, Webpack, WordPress, and every extensible framework.
 * ============================================================
 */

// STORY: Station Master Pandey configures the Mughalsarai junction
// with signal cabins (middleware), optional coaches like pantry car
// and AC first class (plugins), and departure/arrival hooks
// (whistle before departure, announcement after arrival).

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Middleware Pipeline
// ────────────────────────────────────────────────────────────

// WHY: Middleware is a chain of functions where each can transform
// the request, short-circuit, or pass to the next handler.

class SignalCabinPipeline {
  constructor() { this.stack = []; }
  use(fn) { this.stack.push(fn); }
  run(req, res) {
    let idx = 0;
    const next = () => {
      if (idx < this.stack.length) {
        this.stack[idx++](req, res, next);
      }
    };
    next();
  }
}

console.log("=== Signal Cabin Middleware ==="); // Output: === Signal Cabin Middleware ===

const junction = new SignalCabinPipeline();

// Pandey adds signal cabin checks along the track
junction.use((req, res, next) => {
  req.trackClear = true;
  console.log("  [Cabin 1] Track clear: confirmed"); // Output:   [Cabin 1] Track clear: confirmed
  next();
});

junction.use((req, res, next) => {
  req.pointsSet = true;
  console.log("  [Cabin 2] Points set: platform 3"); // Output:   [Cabin 2] Points set: platform 3
  next();
});

junction.use((req, res, next) => {
  res.body = `${req.trainName} cleared at Mughalsarai, track: ${req.trackClear}, points: ${req.pointsSet}`;
  console.log("  [Signal Green] " + res.body); // Output:   [Signal Green] Rajdhani Express cleared at Mughalsarai, track: true, points: true
});

const req = { trainName: "Rajdhani Express" };
const res = {};
junction.run(req, res);

// WHY: Koa-style onion — each middleware wraps the next, runs before AND after
function koaCompose(middlewares) {
  return function (ctx) {
    let index = -1;
    function dispatch(i) {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      if (i >= middlewares.length) return;
      return middlewares[i](ctx, () => dispatch(i + 1));
    }
    return dispatch(0);
  };
}

console.log("\n=== Koa-style Onion Middleware ==="); // Output: === Koa-style Onion Middleware ===

const onion = koaCompose([
  (ctx, next) => {
    ctx.log.push("A-before");
    next();
    ctx.log.push("A-after");
  },
  (ctx, next) => {
    ctx.log.push("B-before");
    next();
    ctx.log.push("B-after");
  },
  (ctx, next) => {
    ctx.log.push("CORE");
  }
]);

const ctx = { log: [] };
onion(ctx);
console.log("Onion order:", ctx.log.join(" > ")); // Output: Onion order: A-before > B-before > CORE > B-after > A-after

// ────────────────────────────────────────────────────────────
// BLOCK 2 — Plugin Architecture
// ────────────────────────────────────────────────────────────

// WHY: A plugin system lets external code extend your app through
// a controlled API. The host defines an API surface; plugins
// register via lifecycle hooks.

class JunctionHost {
  constructor(name) { this.name = name; this.plugins = []; this.capabilities = {}; }

  // WHY: Plugins receive a limited API — they can't access internals directly
  register(plugin) {
    const api = {
      addCapability: (name, fn) => { this.capabilities[name] = fn; },
      hostName: this.name
    };
    plugin.install(api);
    this.plugins.push(plugin.name);
  }

  run(capabilityName, ...args) {
    if (!this.capabilities[capabilityName]) {
      return `No capability: ${capabilityName}`;
    }
    return this.capabilities[capabilityName](...args);
  }

  listPlugins() { return this.plugins; }
}

// Pandey's Mughalsarai junction as a plugin host
const mughalsarai = new JunctionHost("Mughalsarai Junction");

const pantryCarPlugin = {
  name: "PantryCar",
  install(api) {
    api.addCapability("serveMeal", (train, meal) =>
      `[${api.hostName}] Pantry Car: ${meal} served on ${train}`
    );
  }
};

const acCoachPlugin = {
  name: "ACFirstClass",
  install(api) {
    api.addCapability("upgradeCoach", (passenger) =>
      `[AC First Class] ${passenger} upgraded to 1A berth`
    );
  }
};

console.log("\n=== Plugin Architecture (Coach Additions) ==="); // Output: === Plugin Architecture (Coach Additions) ===

mughalsarai.register(pantryCarPlugin);
mughalsarai.register(acCoachPlugin);

console.log("Plugins:", mughalsarai.listPlugins().join(", ")); // Output: Plugins: PantryCar, ACFirstClass
console.log(mughalsarai.run("serveMeal", "Rajdhani Express", "Veg Thali")); // Output: [Mughalsarai Junction] Pantry Car: Veg Thali served on Rajdhani Express
console.log(mughalsarai.run("upgradeCoach", "Sharma ji")); // Output: [AC First Class] Sharma ji upgraded to 1A berth
console.log(mughalsarai.run("unknown")); // Output: No capability: unknown

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Hook System (Action & Filter Hooks)
// ────────────────────────────────────────────────────────────

// WHY: Hooks let code tap into lifecycle events. Action hooks run
// side effects. Filter hooks transform values through a chain —
// exactly how WordPress works.

class RailwayHookSystem {
  constructor() { this.actions = {}; this.filters = {}; }

  // WHY: Actions = side effects, Filters = value transformers
  addAction(name, fn, priority = 10) {
    if (!this.actions[name]) this.actions[name] = [];
    this.actions[name].push({ fn, priority });
    this.actions[name].sort((a, b) => a.priority - b.priority);
  }
  doAction(name, ...args) {
    if (this.actions[name]) this.actions[name].forEach(h => h.fn(...args));
  }
  addFilter(name, fn, priority = 10) {
    if (!this.filters[name]) this.filters[name] = [];
    this.filters[name].push({ fn, priority });
    this.filters[name].sort((a, b) => a.priority - b.priority);
  }
  applyFilters(name, value, ...args) {
    if (!this.filters[name]) return value;
    return this.filters[name].reduce((v, h) => h.fn(v, ...args), value);
  }
}

console.log("\n=== Railway Hook System ==="); // Output: === Railway Hook System ===

const hooks = new RailwayHookSystem();

// WHY: Action hooks — Pandey logs events at lifecycle points
hooks.addAction("train:arrive", (train) => {
  console.log(`  Action: ${train} arrived at Mughalsarai`);
});
hooks.addAction("train:arrive", (train) => {
  console.log(`  Action: chai-wala dispatched for ${train}`);
}, 20); // lower priority = runs first, 20 runs second
hooks.addAction("train:depart", (train) => {
  console.log(`  Action: ${train} departed, whistle blown, track cleared`);
});

console.log("-- Shatabdi Arrival --"); // Output: -- Shatabdi Arrival --
hooks.doAction("train:arrive", "Shatabdi Express");
// Output:   Action: Shatabdi Express arrived at Mughalsarai
// Output:   Action: chai-wala dispatched for Shatabdi Express

console.log("-- Garib Rath Departure --"); // Output: -- Garib Rath Departure --
hooks.doAction("train:depart", "Garib Rath");
// Output:   Action: Garib Rath departed, whistle blown, track cleared

// WHY: Filter hooks — transform data through a pipeline
hooks.addFilter("ticket:format", (text) => text.toUpperCase());
hooks.addFilter("ticket:format", (text) => `*** ${text} ***`);
hooks.addFilter("ticket:format", (text) => text + " [VALID]");

const raw = "rajdhani express berth 42 ac-2tier";
const formatted = hooks.applyFilters("ticket:format", raw);
console.log("Filtered ticket:", formatted); // Output: Filtered ticket: *** RAJDHANI EXPRESS BERTH 42 AC-2TIER *** [VALID]

// WHY: Priority ordering controls the filter chain
hooks.addFilter("fare:adjust", (p) => p * 0.9, 1);    // 10% tatkal discount first
hooks.addFilter("fare:adjust", (p) => p + 50, 2);      // then service charge
hooks.addFilter("fare:adjust", (p) => Math.round(p * 100) / 100, 3); // then round

const finalFare = hooks.applyFilters("fare:adjust", 2000);
console.log("Final fare: \u20B9" + finalFare); // Output: Final fare: ₹1850

// Pandey's summary
console.log("\nPandey's Mughalsarai junction is fully extensible:"); // Output: Pandey's Mughalsarai junction is fully extensible:
console.log("- Signal cabins (middleware) compose processing steps"); // Output: - Signal cabins (middleware) compose processing steps
console.log("- Coach plugins extend via controlled API"); // Output: - Coach plugins extend via controlled API
console.log("- Hooks tap into departure/arrival lifecycle events"); // Output: - Hooks tap into departure/arrival lifecycle events

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Middleware (signal cabins) compose processing steps (Express next(), Koa onion).
// 2. Plugin architecture (pantry car, AC coach) provides a controlled API surface for extensions.
// 3. Action hooks (whistle, announcement) fire side effects; filter hooks transform values.
// 4. Priority ordering gives fine control over execution sequence.
// 5. These patterns power Express, Webpack, WordPress, and every extensible tool.
