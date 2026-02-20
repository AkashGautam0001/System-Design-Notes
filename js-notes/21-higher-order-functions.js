// ============================================================
// FILE 21: HIGHER-ORDER FUNCTIONS
// Topic: Functions that accept/return functions — callbacks,
//        composition, currying, partial application, real-world use
// WHY: Higher-order functions are the heart of functional programming
//      in JS. They let you write abstract, reusable, composable logic
//      instead of repeating yourself everywhere.
// ============================================================

// ============================================================
// EXAMPLE 1 — The Maruti Suzuki Assembly Line, Gurgaon
// Story: A Maruti Suzuki factory has an assembly line where each
// station is a function. Stations can be swapped, chained, and
// configured on the fly — because functions are first-class values.
// ============================================================

// WHY: Functions that TAKE functions (callbacks) let you inject
// behavior into reusable structures — the same loop or pipeline
// can do completely different things depending on what you pass in.

// --- Functions That Take Functions (Callbacks) ---

function assemblyLine(cars, stationFn) {
  const results = [];
  for (const car of cars) {
    results.push(stationFn(car));
  }
  return results;
}

const rawBodies = ["alto", "swift", "baleno", "brezza"];

// Station 1: Paint (uppercase)
const painted = assemblyLine(rawBodies, (car) => car.toUpperCase());
console.log("Painted:", painted);
// Output: Painted: [ 'ALTO', 'SWIFT', 'BALENO', 'BREZZA' ]

// Station 2: Stamp chassis numbers
const stamped = assemblyLine(rawBodies, (car) => `${car}-${Math.floor(Math.random() * 1000)}`);
console.log("Stamped:", stamped);
// Output: Stamped: [ 'alto-<num>', 'swift-<num>', 'baleno-<num>', 'brezza-<num>' ]

// Station 3: Quality check (filter-like using a callback)
function qualityGate(items, testFn) {
  const passed = [];
  const failed = [];
  for (const item of items) {
    (testFn(item) ? passed : failed).push(item);
  }
  return { passed, failed };
}

const inventory = [
  { name: "Engine Block", rating: 92 },
  { name: "Steering Column", rating: 45 },
  { name: "ECU Module", rating: 88 },
  { name: "Headlamp Assembly", rating: 30 },
  { name: "Transmission Unit", rating: 97 },
];

const qcResult = qualityGate(inventory, (part) => part.rating >= 80);
console.log("Passed QC:", qcResult.passed.map((p) => p.name));
// Output: Passed QC: [ 'Engine Block', 'ECU Module', 'Transmission Unit' ]
console.log("Failed QC:", qcResult.failed.map((p) => p.name));
// Output: Failed QC: [ 'Steering Column', 'Headlamp Assembly' ]


// WHY: Functions that RETURN functions let you create specialized
// versions of a general function — like configuring a station
// before it joins the assembly line.

// --- Functions That Return Functions ---

function createStampingStation(prefix) {
  let serialNumber = 0;
  // Returns a new function that "remembers" prefix and serialNumber
  return function (modelName) {
    serialNumber++;
    return `${prefix}-${String(serialNumber).padStart(4, "0")}-${modelName}`;
  };
}

const commercialStamper = createStampingStation("COM");
const passengerStamper = createStampingStation("PAS");

console.log("\n=== Functions Returning Functions ===");
console.log(commercialStamper("Eeco"));
// Output: COM-0001-Eeco
console.log(commercialStamper("SuperCarry"));
// Output: COM-0002-SuperCarry
console.log(passengerStamper("Eeco"));
// Output: PAS-0001-Eeco  <-- Independent counter!

// --- Multiplier factory ---
function createMultiplier(factor) {
  return (value) => value * factor;
}

const double = createMultiplier(2);
const triple = createMultiplier(3);
const toExShowroomPrice = createMultiplier(1.28); // on-road markup conversion

console.log("Double 5:", double(5));
// Output: Double 5: 10
console.log("Triple 5:", triple(5));
// Output: Triple 5: 15
console.log("On-road price for 100:", toExShowroomPrice(100));
// Output: On-road price for 100: 128


