/**
 * ============================================================
 *  FILE 17 : Google Maps in Bangalore Traffic — Strategy Pattern
 *  Topic   : Strategy, Policy
 *  WHY THIS MATTERS:
 *    The Strategy pattern lets you swap algorithms at runtime
 *    without changing the code that uses them. Instead of
 *    giant if/else chains, you inject the behavior you need.
 *    You use it every time you pass a comparator to .sort().
 * ============================================================
 */

// STORY: Auto driver Raju navigates Bangalore traffic daily. Depending
// on the conditions — rain, peak hour, metro construction — he swaps his
// navigation strategy (auto-route, metro, bike, walking) so the ride is
// always optimal. Fare calculation changes with each strategy too.

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Classic Strategy (interchangeable sorting)
// ────────────────────────────────────────────────────────────

// WHY: Instead of hard-coding one comparison, we pass the strategy
// in. The navigator doesn't know or care which one is active.

console.log("=== BLOCK 1: Classic Strategy — Sorting ===");

const byName = (a, b) => a.name.localeCompare(b.name);
const byDistance = (a, b) => a.distance - b.distance;
const byTraffic = (a, b) => a.traffic - b.traffic;

class BangaloreNavigator {
  constructor(strategy) { this.strategy = strategy; }
  setStrategy(strategy) {
    // WHY: Swapping at runtime — no subclassing, no conditionals
    this.strategy = strategy;
  }
  planRoute(waypoints) {
    return [...waypoints].sort(this.strategy).map(w => w.name);
  }
}

const waypoints = [
  { name: "Silk Board Junction", distance: 12, traffic: 9 },
  { name: "Indiranagar", distance: 4, traffic: 3 },
  { name: "Koramangala", distance: 7, traffic: 6 },
  { name: "Whitefield", distance: 20, traffic: 8 },
];

const raju = new BangaloreNavigator(byDistance);
console.log("Sort by distance:", raju.planRoute(waypoints).join(" -> "));
// Output: Sort by distance: Indiranagar -> Koramangala -> Silk Board Junction -> Whitefield
raju.setStrategy(byTraffic);
console.log("Sort by traffic:", raju.planRoute(waypoints).join(" -> "));
// Output: Sort by traffic: Indiranagar -> Koramangala -> Whitefield -> Silk Board Junction
raju.setStrategy(byName);
console.log("Sort by name:", raju.planRoute(waypoints).join(" -> "));
// Output: Sort by name: Indiranagar -> Koramangala -> Silk Board Junction -> Whitefield

// WHY: The BangaloreNavigator never changed — only the strategy did (Open/Closed Principle).

// ────────────────────────────────────────────────────────────
// BLOCK 2 — Validation Strategies (fare calculation rules)
// ────────────────────────────────────────────────────────────

// WHY: Each validation rule is a strategy that can be composed
// and swapped — no giant validate() function.

console.log("\n=== BLOCK 2: Validation Strategies ===");

const required = {
  name: "required",
  validate(v) {
    const valid = v !== null && v !== undefined && v !== "";
    return { valid, message: valid ? "OK" : "Field is required" };
  }
};
const minLength = (min) => ({
  name: `minLength(${min})`,
  validate(v) {
    const valid = typeof v === "string" && v.length >= min;
    return { valid, message: valid ? "OK" : `Must be at least ${min} chars` };
  }
});
const isEmail = {
  name: "isEmail",
  validate(v) {
    const valid = typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    return { valid, message: valid ? "OK" : "Invalid email format" };
  }
};
const numberRange = (min, max) => ({
  name: `numberRange(${min},${max})`,
  validate(v) {
    const valid = typeof v === "number" && v >= min && v <= max;
    return { valid, message: valid ? "OK" : `Must be between ${min} and ${max}` };
  }
});

class FareCalculator {
  constructor() { this.fieldRules = {}; }
  addRule(field, strategy) {
    if (!this.fieldRules[field]) this.fieldRules[field] = [];
    this.fieldRules[field].push(strategy);
    return this;
  }
  validate(data) {
    const errors = [];
    for (const [field, strategies] of Object.entries(this.fieldRules)) {
      for (const s of strategies) {
        const r = s.validate(data[field]);
        if (!r.valid) errors.push({ field, rule: s.name, message: r.message });
      }
    }
    return { valid: errors.length === 0, errors };
  }
}

const form = new FareCalculator()
  .addRule("name", required).addRule("name", minLength(2))
  .addRule("email", required).addRule("email", isEmail)
  .addRule("age", numberRange(18, 120));

