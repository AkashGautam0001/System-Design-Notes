/**
 * ============================================================
 *  FILE 38: PROXY & REFLECT
 * ============================================================
 *  Topic: Intercepting and customizing fundamental operations
 *         on objects using Proxy traps and the Reflect API.
 *
 *  Why it matters:
 *    Proxy lets you define custom behavior for fundamental
 *    operations (property lookup, assignment, enumeration,
 *    function invocation, etc.).  It powers Vue 3's reactivity
 *    system, validation layers, logging utilities, and more.
 *    Reflect provides the clean, functional counterpart to
 *    every Proxy trap.
 * ============================================================
 *
 *  STORY — "The Customs Inspector at Mumbai Port"
 *  At Mumbai Port, there is a CUSTOMS INSPECTOR (Proxy) named
 *  Deshmukh who stands between importers and the godown
 *  (warehouse / target object).  Every time someone tries to
 *  check, store, or remove cargo, Inspector Deshmukh
 *  INTERCEPTS the action (trap) and decides what to do.  His
 *  counterpart, REFLECT, performs the standard customs
 *  procedure whenever the inspector chooses to allow it.
 * ============================================================
 */

console.log("=== FILE 38: Proxy & Reflect ===\n");

// ============================================================
//  EXAMPLE 1 — PROXY FUNDAMENTALS & COMMON TRAPS
//  (The inspector begins his shift)
// ============================================================

// WHY: Proxy creates a wrapper around an object that intercepts
// operations.  Understanding the handler's "traps" is the key
// to unlocking Proxy's power.

console.log("--- EXAMPLE 1: Proxy Fundamentals & Common Traps ---\n");

// --- Basic structure: new Proxy(target, handler) ---

const godown = {
  spices: 500,
  textiles: 1200,
  electronics: 50,
  _smuggledGoods: "Hidden contraband",  // "private" by convention
};

// The Customs Inspector (Proxy handler)
const inspectorHandler = {

  // --- get trap: intercepts property reads ---
  get(target, property, receiver) {
    // Block access to "private" properties (those starting with _)
    if (typeof property === "string" && property.startsWith("_")) {
      console.log(`  Inspector: "The cargo '${property}' is seized and hidden from you!"`);
      return undefined;
    }

    console.log(`  Inspector: Importer checks '${property}'`);
    return Reflect.get(target, property, receiver);
  },

  // --- set trap: intercepts property writes ---
  set(target, property, value, receiver) {
    // Validation: only accept positive numbers for cargo quantities
    if (typeof value === "number" && value < 0) {
      console.log(`  Inspector: "You cannot set '${property}' to a negative quantity!"`);
      return false; // indicates failure (throws in strict mode)
    }

    console.log(`  Inspector: Importer updates '${property}' to ${value}`);
    return Reflect.set(target, property, value, receiver);
  },

  // --- has trap: intercepts the `in` operator ---
  has(target, property) {
    if (typeof property === "string" && property.startsWith("_")) {
      console.log(`  Inspector: "There is no '${property}' here..." (seized)`);
      return false;
    }
    return Reflect.has(target, property);
  },

  // --- deleteProperty trap: intercepts `delete` ---
  deleteProperty(target, property) {
    if (property === "electronics") {
      console.log(`  Inspector: "The electronics CANNOT be removed — duty unpaid!"`);
      return false;
    }
    console.log(`  Inspector: '${property}' has been cleared from the godown.`);
    return Reflect.deleteProperty(target, property);
  },

  // --- ownKeys trap: intercepts Object.keys(), for...in, etc. ---
  ownKeys(target) {
    // Hide private properties from enumeration
    return Reflect.ownKeys(target).filter(
      (key) => typeof key !== "string" || !key.startsWith("_")
    );
  },
};

const inspectedGodown = new Proxy(godown, inspectorHandler);

// --- Demonstrating each trap ---

// get
console.log("GET traps:");
console.log("  Spices:", inspectedGodown.spices);
// Output:   Inspector: Importer checks 'spices'
// Output:   Spices: 500

inspectedGodown._smuggledGoods;
// Output:   Inspector: "The cargo '_smuggledGoods' is seized and hidden from you!"

