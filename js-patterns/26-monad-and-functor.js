/**
 * ============================================================
 *  FILE 26 : Monad & Functor Patterns
 *  Topic   : Functor, Monad, Maybe, Either/Result
 *  WHY THIS MATTERS:
 *    Functors and monads give us chainable containers that
 *    handle nulls, errors, and side-effects in a composable
 *    way — replacing scattered null checks and try/catch
 *    blocks with elegant pipelines.
 * ============================================================
 */

// STORY: Mumbai's Dabbawala system packs values in steel tiffin
// containers (dabbas) that chain safely through the rail network —
// Functor = dabba with `.map()`, Maybe = dabba might be empty,
// Either = delivery succeeded or address wrong.

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Functor: The Mappable Container
// ────────────────────────────────────────────────────────────
console.log("=== BLOCK 1: Functor ===");

// WHY: A Functor is any container that implements `map` —
// it lets you transform the value inside without unwrapping it.

// Array is the most familiar functor
const prices = [40, 60, 80];
const doubled = prices.map(x => x * 2);
console.log("Dabbawala maps over prices:", doubled);
// Output: Dabbawala maps over prices: [ 80, 120, 160 ]

// WHY: A custom Dabba functor wraps any single value.
class Dabba {
  constructor(value) { this._value = value; }

  // The functor contract: map applies fn and re-wraps
  map(fn) { return new Dabba(fn(this._value)); }

  // Utility to inspect
  inspect() { return `Dabba(${JSON.stringify(this._value)})`; }
}

const result = new Dabba(50)
  .map(x => x + 10)
  .map(x => x * 2)
  .map(x => `₹${x}`);

console.log("Dabbawala chains Dabba maps:", result.inspect());
// Output: Dabbawala chains Dabba maps: Dabba("₹120")

// WHY: Functor laws guarantee predictable composition.
// Law 1 — Identity: dabba.map(x => x) equals dabba
const idDabba = new Dabba(75).map(x => x);
console.log("Identity law:", idDabba.inspect());
// Output: Identity law: Dabba(75)

// Law 2 — Composition: map(f).map(g) equals map(x => g(f(x)))
const f = x => x + 5;
const g = x => x * 3;
const composed = new Dabba(10).map(x => g(f(x)));
const chained = new Dabba(10).map(f).map(g);
console.log("Composition law — composed:", composed.inspect(), "chained:", chained.inspect());
// Output: Composition law — composed: Dabba(45) chained: Dabba(45)

// ────────────────────────────────────────────────────────────
// BLOCK 2 — MaybeDabba Monad: Null-Safe Chaining
// ────────────────────────────────────────────────────────────
console.log("\n=== BLOCK 2: MaybeDabba Monad ===");

// WHY: MaybeDabba eliminates null checks by short-circuiting
// the chain when the value is null or undefined (no lunch today).

class MaybeDabba {
  constructor(value) { this._value = value; }

  static of(value) { return new MaybeDabba(value); }

  get isNothing() { return this._value === null || this._value === undefined; }

  // Functor: map
  map(fn) {
    return this.isNothing ? this : MaybeDabba.of(fn(this._value));
  }

  // Monad: flatMap (avoids MaybeDabba(MaybeDabba(x)) nesting)
  flatMap(fn) {
    return this.isNothing ? this : fn(this._value);
  }

  getOrElse(fallback) {
    return this.isNothing ? fallback : this._value;
  }

  inspect() {
    return this.isNothing ? "EmptyDabba" : `TiffinDabba(${JSON.stringify(this._value)})`;
  }
}

// Dabbawala looks up nested delivery data safely
const deliveries = {
  ramesh: { address: { area: "Nariman Point" } },
  suresh: { address: null },
  priya: null
};

function getArea(name) {
  return MaybeDabba.of(deliveries[name])
    .flatMap(u => MaybeDabba.of(u.address))
    .map(addr => addr.area)
    .getOrElse("Unknown");
}

console.log("Ramesh's area:", getArea("ramesh"));
// Output: Ramesh's area: Nariman Point
console.log("Suresh's area:", getArea("suresh"));
// Output: Suresh's area: Unknown
console.log("Priya's area:", getArea("priya"));
// Output: Priya's area: Unknown
console.log("Nobody's area:", getArea("nobody"));
// Output: Nobody's area: Unknown

// WHY: JavaScript's ?. is essentially a built-in MaybeDabba
const rameshArea = deliveries["ramesh"]?.address?.area ?? "Unknown";
const sureshArea = deliveries["suresh"]?.address?.area ?? "Unknown";
console.log("Optional chaining — Ramesh:", rameshArea, "Suresh:", sureshArea);
// Output: Optional chaining — Ramesh: Nariman Point Suresh: Unknown

