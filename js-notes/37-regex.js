/**
 * ============================================================
 *  FILE 37: REGULAR EXPRESSIONS (REGEX)
 * ============================================================
 *  Topic: Creating patterns, flags, methods, character classes,
 *         quantifiers, groups, lookaheads/lookbehinds, and
 *         practical use cases like email/URL/date extraction.
 *
 *  Why it matters:
 *    Regular expressions are the universal tool for pattern
 *    matching in strings.  From form validation to log parsing
 *    to search-and-replace, regex is everywhere.  Master it
 *    once, use it in every language.
 * ============================================================
 *
 *  STORY — "Operator Meena at the Aadhaar Verification Center"
 *  Operator Meena works at the Aadhaar Verification Center:
 *    - Every DOCUMENT (string) is scanned against a
 *      PATTERN (regex) to verify identity details.
 *    - The operator uses different TOOLS (methods) to scan,
 *      test, and extract citizen information.
 *    - FLAGS modify how thorough the search is (case-blind,
 *      global sweep, multiline scan, etc.).
 * ============================================================
 */

console.log("=== FILE 37: Regular Expressions (Regex) ===\n");

// ============================================================
//  EXAMPLE 1 — CREATING REGEX & CORE METHODS
//  (The operator's basic toolkit)
// ============================================================

// WHY: There are two ways to create regex and several methods
// to use them.  Knowing which method to reach for saves time
// and avoids bugs.

console.log("--- EXAMPLE 1: Creating Regex & Core Methods ---\n");

// --- Two ways to create ---

// 1. Literal syntax (preferred when pattern is fixed)
const aadhaarPattern = /\d{12}/i;

// 2. Constructor syntax (useful when pattern is dynamic)
const dynamicClue = "PAN";
const dynamicPattern = new RegExp(dynamicClue, "gi");

console.log("Pattern 1 (literal):", aadhaarPattern);
// Output: Pattern 1 (literal): /\d{12}/i

console.log("Pattern 2 (constructor):", dynamicPattern);
// Output: Pattern 2 (constructor): /PAN/gi

// --- Flags ---
/*
 *  g  — Global: find ALL matches, not just the first
 *  i  — Case-Insensitive: /a/i matches "A" and "a"
 *  m  — Multiline: ^ and $ match start/end of each LINE
 *  s  — DotAll: . matches newline characters too
 *  u  — Unicode: proper handling of Unicode code points
 *  d  — hasIndices: include start/end indices in match results
 */

// --- .test() — "Is this document format valid?" (returns boolean) ---
const citizenDoc = "Aadhaar-PAN-Passport-Aadhaar";

console.log("\n.test() — does the pattern exist?");
console.log(/aadhaar/i.test(citizenDoc));
// Output: true

console.log(/voter/i.test(citizenDoc));
// Output: false

// --- .exec() — "Extract the match details" (returns array or null) ---
console.log("\n.exec() — extract match details:");
const execResult = /(\w+)-(\w+)/i.exec(citizenDoc);
console.log("Full match:", execResult[0]);
// Output: Full match: Aadhaar-PAN
console.log("Group 1:", execResult[1]);
// Output: Group 1: Aadhaar
console.log("Group 2:", execResult[2]);
// Output: Group 2: PAN
console.log("Index:", execResult.index);
// Output: Index: 0

// --- String methods that accept regex ---

const verificationLog = "Case #42: The applicant submitted PAN and aadhaar copies at the PAN counter.";

// string.match() — find matches (returns array)
console.log("\n.match() without /g — first match + groups:");
console.log(verificationLog.match(/pan/i));
// Output: [ 'PAN', index: 33, ... ]

console.log("\n.match() with /g — all matches (no groups):");
console.log(verificationLog.match(/pan/gi));
// Output: [ 'PAN', 'PAN' ]

// string.matchAll() — iterable of ALL matches WITH groups (requires /g)
console.log("\n.matchAll() — all matches with full details:");
const allMatches = [...verificationLog.matchAll(/(\w+) copies/gi)];
allMatches.forEach((m) => {
  console.log(`  Match: "${m[0]}", Group 1: "${m[1]}", Index: ${m.index}`);
});
// Output:   Match: "aadhaar copies", Group 1: "aadhaar", Index: 52

