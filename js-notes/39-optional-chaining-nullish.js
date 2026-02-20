/**
 * ============================================================
 *  FILE 39: OPTIONAL CHAINING & NULLISH COALESCING
 * ============================================================
 *  Topic: ?. (optional chaining), ?? (nullish coalescing),
 *         ??= (logical nullish assignment), and how they
 *         compare to the older || pattern.
 *
 *  Why it matters:
 *    Before these operators, accessing deeply nested properties
 *    required ugly chains of && checks, and providing defaults
 *    with || would accidentally swallow 0, "", and false.
 *    Optional chaining and nullish coalescing make code
 *    shorter, safer, and more intentional.
 * ============================================================
 *
 *  STORY — "Sarkari File Tracing with Babu Tripathi"
 *  You are Babu Tripathi tracing a government file through
 *  departments.  Some departments have NOTINGS on the file
 *  showing the next forwarding address, some don't.
 *  Optional chaining (?.) is your RTI query that lets you
 *  check ahead without getting a "File Not Found" crash
 *  (TypeError).  Nullish coalescing (??) is your fallback
 *  stamp that kicks in ONLY when the file number is truly
 *  missing (null/undefined), not when it just says "0 pages
 *  attached" or "empty remarks."
 * ============================================================
 */

console.log("=== FILE 39: Optional Chaining & Nullish Coalescing ===\n");

// ============================================================
//  EXAMPLE 1 — OPTIONAL CHAINING (?.)
//  (Tracing files without crashing)
// ============================================================

// WHY: Without ?., accessing a property on null or undefined
// throws a TypeError.  With ?., the expression short-circuits
// to undefined instead of crashing.

console.log("--- EXAMPLE 1: Optional Chaining (?.) ---\n");

// --- The government file trail ---
const ministry = {
  reception: {
    name: "Central Filing Section",
    stamped: true,
    forwarding: {
      name: "Under Secretary Desk",
      notings: ["approved by section officer", "budget check done"],
      forwarding: {
        name: "Joint Secretary Office",
        approval: {
          sanctionAmount: 500,
          remark: "Cleared for disbursement",
        },
        // No further forwarding — file resting here!
      },
    },
  },
};

// --- Property access with ?. ---
console.log("1. Safe property access with ?.:");

// Without optional chaining (the old way):
const oldWay =
  ministry &&
  ministry.reception &&
  ministry.reception.forwarding &&
  ministry.reception.forwarding.name;
console.log("  Old way:", oldWay);
// Output:   Old way: Under Secretary Desk

// With optional chaining (clean and readable):
const newWay = ministry?.reception?.forwarding?.name;
console.log("  New way:", newWay);
// Output:   New way: Under Secretary Desk

// Going too deep — department doesn't exist:
const beyondJointSecy = ministry?.reception?.forwarding?.forwarding?.forwarding?.name;
console.log("  Beyond Joint Secretary:", beyondJointSecy);
// Output:   Beyond Joint Secretary: undefined    (no crash!)

// Without ?., this would throw:
// ministry.reception.forwarding.forwarding.forwarding.name  // TypeError!

// --- Method calls with ?.() ---
console.log("\n2. Safe method calls with ?.():");

const babuTripathi = {
  name: "Tripathi",
  desk: {
    fileStamp: { name: "Urgent Stamp", use() { return "The file has been stamped URGENT!"; } },
    redInk: null,   // No red ink at this desk
  },
};

// Call a method if it exists:
console.log("  Stamp:", babuTripathi.desk.fileStamp?.use());
// Output:   Stamp: The file has been stamped URGENT!

// Safely call a method on null:
console.log("  Red Ink:", babuTripathi.desk.redInk?.apply());
// Output:   Red Ink: undefined   (no TypeError, even though redInk is null)

// Method that might not exist on the object:
const result = babuTripathi.escalateFile?.();
console.log("  Escalate file:", result);
// Output:   Escalate file: undefined   (babuTripathi has no escalateFile method)

// --- Bracket access with ?.[] ---
console.log("\n3. Safe bracket access with ?.[]:");

