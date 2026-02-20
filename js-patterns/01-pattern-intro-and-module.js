/**
 * ============================================================
 *  FILE 1 : Sharma ji's Kirana Store - Module Pattern
 *  Topic  : Module Pattern, Revealing Module Pattern, IIFE
 *  WHY THIS MATTERS:
 *    Modules are the foundation of organised JavaScript.
 *    Before ES6, closures and IIFEs were the ONLY way to
 *    achieve encapsulation.  Understanding these patterns
 *    explains why modern `import/export` works the way it
 *    does and how to keep private state truly private.
 * ============================================================
 */

// STORY: Sharma ji organises his kirana store with a private
//        godown (backroom) and a public billing counter, so
//        that only the right items are visible to customers.

console.log("=== FILE 01: Sharma ji's Kirana Store ===\n");

// ────────────────────────────────────
// BLOCK 1 — IIFE and Classic Module Pattern
// ────────────────────────────────────

// WHY: An IIFE (Immediately Invoked Function Expression) creates
//      a private scope.  Variables inside never leak to the outside.
//      This is like the rolling shutter of a kirana store — it runs
//      once at opening and seals the private godown from the outside.

const KiranaStore = (function () {
  // Private — nothing outside the IIFE can touch these (the godown)
  let itemCount = 0;
  const godown = [];

  // WHY: We return an object whose methods close over the
  //      private variables.  This IS the Module Pattern.
  return {
    add(name) {
      itemCount++;
      godown.push(name);
      return `Sharma ji stocked item: ${name}`;
    },
    count() {
      return itemCount;
    },
    list() {
      return godown.slice(); // return a copy, not the original
    },
  };
})();

console.log(KiranaStore.add("Atta 10kg"));           // Output: Sharma ji stocked item: Atta 10kg
console.log(KiranaStore.add("Toor Dal 5kg"));         // Output: Sharma ji stocked item: Toor Dal 5kg
console.log("Count:", KiranaStore.count());            // Output: Count: 2
console.log("List:", KiranaStore.list());              // Output: List: [ 'Atta 10kg', 'Toor Dal 5kg' ]

// WHY: Direct access to internals is impossible.
console.log("Direct godown?", typeof KiranaStore.godown);      // Output: Direct godown? undefined
console.log("Direct count?", typeof KiranaStore.itemCount);    // Output: Direct count? undefined

// ────────────────────────────────────
// BLOCK 2 — Revealing Module Pattern
// ────────────────────────────────────

// WHY: The Revealing Module Pattern defines ALL logic as private
//      functions, then returns an object that maps public names
//      to private references.  This makes the public API crystal
//      clear at a glance — like deciding which items go on the
//      display shelf. You just read the return statement.

console.log("\n--- Revealing Module Pattern ---");

const AccountBook = (function () {
  const records = [];
  let accessLog = [];

  function logAccess(action) {
    accessLog.push(`[${new Date().toISOString().slice(0, 10)}] ${action}`);
  }

  function store(doc) {
    logAccess(`Stored: ${doc}`);
    records.push(doc);
  }

  function retrieve(index) {
    logAccess(`Retrieved index ${index}`);
    return records[index] || "Not found";
  }

  function getRecordCount() {
    return records.length;
  }

  function getAccessLog() {
    return accessLog.slice();
  }

  // WHY: The "reveal" — only these four are public.
  //      `logAccess` stays completely hidden (like Sharma ji's
  //      private hisaab-kitaab entries that customers never see).
  return {
    store,
    retrieve,
    count: getRecordCount,
    log: getAccessLog,
  };
})();

AccountBook.store("Sugar 2kg");
AccountBook.store("Basmati Rice 5kg");
console.log("Sharma ji retrieves:", AccountBook.retrieve(0));  // Output: Sharma ji retrieves: Sugar 2kg
console.log("Record count:", AccountBook.count());             // Output: Record count: 2
console.log("Log entries:", AccountBook.log().length);         // Output: Log entries: 3

// WHY: logAccess is truly private — no way to call it from outside.
console.log("logAccess hidden?", typeof AccountBook.logAccess); // Output: logAccess hidden? undefined

// ────────────────────────────────────
// BLOCK 3 — ES6 Module Simulation (Namespace Pattern)
// ────────────────────────────────────

// WHY: Before native ES modules, developers simulated them with
//      namespace objects.  This technique is still useful when
//      you need multiple "modules" in a single file for demos
//      or when bundlers are not available.

console.log("\n--- ES6 Module Simulation ---");

const SharmaMart = {};

// "Module" A — Inventory helpers
SharmaMart.Inventory = (function () {
  function unitPrice(totalPrice, quantity) {
    return totalPrice / quantity;
  }

  function totalWeight(weightPerItem, quantity) {
    return weightPerItem * quantity;
  }

  // Simulates: export { unitPrice, totalWeight }
  return { unitPrice, totalWeight };
})();

// "Module" B — BillingCalculator (depends on Inventory)
SharmaMart.BillingCalculator = (function (Inv) {
  // WHY: We pass the dependency in as a parameter.  This is
  //      dependency injection — the earliest form of it in JS.
  function gstCalc(price, quantity, gstPercent) {
    const baseTotal = Inv.unitPrice(price, 1) * quantity;
    return `₹${(baseTotal * gstPercent / 100).toFixed(1)} GST on ₹${baseTotal.toFixed(1)}`;
  }

  function bulkDiscount(pricePerKg, kgs) {
    const totalWeight = Inv.totalWeight(pricePerKg, kgs);
    return `₹${(totalWeight * 0.95).toFixed(1)} after 5% bulk discount`;
  }

  return { gstCalc, bulkDiscount };
})(SharmaMart.Inventory); // "import" Inventory

console.log("GST:", SharmaMart.BillingCalculator.gstCalc(100, 3, 18));        // Output: GST: ₹54.0 GST on ₹300.0
console.log("Bulk:", SharmaMart.BillingCalculator.bulkDiscount(60, 10));      // Output: Bulk: ₹570.0 after 5% bulk discount

// Sharma ji uses the namespace to discover what's available
console.log("Store modules:", Object.keys(SharmaMart));                       // Output: Store modules: [ 'Inventory', 'BillingCalculator' ]
console.log("Inventory API:", Object.keys(SharmaMart.Inventory));             // Output: Inventory API: [ 'unitPrice', 'totalWeight' ]

// ────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────
// 1. IIFEs create a private scope — like the rolling shutter of
//    Sharma ji's kirana store, sealing the godown from outside.
// 2. The Module Pattern uses closures to expose a public billing
//    counter while keeping the godown hidden.  No class keyword needed.
// 3. The Revealing Module Pattern makes the public surface explicit
//    by mapping names in the return object to private functions —
//    like deciding which items go on the display shelf.
// 4. Namespace objects simulate ES6 modules in a single-file context
//    and support dependency injection through IIFE parameters.
// 5. Even with native ES modules, these patterns remain relevant
//    for understanding closures, encapsulation, and API design.

console.log("\n=== Sharma ji pulls down the shutter. Store secured. ===");
// Output: === Sharma ji pulls down the shutter. Store secured. ===