// flatMap prevents nesting
const nested = MaybeDabba.of(50).flatMap(x => MaybeDabba.of(x * 10));
console.log("flatMap avoids nesting:", nested.inspect());
// Output: flatMap avoids nesting: TiffinDabba(500)

// ────────────────────────────────────────────────────────────
// BLOCK 3 — DeliveryResult Monad: Railway-Oriented Programming
// ────────────────────────────────────────────────────────────
console.log("\n=== BLOCK 3: DeliveryResult Monad ===");

// WHY: DeliveryResult handles errors as values — the "happy path"
// stays in Delivered (Right), failures ride in WrongAddress (Left).

class WrongAddress {
  constructor(value) { this._value = value; }
  map() { return this; }             // skip transforms
  flatMap() { return this; }         // skip transforms
  fold(leftFn, _rightFn) { return leftFn(this._value); }
  inspect() { return `WrongAddress(${JSON.stringify(this._value)})`; }
}

class Delivered {
  constructor(value) { this._value = value; }
  map(fn) { return new Delivered(fn(this._value)); }
  flatMap(fn) { return fn(this._value); }
  fold(_leftFn, rightFn) { return rightFn(this._value); }
  inspect() { return `Delivered(${JSON.stringify(this._value)})`; }
}

function tryCatch(fn) {
  try { return new Delivered(fn()); }
  catch (e) { return new WrongAddress(e.message); }
}

// Dabbawala builds a delivery validation pipeline
function parsePincode(input) {
  return tryCatch(() => {
    const n = Number(input);
    if (Number.isNaN(n)) throw new Error("Not a number");
    return n;
  });
}

function validatePincode(pin) {
  return pin >= 100000 && pin <= 999999
    ? new Delivered(pin)
    : new WrongAddress(`Pincode ${pin} out of range`);
}

function formatDelivery(pin) {
  return `Deliver to pincode ${pin}`;
}

// Railway: happy path
const happy = parsePincode("400001")
  .flatMap(validatePincode)
  .map(formatDelivery)
  .fold(
    err => `FAILED: ${err}`,
    val => `SUCCESS: ${val}`
  );
console.log("Happy path:", happy);
// Output: Happy path: SUCCESS: Deliver to pincode 400001

// Railway: parse failure
const parseFail = parsePincode("abc")
  .flatMap(validatePincode)
  .map(formatDelivery)
  .fold(
    err => `FAILED: ${err}`,
    val => `SUCCESS: ${val}`
  );
console.log("Parse failure:", parseFail);
// Output: Parse failure: FAILED: Not a number

// Railway: validation failure
const valFail = parsePincode("999")
  .flatMap(validatePincode)
  .map(formatDelivery)
  .fold(
    err => `FAILED: ${err}`,
    val => `SUCCESS: ${val}`
  );
console.log("Validation failure:", valFail);
// Output: Validation failure: FAILED: Pincode 999 out of range

function validateCustomerName(name) {
  return name && name.length >= 2
    ? new Delivered(name)
    : new WrongAddress("Customer name too short");
}

function validateLunchItem(item) {
  return item && ["roti", "sabzi", "dal", "rice", "biryani"].includes(item)
    ? new Delivered(item)
    : new WrongAddress("Invalid lunch item");
}

function validateOrder(name, item, pincode) {
  return validateCustomerName(name).flatMap(n =>
    validateLunchItem(item).flatMap(i =>
      parsePincode(pincode).flatMap(validatePincode).map(p =>
        ({ customer: n, lunchItem: i, pincode: p })
      )
    )
  );
}

const goodOrder = validateOrder("Ramesh", "dal", "400001");
console.log("Valid order:", goodOrder.fold(e => `ERR: ${e}`, u => `OK: ${JSON.stringify(u)}`));
// Output: Valid order: OK: {"customer":"Ramesh","lunchItem":"dal","pincode":400001}

const badOrder = validateOrder("R", "pizza", "400001");
console.log("Bad order:", badOrder.fold(e => `ERR: ${e}`, u => `OK: ${JSON.stringify(u)}`));
// Output: Bad order: ERR: Customer name too short

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. A Functor implements `map` — transforms values without
//    unwrapping the dabba. Array is the canonical example.
// 2. A Monad adds `flatMap`/`chain` — avoids nested wrapping
//    when the transform itself returns a tiffin container.
// 3. MaybeDabba handles null/undefined safely (empty dabba =
//    no lunch today); JS `?.` is similar.
// 4. DeliveryResult (WrongAddress/Delivered) encodes success/
//    failure as values, enabling railway-oriented delivery
//    validation without try/catch.
// 5. `fold` collapses the dabba back to a plain value,
//    forcing you to handle both cases explicitly.