const departmentNames = {
  dept1: "Central Filing Section",
  dept2: "Under Secretary Desk",
};

const currentDept = "dept1";
const missingDept = "dept99";

console.log("  Current:", departmentNames?.[currentDept]);
// Output:   Current: Central Filing Section

console.log("  Missing:", departmentNames?.[missingDept]);
// Output:   Missing: undefined

// Dynamic key on a potentially null object:
const secretDepts = null;
console.log("  Secret:", secretDepts?.["classified"]);
// Output:   Secret: undefined

// --- Chaining deeper with arrays ---
console.log("\n4. Optional chaining with arrays:");

const ministryFloors = [
  { offices: [{ name: "Accounts Section" }, { name: "Audit Wing" }] },
  { offices: [{ name: "Legal Cell" }] },
  null, // Floor 3 under renovation!
];

console.log("  Floor 1, Office 1:", ministryFloors[0]?.offices?.[0]?.name);
// Output:   Floor 1, Office 1: Accounts Section

console.log("  Floor 3, Office 1:", ministryFloors[2]?.offices?.[0]?.name);
// Output:   Floor 3, Office 1: undefined

// Index out of bounds:
console.log("  Floor 5:", ministryFloors[4]?.offices?.[0]?.name);
// Output:   Floor 5: undefined

// --- Short-circuit behavior ---
console.log("\n5. Short-circuit behavior:");

let sideEffectRan = false;
const nothing = null;

// Everything after ?. is skipped if the left side is null/undefined
nothing?.prop[
  (() => {
    sideEffectRan = true;
    return "key";
  })()
];

console.log("  Side effect ran?", sideEffectRan);
// Output:   Side effect ran? false   (?. short-circuited the whole chain)

// ============================================================
//  EXAMPLE 2 — NULLISH COALESCING (??) AND RELATED OPERATORS
//  (The fallback stamp)
// ============================================================

// WHY: The || operator treats 0, "", false, and NaN as falsy,
// which can accidentally discard valid values.  ?? only kicks
// in for null and undefined — the truly "missing" values.

console.log("\n--- EXAMPLE 2: Nullish Coalescing (??) & ??= ---\n");

// --- ?? vs || — the crucial difference ---
console.log("1. ?? vs || comparison:\n");

const fileConfig = {
  maxCopies: 0,            // 0 is intentional (no copies allowed)
  priority: "",            // empty string means "general"
  requiresStamp: false,    // explicitly no stamp needed
  assignedOfficer: null,   // not assigned yet
  fileNumber: undefined,   // not generated yet
};

// || treats 0, "", false as falsy — provides unintended defaults
console.log("  maxCopies || 4:    ", fileConfig.maxCopies || 4);
// Output:   maxCopies || 4:     4         <-- WRONG! 0 is valid
console.log("  priority || 'Urgent':", fileConfig.priority || "Urgent");
// Output:   priority || 'Urgent': Urgent  <-- WRONG! "" is valid
console.log("  requiresStamp || true:  ", fileConfig.requiresStamp || true);
// Output:   requiresStamp || true:   true       <-- WRONG! false is valid

// ?? only replaces null and undefined — respects 0, "", false
console.log("\n  maxCopies ?? 4:    ", fileConfig.maxCopies ?? 4);
// Output:   maxCopies ?? 4:     0          <-- CORRECT!
console.log("  priority ?? 'Urgent':", fileConfig.priority ?? "Urgent");
// Output:   priority ?? 'Urgent':          <-- CORRECT! (empty string kept)
console.log("  requiresStamp ?? true:  ", fileConfig.requiresStamp ?? true);
// Output:   requiresStamp ?? true:   false       <-- CORRECT!
console.log("  assignedOfficer ?? 'Unassigned':", fileConfig.assignedOfficer ?? "Unassigned");
// Output:   assignedOfficer ?? 'Unassigned': Unassigned       <-- null replaced
console.log("  fileNumber ?? 'PENDING':     ", fileConfig.fileNumber ?? "PENDING");
// Output:   fileNumber ?? 'PENDING':      PENDING          <-- undefined replaced

