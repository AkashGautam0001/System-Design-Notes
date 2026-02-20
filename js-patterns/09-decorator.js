/**
 * ============================================================
 *  FILE 9 : The Paan Shop — Decorator Pattern
 *  Topic : Decorator, Function Decorator
 *  WHY THIS MATTERS:
 *    The Decorator pattern attaches new behavior to objects or
 *    functions dynamically, without modifying the original.
 *    It is an alternative to subclassing — more flexible and
 *    composable. In JavaScript, decorators appear as HOFs
 *    (higher-order functions), middleware, and the TC39
 *    decorator proposal for classes.
 * ============================================================
 */

// STORY: Paan wala Chhotu layers toppings onto a base paan.
// A plain meetha paan can be decorated with gulkand, coconut,
// or silver vark — each layer adds flavor and cost without
// altering the original paan.

"use strict";

// ────────────────────────────────────
// BLOCK 1: Object/Class Decorator (wrapping objects with additional behavior)
// ────────────────────────────────────

// WHY: Instead of creating subclasses for every combination
// (GulkandCoconutSilverVarkPaan), decorators let you compose
// toppings at runtime, one layer at a time.

console.log("--- Block 1: Object/Class Decorator ---");

class Paan {
  constructor(name) { this.name = name; }
  getDescription() { return this.name; }
  getCost() { return 20; }
}

// WHY: Each decorator wraps the previous object and delegates to it
class GulkandDecorator {
  constructor(p) { this._p = p; }
  getDescription() { return `${this._p.getDescription()} + Gulkand`; }
  getCost() { return this._p.getCost() + 15; }
}

class CoconutDecorator {
  constructor(p) { this._p = p; }
  getDescription() { return `${this._p.getDescription()} + Coconut`; }
  getCost() { return this._p.getCost() + 10; }
}

class SilverVarkDecorator {
  constructor(p) { this._p = p; }
  getDescription() { return `${this._p.getDescription()} + Silver Vark`; }
  getCost() { return this._p.getCost() + 50; }
}

// Chhotu layers toppings one by one
let paan = new Paan("Meetha Paan");
console.log(`Base: ${paan.getDescription()} — ₹${paan.getCost()}`); // Output: Base: Meetha Paan — ₹20

paan = new GulkandDecorator(paan);
console.log(`Added: ${paan.getDescription()} — ₹${paan.getCost()}`); // Output: Added: Meetha Paan + Gulkand — ₹35

paan = new CoconutDecorator(paan);
console.log(`Added: ${paan.getDescription()} — ₹${paan.getCost()}`); // Output: Added: Meetha Paan + Gulkand + Coconut — ₹45

paan = new SilverVarkDecorator(paan);
console.log(`Final: ${paan.getDescription()} — ₹${paan.getCost()}`); // Output: Final: Meetha Paan + Gulkand + Coconut + Silver Vark — ₹95

// WHY: Different customers get different combinations without new classes
let saadaPaan = new CoconutDecorator(new Paan("Saada Paan"));
console.log(`Saada: ${saadaPaan.getDescription()} — ₹${saadaPaan.getCost()}`); // Output: Saada: Saada Paan + Coconut — ₹30

// ────────────────────────────────────
// BLOCK 2: Function Decorators (HOFs that add logging, timing, validation)
// ────────────────────────────────────

// WHY: In JavaScript, functions are first-class. A function decorator
// wraps another function with extra behavior — logging, timing, caching.

console.log("\n--- Block 2: Function Decorators ---");

function preparePaan(type, quantity) {
  return `Prepared ${quantity} ${type} paan in ${100 + Math.floor(quantity * 2)}ms`;
}

// WHY: Adds logging without modifying the original function
function withLogging(fn, label) {
  return function (...args) {
    console.log(`[LOG] ${label} called with:`, args.join(", "));
    const result = fn.apply(this, args);
    console.log(`[LOG] ${label} returned:`, result);
    return result;
  };
}

const loggedPrepare = withLogging(preparePaan, "preparePaan");
loggedPrepare("meetha", 60);
// Output: [LOG] preparePaan called with: meetha, 60
// Output: [LOG] preparePaan returned: Prepared 60 meetha paan in 220ms

// Validation decorator — Chhotu rejects bad inputs at the counter
// WHY: Separates validation logic from business logic
function withValidation(fn, validator, errorMsg) {
  return function (...args) {
    if (!validator(...args)) throw new Error(errorMsg);
    return fn.apply(this, args);
  };
}

