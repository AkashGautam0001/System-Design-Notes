/**
 * ============================================================
 *  FILE 6 : Template Literals
 * ============================================================
 *  Topic  : Basic interpolation ${}, multi-line strings,
 *           expression evaluation, nested templates,
 *           tagged template literals (intro).
 *
 *  WHY THIS MATTERS:
 *  Before template literals (ES6), building dynamic strings
 *  meant ugly concatenation with +. Template literals make
 *  string composition readable, multi-line friendly, and
 *  powerful enough to build DSLs via tagged templates.
 * ============================================================
 */

// ============================================================
// STORY: Pandit ji runs a wedding card printing press. Each
// card must be inscribed with the exact details — names, venue,
// muhurat time — interpolated perfectly. One wrong detail
// (concatenation bug) and the wrong family gets invited.
// ============================================================

// ────────────────────────────────────────────────────────────
// SECTION 1 — Basic Interpolation with ${}
// ────────────────────────────────────────────────────────────
// WHY: Interpolation lets you embed variables and expressions
// directly inside a string using backticks (`), eliminating
// the messy + " " + pattern.

const groomName = "Rajesh";
const brideName = "Priya";
const venueRent = 25;

// Old way — concatenation (hard to read)
const oldCard = "Groom " + groomName + " weds " + brideName + " for " + venueRent + " lakh venue.";
console.log("Old:", oldCard);
// Output: Old: Groom Rajesh weds Priya for 25 lakh venue.

// New way — template literal (clean and readable)
const newCard = `Groom ${groomName} weds ${brideName} for ${venueRent} lakh venue.`;
console.log("New:", newCard);
// Output: New: Groom Rajesh weds Priya for 25 lakh venue.

// ────────────────────────────────────────────────────────────
// SECTION 2 — Multi-line Strings
// ────────────────────────────────────────────────────────────
// WHY: Regular strings need \n for newlines. Template literals
// preserve line breaks naturally — perfect for generating
// readable text blocks, HTML, or log entries.

// Old way — escaped newlines
const oldShloka = "Shubh Vivah Samaroh,\nAapki gracious upasthiti,\nPrarthit hai!";
console.log("Old shloka:\n" + oldShloka);

// Template literal way — natural multi-line
const shloka = `
  Shubh Vivah Samaroh,
  Aapki gracious upasthiti,
  Prarthit hai!
`;
console.log("Card reads:", shloka);
// Output:
//   Shubh Vivah Samaroh,
//   Aapki gracious upasthiti,
//   Prarthit hai!

// Practical: generating a formatted wedding card
const weddingCard = `
+============================+
|  Groom  : ${groomName.padEnd(16)}  |
|  Bride  : ${brideName.padEnd(16)}  |
|  Venue  : ${String(venueRent).padEnd(16)}  |
+============================+
`;
console.log(weddingCard);
// Output:
// +============================+
// |  Groom  : Rajesh            |
// |  Bride  : Priya             |
// |  Venue  : 25                |
// +============================+

// ────────────────────────────────────────────────────────────
// SECTION 3 — Expression Evaluation Inside ${}
// ────────────────────────────────────────────────────────────
// WHY: You're not limited to simple variables. Any valid JS
// expression — arithmetic, function calls, ternaries — can
// go inside ${}.

const baseGuests = 40;
const perPlateMultiplier = 1.5;

console.log(`Total catering cost: ${baseGuests * perPlateMultiplier} thousand`);
// Output: Total catering cost: 60 thousand

// Ternary expression
const isDestinationWedding = true;
console.log(`Wedding type: ${isDestinationWedding ? "DESTINATION" : "Local"}`);
// Output: Wedding type: DESTINATION

// Function call inside ${}
function muhuratLevel(venueRent) {
  if (venueRent >= 50) return "Grand";
  if (venueRent >= 25) return "Standard";
  return "Simple";
}
console.log(`Muhurat level: ${muhuratLevel(venueRent)}`);
// Output: Muhurat level: Standard

// Method call
const rawFlower = "  Rajnigandha  ";
console.log(`Flower: [${rawFlower.trim().toUpperCase()}]`);
// Output: Flower: [RAJNIGANDHA]