// --- Summary table ---
console.log("\n  Value        || 'default'    ?? 'default'");
console.log("  ─────────    ───────────    ───────────");
const testValues = [
  ["null",       null],
  ["undefined",  undefined],
  ["0",          0],
  ["''",         ""],
  ["false",      false],
  ["NaN",        NaN],
  ["'hello'",    "hello"],
  ["42",         42],
];

testValues.forEach(([label, val]) => {
  const orResult = val || "default";
  const nullishResult = val ?? "default";
  console.log(
    `  ${label.padEnd(12)} ${String(orResult).padEnd(14)} ${String(nullishResult)}`
  );
});

// --- Combining ?. and ?? — the power duo ---
console.log("\n2. Combining ?. and ?? — the power duo:\n");

// WHY: ?. prevents crashes, ?? provides fallbacks.  Together
// they handle "navigate safely AND provide a default."

const officerProfile = {
  name: "Tripathi",
  department: null,     // Not assigned to a department
  fileStats: {
    pendingFiles: 0,    // Zero pending but that's valid!
    sanctionedBudget: undefined,
  },
};

// Get department name, or "Unassigned" if missing
const deptName = officerProfile?.department?.name ?? "Unassigned";
console.log("  Department:", deptName);
// Output:   Department: Unassigned

// Get pending files, using ?? to preserve 0
const pendingFiles = officerProfile?.fileStats?.pendingFiles ?? 100;
console.log("  Pending files:", pendingFiles);
// Output:   Pending files: 0     (0 is preserved! || would give 100)

// Get budget with a default
const budget = officerProfile?.fileStats?.sanctionedBudget ?? 50;
console.log("  Budget (lakhs):", budget);
// Output:   Budget (lakhs): 50      (undefined replaced)

// Deep access on missing path with default
const peonName = officerProfile?.support?.peon?.name ?? "No peon assigned";
console.log("  Peon:", peonName);
// Output:   Peon: No peon assigned

// --- Logical nullish assignment: ??= ---
console.log("\n3. Logical nullish assignment (??=):\n");

// WHY: ??= assigns ONLY if the current value is null or
// undefined.  It's the assignment counterpart of ??.

const deskInventory = {
  stamps: 3,
  paperClips: 0,       // intentionally 0
  redInk: null,        // not available
  // stapler is not defined at all
};

// ??= does NOT overwrite existing values (even 0)
deskInventory.stamps ??= 10;
console.log("  Stamps:", deskInventory.stamps);
// Output:   Stamps: 3     (already had a value)

deskInventory.paperClips ??= 100;
console.log("  Paper clips:", deskInventory.paperClips);
// Output:   Paper clips: 0         (0 is NOT null/undefined, so kept)

deskInventory.redInk ??= "Camlin Red Ink";
console.log("  Red ink:", deskInventory.redInk);
// Output:   Red ink: Camlin Red Ink  (null was replaced)

deskInventory.stapler ??= "Kangaro Stapler";
console.log("  Stapler:", deskInventory.stapler);
// Output:   Stapler: Kangaro Stapler  (undefined was replaced)

// Compare with ||= (would also overwrite 0, "", false):
let fileCount = 0;
fileCount ||= 5;
console.log("\n  fileCount ||= 5:", fileCount);
// Output:   fileCount ||= 5: 5     (0 was treated as falsy!)

let pendingCount = 0;
pendingCount ??= 5;
console.log("  pendingCount ??= 5:", pendingCount);
// Output:   pendingCount ??= 5: 0     (0 is preserved!)

// --- Operator precedence: ?? cannot mix with || or && ---
console.log("\n4. Operator precedence note:\n");

// WHY: To prevent confusion, JavaScript forbids mixing ??
// with || or && without explicit parentheses.

// This would throw a SyntaxError:
// const val = a || b ?? c;    // SyntaxError!

// Must use parentheses:
const a = null, b = 0, c = "fallback";
const safeResult = (a || b) ?? c;
console.log("  (a || b) ?? c:", safeResult);
// Output:   (a || b) ?? c: fallback   (a||b => 0, then 0 ?? c => 0... wait)
// Actually: a is null, b is 0, so a || b => 0. Then 0 ?? c => 0 (not null/undefined).
console.log("  Explanation: a||b gives 0 (since null||0 = 0), then 0 ?? c gives 0");
// Output:   Explanation: a||b gives 0 (since null||0 = 0), then 0 ?? c gives 0

