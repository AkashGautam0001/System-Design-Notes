/**
 * ============================================================
 *  FILE 24 : Function Composition, Pipe, Currying & Partial
 *  Topic   : Functional Programming Patterns
 *  WHY THIS MATTERS:
 *    Composition builds complex transformations from simple,
 *    reusable functions. Currying and partial application let
 *    you configure functions incrementally. These are the
 *    backbone of functional JavaScript — used everywhere from
 *    Redux middleware to RxJS operators.
 * ============================================================
 */

// STORY: Amma's Masala Dabba — she chains spice processing steps
// (roast, grind, temper, mix) like a pipeline. Each function
// transforms the spice into the next stage.

// ────────────────────────────────────────────────────────────
//  BLOCK 1 : Function Composition (compose, pipe, point-free)
// ────────────────────────────────────────────────────────────

// WHY: compose(f, g)(x) === f(g(x)).  pipe is compose in
//      left-to-right order, which reads more naturally.

const compose = (...fns) => (x) =>
  fns.reduceRight((acc, fn) => fn(acc), x);

const pipe = (...fns) => (x) =>
  fns.reduce((acc, fn) => fn(acc), x);

// Amma's spice transformations
const roast   = (s) => `roasted(${s})`;
const grind   = (s) => `ground(${s})`;
const temper  = (s) => `tempered(${s})`;
const mix     = (s) => `mixed(${s})`;

console.log("=== Amma's Masala Dabba Composition ===");              // Output: === Amma's Masala Dabba Composition ===

// compose: right-to-left
const masala1 = compose(mix, temper, grind, roast);
console.log(`  compose: ${masala1("jeera")}`);
// Output:   compose: mixed(tempered(ground(roasted(jeera))))

// pipe: left-to-right (more readable)
const masala2 = pipe(roast, grind, temper, mix);
console.log(`  pipe:    ${masala2("jeera")}`);
// Output:   pipe:    mixed(tempered(ground(roasted(jeera))))

// WHY: Point-free style — we never name the argument.
const double  = (n) => n * 2;
const addOne  = (n) => n + 1;
const square  = (n) => n * n;

const transform = pipe(double, addOne, square);
// point-free: we pass transform directly without (x) => transform(x)
console.log(`  pipe(double, addOne, square)(3) = ${transform(3)}`);
// Output:   pipe(double, addOne, square)(3) = 49

// Composing string operations
const trim      = (s) => s.trim();
const lower     = (s) => s.toLowerCase();
const dashify   = (s) => s.replace(/\s+/g, "-");

const slugify = pipe(trim, lower, dashify);
console.log(`  slugify: "${slugify("  Masala Dosa  ")}"`);           // Output:   slugify: "masala-dosa"

// ────────────────────────────────────────────────────────────
//  BLOCK 2 : Currying (manual, generic utility, practical use)
// ────────────────────────────────────────────────────────────

// WHY: Currying transforms f(a, b, c) into f(a)(b)(c).
//      This lets us build specialized functions from general ones.

// Manual currying
const addManual = (a) => (b) => a + b;
const add10 = addManual(10);

console.log("\n=== Amma's Currying Station ===");                    // Output: === Amma's Currying Station ===
console.log(`  add10(5) = ${add10(5)}`);                             // Output:   add10(5) = 15

// Generic curry utility
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return (...next) => curried(...args, ...next);
  };
}

const multiply = curry((a, b, c) => a * b * c);

console.log(`  multiply(2)(3)(4) = ${multiply(2)(3)(4)}`);           // Output:   multiply(2)(3)(4) = 24
console.log(`  multiply(2, 3)(4) = ${multiply(2, 3)(4)}`);           // Output:   multiply(2, 3)(4) = 24
console.log(`  multiply(2, 3, 4) = ${multiply(2, 3, 4)}`);           // Output:   multiply(2, 3, 4) = 24

// WHY: Currying shines with map/filter — create reusable predicates.

const greaterThan = curry((threshold, value) => value > threshold);
const multiplyBy  = curry((factor, value) => value * factor);

const prices = [50, 150, 300, 500, 800];

const expensiveSpices = prices.filter(greaterThan(200));
console.log(`  > ₹200: [${expensiveSpices}]`);                      // Output:   > ₹200: [300,500,800]