// WHY: Composition lets you build complex transformations from small,
// focused functions — like snapping together assembly line stations.

// --- Composition: compose() and pipe() ---

// compose: right-to-left execution (mathematical convention)
function compose(...fns) {
  return function (value) {
    return fns.reduceRight((acc, fn) => fn(acc), value);
  };
}

// pipe: left-to-right execution (more intuitive reading order)
function pipe(...fns) {
  return function (value) {
    return fns.reduce((acc, fn) => fn(acc), value);
  };
}

// Small, focused transformation functions
const cleanModel = (name) => name.trim().toLowerCase();
const stampModel = (name) => `MARUTI-${name}`;
const packModel = (name) => `[DISPATCHED: ${name}]`;

// compose: reads right-to-left → clean, then stamp, then pack
const processModelCompose = compose(packModel, stampModel, cleanModel);
console.log("\n=== Composition ===");
console.log("compose:", processModelCompose("  Swift DZire  "));
// Output: compose: [DISPATCHED: MARUTI-swift dzire]

// pipe: reads left-to-right → clean, then stamp, then pack (same result)
const processModelPipe = pipe(cleanModel, stampModel, packModel);
console.log("pipe:   ", processModelPipe("  Swift DZire  "));
// Output: pipe:    [DISPATCHED: MARUTI-swift dzire]

// Building different pipelines by mixing and matching
const debugPipeline = pipe(
  cleanModel,
  (name) => { console.log(`  [debug] cleaned: "${name}"`); return name; },
  stampModel,
  (name) => { console.log(`  [debug] stamped: "${name}"`); return name; },
  packModel
);

console.log("Debug:", debugPipeline("  Baleno RS  "));
// Output:   [debug] cleaned: "baleno rs"
// Output:   [debug] stamped: "MARUTI-baleno rs"
// Output: Debug: [DISPATCHED: MARUTI-baleno rs]


// ============================================================
// EXAMPLE 2 — Currying, Partial Application & Real-World Patterns
// Story: The Maruti Suzuki factory introduces configurable assembly
// stations that take instructions one step at a time (currying) and
// can be partially pre-configured (partial application).
// ============================================================

// WHY: Currying transforms a function that takes multiple arguments
// into a chain of functions each taking a single argument. This
// enables powerful reuse through partial application.

// --- Currying ---

// Non-curried: takes all arguments at once
function assembleCar(platform, engine, trim) {
  return `Car: ${platform} platform + ${engine} engine + ${trim} trim`;
}

console.log("\n=== Currying ===");
console.log(assembleCar("Heartect", "K-Series", "ZXi+"));
// Output: Car: Heartect platform + K-Series engine + ZXi+ trim

// Curried: takes one argument at a time
function assembleCarCurried(platform) {
  return function (engine) {
    return function (trim) {
      return `Car: ${platform} platform + ${engine} engine + ${trim} trim`;
    };
  };
}

// Call step by step
const withHeartect = assembleCarCurried("Heartect");
const withKSeries = withHeartect("K-Series");
const fullyAssembled = withKSeries("ZXi+");
console.log("Curried (step by step):", fullyAssembled);
// Output: Curried (step by step): Car: Heartect platform + K-Series engine + ZXi+ trim

// Or call all at once
console.log("Curried (chained):", assembleCarCurried("TNGA")("Diesel")("VXi"));
// Output: Curried (chained): Car: TNGA platform + Diesel engine + VXi trim

// Arrow syntax makes currying very concise
const configureCar = (platform) => (engine) => (trim) =>
  `Car: ${platform} platform + ${engine} engine + ${trim} trim`;

console.log("Arrow curried:", configureCar("Heartect")("Boosterjet")("Alpha"));
// Output: Arrow curried: Car: Heartect platform + Boosterjet engine + Alpha trim


// --- Generic Curry Utility ---

function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn(...args);
    }
    return function (...moreArgs) {
      return curried(...args, ...moreArgs);
    };
  };
}

const curriedAssemble = curry(assembleCar);

