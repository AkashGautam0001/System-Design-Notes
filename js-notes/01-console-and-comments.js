/**
 * ============================================================
 *  FILE 1 : Console Methods & Comments
 * ============================================================
 *  Topic  : console.log, .warn, .error, .table, .group/.groupEnd,
 *           .time/.timeEnd, .count, .clear, .dir, .assert
 *           Single-line //, multi-line /* *​/, JSDoc /** *​/
 *
 *  WHY THIS MATTERS:
 *  The console is your first debugging superpower. Before you
 *  can fix code, you need to *see* what the code is doing.
 *  Comments, on the other hand, are how you leave breadcrumbs
 *  for your future self (and every teammate who reads your code).
 * ============================================================
 */

// ============================================================
// STORY: CBI Inspector Sharma is investigating a jewellery
// heist in Chandni Chowk. Every console method is a tool in
// the inspector's kit.
// ============================================================

// ────────────────────────────────────────────────────────────
// SECTION 1 — console.log()  (The inspector's notebook)
// ────────────────────────────────────────────────────────────
// WHY: console.log() is the most common way to inspect values
// while your program runs. Think of it as writing a clue in
// your notebook.

const clue1 = "Muddy chappal print near the window";
const clue2 = "Broken bangles on the shop floor";

console.log("Clue found:", clue1);
// Output: Clue found: Muddy chappal print near the window

console.log("Clue found:", clue2);
// Output: Clue found: Broken bangles on the shop floor

// You can log multiple values at once
const suspectName = "Raju";
const suspectAge = 34;
console.log("Suspect:", suspectName, "| Age:", suspectAge);
// Output: Suspect: Raju | Age: 34

// ────────────────────────────────────────────────────────────
// SECTION 2 — console.warn() & console.error()
// ────────────────────────────────────────────────────────────
// WHY: Not every message has the same urgency. Warnings and
// errors stand out in the console so critical info isn't missed.

console.warn("WARNING: Fingerprint evidence is smudging in the humidity!");
// Output: WARNING: Fingerprint evidence is smudging in the humidity!
// (Displays with a yellow warning icon in most consoles)

console.error("ERROR: Chain of custody broken for Evidence #7!");
// Output: ERROR: Chain of custody broken for Evidence #7!
// (Displays with a red error icon in most consoles)

// ────────────────────────────────────────────────────────────
// SECTION 3 — console.table()
// ────────────────────────────────────────────────────────────
// WHY: When you have structured data (arrays, objects), a table
// view is far easier to read than a raw dump.

const evidenceLog = [
  { id: 1, item: "Muddy chappal print",   location: "Window sill" },
  { id: 2, item: "Broken bangles",        location: "Shop floor" },
  { id: 3, item: "Red sindoor smudge",    location: "Door handle" },
];

console.table(evidenceLog);
// Output:
// ┌─────────┬────┬──────────────────────┬──────────────┐
// │ (index) │ id │        item          │   location   │
// ├─────────┼────┼──────────────────────┼──────────────┤
// │    0    │ 1  │ 'Muddy chappal print'│ 'Window sill'│
// │    1    │ 2  │ 'Broken bangles'     │ 'Shop floor' │
// │    2    │ 3  │ 'Red sindoor smudge' │ 'Door handle'│
// └─────────┴────┴──────────────────────┴──────────────┘

// ────────────────────────────────────────────────────────────
// SECTION 4 — console.group() & console.groupEnd()
// ────────────────────────────────────────────────────────────
// WHY: Group related logs together so they collapse/expand in
// the console — perfect for organising clues by suspect.

console.group("Suspect: Raju");
console.log("Motive: Gambling debts");
console.log("Alibi: Claims he was at the chai stall");
console.log("Evidence: Chappal size matches the print");
console.groupEnd();
// Output:
// Suspect: Raju
//   Motive: Gambling debts
//   Alibi: Claims he was at the chai stall
//   Evidence: Chappal size matches the print

console.group("Suspect: Meena");
console.log("Motive: Revenge against the jeweller");
console.log("Alibi: Verified by two neighbours");
console.groupEnd();
// Output:
// Suspect: Meena
//   Motive: Revenge against the jeweller
//   Alibi: Verified by two neighbours

// ────────────────────────────────────────────────────────────
// SECTION 5 — console.time() & console.timeEnd()
// ────────────────────────────────────────────────────────────
// WHY: Sometimes you need to know *how long* an operation takes.
// The inspector wants to time how fast the forensic lab processes evidence.

console.time("evidenceProcessing");