console.log("Valid data:", form.validate({ name: "Raju", email: "raju@auto.in", age: 35 }).valid);
// Output: Valid data: true
const result2 = form.validate({ name: "", email: "not-an-email", age: 12 });
console.log("Invalid data:", result2.valid); // Output: Invalid data: false
result2.errors.forEach(e => console.log(`  ${e.field}: ${e.message}`));
// Output:   name: Field is required
// Output:   name: Must be at least 2 chars
// Output:   email: Invalid email format
// Output:   age: Must be between 18 and 120

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Payment Strategies (UPI vs Cash vs Card)
// ────────────────────────────────────────────────────────────

// WHY: Strategy makes adding a new payment processor trivial —
// just add a new strategy, no changes to existing code.

console.log("\n=== BLOCK 3: Payment Processing Strategies ===");

// Classes for strategies that hold state
class UPIStrategy {
  constructor(upiId) { this.upiId = upiId; }
  pay(amt) { return `Paid ₹${amt.toFixed(2)} via UPI (${this.upiId})`; }
}
class CashStrategy {
  constructor(denomination) { this.denomination = denomination; }
  pay(amt) { return `Paid ₹${amt.toFixed(2)} in cash (₹${this.denomination} notes)`; }
}
class CardStrategy {
  constructor(num) { this.num = num; }
  pay(amt) {
    const last4 = this.num.slice(-4);
    return `Paid ₹${amt.toFixed(2)} with card ending ${last4}`;
  }
}

class AutoFareCheckout {
  constructor(strategy) { this.strategy = strategy; }
  setPaymentMethod(s) { this.strategy = s; }
  processPayment(amt) { return this.strategy ? this.strategy.pay(amt) : "No method"; }
}

const checkout = new AutoFareCheckout(new UPIStrategy("raju@okaxis"));
console.log(checkout.processPayment(150.00)); // Output: Paid ₹150.00 via UPI (raju@okaxis)
checkout.setPaymentMethod(new CashStrategy(100));
console.log(checkout.processPayment(250.50)); // Output: Paid ₹250.50 in cash (₹100 notes)
checkout.setPaymentMethod(new CardStrategy("4111222233334444"));
console.log(checkout.processPayment(500.00)); // Output: Paid ₹500.00 with card ending 4444

// WHY: In JS, functions ARE objects — you don't always need classes.
console.log("\nFunctions-as-strategies:");

const strategies = {
  auto:   (p) => ({ total: p, label: "Auto fare (standard)" }),
  metro:  (p) => ({ total: p + 30, label: "Metro + auto last mile (+₹30)" }),
  bike:   (p) => ({ total: p >= 200 ? p * 0.8 : p, label: p >= 200 ? "Bike taxi (20% off long ride)" : "Bike taxi (standard)" }),
};

function calcFare(price, mode) {
  const s = strategies[mode];
  return s ? s(price) : { total: price, label: "Unknown" };
}

const s1 = calcFare(120, "auto");
console.log(`  ${s1.label}: ₹${s1.total.toFixed(2)}`); // Output:   Auto fare (standard): ₹120.00
const s2 = calcFare(120, "metro");
console.log(`  ${s2.label}: ₹${s2.total.toFixed(2)}`); // Output:   Metro + auto last mile (+₹30): ₹150.00
const s3 = calcFare(250, "bike");
console.log(`  ${s3.label}: ₹${s3.total.toFixed(2)}`); // Output:   Bike taxi (20% off long ride): ₹200.00
const s4 = calcFare(100, "bike");
console.log(`  ${s4.label}: ₹${s4.total.toFixed(2)}`); // Output:   Bike taxi (standard): ₹100.00

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
console.log("\n=== KEY TAKEAWAYS ===");
console.log("1. Strategy swaps algorithms at runtime — Raju switches auto/metro/bike without changing the navigator"); // Output: 1. Strategy swaps algorithms at runtime — Raju switches auto/metro/bike without changing the navigator
console.log("2. In JS, strategies can be plain functions — no class boilerplate needed"); // Output: 2. In JS, strategies can be plain functions — no class boilerplate needed
console.log("3. Use classes when strategies need internal state (e.g., UPI ID, card number)"); // Output: 3. Use classes when strategies need internal state (e.g., UPI ID, card number)
console.log("4. Validation strategies compose naturally — add fare rules, not conditionals"); // Output: 4. Validation strategies compose naturally — add fare rules, not conditionals
console.log("5. Strategy eliminates switch/if-else chains (Open/Closed Principle)"); // Output: 5. Strategy eliminates switch/if-else chains (Open/Closed Principle)