// set
console.log("\nSET traps:");
inspectedGodown.spices = 600;
// Output:   Inspector: Importer updates 'spices' to 600

inspectedGodown.textiles = -100;
// Output:   Inspector: "You cannot set 'textiles' to a negative quantity!"

console.log("  Textiles after invalid set:", godown.textiles);
// Output:   Textiles after invalid set: 1200

// has
console.log("\nHAS trap (in operator):");
console.log("  'spices' in godown?", "spices" in inspectedGodown);
// Output:   'spices' in godown? true

console.log("  '_smuggledGoods' in godown?", "_smuggledGoods" in inspectedGodown);
// Output:   Inspector: "There is no '_smuggledGoods' here..." (seized)
// Output:   '_smuggledGoods' in godown? false

// deleteProperty
console.log("\nDELETE trap:");
delete inspectedGodown.electronics;
// Output:   Inspector: "The electronics CANNOT be removed — duty unpaid!"

// ownKeys
console.log("\nOWN KEYS trap (Object.keys):");
console.log("  Visible keys:", Object.keys(inspectedGodown));
// Output:   Visible keys: [ 'spices', 'textiles', 'electronics' ]
// (_smuggledGoods is filtered out)

// --- Reflect API: the standard customs procedure ---
console.log("\n--- Reflect API ---");

// WHY: Reflect provides methods for every Proxy trap.  It
// returns booleans for success/failure instead of throwing,
// and gives a cleaner alternative to Object.* methods.

const portOffice = { name: "Mumbai Port Trust", docks: 4 };

// Reflect.get — same as obj[prop]
console.log("Reflect.get:", Reflect.get(portOffice, "name"));
// Output: Reflect.get: Mumbai Port Trust

// Reflect.set — same as obj[prop] = value, returns boolean
console.log("Reflect.set:", Reflect.set(portOffice, "docks", 5));
// Output: Reflect.set: true
console.log("  Docks now:", portOffice.docks);
// Output:   Docks now: 5

// Reflect.has — same as `prop in obj`
console.log("Reflect.has:", Reflect.has(portOffice, "name"));
// Output: Reflect.has: true

// Reflect.deleteProperty — same as `delete obj[prop]`
Reflect.deleteProperty(portOffice, "docks");
console.log("After delete:", portOffice);
// Output: After delete: { name: 'Mumbai Port Trust' }

// Reflect.ownKeys — like Object.keys + Symbol keys + non-enumerable
console.log("Reflect.ownKeys:", Reflect.ownKeys({ a: 1, b: 2 }));
// Output: Reflect.ownKeys: [ 'a', 'b' ]

// --- apply & construct traps ---
console.log("\n--- apply & construct traps ---");

// apply trap: intercepts function calls
function summonLabourer(name) {
  return `Labourer ${name} has been called to the dock!`;
}

const labourerProxy = new Proxy(summonLabourer, {
  apply(target, thisArg, argumentsList) {
    console.log(`  Inspector intercepts call for: ${argumentsList[0]}`);
    return Reflect.apply(target, thisArg, argumentsList);
  },
});

console.log(labourerProxy("Ramesh Patil"));
// Output:   Inspector intercepts call for: Ramesh Patil
// Output: Labourer Ramesh Patil has been called to the dock!

// construct trap: intercepts `new` operator
class CargoContainer {
  constructor(name, weight) {
    this.name = name;
    this.weight = weight;
  }
}

const CargoContainerProxy = new Proxy(CargoContainer, {
  construct(target, args, newTarget) {
    console.log(`  Inspector: Creating container with args: ${JSON.stringify(args)}`);
    return Reflect.construct(target, args, newTarget);
  },
});

const container = new CargoContainerProxy("Saffron Crate", 10);
console.log(`  Created: ${container.name}, Weight ${container.weight} tonnes`);
// Output:   Inspector: Creating container with args: ["Saffron Crate",10]
// Output:   Created: Saffron Crate, Weight 10 tonnes

// ============================================================
//  EXAMPLE 2 — PRACTICAL PROXY PATTERNS
//  (The inspector's real-world checkpoints)
// ============================================================

