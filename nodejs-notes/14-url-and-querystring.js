/** ============================================================
 FILE 14: URL and Query String Parsing
 ============================================================
 Topic: URL class, URLSearchParams, legacy url.parse(),
        querystring module, practical URL manipulation
 WHY THIS MATTERS:
   Every web app deals with URLs — parsing routes, extracting
   query parameters, building API endpoints. The URL class is
   the modern standard; knowing the legacy APIs helps you
   maintain older codebases.
 ============================================================ */

// ============================================================
// STORY: IRCTC TRAVEL PORTAL
//   Rajesh works at the IRCTC booking portal where every
//   train journey is encoded in a URL. He must decode
//   booking addresses, extract passenger details, and build
//   new reservation links. Today he masters every tool in
//   the URL toolbox.
// ============================================================

const url = require("url");
const querystring = require("querystring");

// ============================================================
// EXAMPLE BLOCK 1 — The URL Class and searchParams
// ============================================================

console.log("=== BLOCK 1: The URL Class & searchParams ===\n");

// ──────────────────────────────────────────────────────────────
// 1a — Constructing and inspecting a URL
// ──────────────────────────────────────────────────────────────

// WHY: The URL class (WHATWG standard) is the modern way to
//   parse URLs in Node.js. It matches the browser's URL API,
//   so your knowledge transfers directly to frontend code.

const booking = new URL(
  "https://www.irctc.co.in:8443/booking/search?from=NDLS&to=BCT&class=3A&quota=GN&page=2#results"
);

console.log("  Full URL (href):");
console.log(`    ${booking.href}`);
// Output: https://www.irctc.co.in:8443/booking/search?from=NDLS&to=BCT&class=3A&quota=GN&page=2#results

console.log("\n  Decomposed parts:");
console.log(`    protocol:  ${booking.protocol}`);
// Output: protocol:  https:
console.log(`    hostname:  ${booking.hostname}`);
// Output: hostname:  www.irctc.co.in
console.log(`    port:      ${booking.port}`);
// Output: port:      8443
console.log(`    origin:    ${booking.origin}`);
// Output: origin:    https://www.irctc.co.in:8443
console.log(`    pathname:  ${booking.pathname}`);
// Output: pathname:  /booking/search
console.log(`    search:    ${booking.search}`);
// Output: search:    ?from=NDLS&to=BCT&class=3A&quota=GN&page=2
console.log(`    hash:      ${booking.hash}`);
// Output: hash:      #results

// ──────────────────────────────────────────────────────────────
// 1b — searchParams — the query string swiss army knife
// ──────────────────────────────────────────────────────────────

console.log("\n  --- searchParams methods ---\n");

const params = booking.searchParams;

// .get() — retrieve a single parameter
console.log(`    get('from'):     ${params.get("from")}`);
// Output: get('from'):     NDLS
console.log(`    get('to'):       ${params.get("to")}`);
// Output: get('to'):       BCT
console.log(`    get('missing'):  ${params.get("missing")}`);
// Output: get('missing'):  null

// .has() — check existence
console.log(`    has('class'):    ${params.has("class")}`);
// Output: has('class'):    true
console.log(`    has('date'):     ${params.has("date")}`);
// Output: has('date'):     false

// .set() — set/overwrite a parameter
params.set("page", "3");
console.log(`    set('page','3'): ${params.get("page")}`);
// Output: set('page','3'): 3

// .append() — add another value (allows duplicates)
params.append("stopover", "JHS");
params.append("stopover", "BPL");
console.log(`    getAll('stopover'): ${JSON.stringify(params.getAll("stopover"))}`);
// Output: getAll('stopover'): ["JHS","BPL"]

// WHY: .get() returns only the first value. Use .getAll()
//   when a parameter can appear multiple times (like filters
//   or multi-select checkboxes).

// .delete() — remove a parameter
params.delete("class");
console.log(`    After delete('class'), has: ${params.has("class")}`);
// Output: After delete('class'), has: false

// .toString() — serialize back to query string
console.log(`    toString(): ${params.toString()}`);
// Output: toString(): from=NDLS&to=BCT&quota=GN&page=3&stopover=JHS&stopover=BPL

// ──────────────────────────────────────────────────────────────
// 1c — Iterating over searchParams
// ──────────────────────────────────────────────────────────────

console.log("\n  --- Iterating with forEach and entries ---\n");

// .forEach()
console.log("    forEach:");
params.forEach((value, key) => {
  console.log(`      ${key} = ${value}`);
});

// .entries() — returns an iterator of [key, value] pairs
console.log("\n    entries (spread to array):");
const entries = [...params.entries()];
console.log(`      ${JSON.stringify(entries)}`);

// WHY: entries() is useful when you need to convert params
//   to a plain object or Map for further processing.

