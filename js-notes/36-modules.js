/**
 * ============================================================
 *  FILE 36: JAVASCRIPT MODULES
 * ============================================================
 *  Topic: CommonJS (require/module.exports), ES Modules
 *         (import/export), dynamic imports, module scope,
 *         and circular dependency awareness.
 *
 *  Why it matters:
 *    Modules are the backbone of every maintainable codebase.
 *    Without them, every variable leaks into the global scope,
 *    name collisions are inevitable, and code reuse is a
 *    nightmare.  Knowing both CommonJS and ESM is essential
 *    because Node.js straddles both worlds.
 * ============================================================
 *
 *  STORY — "The Mantralaya File System"
 *  Imagine a state government Mantralaya (secretariat):
 *    - Each DEPARTMENT (module) maintains its own files and has
 *      a clear file type (named export) or is simply "the
 *      department head's order" (default export).
 *    - A REQUESTING OFFICER (importing file) requisitions
 *      specific files by type, or requests the entire department
 *      dossier (namespace import).
 *    - The FILE REGISTRY (module resolver) tracks who has
 *      what, prevents duplicate copies (caching), and handles
 *      inter-department references (circular deps).
 *
 *  NOTE: This file demonstrates module syntax from BOTH systems.
 *  Since a single file cannot be both CommonJS and ESM at once,
 *  many examples are shown as ILLUSTRATIVE comments.  Sections
 *  marked [RUNNABLE] can actually execute with `node 36-modules.js`.
 *  Sections marked [ILLUSTRATIVE] show what separate files
 *  would look like.
 * ============================================================
 */

console.log("=== FILE 36: JavaScript Modules ===\n");

// ============================================================
//  SECTION 1 — COMMONJS (Node.js classic)
//  [ILLUSTRATIVE — shows what separate files would contain]
// ============================================================

// WHY: CommonJS was Node.js's original module system.  You'll
// encounter it in millions of existing packages and legacy
// codebases.  `require()` is synchronous and loads at runtime.

console.log("--- SECTION 1: CommonJS (require / module.exports) ---\n");

/*
 * -- revenueDesk.js (the department file on the shelf) -------
 *
 *   // Named exports via module.exports object
 *   const departmentName = "Revenue Department, Mantralaya";
 *
 *   function issueCircular(subject, officer) {
 *     return `${officer} issued circular: "${subject}"`;
 *   }
 *
 *   function acknowledgeFile(subject, officer) {
 *     return `${officer} acknowledged file: "${subject}"`;
 *   }
 *
 *   // Export multiple things:
 *   module.exports = { departmentName, issueCircular, acknowledgeFile };
 *
 *   // Or export them one by one:
 *   // exports.departmentName = departmentName;
 *   // exports.issueCircular = issueCircular;
 *
 * -- requestingOfficer.js (the officer requesting files) -----
 *
 *   const { departmentName, issueCircular } = require("./revenueDesk");
 *
 *   console.log(departmentName);
 *   // Output: Revenue Department, Mantralaya
 *
 *   console.log(issueCircular("Land Survey Update", "Shri Kulkarni"));
 *   // Output: Shri Kulkarni issued circular: "Land Survey Update"
 */

// [RUNNABLE] — We can demonstrate module.exports/require patterns
// using inline objects to simulate the concept:

const revenueDesk = (() => {
  // This IIFE simulates a CommonJS module's private scope
  const departmentName = "Revenue Department, Mantralaya";

  function issueCircular(subject, officer) {
    return `${officer} issued circular: "${subject}"`;
  }

  function acknowledgeFile(subject, officer) {
    return `${officer} acknowledged file: "${subject}"`;
  }

  // Simulating module.exports
  return { departmentName, issueCircular, acknowledgeFile };
})();

// Simulating: const { departmentName, issueCircular } = require("./revenueDesk");
const { departmentName, issueCircular } = revenueDesk;

console.log(departmentName);
// Output: Revenue Department, Mantralaya

console.log(issueCircular("Land Survey Update", "Shri Kulkarni"));
// Output: Shri Kulkarni issued circular: "Land Survey Update"

console.log(revenueDesk.acknowledgeFile("Budget Allocation Order", "Smt. Deshmukh"));
// Output: Smt. Deshmukh acknowledged file: "Budget Allocation Order"

/*
 * CommonJS key rules:
 *   1. `module.exports` is the ACTUAL object that gets returned
 *      by require().
 *   2. `exports` is just a shorthand reference to module.exports.
 *      If you reassign `exports = { ... }`, it breaks the link!
 *   3. require() is SYNCHRONOUS — the file is read and executed
 *      immediately.
 *   4. Modules are CACHED — require("./foo") twice returns the
 *      same object.
 */

