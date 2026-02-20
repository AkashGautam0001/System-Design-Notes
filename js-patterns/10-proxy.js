/**
 * ============================================================
 *  FILE 10 : The SBI Bank Guard — Proxy Pattern
 *  Topic : Proxy, ES6 Proxy, Reflect API
 *  WHY THIS MATTERS:
 *    A Proxy stands between a client and a real object,
 *    intercepting operations for access control, validation,
 *    lazy loading, logging, and reactive data binding. ES6's
 *    built-in Proxy + Reflect make this pattern first-class
 *    in JavaScript, powering frameworks like Vue.js.
 * ============================================================
 */

// STORY: Security guard Raju stands in front of the SBI bank locker room.
// Every request to access, modify, or inspect the lockers goes
// through Raju first. He checks Aadhaar, logs entries, and sometimes blocks.

"use strict";

// ────────────────────────────────────
// BLOCK 1: Classic Proxy (Virtual Proxy for Lazy Loading, Protection Proxy)
// ────────────────────────────────────

// WHY: Before ES6 Proxy, we built proxies manually by wrapping objects.

console.log("--- Block 1: Classic Proxy ---");

class LockerRoom {
  constructor() {
    this._contents = { gold: 5000, documents: 120, jewelry: 45 };
    console.log("  [LockerRoom] Heavy locker room door opened (expensive operation)");
  }
  getContents() { return { ...this._contents }; }
  deposit(item, amt) {
    this._contents[item] = (this._contents[item] || 0) + amt;
    return `Deposited ${amt} ${item}`;
  }
  withdraw(item, amt) {
    if ((this._contents[item] || 0) < amt) throw new Error(`Insufficient ${item}`);
    this._contents[item] -= amt;
    return `Withdrew ${amt} ${item}`;
  }
}

// WHY: Virtual proxy defers costly creation until first actual use
class LockerRoomProxy {
  constructor() { this._lockerRoom = null; }
  _ensure() { if (!this._lockerRoom) this._lockerRoom = new LockerRoom(); return this._lockerRoom; }
  getContents() { return this._ensure().getContents(); }
  deposit(i, a) { return this._ensure().deposit(i, a); }
  withdraw(i, a) { return this._ensure().withdraw(i, a); }
}

console.log("Raju creates a virtual proxy (locker room not opened yet)");
const lazyLocker = new LockerRoomProxy();
console.log("LockerRoom instance exists?", lazyLocker._lockerRoom !== null); // Output: LockerRoom instance exists? false

console.log("First access triggers locker room opening:");
const contents = lazyLocker.getContents();
// Output:   [LockerRoom] Heavy locker room door opened (expensive operation)
console.log("Gold:", contents.gold); // Output: Gold: 5000
console.log("LockerRoom instance exists now?", lazyLocker._lockerRoom !== null); // Output: LockerRoom instance exists now? true

// WHY: A protection proxy enforces access control rules
class ProtectedLockerRoom {
  constructor(lockerRoom, role) { this._lockerRoom = lockerRoom; this._role = role; }
  getContents() {
    if (this._role === "manager") return this._lockerRoom.getContents();
    return { message: "Access summary: locker room contains items" };
  }
  withdraw(item, amt) {
    if (this._role !== "manager") throw new Error("Raju says: Only managers can withdraw from lockers!");
    return this._lockerRoom.withdraw(item, amt);
  }
  deposit(item, amt) { return this._lockerRoom.deposit(item, amt); }
}

console.log("\nProtection proxy — role-based access:");
const managerLocker = new ProtectedLockerRoom(lazyLocker._lockerRoom, "manager");
const clerkLocker = new ProtectedLockerRoom(lazyLocker._lockerRoom, "clerk");