// .sort() — sorts parameters by name (alphabetical)
params.sort();
console.log(`\n    After sort(): ${params.toString()}`);
// Output: After sort(): from=NDLS&page=3&quota=GN&stopover=JHS&stopover=BPL&to=BCT

// ──────────────────────────────────────────────────────────────
// 1d — Constructing URLs with the URL class
// ──────────────────────────────────────────────────────────────

console.log("\n  --- Building URLs programmatically ---\n");

const trainBooking = new URL("https://api.irctc.co.in/v2/book");
trainBooking.searchParams.set("train", "12952");
trainBooking.searchParams.set("from", "NDLS");
trainBooking.searchParams.set("to", "MMCT");
trainBooking.searchParams.set("date", "2025-08-15");
trainBooking.searchParams.set("passengers", "2");

console.log(`    Built URL: ${trainBooking.href}`);
// Output: Built URL: https://api.irctc.co.in/v2/book?train=12952&from=NDLS&to=MMCT&date=2025-08-15&passengers=2

// WHY: Building URLs with the URL class avoids manual string
//   concatenation bugs — it handles encoding automatically.

// Special characters are encoded automatically
trainBooking.searchParams.set("notes", "window seat & lower berth");
console.log(`    With special chars: ${trainBooking.searchParams.get("notes")}`);
// Output: With special chars: window seat & lower berth
console.log(`    Encoded in URL: ...notes=${trainBooking.searchParams.toString().split("notes=")[1]}`);

// Relative URL resolution
const base = new URL("https://www.irctc.co.in/api/v1/");
const endpoint = new URL("trains?date=today", base);
console.log(`\n    Resolved relative URL: ${endpoint.href}`);
// Output: Resolved relative URL: https://www.irctc.co.in/api/v1/trains?date=today

console.log("");

// ============================================================
// EXAMPLE BLOCK 2 — URLSearchParams, Legacy APIs, Practical Use
// ============================================================

console.log("=== BLOCK 2: URLSearchParams, Legacy APIs & Practical Use ===\n");

// ──────────────────────────────────────────────────────────────
// 2a — URLSearchParams as a standalone tool
// ──────────────────────────────────────────────────────────────

console.log("  --- Standalone URLSearchParams ---\n");

// WHY: You can use URLSearchParams without a full URL —
//   handy for building query strings from objects or parsing
//   bare query strings.

// From a string
const fromString = new URLSearchParams("station=NDLS&city=New+Delhi&zone=NR");
console.log(`    From string: station=${fromString.get("station")}, zone=${fromString.get("zone")}`);
// Output: From string: station=NDLS, zone=NR

// From an object
const fromObject = new URLSearchParams({
  destination: "Varanasi",
  trainNo: "12560",
  class: "SL",
});
console.log(`    From object: ${fromObject.toString()}`);
// Output: From object: destination=Varanasi&trainNo=12560&class=SL

// From an array of pairs
const fromPairs = new URLSearchParams([
  ["passenger", "Rajesh Kumar"],
  ["passenger", "Sunita Devi"],
  ["passenger", "Amit Sharma"],
]);
console.log(`    From pairs: ${fromPairs.toString()}`);
// Output: From pairs: passenger=Rajesh+Kumar&passenger=Sunita+Devi&passenger=Amit+Sharma
console.log(`    getAll('passenger'): ${JSON.stringify(fromPairs.getAll("passenger"))}`);
// Output: getAll('passenger'): ["Rajesh Kumar","Sunita Devi","Amit Sharma"]

// ──────────────────────────────────────────────────────────────
// 2b — Legacy url.parse() (deprecated but still seen)
// ──────────────────────────────────────────────────────────────

console.log("\n  --- Legacy url.parse() ---\n");

// WHY: url.parse() is the Node-specific legacy API. It is
//   soft-deprecated in favor of the WHATWG URL class. You
//   will still see it in older codebases and tutorials.
//   NOTE: url.parse() does NOT handle searchParams — you
//   get a raw query string.

const legacyUrl = "https://www.irctc.co.in/trains?from=HWH&to=NDLS&class=2A&tatkal=true";
const parsed = url.parse(legacyUrl, true);
// WHY: The second argument `true` parses the query string
//   into an object using querystring.parse() internally.

console.log("    [DEPRECATED] url.parse() results:");
console.log(`      protocol: ${parsed.protocol}`);
// Output: protocol: https:
console.log(`      hostname: ${parsed.hostname}`);
// Output: hostname: www.irctc.co.in
console.log(`      pathname: ${parsed.pathname}`);
// Output: pathname: /trains
console.log(`      query (object): ${JSON.stringify(parsed.query)}`);
// Output: query (object): {"from":"HWH","to":"NDLS","class":"2A","tatkal":"true"}

