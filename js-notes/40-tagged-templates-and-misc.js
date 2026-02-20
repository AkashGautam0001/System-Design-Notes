/**
 * ============================================================
 * FILE 40: Tagged Templates & Miscellaneous Operators
 * ============================================================
 * Topic: Tagged template literals, comma operator, void, labels,
 *        eval(), with statement, and globalThis.
 *
 * WHY IT MATTERS:
 * Tagged templates unlock powerful DSLs — from safe HTML rendering
 * to SQL query builders. The "misc" operators are rarely used but
 * appear in legacy code, interviews, and library internals. Knowing
 * them prevents confusion and helps you read *any* JavaScript.
 * ============================================================
 */

// ============================================================
// STORY: THE AYURVEDA VAIDYA'S PRESCRIPTION PAD
// A Vaidya named Sharma maintains a prescription pad. Some
// formulations are modern and safe (tagged templates, globalThis).
// Others are ancient and risky (eval, with). He must understand
// them all — but wisely choose which ones to prescribe.
// ============================================================


// ============================================================
// SECTION 1 — TAGGED TEMPLATE LITERALS (DEEP DIVE)
// ============================================================

// WHY: Tagged templates let you intercept and transform template
// literal pieces BEFORE they become a final string. This is how
// libraries like lit-html, styled-components, and GraphQL tags work.

// --- How a tag function receives its arguments ---

function prescriptionFormat(strings, ...values) {
  // `strings` is an array of the static text segments
  // `values` are the interpolated expressions, in order
  console.log("Static parts:", strings);
  // Output: Static parts: [ 'Prescribing ', ' for ', '!' ]
  console.log("Dynamic parts:", values);
  // Output: Dynamic parts: [ 'Ashwagandha', 'the patient' ]

  // Rebuild the string manually
  let result = "";
  strings.forEach((str, i) => {
    result += str;
    if (i < values.length) {
      result += values[i].toUpperCase();
    }
  });
  return result;
}

const herbName = "Ashwagandha";
const target = "the patient";

const prescription = prescriptionFormat`Prescribing ${herbName} for ${target}!`;
console.log(prescription);
// Output: Prescribing ASHWAGANDHA for THE PATIENT!


// --- Example: Building a Simple HTML Sanitizer ---

// WHY: User input inside HTML can lead to XSS attacks. A tagged
// template can automatically escape dangerous characters.

function sanitize(strings, ...values) {
  const escapeHTML = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  let result = "";
  strings.forEach((str, i) => {
    result += str;
    if (i < values.length) {
      result += escapeHTML(values[i]); // only dynamic parts are escaped
    }
  });
  return result;
}

const patientInput = '<script>alert("wrong dosage")</script>';
const safeHTML = sanitize`<p>Patient noted: ${patientInput}</p>`;
console.log(safeHTML);
// Output: <p>Patient noted: &lt;script&gt;alert(&quot;wrong dosage&quot;)&lt;/script&gt;</p>

const cleanInput = "Vaidya Sharma";
const safeHTML2 = sanitize`<h1>Welcome, ${cleanInput}</h1>`;
console.log(safeHTML2);
// Output: <h1>Welcome, Vaidya Sharma</h1>


// --- Example: Building a SQL-like Tagged Template ---

// WHY: SQL injection is one of the most common security vulnerabilities.
// A tagged template can separate query structure from user values,
// mimicking parameterized queries.

function sql(strings, ...values) {
  let query = "";
  const params = [];

  strings.forEach((str, i) => {
    query += str;
    if (i < values.length) {
      params.push(values[i]);
      query += `$${params.length}`; // positional placeholder
    }
  });

  return { query: query.trim(), params };
}

const herbCategory = "Rasayana";
const minPotency = 5;

const result = sql`SELECT * FROM prescriptions WHERE category = ${herbCategory} AND potency >= ${minPotency}`;
console.log(result.query);
// Output: SELECT * FROM prescriptions WHERE category = $1 AND potency >= $2
console.log(result.params);
// Output: [ 'Rasayana', 5 ]

// The actual values are NEVER concatenated into the query string.
// This is exactly how libraries like slonik and pg-promise work.


// --- strings.raw: Accessing raw, unprocessed text ---

function showRaw(strings) {
  console.log("Cooked:", strings[0]); // interprets escape sequences
  console.log("Raw:   ", strings.raw[0]); // preserves backslashes
}