function setPrice(item, price) { return `${item} priced at ₹${price}`; }

const safeSetPrice = withValidation(
  setPrice,
  (_item, price) => typeof price === "number" && price > 0,
  "Price must be a positive number"
);

console.log(safeSetPrice("Banarasi Paan", 120)); // Output: Banarasi Paan priced at ₹120

try { safeSetPrice("Banarasi Paan", -5); } catch (e) {
  console.log("Validation caught:", e.message); // Output: Validation caught: Price must be a positive number
}

// Memoization decorator — Chhotu caches repeated calculations
// WHY: Avoids redundant computation for pure functions with same inputs
function withMemoization(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

function betelLeavesNeeded(orders, leavesPerPaan) { return Math.round(orders * leavesPerPaan * 1.15); }

const memoizedLeaves = withMemoization(betelLeavesNeeded);
console.log("Leaves:", memoizedLeaves(50, 70)); // Output: Leaves: 4025
console.log("Leaves (cached):", memoizedLeaves(50, 70)); // Output: Leaves (cached): 4025

// ────────────────────────────────────
// BLOCK 3: Method Decorators, Stacking Multiple Decorators, Ordering
// ────────────────────────────────────

// WHY: Decorators compose — you can stack them. The order matters!

console.log("\n--- Block 3: Stacking Decorators & Ordering ---");

// WHY: decorateMethod lets you enhance methods without changing the class
function decorateMethod(obj, methodName, decorator) {
  const original = obj[methodName].bind(obj);
  obj[methodName] = decorator(original, methodName);
}

class PaanShop {
  constructor(name) { this.name = name; }
  takeOrder(client) { return `${this.name} took order from ${client}`; }
}

const chhotuShop = new PaanShop("Chhotu's Paan Bhandar");
decorateMethod(chhotuShop, "takeOrder", withLogging);
chhotuShop.takeOrder("Bunty");
// Output: [LOG] takeOrder called with: Bunty
// Output: [LOG] takeOrder returned: Chhotu's Paan Bhandar took order from Bunty

// Stacking multiple decorators — order matters!
console.log("\nStacking decorators on a pricing function:");

function calculatePrice(base, quantity) { return base * quantity; }

function withDiscount(fn) {
  return function (...args) {
    const price = fn.apply(this, args);
    const discounted = price * 0.9;
    console.log(`  [Discount] ${price} -> ${discounted}`);
    return discounted;
  };
}

function withGST(fn) {
  return function (...args) {
    const price = fn.apply(this, args);
    const taxed = price * 1.18;
    console.log(`  [GST 18%] ${price} -> ${taxed}`);
    return taxed;
  };
}

function withRounding(fn) {
  return function (...args) {
    const price = fn.apply(this, args);
    const rounded = Math.round(price * 100) / 100;
    console.log(`  [Round] ${price} -> ${rounded}`);
    return rounded;
  };
}

// WHY: Innermost decorator runs first, outermost last
const finalPrice = withRounding(withGST(withDiscount(calculatePrice)));

console.log("Order: Discount -> GST -> Round");
const result = finalPrice(100, 3);
// Output: Order: Discount -> GST -> Round
// Output:   [Discount] 300 -> 270
// Output:   [GST 18%] 270 -> 318.6
// Output:   [Round] 318.6 -> 318.6
console.log("Final price:", result); // Output: Final price: 318.6

// Compose utility — Chhotu's helper to stack decorators cleanly
// WHY: compose(a, b, c)(fn) === a(b(c(fn)))
function compose(...decorators) {
  return (fn) => decorators.reduceRight((acc, dec) => dec(acc), fn);
}

const pipelinedPrice = compose(withRounding, withGST, withDiscount)(calculatePrice);

console.log("\nSame result via compose:");
const result2 = pipelinedPrice(50, 4);
// Output: Same result via compose:
// Output:   [Discount] 200 -> 180
// Output:   [GST 18%] 180 -> 212.4
// Output:   [Round] 212.4 -> 212.4
console.log("Pipelined price:", result2); // Output: Pipelined price: 212.4

// ────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────
// 1. Decorator adds behavior to objects/functions without modifying them
// 2. Object decorators wrap and delegate — composable alternative to subclassing
// 3. Function decorators (HOFs) add logging, timing, validation, memoization
// 4. Stacking order matters: the outermost decorator runs first on input
// 5. compose() utility makes stacking decorators readable and maintainable
// 6. Method decorators can be applied to individual methods on existing objects
// 7. Decorators follow the Open/Closed Principle: open for extension, closed for modification