// Math operations
const families = 3;
const totalVenueRent = venueRent * families;
console.log(`Booking for ${families} families costs ${totalVenueRent} lakh total.`);
// Output: Booking for 3 families costs 75 lakh total.

// ────────────────────────────────────────────────────────────
// SECTION 4 — Nested Template Literals
// ────────────────────────────────────────────────────────────
// WHY: Sometimes you need a template literal INSIDE another
// template literal — for conditional blocks, loops, or
// composing complex strings.

const functions = [
  { name: "Haldi",    type: "Ritual",   day: 1 },
  { name: "Sangeet",  type: "Dance",    day: 2 },
  { name: "Pheras",   type: "Wedding",  day: 4 },
];

// Nested template: ternary inside a template inside a template
const eventSummary = `Pandit ji's Schedule:
${functions.map(f => `  - ${f.name} (${f.type}) ${f.day >= 3 ? `[MAIN EVENT]` : `[Day ${f.day}]`}`).join("\n")}`;

console.log(eventSummary);
// Output:
// Pandit ji's Schedule:
//   - Haldi (Ritual) [Day 1]
//   - Sangeet (Dance) [Day 2]
//   - Pheras (Wedding) [MAIN EVENT]

// Another nesting example: conditional block
const hasBaraat = true;
const baraatStyle = "Ghodi with Band Baaja";

const profile = `
Pandit: ${groomName}
${hasBaraat ? `Baraat: ${baraatStyle} (confirmed)` : `Baraat: None`}
`;
console.log(profile.trim());
// Output:
// Pandit: Rajesh
// Baraat: Ghodi with Band Baaja (confirmed)

// ────────────────────────────────────────────────────────────
// SECTION 5 — Tagged Template Literals (Introduction)
// ────────────────────────────────────────────────────────────
// WHY: Tagged templates let a function process a template
// literal before it becomes a string. This is the foundation
// for libraries like styled-components, GraphQL's gql`...`,
// and safe SQL query builders. Deep dive in file 40.

// A tagged template is called like: tagFunction`template string`
// The tag receives:
//   - strings[] — the static parts between ${}
//   - ...values — the interpolated expressions

function decorate(strings, ...values) {
  let result = "";
  strings.forEach((str, i) => {
    result += str;
    if (i < values.length) {
      // Wrap each interpolated value in decorative borders
      result += `*${values[i]}*`;
    }
  });
  return result;
}

const decoration = "Marigold";
const quantity = 9001;
const decoratedCard = decorate`Order ${decoration} garlands quantity ${quantity}`;

console.log("Tagged result:", decoratedCard);
// Output: Tagged result: Order *Marigold* garlands quantity *9001*

// Practical example: a "safe" HTML escaper
function safeHTML(strings, ...values) {
  const escape = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  let result = "";
  strings.forEach((str, i) => {
    result += str;
    if (i < values.length) {
      result += escape(values[i]);
    }
  });
  return result;
}

const userInput = '<script>alert("shaadi!")</script>';
const safePage = safeHTML`<div>Pandit ji says: ${userInput}</div>`;
console.log("Safe HTML:", safePage);
// Output: Safe HTML: <div>Pandit ji says: &lt;script&gt;alert(&quot;shaadi!&quot;)&lt;/script&gt;</div>

// The raw property — access the raw (unprocessed) strings
function showRaw(strings) {
  console.log("Cooked:", strings[0]);
  console.log("Raw:", strings.raw[0]);
}
showRaw`Line1\nLine2`;
// Output:
// Cooked: Line1
// Line2
// Raw: Line1\nLine2

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Template literals use backticks (`) instead of quotes.
// 2. ${expression} embeds any JS expression — variables, math,
//    function calls, ternaries.
// 3. Multi-line strings "just work" — no \n needed.
// 4. Template literals can be nested: `...${condition ? `A` : `B`}...`
// 5. Tagged templates let a function intercept and process the
//    template — the basis for styled-components, gql, etc.
// 6. The tag function receives (strings[], ...values) where
//    strings are the static parts and values are the ${} parts.
// 7. strings.raw gives the un-escaped version of static parts.
//
// Pandit ji's wisdom: "Concatenation is a hand-written card
// from a bygone era. Template literals are the modern printing
// press every card maker should master."
// ============================================================