const withGST = prices.map(multiplyBy(1.18));
console.log(`  +18% GST: [${withGST}]`);                            // Output:   +18% GST: [59,177,354,590,944]

// Curried gravy maker — configure base, then spice, then heat
const makeGravy = curry((base, spice, heat) =>
  `${base} gravy with ${spice} on ${heat} flame`
);

const makeSouthIndian = makeGravy("coconut");
const coconutMild = makeSouthIndian("curry leaves");

console.log(`  ${coconutMild("slow")}`);                             // Output:   coconut gravy with curry leaves on slow flame
console.log(`  ${coconutMild("high")}`);                             // Output:   coconut gravy with curry leaves on high flame

// ────────────────────────────────────────────────────────────
//  BLOCK 3 : Partial Application (bind, custom, vs currying)
// ────────────────────────────────────────────────────────────

// WHY: Partial application fixes some arguments up front and
//      returns a function expecting the rest. Unlike currying,
//      it does not require one-arg-at-a-time.

// Using Function.prototype.bind
function prepareDish(base, masala, tadka) {
  return `${base} with ${masala} and ${tadka} tadka`;
}

const dalBase = prepareDish.bind(null, "dal", "haldi-mirch");
console.log("\n=== Amma's Partial Application ===");                 // Output: === Amma's Partial Application ===
console.log(`  bind: ${dalBase("ghee-jeera")}`);                     // Output:   bind: dal with haldi-mirch and ghee-jeera tadka

// Custom partial utility
function partial(fn, ...preset) {
  return (...later) => fn(...preset, ...later);
}

const logKitchen = (level, kitchen, msg) =>
  `[${level}] (${kitchen}) ${msg}`;

const ammaLog = partial(logKitchen, "INFO", "Amma-Kitchen");
console.log(`  partial: ${ammaLog("Masala ready")}`);                // Output:   partial: [INFO] (Amma-Kitchen) Masala ready

const ammaWarn = partial(logKitchen, "WARN", "Amma-Kitchen");
console.log(`  partial: ${ammaWarn("Tadka burning!")}`);             // Output:   partial: [WARN] (Amma-Kitchen) Tadka burning!

// WHY: Partial with placeholder (advanced)
const PLACEHOLDER = Symbol("_");

function partialWithPlaceholders(fn, ...preset) {
  return (...later) => {
    const args = [...preset];
    let li = 0;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === PLACEHOLDER) {
        args[i] = later[li++];
      }
    }
    // Append remaining
    while (li < later.length) args.push(later[li++]);
    return fn(...args);
  };
}

const _ = PLACEHOLDER;
const middleDish = partialWithPlaceholders(prepareDish, _, "sambar powder", _);
console.log(`  placeholder: ${middleDish("rice", "mustard-seed")}`);
                                                                     // Output:   placeholder: rice with sambar powder and mustard-seed tadka

// Currying vs Partial — side by side
console.log("\n  --- Currying vs Partial ---");                      // Output:   --- Currying vs Partial ---
const curriedDish = curry(prepareDish);
const partialDish = partial(prepareDish, "biryani");

console.log(`  curried:  ${curriedDish("biryani")("garam masala")("dum")}`);
                                                                     // Output:   curried:  biryani with garam masala and dum tadka
console.log(`  partial:  ${partialDish("garam masala", "dum")}`);    // Output:   partial:  biryani with garam masala and dum tadka

// Composition + Currying combined
const processPrice = pipe(
  multiplyBy(1.18),
  addManual(50),
  String
);
console.log(`  composed+curried: ${processPrice(100)}`);             // Output:   composed+curried: 168

// ────────────────────────────────────────────────────────────
//  KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. compose(f, g) applies right-to-left; pipe(f, g) applies
//    left-to-right. Pipe reads more naturally for spice pipelines.
// 2. Currying converts makeGravy(base, spice, heat) to
//    makeGravy(base)(spice)(heat), enabling incremental specialization.
// 3. Partial application fixes some args now (like Amma pre-setting
//    coconut base), passes the rest later. More flexible than currying.
// 4. Combine composition + currying for powerful, readable
//    masala preparation pipelines.