// Simulate some work
let fingerprintMatches = 0;
for (let i = 0; i < 1_000_000; i++) {
  fingerprintMatches++;
}

console.timeEnd("evidenceProcessing");
// Output: evidenceProcessing: <X>ms   (actual time will vary)

// ────────────────────────────────────────────────────────────
// SECTION 6 — console.count()
// ────────────────────────────────────────────────────────────
// WHY: Counts how many times a particular label is logged.
// Great for tracking how often something happens without a
// manual counter variable.

console.count("clueDiscovered");
// Output: clueDiscovered: 1
console.count("clueDiscovered");
// Output: clueDiscovered: 2
console.count("clueDiscovered");
// Output: clueDiscovered: 3
console.count("deadEnd");
// Output: deadEnd: 1

// ────────────────────────────────────────────────────────────
// SECTION 7 — console.clear()
// ────────────────────────────────────────────────────────────
// WHY: Wipes the console clean. Useful when your output gets
// noisy and you want a fresh start.

// console.clear();
// Output: (console is cleared — uncomment to test)
// NOTE: Commented out so it doesn't erase the output above.

// ────────────────────────────────────────────────────────────
// SECTION 8 — console.dir()
// ────────────────────────────────────────────────────────────
// WHY: Shows an interactive/tree view of a JavaScript object.
// Especially handy for DOM elements in the browser, but in
// Node.js it prints a nicely formatted object.

const caseFile = {
  caseNumber: 4417,
  inspector: "Sharma",
  status: "Open",
  suspects: ["Raju", "Meena"],
  evidence: evidenceLog,
};

console.dir(caseFile, { depth: null });
// Output: (Displays the full nested object structure)

// ────────────────────────────────────────────────────────────
// SECTION 9 — console.assert()
// ────────────────────────────────────────────────────────────
// WHY: Assert logs ONLY when the condition is *false*. Think of
// it as the inspector saying "This should be true — yell at me
// if it's not."

const evidenceCount = 3;
console.assert(evidenceCount > 0, "We should have at least 1 piece of evidence!");
// Output: (nothing — condition is true, so assertion passes silently)

console.assert(evidenceCount > 10, "We need more than 10 pieces of evidence!");
// Output: Assertion failed: We need more than 10 pieces of evidence!

// ────────────────────────────────────────────────────────────
// SECTION 10 — Comments in JavaScript
// ────────────────────────────────────────────────────────────
// WHY: Code tells the computer *what* to do. Comments tell
// humans *why* the code does it.

// --- 10a: Single-line comments ---
// This is a single-line comment. Use it for short notes.
const verdict = "Not guilty"; // You can also put them at end of a line.

// --- 10b: Multi-line comments ---
/*
  Multi-line comments are wrapped with slash-star ... star-slash.
  Use them when one line isn't enough.

  Inspector Sharma's note:
  "The timeline doesn't add up. Raju says he left at 8 PM,
   but the CCTV footage shows movement at 8:47 PM."
*/

// --- 10c: JSDoc comments ---
/**
 * Analyses a clue and returns a relevance score.
 * @param {string} clue  - A description of the clue.
 * @param {number} age   - Hours since the clue was found.
 * @returns {number}       Relevance score from 0 to 100.
 */
function analyseClue(clue, age) {
  // Fresher clues score higher
  const freshnessBonus = Math.max(0, 100 - age * 2);
  const lengthScore = Math.min(clue.length, 50);
  return Math.round((freshnessBonus + lengthScore) / 2);
}

const relevance = analyseClue("Red sindoor smudge on door handle", 3);
console.log("Clue relevance score:", relevance);
// Output: Clue relevance score: 64

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. console.log()    — Your everyday debugging notebook.
// 2. console.warn()   — Yellow flag for non-critical issues.
// 3. console.error()  — Red flag for things that broke.
// 4. console.table()  — Beautiful tabular view for arrays/objects.
// 5. console.group()  — Nest related logs; end with groupEnd().
// 6. console.time()   — Start a timer; timeEnd() stops & prints.
// 7. console.count()  — Auto-incrementing label counter.
// 8. console.clear()  — Wipe the console slate clean.
// 9. console.dir()    — Deep-inspect an object's structure.
// 10. console.assert() — Silent unless the condition is false.
// 11. //               — Single-line comment.
// 12. /* ... */        — Multi-line comment block.
// 13. /** ... */       — JSDoc comment for documenting functions.
//
// Inspector Sharma says: "Log early, log often, and always
// leave comments so the next officer can pick up the trail."
// ============================================================