console.log("Manager sees:", JSON.stringify(managerLocker.getContents())); // Output: Manager sees: {"gold":5000,"documents":120,"jewelry":45}
console.log("Clerk sees:", JSON.stringify(clerkLocker.getContents())); // Output: Clerk sees: {"message":"Access summary: locker room contains items"}
console.log(clerkLocker.deposit("silver", 200)); // Output: Deposited 200 silver

try { clerkLocker.withdraw("gold", 100); } catch (e) {
  console.log("Clerk withdraw:", e.message); // Output: Clerk withdraw: Raju says: Only managers can withdraw from lockers!
}

// ────────────────────────────────────
// BLOCK 2: ES6 Proxy + Reflect (get/set traps, validation, logging)
// ────────────────────────────────────

// WHY: ES6 Proxy intercepts fundamental operations at the language level.
// Reflect provides the default behavior for each trap.

console.log("\n--- Block 2: ES6 Proxy + Reflect ---");

const lockerData = { gold: 5000, documents: 120, _aadhaarPin: "9876-5432-1098" };

// WHY: The handler defines traps that intercept operations on the target
const secureLocker = new Proxy(lockerData, {
  get(target, prop, receiver) {
    if (typeof prop === "string" && prop.startsWith("_")) {
      console.log(`  [Raju] BLOCKED read of private "${prop}"`);
      return undefined;
    }
    const value = Reflect.get(target, prop, receiver);
    console.log(`  [Raju] READ locker.${String(prop)} -> ${value}`);
    return value;
  },
  set(target, prop, value, receiver) {
    if (typeof prop === "string" && prop.startsWith("_")) {
      console.log(`  [Raju] BLOCKED write to private "${prop}"`);
      return true;
    }
    // WHY: Validation at the proxy layer keeps the target always valid
    if (typeof value === "number" && value < 0) {
      console.log(`  [Raju] REJECTED negative value for "${prop}": ${value}`);
      return true;
    }
    console.log(`  [Raju] WRITE locker.${String(prop)} = ${value}`);
    return Reflect.set(target, prop, value, receiver);
  },
  deleteProperty(_target, prop) {
    console.log(`  [Raju] DELETE attempt on "${prop}" — DENIED`);
    return true; // WHY: Block all deletions from the locker
  },
  has(target, prop) {
    // WHY: The 'in' operator also goes through the proxy
    if (typeof prop === "string" && prop.startsWith("_")) return false;
    return Reflect.has(target, prop);
  },
});

console.log("Gold:", secureLocker.gold);
// Output:   [Raju] READ locker.gold -> 5000
// Output: Gold: 5000
console.log("Aadhaar:", secureLocker._aadhaarPin);
// Output:   [Raju] BLOCKED read of private "_aadhaarPin"
// Output: Aadhaar: undefined

secureLocker.gold = 6000;
// Output:   [Raju] WRITE locker.gold = 6000
console.log("Updated gold:", lockerData.gold); // Output: Updated gold: 6000

secureLocker.documents = -50;
// Output:   [Raju] REJECTED negative value for "documents": -50
console.log("Documents unchanged:", lockerData.documents); // Output: Documents unchanged: 120

delete secureLocker.gold;
// Output:   [Raju] DELETE attempt on "gold" — DENIED
console.log("Gold still there:", lockerData.gold); // Output: Gold still there: 6000

console.log("'gold' in locker:", "gold" in secureLocker); // Output: 'gold' in locker: true
console.log("'_aadhaarPin' in locker:", "_aadhaarPin" in secureLocker); // Output: '_aadhaarPin' in locker: false

// ────────────────────────────────────
// BLOCK 3: Reactive Data Binding with Proxy (how Vue.js reactivity works)
// ────────────────────────────────────

// WHY: Vue.js 3 uses Proxy to make data reactive — when a property
// changes, subscribers are notified (and the UI re-renders).

console.log("\n--- Block 3: Reactive Data Binding ---");

