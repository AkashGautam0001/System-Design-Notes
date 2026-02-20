/**
 * ============================================================
 *  FILE 23: call(), apply(), and bind()
 * ============================================================
 *  Topic: Explicitly setting the value of `this` when
 *         invoking or creating functions.
 *
 *  Why it matters: These three methods give you full manual
 *  control over `this`. They let you borrow methods, set
 *  context for callbacks, and create partially applied
 *  functions — all essential patterns in real codebases.
 * ============================================================
 *
 *  STORY: Think of functions as freelance Pandits for hire.
 *  With call() and apply() you invite Pandit ji for a one-time
 *  puja — you hand him a household (thisArg) and he performs
 *  the ritual immediately. With bind() Pandit ji signs a
 *  permanent contract: a brand-new function is returned that
 *  will ALWAYS perform puja for that family, no matter who
 *  calls him later.
 * ============================================================
 */

// ============================================================
//  EXAMPLE 1 — Freelance Pandits: call() and apply()
// ============================================================

// WHY: Sometimes a function lives on one object but you need
// it to operate on another. call() and apply() invoke the
// function immediately with a chosen `this`.

// ----- Our freelance Pandit function -----
function performPuja(samagri, mantra) {
  return `${this.name} offers ${samagri} and chants "${mantra}!"`;
}

const sharmaFamily = { name: "Sharma ji" };
const guptaFamily  = { name: "Gupta ji" };

// ----- call(): arguments listed one by one -----
console.log("--- call() ---");
console.log(performPuja.call(sharmaFamily, "ghee and camphor", "Om Namah Shivaya"));
// Output: Sharma ji offers ghee and camphor and chants "Om Namah Shivaya!"

console.log(performPuja.call(guptaFamily, "flowers and coconut", "Jai Shree Ram"));
// Output: Gupta ji offers flowers and coconut and chants "Jai Shree Ram!"

// ----- apply(): arguments passed as an array -----
console.log("\n--- apply() ---");
const guptaSamagri = ["havan samagri and til", "Om Swaha"];
console.log(performPuja.apply(guptaFamily, guptaSamagri));
// Output: Gupta ji offers havan samagri and til and chants "Om Swaha!"

// apply() is handy when you already have arguments in an array.
const donations = [1100, 2100, 501, 5100, 251];
console.log("Max donation:", Math.max.apply(null, donations));
// Output: Max donation: 5100
// (Modern alternative: Math.max(...donations))

// ----- Method borrowing -----
console.log("\n--- Method borrowing ---");
const vaidya = {
  name: "Vaidya Ayurved",
  heal(ailment) {
    return `${this.name} treats ${ailment} with herbal remedy`;
  },
};

// Borrow vaidya's method for Sharma family — a one-time job.
console.log(vaidya.heal.call(sharmaFamily, "the joint pain"));
// Output: Sharma ji treats the joint pain with herbal remedy

// The freelance pandit (heal) temporarily worked for Sharma ji
// but still belongs to the vaidya.
console.log(vaidya.heal("the chronic cough"));
// Output: Vaidya Ayurved treats the chronic cough with herbal remedy


// ============================================================
//  EXAMPLE 2 — Signing a Contract: bind()
// ============================================================

// WHY: bind() does NOT invoke the function. It returns a NEW
// function with `this` permanently locked. This is critical
// for callbacks (event handlers, setTimeout, etc.) where you
// need the context to stick.

const panditNetwork = {
  name: "Kashi Pandit Sangh",
  motto: "Dharma and Devotion",
  announce() {
    return `Network: ${this.name} — "${this.motto}"`;
  },
  recruitAfterDelay() {
    // Without bind, setTimeout would lose `this`.
    setTimeout(
      function () {
        console.log(`[Lost context] Network: ${this?.name || "UNKNOWN"}`);
        // Output: [Lost context] Network: UNKNOWN
      },
      100
    );

    // With bind, `this` is locked to panditNetwork.
    setTimeout(
      function () {
        console.log(`[Bound context] Network: ${this.name}`);
        // Output: [Bound context] Network: Kashi Pandit Sangh
      }.bind(this),
      200
    );
  },
};

console.log("\n--- bind() basic ---");
const boundAnnounce = panditNetwork.announce.bind(panditNetwork);

// Even though we detach it, `this` stays locked.
const detached = boundAnnounce;
console.log(detached());
// Output: Network: Kashi Pandit Sangh — "Dharma and Devotion"

console.log("\n--- bind() with setTimeout ---");
panditNetwork.recruitAfterDelay();

// ----- Partial application with bind -----
console.log("\n--- Partial application ---");

function preparePrasad(baseIngredient, sweet, garnish) {
  return `Prepared ${baseIngredient} ${sweet} with ${garnish} topping`;
}

// Lock the first argument; the rest are supplied later.
const prepareGheePrasad = preparePrasad.bind(null, "ghee");
console.log(prepareGheePrasad("ladoo", "dry fruits"));
// Output: Prepared ghee ladoo with dry fruits topping

console.log(prepareGheePrasad("halwa", "kesar"));
// Output: Prepared ghee halwa with kesar topping

// Lock two arguments.
const prepareGheeLadoo = preparePrasad.bind(null, "ghee", "ladoo");
console.log(prepareGheeLadoo("silver vark"));
// Output: Prepared ghee ladoo with silver vark topping


// ============================================================
//  call vs apply vs bind — Quick Reference
// ============================================================
//
//  Method  | Invokes immediately? | Args format        | Returns
//  --------|----------------------|--------------------|----------
//  call()  | YES                  | comma-separated    | result
//  apply() | YES                  | array              | result
//  bind()  | NO                   | comma-separated    | new fn
//
//  Mnemonic:
//    call  = C for Commas
//    apply = A for Array
//    bind  = B for "Bound" (a new function, for later)
// ============================================================

console.log("\n--- Quick demo comparing all three ---");

function reportSeva(location, status) {
  return `${this.name} at ${location}: ${status}`;
}

const sevadar = { name: "Pandit Shukla" };

// call — immediate, comma args
console.log("call: ", reportSeva.call(sevadar, "Sharma Niwas", "puja complete"));
// Output: call:  Pandit Shukla at Sharma Niwas: puja complete

// apply — immediate, array args
console.log("apply:", reportSeva.apply(sevadar, ["Gupta Bhawan", "havan in progress"]));
// Output: apply: Pandit Shukla at Gupta Bhawan: havan in progress

// bind — deferred, returns new function
const boundReport = reportSeva.bind(sevadar, "Verma Villa");
console.log("bind: ", boundReport("standing by"));
// Output: bind:  Pandit Shukla at Verma Villa: standing by


// ============================================================
//  KEY TAKEAWAYS
// ============================================================
// 1. call() and apply() invoke a function immediately with a
//    chosen `this`. The only difference is how you pass args:
//    commas (call) vs array (apply).
// 2. bind() returns a NEW function with `this` permanently
//    locked — it does NOT call the original.
// 3. Method borrowing: use call/apply to run one object's
//    method in the context of another object.
// 4. Partial application: bind() can pre-fill arguments,
//    creating specialized versions of general functions.
// 5. In modern JS, arrow functions and spread syntax reduce
//    the need for apply/bind, but knowing all three is
//    essential for reading existing codebases.
// ============================================================