// ============================================================
//  SECTION 2 — ES MODULES (ESM — the modern standard)
//  [ILLUSTRATIVE — shows what separate .mjs files would contain]
// ============================================================

// WHY: ESM is the JavaScript standard.  It's statically
// analyzable (enabling tree-shaking), supports top-level await,
// and works in both browsers and Node.js.

console.log("\n--- SECTION 2: ES Modules (import / export) ---\n");

/*
 * -- fileRegistry.mjs ----------------------------------------
 *
 *   // --- Named exports ---
 *   export const totalFiles = 42_000;
 *
 *   export function searchRegistry(query) {
 *     return `Searching for "${query}" in ${totalFiles} files...`;
 *   }
 *
 *   export function reserveFile(subject) {
 *     return `"${subject}" has been reserved for review.`;
 *   }
 *
 *   // --- Default export ---
 *   // A module can have ONE default export (the department head)
 *   const registrySystem = {
 *     name: "Mantralaya e-Filing v3",
 *     version: "3.2.1",
 *   };
 *   export default registrySystem;
 *
 *
 * -- officer.mjs ---------------------------------------------
 *
 *   // Import the default export (no curly braces)
 *   import registrySystem from "./fileRegistry.mjs";
 *   console.log(registrySystem.name);
 *   // Output: Mantralaya e-Filing v3
 *
 *   // Import named exports (curly braces)
 *   import { searchRegistry, reserveFile } from "./fileRegistry.mjs";
 *   console.log(searchRegistry("land acquisition"));
 *   // Output: Searching for "land acquisition" in 42000 files...
 *
 *   // Import ALL as a namespace
 *   import * as Registry from "./fileRegistry.mjs";
 *   console.log(Registry.totalFiles);
 *   // Output: 42000
 *   console.log(Registry.default.version);
 *   // Output: 3.2.1
 *
 *   // Renaming imports
 *   import { searchRegistry as search } from "./fileRegistry.mjs";
 *   console.log(search("pension"));
 *   // Output: Searching for "pension" in 42000 files...
 */

// [RUNNABLE] — Simulating named vs default exports:

const fileRegistryModule = (() => {
  const totalFiles = 42_000;

  function searchRegistry(query) {
    return `Searching for "${query}" in ${totalFiles} files...`;
  }

  function reserveFile(subject) {
    return `"${subject}" has been reserved for review.`;
  }

  const defaultExport = {
    name: "Mantralaya e-Filing v3",
    version: "3.2.1",
  };

  // Simulating: named exports + default
  return {
    totalFiles,
    searchRegistry,
    reserveFile,
    default: defaultExport,
  };
})();

// Simulating: import registrySystem from "./fileRegistry.mjs";
const registrySystem = fileRegistryModule.default;
console.log(`Registry: ${registrySystem.name} (v${registrySystem.version})`);
// Output: Registry: Mantralaya e-Filing v3 (v3.2.1)

// Simulating: import { searchRegistry } from "./fileRegistry.mjs";
const { searchRegistry } = fileRegistryModule;
console.log(searchRegistry("land acquisition"));
// Output: Searching for "land acquisition" in 42000 files...

// Simulating: import * as Registry from "./fileRegistry.mjs";
const Registry = fileRegistryModule;
console.log(`Total files: ${Registry.totalFiles}`);
// Output: Total files: 42000

// ============================================================
//  SECTION 3 — NAMED EXPORTS vs DEFAULT EXPORT
// ============================================================

// WHY: Choosing between named and default exports affects
// refactoring, auto-imports, and tree-shaking.  Understanding
// the trade-offs prevents confusion.

console.log("\n--- SECTION 3: Named vs Default Exports ---\n");

/*
 * Named exports:
 *   export const stampDuty = 250;
 *   export function calculatePenalty(days) { ... }
 *
 *   - Can have MANY per module
 *   - Must use exact name (or rename with `as`)
 *   - Better for tree-shaking (bundlers drop unused named exports)
 *   - Better for editor auto-complete
 *
 * Default export:
 *   export default class Department { ... }
 *
 *   - Only ONE per module
 *   - Importer chooses any name: import MyDept from "./department.mjs"
 *   - Good for modules with a single primary purpose
 *   - Harder to refactor (name isn't enforced)
 */

// [RUNNABLE] demonstration of the naming flexibility:

const circularSection = { type: "Circular", fileCount: 12_500 };
const notificationSection = { type: "Notification", fileCount: 8_300 };

// With named exports, the name is fixed:
// import { circularSection } from "./sections.mjs";  // must be circularSection

// With default exports, the importer picks any name:
// import whateverIWant from "./sections.mjs";         // any name works