function reactive(target, onChange) {
  const handler = {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      // WHY: Wrap nested objects in a proxy too (deep reactivity)
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        return new Proxy(value, handler);
      }
      return value;
    },
    set(obj, prop, value, receiver) {
      const oldValue = obj[prop];
      const result = Reflect.set(obj, prop, value, receiver);
      // WHY: Only fire onChange if the value actually changed
      if (oldValue !== value) onChange(prop, oldValue, value);
      return result;
    },
  };
  return new Proxy(target, handler);
}

const renderLog = [];
const state = reactive(
  { count: 0, account: { name: "Raju", role: "guard" } },
  (prop, oldVal, newVal) => {
    const msg = `[Reactive] "${prop}" changed: ${JSON.stringify(oldVal)} -> ${JSON.stringify(newVal)}`;
    renderLog.push(msg);
    console.log(msg);
  }
);

state.count = 1;        // Output: [Reactive] "count" changed: 0 -> 1
state.count = 5;        // Output: [Reactive] "count" changed: 1 -> 5
state.account.name = "Raju Srivastava"; // Output: [Reactive] "name" changed: "Raju" -> "Raju Srivastava"
state.account.role = "head guard";      // Output: [Reactive] "role" changed: "guard" -> "head guard"
state.count = 5; // same value — no reaction fires

console.log("\nTotal reactions:", renderLog.length); // Output: Total reactions: 4
console.log("Current state:", JSON.stringify({
  count: state.count, accountName: state.account.name, accountRole: state.account.role,
}));
// Output: Current state: {"count":5,"accountName":"Raju Srivastava","accountRole":"head guard"}

// Auto-validating form — practical use of Proxy + validation
console.log("\n--- Bonus: Auto-Validating Form ---");

const formErrors = [];
function validatedForm(schema) {
  return new Proxy({}, {
    set(target, prop, value) {
      const rule = schema[prop];
      if (rule && !rule.validate(value)) {
        formErrors.push(prop);
        console.log(`  [Form] Validation failed for "${prop}": ${rule.message}`);
        return true;
      }
      return Reflect.set(target, prop, value);
    },
    get(target, prop, receiver) { return Reflect.get(target, prop, receiver); },
  });
}

const form = validatedForm({
  age: { validate: (v) => typeof v === "number" && v >= 18 && v <= 120, message: "Age must be 18-120" },
  aadhaar: { validate: (v) => typeof v === "string" && /^\d{4}-\d{4}-\d{4}$/.test(v), message: "Aadhaar must be XXXX-XXXX-XXXX format" },
});

form.age = 25;
console.log("Age set:", form.age); // Output: Age set: 25
form.age = 10;
// Output:   [Form] Validation failed for "age": Age must be 18-120
console.log("Age unchanged:", form.age); // Output: Age unchanged: 25
form.aadhaar = "9876-5432-1098";
console.log("Aadhaar set:", form.aadhaar); // Output: Aadhaar set: 9876-5432-1098
form.aadhaar = "not-an-aadhaar";
// Output:   [Form] Validation failed for "aadhaar": Aadhaar must be XXXX-XXXX-XXXX format
console.log("Aadhaar unchanged:", form.aadhaar); // Output: Aadhaar unchanged: 9876-5432-1098
console.log("Total validation errors:", formErrors.length); // Output: Total validation errors: 2

console.log("\nRaju's shift ends. The locker room is secure.");

// ────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────
// 1. Proxy stands between client and object, intercepting operations
// 2. Virtual Proxy delays expensive object creation (locker room door) until first use
// 3. Protection Proxy enforces access control based on roles or rules
// 4. ES6 Proxy traps: get, set, deleteProperty, has, apply, construct, etc.
// 5. Reflect provides default behavior for each trap — use it as the fallback
// 6. Reactive data binding (Vue.js style) uses Proxy to detect changes
// 7. Proxy + validation = auto-enforcing schemas (Aadhaar format) on plain objects
// 8. Proxies are transparent — consumers don't know they're using one