showRaw`Vaidya says:\n"Take twice daily"`;
// Output: Cooked: Vaidya says:
// "Take twice daily"
// Output: Raw:    Vaidya says:\n"Take twice daily"

// The built-in String.raw tag does the same:
console.log(String.raw`Dosage: 2g\ntwice daily`);
// Output: Dosage: 2g\ntwice daily


// ============================================================
// SECTION 2 — THE COMMA OPERATOR
// ============================================================

// WHY: The comma operator evaluates each operand left-to-right and
// returns the LAST value. It's rare in everyday code but shows up in
// minified JS, for-loop headers, and terse expressions.

const dosageResult = (1 + 1, 2 + 2, 3 + 3);
console.log("Dosage strength:", dosageResult);
// Output: Dosage strength: 6

// Practical use: multiple updates in a for-loop
const herbs = ["ashwagandha", "brahmi", "tulsi"];
for (let i = 0, j = herbs.length - 1; i < j; i++, j--) {
  console.log(`Mixing ${herbs[i]} with ${herbs[j]}`);
}
// Output: Mixing ashwagandha with tulsi

// NOTE: The comma in variable declarations (let a, b) and function
// arguments (fn(a, b)) is NOT the comma operator — it's just syntax.


// ============================================================
// SECTION 3 — THE void OPERATOR
// ============================================================

// WHY: `void expr` evaluates the expression and returns `undefined`.
// It's used to ensure something always yields undefined — especially
// in older code and bookmarklets. You'll see it in compiled output.

console.log(void 0);
// Output: undefined

console.log(void "Vaidya's restricted formula");
// Output: undefined

// Modern use: void is sometimes used with IIFEs in arrow contexts
// to signal "I don't care about the return value":
const prescribeQuietly = () => void console.log("Prescription written silently");
const quietResult = prescribeQuietly();
// Output: Prescription written silently
console.log("Return:", quietResult);
// Output: Return: undefined


// ============================================================
// SECTION 4 — LABELS WITH LOOPS
// ============================================================

// WHY: Labels let you break or continue OUTER loops from inside
// inner loops. Without them, break/continue only affect the
// innermost loop. Useful for nested search patterns.

const herbGrid = [
  ["ashwagandha", "shatavari", "guduchi"],
  ["brahmi", "turmeric", "neem"],
  ["tulsi", "amla", "triphala"],
];

// Find "turmeric" in the 2D grid
let foundHerb = null;

outerSearch: for (let row = 0; row < herbGrid.length; row++) {
  for (let col = 0; col < herbGrid[row].length; col++) {
    if (herbGrid[row][col] === "turmeric") {
      foundHerb = { row, col };
      break outerSearch; // breaks out of BOTH loops
    }
  }
}

console.log("Found herb at:", foundHerb);
// Output: Found herb at: { row: 1, col: 1 }

// continue with a label — skip entire outer iteration
console.log("--- Skipping row with 'neem' ---");
rowLoop: for (let r = 0; r < herbGrid.length; r++) {
  for (let c = 0; c < herbGrid[r].length; c++) {
    if (herbGrid[r][c] === "neem") {
      console.log(`  Row ${r} contains neem, skipping rest of row`);
      continue rowLoop; // jumps to next iteration of outer loop
    }
  }
  console.log(`  Row ${r} is neem-free:`, herbGrid[r]);
}
// Output: --- Skipping row with 'neem' ---
// Output:   Row 0 is neem-free: [ 'ashwagandha', 'shatavari', 'guduchi' ]
// Output:   Row 1 contains neem, skipping rest of row
// Output:   Row 2 is neem-free: [ 'tulsi', 'amla', 'triphala' ]


// ============================================================
// SECTION 5 — eval() (AND WHY TO AVOID IT)
// ============================================================

// WHY: eval() compiles and runs a string as JavaScript code at
// runtime. It's one of the most dangerous features in the language.
// Understanding WHY it's dangerous is as important as knowing it exists.

// --- Basic usage (for understanding only) ---
const ancientFormula = "2 + 2";
const evalResult = eval(ancientFormula);
console.log("eval result:", evalResult);
// Output: eval result: 4

// --- THE DANGERS ---

// 1. Security: eval can execute arbitrary code
//    eval(userInput) => if userInput is malicious, game over.

// 2. Performance: eval prevents engine optimizations.
//    The JS engine can't optimize code it hasn't seen yet.