console.log("\nGeneric curry:");
console.log(curriedAssemble("Heartect", "K-Series", "ZXi+"));
// Output: Car: Heartect platform + K-Series engine + ZXi+ trim
console.log(curriedAssemble("Heartect")("K-Series")("ZXi+"));
// Output: Car: Heartect platform + K-Series engine + ZXi+ trim
console.log(curriedAssemble("Heartect", "K-Series")("ZXi+"));
// Output: Car: Heartect platform + K-Series engine + ZXi+ trim


// WHY: Partial application "pre-fills" some arguments, creating a
// specialized version of a general function. Unlike currying (which
// always takes one arg at a time), partial application can fix any
// number of arguments.

// --- Partial Application ---

function partial(fn, ...presetArgs) {
  return function (...laterArgs) {
    return fn(...presetArgs, ...laterArgs);
  };
}

function logProduction(timestamp, plant, model, status) {
  return `[${timestamp}] ${plant} | ${model} — ${status}`;
}

// Pre-fill timestamp and plant
const logGurgaonPlant = partial(logProduction, "2025-06-15", "Gurgaon Plant");

console.log("\n=== Partial Application ===");
console.log(logGurgaonPlant("Swift", "ASSEMBLED"));
// Output: [2025-06-15] Gurgaon Plant | Swift — ASSEMBLED
console.log(logGurgaonPlant("Baleno", "QUALITY CHECK"));
// Output: [2025-06-15] Gurgaon Plant | Baleno — QUALITY CHECK

// Using .bind() for partial application (built-in alternative)
const logManesarPlant = logProduction.bind(null, "2025-06-15", "Manesar Plant");
console.log(logManesarPlant("Brezza", "SHIPPED"));
// Output: [2025-06-15] Manesar Plant | Brezza — SHIPPED


// --- Currying vs Partial Application (Side by Side) ---

console.log("\n=== Currying vs Partial Application ===");

// Curried: each call takes exactly ONE argument
const curriedLog = curry(logProduction);
const step1 = curriedLog("2025-06-15");
const step2 = step1("Gurgaon Plant");
const step3 = step2("Ertiga");
console.log("Curried:", step3("ONLINE"));
// Output: Curried: [2025-06-15] Gurgaon Plant | Ertiga — ONLINE

// Partially applied: fix ANY number of arguments at once
const partialLog = partial(logProduction, "2025-06-15", "Gurgaon Plant");
console.log("Partial:", partialLog("Ertiga", "ONLINE"));
// Output: Partial: [2025-06-15] Gurgaon Plant | Ertiga — ONLINE


// WHY: In the real world, higher-order functions appear constantly —
// event handlers, array method callbacks, middleware patterns, and more.

// --- Real-World: Event Handler Pattern (simulated) ---

console.log("\n=== Real-World Patterns ===");

// Simulating an event emitter
function createEventEmitter() {
  const listeners = {};

  return {
    on(event, callback) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    },

    emit(event, data) {
      if (!listeners[event]) return;
      for (const callback of listeners[event]) {
        callback(data);
      }
    },

    off(event, callback) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter((cb) => cb !== callback);
    },
  };
}

const factoryEvents = createEventEmitter();

// Passing functions as callbacks (higher-order pattern)
const onCarBuilt = (car) => console.log(`  [EVENT] Car built: ${car}`);
const onCarDispatched = (car) => console.log(`  [EVENT] Car dispatched: ${car}`);

factoryEvents.on("built", onCarBuilt);
factoryEvents.on("dispatched", onCarDispatched);

factoryEvents.emit("built", "Swift-ZXi-2025");
// Output:   [EVENT] Car built: Swift-ZXi-2025
factoryEvents.emit("dispatched", "Swift-ZXi-2025");
// Output:   [EVENT] Car dispatched: Swift-ZXi-2025


// --- Real-World: Array Methods Recap (all higher-order) ---

const cars = [
  { name: "Swift", weight: 890, operational: true },
  { name: "Alto", weight: 730, operational: true },
  { name: "Ciaz", weight: 1070, operational: false },
  { name: "Baleno", weight: 865, operational: true },
  { name: "SPresso", weight: 725, operational: false },
];

