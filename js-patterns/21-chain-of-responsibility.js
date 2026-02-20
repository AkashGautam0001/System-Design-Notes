/**
 * ============================================================
 *  FILE 21 : Chain of Responsibility & Middleware
 *  Topic   : Behavioral Design Patterns
 *  WHY THIS MATTERS:
 *    The Chain of Responsibility pattern decouples a request
 *    from the object that handles it by passing it along a
 *    chain of potential handlers. Express.js middleware is
 *    the most famous real-world example. Understanding this
 *    pattern is key to building flexible processing pipelines.
 * ============================================================
 */

// STORY: Sarkari Office File Movement — Babu Tripathi's file passes
// from clerk to section officer to under secretary to joint secretary.
// Each babu either approves or forwards the file to the next level.

// ────────────────────────────────────────────────────────────
//  BLOCK 1 : Classic Chain (linked handler objects)
// ────────────────────────────────────────────────────────────

// WHY: Each handler decides whether to process or forward the request.
//      This avoids a giant if/else and lets us add/remove approval levels freely.

class ApprovalHandler {
  constructor(name) {
    this.name = name;
    this.next = null;
  }

  setNext(handler) {
    this.next = handler;
    return handler; // allows chaining .setNext().setNext()
  }

  handle(file) {
    if (this.next) {
      return this.next.handle(file);
    }
    return { approved: true, msg: `${file.title} approved at all levels` };
  }
}

// WHY: Each concrete handler overrides handle() to check one approval criterion.

class Clerk extends ApprovalHandler {
  handle(file) {
    if (file.amount <= 10000) {
      console.log(`  [${this.name}] approved ₹${file.amount} — within clerk limit`);
      return { approved: true, msg: `[${this.name}] ${file.title} approved (₹${file.amount})` };
    }
    console.log(`  [${this.name}] amount ₹${file.amount} exceeds ₹10,000 — forwarding`);
    return super.handle(file);                                       // Output:   [Clerk Sharma] amount ₹75000 exceeds ₹10,000 — forwarding
  }
}

class SectionOfficer extends ApprovalHandler {
  handle(file) {
    if (file.amount <= 100000) {
      console.log(`  [${this.name}] approved ₹${file.amount} — within section officer limit`);
      return { approved: true, msg: `[${this.name}] ${file.title} approved (₹${file.amount})` };
    }
    console.log(`  [${this.name}] amount ₹${file.amount} exceeds ₹1,00,000 — forwarding`);
    return super.handle(file);
  }
}

class UnderSecretary extends ApprovalHandler {
  handle(file) {
    if (!file.documentsComplete) {
      return { approved: false, msg: `[${this.name}] ${file.title} rejected — documents incomplete` };
    }
    console.log(`  [${this.name}] documents verified OK`);           // Output:   [Under Secretary Joshi] documents verified OK
    return super.handle(file);
  }
}

console.log("=== Babu Tripathi's Sarkari File Approval Chain ===");  // Output: === Babu Tripathi's Sarkari File Approval Chain ===

const clerk = new Clerk("Clerk Sharma");
const sectionOfficer = new SectionOfficer("Section Officer Verma");
const underSecretary = new UnderSecretary("Under Secretary Joshi");
clerk.setNext(sectionOfficer).setNext(underSecretary);

const leaveApplication = { title: "Leave-Application", amount: 5000, documentsComplete: true };
const budgetSanction = { title: "Budget-Sanction", amount: 75000, documentsComplete: true };
const tenderApproval = { title: "Tender-Approval", amount: 500000, documentsComplete: false };

console.log("Inspecting Leave-Application:");                        // Output: Inspecting Leave-Application:
const r1 = clerk.handle(leaveApplication);
console.log(`  Result: ${r1.msg}`);                                  // Output:   Result: [Clerk Sharma] Leave-Application approved (₹5000)

console.log("Inspecting Budget-Sanction:");                          // Output: Inspecting Budget-Sanction:
const r2 = clerk.handle(budgetSanction);
console.log(`  Result: ${r2.msg}`);                                  // Output:   Result: [Section Officer Verma] Budget-Sanction approved (₹75000)

console.log("Inspecting Tender-Approval:");                          // Output: Inspecting Tender-Approval:
const r3 = clerk.handle(tenderApproval);
console.log(`  Result: ${r3.msg}`);                                  // Output:   Result: [Under Secretary Joshi] Tender-Approval rejected — documents incomplete

// ────────────────────────────────────────────────────────────
//  BLOCK 2 : Express-style Middleware Chain (req, res, next)
// ────────────────────────────────────────────────────────────

// WHY: Express middleware is a chain of responsibility where each
//      function can modify the request, respond, or call next().

class MiddlewareChain {
  constructor() {
    this.stack = [];
  }

  use(fn) {
    this.stack.push(fn);
    return this; // fluent API
  }

