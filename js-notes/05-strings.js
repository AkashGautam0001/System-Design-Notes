/**
 * ============================================================
 *  FILE 5 : Strings
 * ============================================================
 *  Topic  : String creation, immutability, length, charAt, at,
 *           bracket access, case methods, searching methods,
 *           slicing, replacing, splitting, trimming, padding,
 *           repeating, regex methods, iteration.
 *
 *  WHY THIS MATTERS:
 *  Text is the most common data format in any application —
 *  usernames, messages, URLs, JSON, logs. Mastering string
 *  methods means you can search, transform, and validate text
 *  with confidence and zero guesswork.
 * ============================================================
 */

// ============================================================
// STORY: RAW Agent Vikram works for Indian intelligence.
// Every intercepted message must be decoded, sliced, searched,
// and transformed using JavaScript string operations.
// ============================================================

// ────────────────────────────────────────────────────────────
// SECTION 1 — String Creation & Immutability
// ────────────────────────────────────────────────────────────
// WHY: Strings can be created with quotes or the String
// constructor, but they are IMMUTABLE — you cannot change a
// character in place. Every "modification" returns a NEW string.

const codeName = "Baaz";                             // literal (preferred)
const backupName = String("Cheetah");                // String() constructor
const templateName = `Agent ${codeName}`;            // template literal

console.log(codeName);      // Output: Baaz
console.log(backupName);    // Output: Cheetah
console.log(templateName);  // Output: Agent Baaz

// Immutability demo
let intercepted = "HELLO";
intercepted[0] = "J";       // silently fails (no error, no change)
console.log("After mutation attempt:", intercepted);
// Output: After mutation attempt: HELLO

// ────────────────────────────────────────────────────────────
// SECTION 2 — .length, .charAt(), .at(), Bracket Access
// ────────────────────────────────────────────────────────────
// WHY: Accessing individual characters is the foundation for
// parsing and validation logic.

const secretCode = "TRIDENT";

console.log("Length:", secretCode.length);
// Output: Length: 7

console.log("charAt(0):", secretCode.charAt(0));
// Output: charAt(0): T

console.log("at(-1):", secretCode.at(-1));
// Output: at(-1): T
// .at() supports negative indices — very handy!

console.log("Bracket [3]:", secretCode[3]);
// Output: Bracket [3]: D

console.log("Out of bounds:", secretCode.charAt(99));
// Output: Out of bounds:                (empty string)
console.log("Bracket OOB:", secretCode[99]);
// Output: Bracket OOB: undefined

// ────────────────────────────────────────────────────────────
// SECTION 3 — Case Conversion
// ────────────────────────────────────────────────────────────
// WHY: Case-insensitive comparisons, formatting display text,
// and normalising user input all require case conversion.

const rawTransmission = "ThE PaKiStAn LiNk Is AcTiVe";

console.log("Upper:", rawTransmission.toUpperCase());
// Output: Upper: THE PAKISTAN LINK IS ACTIVE

console.log("Lower:", rawTransmission.toLowerCase());
// Output: Lower: the pakistan link is active

// ────────────────────────────────────────────────────────────
// SECTION 4 — Searching Methods
// ────────────────────────────────────────────────────────────
// WHY: You'll constantly need to check whether a string
// contains a keyword, or find its position.

const message = "The drop point is at Gate 7. Repeat: Gate 7.";

// indexOf / lastIndexOf — return position (or -1 if not found)
console.log("indexOf 'Gate':", message.indexOf("Gate"));
// Output: indexOf 'Gate': 21

console.log("lastIndexOf 'Gate':", message.lastIndexOf("Gate"));
// Output: lastIndexOf 'Gate': 37

console.log("indexOf 'Pier':", message.indexOf("Pier"));
// Output: indexOf 'Pier': -1

// includes — returns boolean
console.log("includes 'drop':", message.includes("drop"));
// Output: includes 'drop': true

// startsWith / endsWith
console.log("startsWith 'The':", message.startsWith("The"));
// Output: startsWith 'The': true

console.log("endsWith '7.':", message.endsWith("7."));
// Output: endsWith '7.': true

// ────────────────────────────────────────────────────────────
// SECTION 5 — Extracting Substrings
// ────────────────────────────────────────────────────────────
// WHY: Pulling out portions of a string is a daily operation —
// extracting tokens, file extensions, URL segments, etc.

const intel = "CLASSIFIED: Operation Trishul Dawn";

// slice(start, end) — end is exclusive; supports negatives
console.log("slice(0, 10):", intel.slice(0, 10));
// Output: slice(0, 10): CLASSIFIED

console.log("slice(12):", intel.slice(12));
// Output: slice(12): Operation Trishul Dawn

console.log("slice(-4):", intel.slice(-4));
// Output: slice(-4): Dawn

// substring(start, end) — similar but no negative indices,
// and if start > end it swaps them automatically
console.log("substring(12, 21):", intel.substring(12, 21));
// Output: substring(12, 21): Operation

console.log("substring(21, 12):", intel.substring(21, 12));
// Output: substring(21, 12): Operation
// (swapped — same result)

// ────────────────────────────────────────────────────────────
// SECTION 6 — Replacing Text
// ────────────────────────────────────────────────────────────
// WHY: Sanitizing input, redacting classified data, templating.

const report = "Agent Vikram met Agent Vikram at the safe house.";

// replace — only the FIRST occurrence
console.log("replace:", report.replace("Vikram", "Arjun"));
// Output: replace: Agent Arjun met Agent Vikram at the safe house.

// replaceAll — every occurrence
console.log("replaceAll:", report.replaceAll("Vikram", "Arjun"));
// Output: replaceAll: Agent Arjun met Agent Arjun at the safe house.