console.log("Named export  -> circularSection.type:", circularSection.type);
// Output: Named export  -> circularSection.type: Circular

console.log("Default export -> importer picks the name freely");
// Output: Default export -> importer picks the name freely

// ============================================================
//  SECTION 4 — DYNAMIC IMPORT: import()
//  [RUNNABLE]
// ============================================================

// WHY: Dynamic imports let you load modules on demand (lazy
// loading), which reduces initial load time for large apps.
// Unlike static imports, import() returns a Promise and works
// inside regular .js files.

console.log("\n--- SECTION 4: Dynamic import() ---\n");

// Dynamic import of a built-in Node module (works everywhere)
async function dynamicDepartmentLoad() {
  // import() returns a Promise that resolves to the module
  const os = await import("node:os");

  const hostname = os.hostname();
  console.log(`Mantralaya server running on: ${hostname}`);
  // Output: Mantralaya server running on: <your-hostname>

  console.log(`Platform: ${os.platform()}`);
  // Output: Platform: <your-platform>

  // Conditional loading pattern — load a module only when needed
  const heavyFeatureNeeded = true;

  if (heavyFeatureNeeded) {
    const path = await import("node:path");
    const filePath = path.join("/mantralaya", "registry", "index.json");
    console.log(`Registry path: ${filePath}`);
    // Output: Registry path: /mantralaya/registry/index.json
  }
}

dynamicDepartmentLoad();

/*
 * Dynamic import patterns:
 *
 *   // Conditional loading
 *   if (userIsSecretary) {
 *     const admin = await import("./secretaryPanel.mjs");
 *     admin.init();
 *   }
 *
 *   // Loading based on variable
 *   const lang = "hi";
 *   const translations = await import(`./i18n/${lang}.mjs`);
 *
 *   // With destructuring
 *   const { searchRegistry } = await import("./fileRegistry.mjs");
 */

// ============================================================
//  SECTION 5 — MODULE SCOPE (No Global Pollution)
//  [RUNNABLE]
// ============================================================

// WHY: Each module has its OWN scope.  Variables declared at
// the top level of a module do NOT leak into the global object.
// This prevents name collisions between unrelated files.

console.log("\n--- SECTION 5: Module Scope ---\n");

// In a script (non-module), top-level `var` pollutes `global`:
// var leaked = "oops";  // globalThis.leaked === "oops" in scripts

// In a module, top-level declarations are scoped to the module:
// const confidentialFile = "Classified Cabinet Note";
// This is NOT accessible from other modules unless exported.

// [RUNNABLE] demonstration using IIFEs to simulate module scope:

const deptA = (() => {
  const confidential = "Home Department's classified briefing";
  const shared = "Home Department public notice";
  return { shared }; // only `shared` is "exported"
})();

const deptB = (() => {
  const confidential = "Finance Department's classified briefing"; // no collision!
  const shared = "Finance Department public notice";
  return { shared };
})();

console.log(deptA.shared);
// Output: Home Department public notice

console.log(deptB.shared);
// Output: Finance Department public notice

// Both departments have a `confidential` variable, but they don't collide
// because each module has its own scope.  You cannot access
// deptA's `confidential` from outside — it's truly private.

console.log("Neither department leaks its 'confidential' variable.");
// Output: Neither department leaks its 'confidential' variable.

// ============================================================
//  SECTION 6 — CIRCULAR DEPENDENCIES
// ============================================================

// WHY: When module A imports module B and module B imports
// module A, you have a circular dependency.  JavaScript handles
// this, but the results can be surprising (partially loaded
// modules, undefined values).

console.log("\n--- SECTION 6: Circular Dependencies ---\n");

/*
 * [ILLUSTRATIVE] — What happens with circular deps:
 *
 * -- homeDept.mjs -------------------------------------------
 *   import { financeDeptName } from "./financeDept.mjs";
 *   export const homeDeptName = "Home Department";
 *   console.log(`Home Dept sees Finance Dept as: ${financeDeptName}`);
 *
 * -- financeDept.mjs ----------------------------------------
 *   import { homeDeptName } from "./homeDept.mjs";
 *   export const financeDeptName = "Finance Department";
 *   console.log(`Finance Dept sees Home Dept as: ${homeDeptName}`);
 *
 * If homeDept.mjs is the entry point:
 *   1. Node starts loading homeDept.mjs
 *   2. homeDept.mjs imports financeDept.mjs -> Node starts loading financeDept.mjs
 *   3. financeDept.mjs imports homeDept.mjs -> circular! Node returns
 *      the PARTIALLY loaded homeDept (homeDeptName is undefined!)
 *   4. financeDept finishes: "Finance Dept sees Home Dept as: undefined"
 *   5. homeDept finishes: "Home Dept sees Finance Dept as: Finance Department"
 *
 * ESM handles this with "live bindings" — the reference updates
 * once the exporting module finishes.  But at the moment of
 * access during load, it may still be undefined.
 *
 * CommonJS handles it similarly but with a snapshot of the
 * partially-constructed module.exports object.
 */