// WHY: Proxy isn't just theoretical — it solves real problems
// like type-safe objects, auto-logging, negative array indexing,
// and revocable access.

console.log("\n--- EXAMPLE 2: Practical Proxy Patterns ---\n");

// --- Pattern 1: Validation Proxy (type checking on set) ---
console.log("Pattern 1: Validation Proxy\n");

function createTypedObject(schema) {
  const data = {};

  return new Proxy(data, {
    set(target, prop, value) {
      if (prop in schema) {
        const expectedType = schema[prop];
        const actualType = typeof value;

        if (actualType !== expectedType) {
          throw new TypeError(
            `Property '${prop}' must be ${expectedType}, got ${actualType}`
          );
        }
      }
      return Reflect.set(target, prop, value);
    },
  });
}

const shipment = createTypedObject({
  name: "string",
  weightInTonnes: "number",
  isCleared: "boolean",
});

shipment.name = "Darjeeling Tea";
shipment.weightInTonnes = 100;
shipment.isCleared = true;
console.log("  Valid shipment:", { ...shipment });
// Output:   Valid shipment: { name: 'Darjeeling Tea', weightInTonnes: 100, isCleared: true }

try {
  shipment.weightInTonnes = "heavy"; // Wrong type!
} catch (err) {
  console.log("  Type error caught:", err.message);
  // Output:   Type error caught: Property 'weightInTonnes' must be number, got string
}

// --- Pattern 2: Logging / Debugging Proxy ---
console.log("\nPattern 2: Logging Proxy\n");

function withLogging(obj, label) {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") {
        console.log(`  [LOG ${label}] READ  ${String(prop)} => ${JSON.stringify(value)}`);
      }
      return value;
    },
    set(target, prop, value, receiver) {
      console.log(`  [LOG ${label}] WRITE ${String(prop)} <= ${JSON.stringify(value)}`);
      return Reflect.set(target, prop, value, receiver);
    },
  });
}

const cargoItem = withLogging({ type: "silk", quantity: 5 }, "Cargo");
cargoItem.type;
// Output:   [LOG Cargo] READ  type => "silk"
cargoItem.quantity = 10;
// Output:   [LOG Cargo] WRITE quantity <= 10

// --- Pattern 3: Negative Array Indexing ---
console.log("\nPattern 3: Negative Array Indexing\n");

// WHY: Python has arr[-1] for the last element.  JavaScript
// doesn't natively — but Proxy can add it (Array.at() also
// works now, but this demonstrates the concept).

function negativeArray(arr) {
  return new Proxy(arr, {
    get(target, prop, receiver) {
      const index = Number(prop);

      // If prop is a negative integer, convert to positive index
      if (Number.isInteger(index) && index < 0) {
        const positiveIndex = target.length + index;
        console.log(`  Inspector: Negative index [${index}] -> [${positiveIndex}]`);
        return Reflect.get(target, String(positiveIndex), receiver);
      }

      return Reflect.get(target, prop, receiver);
    },
  });
}

const cargoManifest = negativeArray(["Spices", "Textiles", "Tea", "Cashews", "Gems"]);

console.log("  Last item:", cargoManifest[-1]);
// Output:   Inspector: Negative index [-1] -> [4]
// Output:   Last item: Gems

console.log("  Second to last:", cargoManifest[-2]);
// Output:   Inspector: Negative index [-2] -> [3]
// Output:   Second to last: Cashews

console.log("  First (positive):", cargoManifest[0]);
// Output:   First (positive): Spices

// --- Pattern 4: Revocable Proxies ---
console.log("\nPattern 4: Revocable Proxy\n");

// WHY: Sometimes you want to grant temporary access that can
// be permanently revoked — like a customs clearance pass that expires.

const restrictedManifest = {
  saffron: "Kashmir Grade-A",
  sandalwood: "Mysore Reserve",
  cardamom: "Kerala Premium",
};

const { proxy: tempAccess, revoke } = Proxy.revocable(restrictedManifest, {
  get(target, prop) {
    console.log(`  Temporary access: reading '${prop}'`);
    return Reflect.get(target, prop);
  },
});