// 3. Scope leakage: eval can create/modify variables in the
//    surrounding scope (in sloppy mode).
eval("var leakedFormula = 'Chyawanprash'");
console.log("Leaked from eval:", leakedFormula);
// Output: Leaked from eval: Chyawanprash

// 4. Debugging nightmare: stack traces become meaningless.

// --- Safer alternatives ---
// JSON.parse() for parsing data
// new Function() for dynamic functions (isolated scope)
// Template literals + tagged templates for dynamic strings

const saferDynamic = new Function("a", "b", "return a + b;");
console.log("new Function result:", saferDynamic(10, 20));
// Output: new Function result: 30

console.log("Rule: If you think you need eval(), you almost certainly don't.");
// Output: Rule: If you think you need eval(), you almost certainly don't.


// ============================================================
// SECTION 6 — THE with STATEMENT (BANNED IN STRICT MODE)
// ============================================================

// WHY: `with` extends the scope chain, making property access shorter
// but creating ambiguity about which variable is being referenced.
// It's banned in strict mode and should NEVER be used.

// NOTE: The following would throw in strict mode.
// We demonstrate it here purely for historical understanding.

const prescriptionPad = {
  title: "Vaidya Sharma's Ayurveda Prescriptions",
  pages: 342,
  language: "Sanskrit",
};

// The `with` statement — DO NOT USE
// with (prescriptionPad) {
//   console.log(title);    // "Vaidya Sharma's Ayurveda Prescriptions"
//   console.log(pages);    // 342
//   console.log(language); // "Sanskrit"
// }

// Why it's terrible: inside `with`, you can't tell if `title` refers
// to prescriptionPad.title, a local variable, or a global. This makes code
// unpredictable and un-optimizable.

// The safe alternative — destructuring:
const { title, pages, language } = prescriptionPad;
console.log(title);
// Output: Vaidya Sharma's Ayurveda Prescriptions
console.log(pages);
// Output: 342
console.log(language);
// Output: Sanskrit

console.log("'with' is forbidden. Use destructuring instead.");
// Output: 'with' is forbidden. Use destructuring instead.


// ============================================================
// SECTION 7 — globalThis
// ============================================================

// WHY: Different environments have different global objects:
//   - Browser: window (or self in workers)
//   - Node.js: global
//   - Deno: globalThis
// `globalThis` is the universal, cross-platform way to access it.

console.log("globalThis is available:", typeof globalThis !== "undefined");
// Output: globalThis is available: true

// Setting a global variable (use sparingly!)
globalThis.vaidyaName = "Sharma the Healer";
console.log(globalThis.vaidyaName);
// Output: Sharma the Healer

// Checking feature availability across environments
const hasSetTimeout = typeof globalThis.setTimeout === "function";
console.log("setTimeout available:", hasSetTimeout);
// Output: setTimeout available: true

const hasDocument = typeof globalThis.document !== "undefined";
console.log("DOM available:", hasDocument);
// Output: DOM available: false

// Cleanup
delete globalThis.vaidyaName;

// Before globalThis, cross-platform code looked like this:
// const global = typeof window !== 'undefined' ? window
//              : typeof global !== 'undefined' ? global
//              : typeof self   !== 'undefined' ? self
//              : {};
// globalThis eliminates all of that.


// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Tagged templates receive (strings[], ...values) — the static
//    parts and dynamic parts separately. Use them to build
//    sanitizers, query builders, i18n, and DSLs.
//
// 2. The HTML sanitizer pattern: escape only the dynamic values,
//    trust only the static template parts you wrote.
//
// 3. The SQL-like tag: never concatenate user values into the query.
//    Collect them as parameters instead — prevents injection.
//
// 4. Comma operator: evaluates all, returns last. Mostly seen in
//    for-loops and minified code.
//
// 5. void: always returns undefined. Rarely needed in modern JS.
//
// 6. Labels: let break/continue target outer loops. Great for
//    early exit from nested iterations.
//
// 7. eval() is dangerous — security holes, performance hits, scope
//    leaks. Use JSON.parse, new Function, or tagged templates.
//
// 8. `with` is banned in strict mode. Use destructuring instead.
//
// 9. globalThis is the universal global object — works everywhere:
//    browsers, Node, Deno, workers.
//
// Vaidya Sharma's wisdom: "Know the risky formulations so you can
// recognize them — but prescribe only the safe ones."
// ============================================================