// [RUNNABLE] — Simulating circular dependency behavior:

function simulateCircularDeps() {
  const departments = {};

  // Simulate homeDept loading
  function loadHomeDept() {
    // homeDept needs financeDept, so load it first
    if (!departments.financeDept) loadFinanceDept();
    departments.homeDept = { homeDeptName: "Home Department" };
    console.log(
      `  Home Dept sees Finance Dept as: ${departments.financeDept?.financeDeptName ?? "undefined (not loaded yet!)"}`
    );
  }

  // Simulate financeDept loading
  function loadFinanceDept() {
    // financeDept needs homeDept — but homeDept isn't done yet!
    if (!departments.homeDept) {
      console.log("  Finance Dept tries to read Home Dept... but it's not ready!");
    }
    departments.financeDept = { financeDeptName: "Finance Department" };
    console.log(
      `  Finance Dept sees Home Dept as: ${departments.homeDept?.homeDeptName ?? "undefined (circular!)"}`
    );
  }

  loadHomeDept();
}

simulateCircularDeps();
// Output:
//   Finance Dept tries to read Home Dept... but it's not ready!
//   Finance Dept sees Home Dept as: undefined (circular!)
//   Home Dept sees Finance Dept as: Finance Department

console.log("\n  Tip: Avoid circular deps by extracting shared code");
console.log("  into a third module that both can import from.");
// Output:   Tip: Avoid circular deps by extracting shared code
// Output:   into a third module that both can import from.

/*
 * How to fix circular dependencies:
 *   1. Extract shared logic into a third module.
 *   2. Use lazy loading (dynamic import) to defer the load.
 *   3. Restructure so the dependency goes one way.
 */

// ============================================================
//  SECTION 7 — QUICK REFERENCE: CommonJS vs ESM
// ============================================================

console.log("\n--- SECTION 7: CommonJS vs ESM Comparison ---\n");

const comparison = [
  ["Feature",           "CommonJS",                "ESM"],
  ["Syntax",            "require() / module.exports", "import / export"],
  ["Loading",           "Synchronous",             "Asynchronous"],
  ["Top-level await",   "No",                      "Yes"],
  ["File extension",    ".js (default in Node)",   ".mjs or type:module"],
  ["Tree-shaking",      "Difficult",               "Built-in support"],
  ["Browser support",   "No (needs bundler)",      "Yes (native)"],
  ["this at top level", "module.exports",          "undefined"],
  ["Caching",           "Yes (by file path)",      "Yes (by URL/path)"],
];

comparison.forEach(([feature, cjs, esm]) => {
  console.log(`  ${feature.padEnd(20)} | ${cjs.padEnd(30)} | ${esm}`);
});
// Output:
//   Feature              | CommonJS                       | ESM
//   Syntax               | require() / module.exports     | import / export
//   Loading              | Synchronous                    | Asynchronous
//   ... (remaining rows)

// ============================================================
//  KEY TAKEAWAYS
// ============================================================
/*
 * 1. COMMONJS — require() is synchronous, used in Node.js for
 *    years.  module.exports is the real export; `exports` is
 *    just a shorthand.
 *
 * 2. ESM — import/export is the JavaScript standard.  It's
 *    statically analyzable, supports tree-shaking, and works
 *    natively in browsers.
 *
 * 3. NAMED EXPORTS — use curly braces: import { foo } from ...
 *    Preferred for most use cases (better auto-import, tree-shake).
 *
 * 4. DEFAULT EXPORT — one per module, no braces on import:
 *    import foo from ...  Good for single-purpose modules.
 *
 * 5. NAMESPACE IMPORT — import * as Lib from ...  Grabs
 *    everything into one object.
 *
 * 6. DYNAMIC IMPORT — import() returns a Promise.  Use for
 *    lazy loading, conditional loading, and variable paths.
 *
 * 7. MODULE SCOPE — top-level variables stay private unless
 *    exported.  No more global pollution.
 *
 * 8. CIRCULAR DEPENDENCIES — JavaScript handles them, but you
 *    may get undefined values during load.  Restructure to
 *    avoid them.
 *
 * 9. MANTRALAYA ANALOGY: Each department (module) maintains its
 *    own files (scope).  Requesting officers (importers) requisition
 *    specific files (named exports) or "the department head's order"
 *    (default export) through the file registry (module resolver).
 */