console.log("\n    Prefer: new URL(urlString) instead of url.parse()");

// ──────────────────────────────────────────────────────────────
// 2c — querystring module (also legacy)
// ──────────────────────────────────────────────────────────────

console.log("\n  --- Legacy querystring module ---\n");

// WHY: querystring.parse() and .stringify() are the old way
//   to handle query strings. URLSearchParams is the modern
//   replacement with a richer API.

// querystring.parse()
const qs = "train=12301&from=HWH&to=NDLS&class=1A&quota=GN";
const qsParsed = querystring.parse(qs);
console.log(`    querystring.parse(): ${JSON.stringify(qsParsed)}`);
// Output: querystring.parse(): {"train":"12301","from":"HWH","to":"NDLS","class":"1A","quota":"GN"}

// querystring.stringify()
const qsObj = { pnr: "4521678901", status: "confirmed", coach: "B3" };
const qsString = querystring.stringify(qsObj);
console.log(`    querystring.stringify(): ${qsString}`);
// Output: querystring.stringify(): pnr=4521678901&status=confirmed&coach=B3

// Custom separators
const custom = querystring.stringify(qsObj, ";", ":");
console.log(`    Custom separators (;  :): ${custom}`);
// Output: Custom separators (;  :): pnr:4521678901;status:confirmed;coach:B3

// ──────────────────────────────────────────────────────────────
// 2d — Practical: parse an API endpoint, build query strings
// ──────────────────────────────────────────────────────────────

console.log("\n  --- Practical: API URL Parsing & Building ---\n");

// Scenario: Parse an API response URL with pagination
const apiUrl = new URL(
  "https://api.irctc.co.in/v3/search?q=Rajdhani+Express&page=5&per_page=20&sort=departure_asc&class=3A"
);

console.log("    Parsing API URL:");
console.log(`      Base: ${apiUrl.origin}${apiUrl.pathname}`);
console.log(`      Query: ${apiUrl.search}`);
console.log(`      Search term: ${apiUrl.searchParams.get("q")}`);
// Output: Search term: Rajdhani Express
console.log(`      Page: ${apiUrl.searchParams.get("page")}`);
console.log(`      Sort: ${apiUrl.searchParams.get("sort")}`);

// Build "next page" URL
const nextPage = new URL(apiUrl.href);
const currentPage = parseInt(nextPage.searchParams.get("page"), 10);
nextPage.searchParams.set("page", String(currentPage + 1));
console.log(`\n    Next page URL: ${nextPage.href}`);
// Output: Next page URL: ...page=6...

// Build a fresh API call from params object
function buildApiUrl(base, params) {
  const apiEndpoint = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    apiEndpoint.searchParams.set(key, value);
  }
  return apiEndpoint.href;
}

const trainSearch = buildApiUrl("https://api.irctc.co.in/v3/trains", {
  from: "NDLS",
  to: "MAS",
  date: "2025-10-02",
  passengers: "4",
  class: "2A",
});
console.log(`\n    Built train search: ${trainSearch}`);
// Output: Built train search: https://api.irctc.co.in/v3/trains?from=NDLS&to=MAS&date=2025-10-02&passengers=4&class=2A

// ──────────────────────────────────────────────────────────────
// 2e — Encoding edge cases
// ──────────────────────────────────────────────────────────────

console.log("\n  --- Encoding Edge Cases ---\n");

const tricky = new URLSearchParams();
tricky.set("query", "fare < 500 & class >= 2A");
tricky.set("name", "Chennai Rajdhani Express");
tricky.set("route", "Delhi → Chennai");

console.log("    Encoded query string:");
console.log(`      ${tricky.toString()}`);
// WHY: URLSearchParams auto-encodes special characters like
//   <, >, &, spaces, and Unicode. This prevents injection
//   and malformed URLs.

console.log("\n    Decoded back:");
for (const [key, val] of tricky) {
  console.log(`      ${key} = ${val}`);
}
// Output: query = fare < 500 & class >= 2A
// Output: name = Chennai Rajdhani Express

console.log("");

// ============================================================
// KEY TAKEAWAYS
// ============================================================
console.log("============================================================");
console.log("KEY TAKEAWAYS");
console.log("============================================================");
console.log("1. new URL(string) is the modern WHATWG standard — use it.");
console.log("2. URL gives you protocol, hostname, port, pathname, search, hash.");
console.log("3. searchParams has get, set, append, delete, has, getAll, forEach.");
console.log("4. URLSearchParams works standalone for building query strings.");
console.log("5. url.parse() is legacy/deprecated — migrate to new URL().");
console.log("6. querystring module is also legacy — prefer URLSearchParams.");
console.log("7. URLSearchParams auto-encodes special characters safely.");
console.log("8. Use new URL(relative, base) to resolve relative URLs.");
console.log("============================================================\n");