// .filter() — takes a predicate function
const activeCars = cars.filter((c) => c.operational);
console.log("\nActive cars:", activeCars.map((c) => c.name));
// Output: Active cars: [ 'Swift', 'Alto', 'Baleno' ]

// .map() — takes a transform function
const carLabels = cars.map((c) => `${c.name} (${c.weight}kg)`);
console.log("Labels:", carLabels);
// Output: Labels: [ 'Swift (890kg)', 'Alto (730kg)', 'Ciaz (1070kg)', 'Baleno (865kg)', 'SPresso (725kg)' ]

// .reduce() — takes an accumulator function
const totalWeight = cars.reduce((sum, c) => sum + c.weight, 0);
console.log("Total production weight:", totalWeight, "kg");
// Output: Total production weight: 4280 kg

// .sort() — takes a comparator function
const byWeight = [...cars].sort((a, b) => a.weight - b.weight);
console.log("Lightest first:", byWeight.map((c) => `${c.name}:${c.weight}kg`));
// Output: Lightest first: [ 'SPresso:725kg', 'Alto:730kg', 'Baleno:865kg', 'Swift:890kg', 'Ciaz:1070kg' ]

// Chaining higher-order methods (pipeline of transformations)
const report = cars
  .filter((c) => c.operational)
  .map((c) => ({ ...c, label: `${c.name} [ACTIVE]` }))
  .sort((a, b) => b.weight - a.weight)
  .map((c) => c.label);

console.log("Production report:", report);
// Output: Production report: [ 'Swift [ACTIVE]', 'Baleno [ACTIVE]', 'Alto [ACTIVE]' ]


// --- Bringing It All Together: Configurable Pipeline ---

console.log("\n=== Configurable Pipeline ===");

const filterBy = (key, value) => (arr) => arr.filter((item) => item[key] === value);
const sortBy = (key, order = "asc") => (arr) =>
  [...arr].sort((a, b) => (order === "asc" ? a[key] - b[key] : b[key] - a[key]));
const mapTo = (fn) => (arr) => arr.map(fn);

// Build a custom pipeline using pipe + curried/partially applied functions
const activeHeavyFirst = pipe(
  filterBy("operational", true),
  sortBy("weight", "desc"),
  mapTo((c) => `${c.name}: ${c.weight}kg`)
);

console.log("Pipeline result:", activeHeavyFirst(cars));
// Output: Pipeline result: [ 'Swift: 890kg', 'Baleno: 865kg', 'Alto: 730kg' ]

// Easily build a different pipeline with the same building blocks
const inactiveAlphabetical = pipe(
  filterBy("operational", false),
  sortBy("name"),
  mapTo((c) => c.name)
);

// Note: sorting strings with a-b subtraction gives NaN; let's fix sortBy for strings
const sortByName = (arr) => [...arr].sort((a, b) => a.name.localeCompare(b.name));

const inactiveReport = pipe(
  filterBy("operational", false),
  sortByName,
  mapTo((c) => c.name)
);

console.log("Inactive:", inactiveReport(cars));
// Output: Inactive: [ 'Ciaz', 'SPresso' ]


// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. A HIGHER-ORDER FUNCTION either takes a function as an argument,
//    returns a function, or both.
// 2. CALLBACKS let you inject behavior into reusable structures
//    (.map, .filter, .reduce, event handlers, etc.).
// 3. RETURNING FUNCTIONS creates factories and configurable utilities
//    with private state (via closures).
// 4. COMPOSE (right-to-left) and PIPE (left-to-right) chain small
//    functions into complex transformations — the essence of
//    functional programming.
// 5. CURRYING converts f(a, b, c) into f(a)(b)(c) — enabling
//    step-by-step configuration.
// 6. PARTIAL APPLICATION pre-fills some arguments to create a
//    specialized function — more flexible than currying.
// 7. Nearly all built-in array methods (.map, .filter, .reduce,
//    .sort, .find, .every, .some) are higher-order functions.
// 8. Combining these patterns (pipe + curry + map/filter) yields
//    expressive, reusable, testable data pipelines.
// ============================================================