const safeResult2 = a ?? (b || c);
console.log("  a ?? (b || c):", safeResult2);
// Output:   a ?? (b || c): fallback   (a is null, so b||c => "fallback")

// --- Real-world patterns ---
console.log("\n5. Real-world patterns:\n");

// API response handling
function processAPIResponse(response) {
  const officerName  = response?.data?.officer?.name ?? "Anonymous";
  const itemCount    = response?.data?.items?.length ?? 0;
  const error        = response?.error?.message ?? null;
  const statusCode   = response?.status ?? 500;

  return { officerName, itemCount, error, statusCode };
}

// Complete response
const goodResponse = {
  status: 200,
  data: { officer: { name: "Tripathi" }, items: ["file-A", "file-B"] },
};

// Partial response (some fields missing)
const partialResponse = {
  status: 200,
  data: { officer: null, items: [] },
};

// Failed response
const failedResponse = null;

console.log("  Good:", processAPIResponse(goodResponse));
// Output:   Good: { officerName: 'Tripathi', itemCount: 2, error: null, statusCode: 200 }

console.log("  Partial:", processAPIResponse(partialResponse));
// Output:   Partial: { officerName: 'Anonymous', itemCount: 0, error: null, statusCode: 200 }

console.log("  Failed:", processAPIResponse(failedResponse));
// Output:   Failed: { officerName: 'Anonymous', itemCount: 0, error: null, statusCode: 500 }

// Configuration merging with ??=
function applyDefaults(config) {
  config.host     ??= "localhost";
  config.port     ??= 3000;
  config.debug    ??= false;
  config.timeout  ??= 5000;
  return config;
}

console.log("\n  Config merge:", applyDefaults({ port: 8080, debug: true }));
// Output:   Config merge: { port: 8080, debug: true, host: 'localhost', timeout: 5000 }

console.log("  Empty config:", applyDefaults({}));
// Output:   Empty config: { host: 'localhost', port: 3000, debug: false, timeout: 5000 }

// ============================================================
//  KEY TAKEAWAYS
// ============================================================
/*
 * 1. OPTIONAL CHAINING (?.)
 *    - obj?.prop      — safe property access
 *    - obj?.method()  — safe method call
 *    - obj?.[expr]    — safe bracket access
 *    - Short-circuits to undefined on null/undefined
 *    - Prevents TypeError crashes on missing nested data
 *
 * 2. NULLISH COALESCING (??)
 *    - Returns the right side ONLY for null/undefined
 *    - Unlike ||, it does NOT replace 0, "", false, or NaN
 *    - Perfect for providing defaults to optional values
 *
 * 3. ?? vs ||
 *    - ||  replaces ALL falsy values (null, undefined, 0, "", false, NaN)
 *    - ??  replaces ONLY null and undefined
 *    - Use ?? when 0, "", or false are valid values
 *
 * 4. LOGICAL NULLISH ASSIGNMENT (??=)
 *    - x ??= y  assigns y to x only if x is null or undefined
 *    - Great for setting defaults on config objects
 *    - Does NOT overwrite 0, "", or false
 *
 * 5. COMBINING ?. AND ??
 *    - The power duo: navigate safely (?.) then provide a
 *      default (??) in one clean expression.
 *    - Pattern: obj?.deep?.path ?? "default"
 *
 * 6. PRECEDENCE RULE: Cannot mix ?? with || or && without
 *    explicit parentheses.  (a ?? b || c) is a SyntaxError.
 *
 * 7. SARKARI FILE ANALOGY:
 *    - ?. is your RTI QUERY — trace the file without crashing
 *      into "File Not Found" errors at any department
 *    - ?? is your FALLBACK STAMP — kicks in only when the file
 *      number is truly missing (null/undefined), not when it
 *      says "0 pages attached"
 *    - ??= is your SUPPLY REQUISITION — fills in only what's
 *      missing from the desk inventory
 */