// With regex (g flag)
const redacted = report.replace(/Vikram/g, "[REDACTED]");
console.log("Regex replace:", redacted);
// Output: Regex replace: Agent [REDACTED] met Agent [REDACTED] at the safe house.

// ────────────────────────────────────────────────────────────
// SECTION 7 — Splitting & Joining
// ────────────────────────────────────────────────────────────
// WHY: Converting between strings and arrays is how you parse
// CSV, tokenize commands, and rebuild formatted output.

const orders = "move-north|hold-position|extract-asset";

const orderList = orders.split("|");
console.log("split:", orderList);
// Output: split: [ 'move-north', 'hold-position', 'extract-asset' ]

console.log("Rejoin:", orderList.join(" -> "));
// Output: Rejoin: move-north -> hold-position -> extract-asset

// Split every character
console.log("chars:", "SOS".split(""));
// Output: chars: [ 'S', 'O', 'S' ]

// ────────────────────────────────────────────────────────────
// SECTION 8 — Trimming Whitespace
// ────────────────────────────────────────────────────────────
// WHY: User input often has accidental spaces. Trimming
// prevents "  admin " from being treated differently than "admin".

const dirtyInput = "   safehouse location   ";

console.log("trim:", `'${dirtyInput.trim()}'`);
// Output: trim: 'safehouse location'

console.log("trimStart:", `'${dirtyInput.trimStart()}'`);
// Output: trimStart: 'safehouse location   '

console.log("trimEnd:", `'${dirtyInput.trimEnd()}'`);
// Output: trimEnd: '   safehouse location'

// ────────────────────────────────────────────────────────────
// SECTION 9 — Repeat, Pad
// ────────────────────────────────────────────────────────────
// WHY: Formatting output — IDs, tables, countdown displays —
// often requires repeating or padding strings.

// repeat
const separator = "-".repeat(30);
console.log(separator);
// Output: ------------------------------

const alarm = "ALERT! ".repeat(3);
console.log(alarm.trim());
// Output: ALERT! ALERT! ALERT!

// padStart / padEnd
const missionNumber = "42";
console.log("padStart:", missionNumber.padStart(6, "0"));
// Output: padStart: 000042

console.log("padEnd:", "Agent".padEnd(12, "."));
// Output: padEnd: Agent.......

// ────────────────────────────────────────────────────────────
// SECTION 10 — Regex Methods: .match(), .search()
// ────────────────────────────────────────────────────────────
// WHY: When indexOf isn't enough, regex gives you pattern-based
// searching and extraction.

const transmission = "Coordinates: 28.6139N, 77.2090E at 0300 hours";

// .search() — returns the index of the first regex match
console.log("search for digits:", transmission.search(/\d+\.\d+/));
// Output: search for digits: 13

// .match() — returns the matched substrings
const coords = transmission.match(/\d+\.\d+[A-Z]/g);
console.log("match coords:", coords);
// Output: match coords: [ '28.6139N', '77.2090E' ]

// ────────────────────────────────────────────────────────────
// SECTION 11 — .localeCompare()
// ────────────────────────────────────────────────────────────
// WHY: Sorting strings correctly across languages requires
// locale-aware comparison, not simple < / > operators.

const agentA = "arjun";
const agentB = "bheem";

console.log("localeCompare:", agentA.localeCompare(agentB));
// Output: localeCompare: -1
// (-1 = agentA comes before agentB; 0 = same; 1 = after)

const agents = ["dhruv", "arjun", "chandra", "bheem"];
agents.sort((a, b) => a.localeCompare(b));
console.log("Sorted agents:", agents);
// Output: Sorted agents: [ 'arjun', 'bheem', 'chandra', 'dhruv' ]

// ────────────────────────────────────────────────────────────
// SECTION 12 — String Iteration with for...of
// ────────────────────────────────────────────────────────────
// WHY: for...of iterates over each character (including multi-
// byte Unicode), unlike a for-index loop which can break on
// surrogate pairs.

const cipherText = "XRAY";
let decoded = "";

for (const char of cipherText) {
  // Shift each letter forward by 1 (simple Caesar cipher demo)
  decoded += String.fromCharCode(char.charCodeAt(0) + 1);
}

console.log("Original:", cipherText);
// Output: Original: XRAY
console.log("Shifted +1:", decoded);
// Output: Shifted +1: YSBZ

// Unicode-safe iteration
const flagMessage = "GO\u{1F680}NOW";
console.log("Length (misleading):", flagMessage.length);
// Output: Length (misleading): 7   (rocket emoji counts as 2 code units)

let charCount = 0;
for (const ch of flagMessage) {
  charCount++;
}
console.log("True char count:", charCount);
// Output: True char count: 6   (for...of counts the rocket as 1)

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1.  Strings are IMMUTABLE. Every method returns a NEW string.
// 2.  .at(-1) is the cleanest way to grab the last character.
// 3.  .includes(), .startsWith(), .endsWith() are boolean
//     searches; .indexOf() gives position or -1.
// 4.  .slice() is preferred over .substring() — it supports
//     negative indices and never auto-swaps arguments.
// 5.  .replace() hits the first match; .replaceAll() (or regex
//     /g) hits every match.
// 6.  .split() turns a string into an array; .join() reverses.
// 7.  .trim() removes leading/trailing whitespace — essential
//     for sanitising user input.
// 8.  .padStart()/.padEnd() for fixed-width formatting.
// 9.  .match() and .search() unlock regex-powered extraction.
// 10. for...of is the Unicode-safe way to iterate characters.
//
// Agent Vikram's rule: "Never trust raw input. Trim it, search
// it, slice it, and only then act on it."
// ============================================================