// string.replace() — replace matches
console.log("\n.replace():");
console.log(verificationLog.replace(/pan/gi, "[REDACTED]"));
// Output: Case #42: The applicant submitted [REDACTED] and aadhaar copies at the [REDACTED] counter.

// string.search() — find index of first match (like indexOf for regex)
console.log("\n.search():");
console.log(verificationLog.search(/aadhaar/i));
// Output: 52

// string.split() — split string by regex
console.log("\n.split():");
const documents = "aadhaar;pan, passport; voter-id ,ration-card";
console.log(documents.split(/[;,]\s*/));
// Output: [ 'aadhaar', 'pan', 'passport', 'voter-id', 'ration-card' ]

// ============================================================
//  EXAMPLE 2 — CHARACTER CLASSES, QUANTIFIERS, & GROUPS
//  (Advanced document verification tools)
// ============================================================

// WHY: Character classes define WHAT to match, quantifiers
// define HOW MANY, and groups let you capture and reference
// sub-patterns.  These are the building blocks of every regex.

console.log("\n--- EXAMPLE 2: Character Classes, Quantifiers & Groups ---\n");

// --- Character classes ---
const applicantRecord = "Applicant age: 34. Phone: 98765-43210. Email: meena@uidai.gov.in";

// .  — any character (except newline without /s flag)
console.log("Dot (.):", applicantRecord.match(/age: .../));
// Output: Dot (.): [ 'age: 34.', ... ]

// \d — digit [0-9]
console.log("\\d:", applicantRecord.match(/\d+/g));
// Output: \d: [ '34', '98765', '43210' ]

// \w — word char [a-zA-Z0-9_]
console.log("\\w+:", "verification_desk_01".match(/\w+/));
// Output: \w+: [ 'verification_desk_01', ... ]

// \s — whitespace
console.log("\\s:", "a b\tc\nd".split(/\s/));
// Output: \s: [ 'a', 'b', 'c', 'd' ]

// \b — word boundary
console.log("\\b:", "pancard pan scatter".match(/\bpan\b/g));
// Output: \b: [ 'pan' ]

// ^ — start of string, $ — end of string
console.log("^...$:", /^Applicant/.test(applicantRecord));
// Output: ^...$: true

// [abc] — character set, [^abc] — negated set
console.log("[aeiou]:", "Operator".match(/[aeiou]/gi));
// Output: [aeiou]: [ 'O', 'e', 'a', 'o' ]

console.log("[^aeiou]:", "Operator".match(/[^aeiou]/gi));
// Output: [^aeiou]: [ 'p', 'r', 't', 'r' ]

// --- Quantifiers ---
console.log("\n--- Quantifiers ---");

const sampleString = "aabbbccccdddddeee";

// * — zero or more
console.log("x*:", "ac".match(/ab*c/));
// Output: x*: [ 'ac', ... ]

// + — one or more
console.log("b+:", sampleString.match(/b+/));
// Output: b+: [ 'bbb', ... ]

// ? — zero or one (optional)
console.log("colou?r:", "color colour".match(/colou?r/g));
// Output: colou?r: [ 'color', 'colour' ]

// {n} — exactly n
console.log("d{3}:", sampleString.match(/d{3}/));
// Output: d{3}: [ 'ddd', ... ]

// {n,m} — between n and m
console.log("c{2,3}:", sampleString.match(/c{2,3}/));
// Output: c{2,3}: [ 'ccc', ... ]

// --- Groups & Backreferences ---
console.log("\n--- Groups ---");

// () — capturing group
const filingRecord = "Document filed on 2024-03-15 at the district office.";
const dateMatch = filingRecord.match(/(\d{4})-(\d{2})-(\d{2})/);
console.log("Full:", dateMatch[0]);
// Output: Full: 2024-03-15
console.log("Year:", dateMatch[1], "Month:", dateMatch[2], "Day:", dateMatch[3]);
// Output: Year: 2024 Month: 03 Day: 15

// (?<name>) — named capturing group
const namedMatch = filingRecord.match(/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/);
console.log("Named groups:", namedMatch.groups);
// Output: Named groups: [Object: null prototype] { year: '2024', month: '03', day: '15' }

// \1 — backreference (match the same text as group 1)
console.log("\nBackreference — detect repeated words:");
const typo = "The the operator found found the record.";
console.log(typo.match(/\b(\w+)\s+\1\b/gi));
// Output: [ 'The the', 'found found' ]