// Access works before revoking
console.log("  Saffron details:", tempAccess.saffron);
// Output:   Temporary access: reading 'saffron'
// Output:   Saffron details: Kashmir Grade-A

// Revoke access permanently
revoke();
console.log("  Access revoked!");

try {
  tempAccess.cardamom; // This will throw!
} catch (err) {
  console.log("  Error after revoke:", err.message);
  // Output:   Error after revoke: Cannot perform 'get' on a proxy that has been revoked
}

// --- Pattern 5: Default values for missing properties ---
console.log("\nPattern 5: Default Values Proxy\n");

function withDefaults(obj, defaults) {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (value === undefined && prop in defaults) {
        return defaults[prop];
      }
      return value;
    },
  });
}

const importer = withDefaults(
  { name: "Rajesh Mehta", firm: "Mehta Exports" },
  { clearanceLevel: "standard", dutyPaid: 0, visits: 1 }
);

console.log("  Name:", importer.name);
// Output:   Name: Rajesh Mehta
console.log("  Clearance (default):", importer.clearanceLevel);
// Output:   Clearance (default): standard
console.log("  Duty paid (default):", importer.dutyPaid);
// Output:   Duty paid (default): 0

// --- Full list of Proxy traps (reference) ---
console.log("\n--- All Proxy Traps (Reference) ---\n");

const allTraps = [
  ["get(target, prop, receiver)",              "Property read: obj.prop"],
  ["set(target, prop, value, receiver)",       "Property write: obj.prop = val"],
  ["has(target, prop)",                        "'prop' in obj"],
  ["deleteProperty(target, prop)",             "delete obj.prop"],
  ["apply(target, thisArg, args)",             "Function call: fn()"],
  ["construct(target, args, newTarget)",        "new Constructor()"],
  ["ownKeys(target)",                          "Object.keys(), for...in"],
  ["getOwnPropertyDescriptor(target, prop)",   "Object.getOwnPropertyDescriptor()"],
  ["defineProperty(target, prop, descriptor)", "Object.defineProperty()"],
  ["getPrototypeOf(target)",                   "Object.getPrototypeOf()"],
  ["setPrototypeOf(target, proto)",            "Object.setPrototypeOf()"],
  ["isExtensible(target)",                     "Object.isExtensible()"],
  ["preventExtensions(target)",                "Object.preventExtensions()"],
];

allTraps.forEach(([trap, intercepts]) => {
  console.log(`  ${trap.padEnd(48)} -> ${intercepts}`);
});

// ============================================================
//  KEY TAKEAWAYS
// ============================================================
/*
 * 1. PROXY = new Proxy(target, handler)
 *    Creates a wrapper that intercepts operations on the target.
 *    The handler object contains "traps" — functions that fire
 *    when specific operations are attempted.
 *
 * 2. COMMON TRAPS:
 *    - get:    reading a property
 *    - set:    writing a property
 *    - has:    the `in` operator
 *    - deleteProperty: the `delete` operator
 *    - apply:  calling a function
 *    - construct: the `new` operator
 *    - ownKeys: Object.keys() and friends
 *
 * 3. REFLECT API mirrors every Proxy trap:
 *    - Reflect.get(), Reflect.set(), Reflect.has(), etc.
 *    - Returns booleans for success/failure (cleaner than try/catch)
 *    - Always use Reflect inside traps for correct default behavior.
 *
 * 4. PRACTICAL PATTERNS:
 *    - Validation: type-check on set
 *    - Logging: transparent debugging layer
 *    - Negative indexing: Python-style arr[-1]
 *    - Default values: fallbacks for missing properties
 *    - Revocable access: Proxy.revocable() for temporary access
 *
 * 5. PERFORMANCE: Proxies add overhead to every intercepted
 *    operation.  Don't wrap hot-path objects in tight loops.
 *
 * 6. CUSTOMS INSPECTOR ANALOGY: The Proxy (Inspector Deshmukh)
 *    stands between you and the target (godown).  Every
 *    interaction passes through the inspector, who can allow,
 *    deny, transform, or log the operation.  Reflect is the
 *    standard customs procedure — the default action.
 */