  run(req, res) {
    let index = 0;
    const next = (err) => {
      if (err) {
        console.log(`  Middleware error: ${err}`);
        return;
      }
      const fn = this.stack[index++];
      if (fn) fn(req, res, next);
    };
    next();
  }
}

console.log("\n=== Babu Tripathi's Express-style Middleware ===");    // Output: === Babu Tripathi's Express-style Middleware ===

const app = new MiddlewareChain();

// Logger middleware
app.use((req, res, next) => {
  console.log(`  [Logger] ${req.method} ${req.url}`);               // Output:   [Logger] GET /files
  req.logged = true;
  next();
});

// Auth middleware
app.use((req, res, next) => {
  if (!req.headers.token) {
    console.log("  [Auth] No token - rejected");
    res.status = 401;
    return; // stop the chain
  }
  console.log("  [Auth] Token valid");                              // Output:   [Auth] Token valid
  req.user = "Babu Tripathi";
  next();
});

// Final handler
app.use((req, res, next) => {
  res.status = 200;
  res.body = `Namaste ${req.user}, here are your pending files`;
  console.log(`  [Handler] ${res.body}`);                           // Output:   [Handler] Namaste Babu Tripathi, here are your pending files
});

const req1 = { method: "GET", url: "/files", headers: { token: "sarkari123" } };
const res1 = {};
app.run(req1, res1);
console.log(`  Final status: ${res1.status}`);                      // Output:   Final status: 200

console.log("  --- Request without token ---");                     // Output:   --- Request without token ---
const req2 = { method: "GET", url: "/classified", headers: {} };
const res2 = {};
app.run(req2, res2);
console.log(`  Final status: ${res2.status}`);                      // Output:   Final status: 401

// ────────────────────────────────────────────────────────────
//  BLOCK 3 : Validation Chain (field validators piped in sequence)
// ────────────────────────────────────────────────────────────

// WHY: A validation chain lets us compose small, reusable validators.
//      Each one returns either an error or passes control to the next.

function createValidationChain(...validators) {
  return function validate(value, fieldName) {
    const errors = [];
    for (const fn of validators) {
      const err = fn(value, fieldName);
      if (err) errors.push(err);
    }
    return errors;
  };
}

// Individual validators for Aadhaar form
const required = (val, field) =>
  (val === undefined || val === null || val === "")
    ? `${field} is required`
    : null;

const minLength = (min) => (val, field) =>
  (typeof val === "string" && val.length < min)
    ? `${field} must be at least ${min} chars`
    : null;

const isNumber = (val, field) =>
  (typeof val !== "number" || isNaN(val))
    ? `${field} must be a number`
    : null;

const exactLength = (len) => (val, field) =>
  (typeof val === "string" && val.length !== len)
    ? `${field} must be exactly ${len} digits`
    : null;

console.log("\n=== Babu Tripathi's Aadhaar Validation Chain ===");   // Output: === Babu Tripathi's Aadhaar Validation Chain ===

const validateName = createValidationChain(required, minLength(3));
const validateAadhaar = createValidationChain(required, exactLength(12));

const nameErrs1 = validateName("RK", "applicantName");
console.log(`  "RK" errors: ${nameErrs1.join("; ")}`);              // Output:   "RK" errors: applicantName must be at least 3 chars

const nameErrs2 = validateName("", "applicantName");
console.log(`  "" errors: ${nameErrs2.join("; ")}`);                // Output:   "" errors: applicantName is required; applicantName must be at least 3 chars

const nameErrs3 = validateName("Tripathi", "applicantName");
console.log(`  "Tripathi" errors: ${nameErrs3.length === 0 ? "none" : nameErrs3.join("; ")}`);
                                                                    // Output:   "Tripathi" errors: none

const aErrs1 = validateAadhaar("12345678", "aadhaarNumber");
console.log(`  "12345678" errors: ${aErrs1.join("; ")}`);           // Output:   "12345678" errors: aadhaarNumber must be exactly 12 digits

const aErrs2 = validateAadhaar("", "aadhaarNumber");
console.log(`  "" errors: ${aErrs2.join("; ")}`);                   // Output:   "" errors: aadhaarNumber is required; aadhaarNumber must be exactly 12 digits

const aErrs3 = validateAadhaar("123456789012", "aadhaarNumber");
console.log(`  "123456789012" errors: ${aErrs3.length === 0 ? "none" : aErrs3.join("; ")}`);
                                                                    // Output:   "123456789012" errors: none

// ────────────────────────────────────────────────────────────
//  KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Chain of Responsibility decouples sender from receivers —
//    the file does not know which babu will approve it.
// 2. Express middleware is the most common JS implementation:
//    each (req, res, next) function either responds or calls next().
// 3. Aadhaar validation chains compose small, focused validators
//    into a pipeline — easy to test, reuse, and extend.
// 4. The pattern shines when approval levels change at runtime
//    or vary by department (like sarkari office hierarchies).