// Non-capturing group (?:...) — groups without capturing
console.log("\nNon-capturing (?:):");
console.log("foobar foobaz".match(/foo(?:bar|baz)/g));
// Output: [ 'foobar', 'foobaz' ]

// --- Lookahead & Lookbehind ---
console.log("\n--- Lookahead & Lookbehind ---");

const idNumbers = "AADHAAR123456789012 AADHAARKUMAR AADHAAR987654321098 AADHAAR-X";

// (?=...) — positive lookahead: match if followed by ...
console.log("Positive lookahead (AADHAAR followed by digits):");
console.log(idNumbers.match(/AADHAAR(?=\d)/g));
// Output: [ 'AADHAAR', 'AADHAAR' ]  (AADHAAR123... and AADHAAR987...)

// (?!...) — negative lookahead: match if NOT followed by ...
console.log("Negative lookahead (AADHAAR NOT followed by digits):");
console.log(idNumbers.match(/AADHAAR(?!\d)\w*/g));
// Output: [ 'AADHAARKUMAR', 'AADHAAR' ]

// (?<=...) — positive lookbehind: match if preceded by ...
console.log("Positive lookbehind (digits after AADHAAR):");
console.log(idNumbers.match(/(?<=AADHAAR)\d+/g));
// Output: [ '123456789012', '987654321098' ]

// (?<!...) — negative lookbehind: match if NOT preceded by ...
console.log("Negative lookbehind (rupee not preceded by US):");
const prices = "US$100 EU$200 $300";
console.log(prices.match(/(?<!US)\$\d+/g));
// Output: [ '$200', '$300' ]

// ============================================================
//  EXAMPLE 3 — PRACTICAL PATTERNS
//  (Real-world document processing)
// ============================================================

// WHY: These are the patterns you'll actually use in production.
// Email validation, URL parsing, and data extraction come up
// constantly.

console.log("\n--- EXAMPLE 3: Practical Patterns ---\n");

// --- Email validation ---
// WHY: Form validation is the #1 use case for regex in web dev.

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const emails = [
  "meena@uidai.gov.in",
  "collector.patna@bihar.nic.in",
  "not-an-email",
  "@missing-local.com",
  "spaces in@email.com",
  "valid+tag@example.museum",
];

console.log("Email validation:");
emails.forEach((email) => {
  console.log(`  ${email.padEnd(40)} ${emailPattern.test(email) ? "VALID" : "INVALID"}`);
});
// Output:
//   meena@uidai.gov.in                       VALID
//   collector.patna@bihar.nic.in             VALID
//   not-an-email                             INVALID
//   @missing-local.com                       INVALID
//   spaces in@email.com                      INVALID
//   valid+tag@example.museum                 VALID

// --- URL parsing with named groups ---
console.log("\nURL parsing:");

const urlPattern = /^(?<protocol>https?):\/\/(?<host>[^/:]+)(?::(?<port>\d+))?(?<path>\/[^\s?#]*)?(?:\?(?<query>[^\s#]*))?(?:#(?<fragment>\S*))?$/;

const urls = [
  "https://uidai.gov.in:8080/verify/aadhaar?status=active#details",
  "http://localhost:3000/api/citizens",
];

urls.forEach((url) => {
  const match = url.match(urlPattern);
  if (match) {
    console.log(`\n  URL: ${url}`);
    const g = match.groups;
    console.log(`  Protocol: ${g.protocol}`);
    console.log(`  Host:     ${g.host}`);
    console.log(`  Port:     ${g.port ?? "(default)"}`);
    console.log(`  Path:     ${g.path ?? "/"}`);
    console.log(`  Query:    ${g.query ?? "(none)"}`);
    console.log(`  Fragment: ${g.fragment ?? "(none)"}`);
  }
});
// Output:
//   URL: https://uidai.gov.in:8080/verify/aadhaar?status=active#details
//   Protocol: https
//   Host:     uidai.gov.in
//   Port:     8080
//   Path:     /verify/aadhaar
//   Query:    status=active
//   Fragment: details
//
//   URL: http://localhost:3000/api/citizens
//   Protocol: http
//   Host:     localhost
//   Port:     3000
//   Path:     /api/citizens
//   Query:    (none)
//   Fragment: (none)

// --- Date extraction from text ---
console.log("\nDate extraction from verification report:");

const report = `
  Verification Log:
  - Aadhaar verified on 03/15/2024 at the district office.
  - PAN linked 2024-07-22 via online portal.
  - Address proof dated 12-25-2023 confirms residency.
  - Follow-up scheduled for 2025.01.10.
`;

// Match multiple date formats
const datePattern = /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})\b/g;
const datesFound = report.match(datePattern);

console.log("Dates found:", datesFound);
// Output: Dates found: [ '03/15/2024', '2024-07-22', '12-25-2023', '2025.01.10' ]

// --- Password strength check ---
console.log("\nPassword strength checker:");

function checkPasswordStrength(password) {
  const checks = {
    "Min 8 chars":    /.{8,}/.test(password),
    "Has uppercase":  /[A-Z]/.test(password),
    "Has lowercase":  /[a-z]/.test(password),
    "Has digit":      /\d/.test(password),
    "Has special":    /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const strength = passed <= 2 ? "WEAK" : passed <= 4 ? "MEDIUM" : "STRONG";

  console.log(`  Password: "${password}" -> ${strength}`);
  Object.entries(checks).forEach(([rule, ok]) => {
    console.log(`    ${ok ? "[PASS]" : "[FAIL]"} ${rule}`);
  });

  return strength;
}

checkPasswordStrength("abc");
// Output:
//   Password: "abc" -> WEAK
//   [FAIL] Min 8 chars
//   ...

checkPasswordStrength("Meena@Uidai#007!");
// Output:
//   Password: "Meena@Uidai#007!" -> STRONG
//   [PASS] Min 8 chars
//   ...

// --- Replace with a function ---
console.log("\nReplace with callback function:");

const sensitiveReport = "Aadhaar 834291076543 linked to Aadhaar 912345678901 at the center.";
const redacted = sensitiveReport.replace(/Aadhaar (\d+)/g, (fullMatch, digits) => {
  return `Aadhaar ${"*".repeat(digits.length)}`;
});
console.log(redacted);
// Output: Aadhaar ************ linked to Aadhaar ************ at the center.

// --- Splitting complex strings ---
console.log("\nSplit by multiple delimiters:");
const messyData = "aadhaar, pan;passport | voter-id\tration-card";
console.log(messyData.split(/\s*[,;|\t]\s*/));
// Output: [ 'aadhaar', 'pan', 'passport', 'voter-id', 'ration-card' ]

// ============================================================
//  KEY TAKEAWAYS
// ============================================================
/*
 * 1. TWO CREATION METHODS:
 *    - Literal: /pattern/flags  (preferred for fixed patterns)
 *    - Constructor: new RegExp(str, flags)  (for dynamic patterns)
 *
 * 2. ESSENTIAL FLAGS:
 *    g (global), i (case-insensitive), m (multiline),
 *    s (dotAll), u (unicode), d (indices).
 *
 * 3. METHODS CHEAT SHEET:
 *    - regex.test(str)       -> boolean
 *    - regex.exec(str)       -> match array or null
 *    - str.match(regex)      -> array (no /g: with groups; /g: all matches)
 *    - str.matchAll(regex)   -> iterator of all matches with groups (/g required)
 *    - str.replace(regex, x) -> new string
 *    - str.search(regex)     -> index or -1
 *    - str.split(regex)      -> array
 *
 * 4. CHARACTER CLASSES: \d (digit), \w (word), \s (space),
 *    \b (boundary), . (any), [abc] (set), [^abc] (negated).
 *
 * 5. QUANTIFIERS: * (0+), + (1+), ? (0-1), {n}, {n,m}.
 *
 * 6. GROUPS: () capture, (?<name>) named capture, \1 backreference,
 *    (?:) non-capturing.
 *
 * 7. LOOKAROUND:
 *    (?=x) positive lookahead, (?!x) negative lookahead,
 *    (?<=x) positive lookbehind, (?<!x) negative lookbehind.
 *
 * 8. PRACTICAL TIP: Keep regex readable.  If it's longer than
 *    one line, consider breaking it up or using named groups.
 *    Comment complex patterns liberally.
 *
 * 9. AADHAAR CENTER ANALOGY: The regex is the document pattern,
 *    the string is the citizen's submission, and the methods are
 *    Operator Meena's verification tools.
 */
