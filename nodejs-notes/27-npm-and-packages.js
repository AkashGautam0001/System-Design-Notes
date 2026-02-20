/** ============================================================
    FILE 27: npm and Packages
    ============================================================
    Topic: package.json anatomy, semver, node_modules, npx
    WHY THIS MATTERS:
    npm is the world's largest software registry. Understanding
    package.json, semantic versioning, and module resolution is
    essential for every Node.js developer — it's how you build
    on the shoulders of giants without breaking your app.
    ============================================================ */

// ============================================================
// STORY: Kirana Store Wholesale Market
// Seth Govind ji manages a kirana store and orders supplies
// from the wholesale market (npm registry). package.json is
// the order list. node_modules is the godown (warehouse).
// npm install is bulk purchasing. Each item has a version,
// a supplier, and its own chain of sub-suppliers.
// ============================================================

// ============================================================
// EXAMPLE BLOCK 1 — package.json Anatomy
// ============================================================

console.log('=== Seth Govind ji opens the wholesale order ledger ===\n');

// ──────────────────────────────────────────────────────────
// The complete package.json — field by field
// ──────────────────────────────────────────────────────────

const samplePackageJson = {
  name: "@govindji/kirana-app",
  // WHY: Package name. Lowercase, scoped (@org/name). Unique on npm. Max 214 chars.

  version: "2.1.0",
  // WHY: Semantic version MAJOR.MINOR.PATCH. Required for publishing.

  description: "A kirana store inventory management application",
  // WHY: Shows in npm search results. Keep concise.

  main: "./dist/index.js",
  // WHY: Entry point for require('kirana-app') in CommonJS.

  exports: { ".": { import: "./dist/index.mjs", require: "./dist/index.cjs" }, "./utils": "./dist/utils.js" },
  // WHY: Modern replacement for "main". Supports conditional exports (ESM vs CJS),
  // subpath exports, and encapsulation. Unlisted files cannot be required.

  type: "commonjs",
  // WHY: "commonjs" = require/module.exports. "module" = import/export (ESM).

  keywords: ["kirana", "inventory", "wholesale"],
  // WHY: Helps people find your package in npm search.

  author: "Govind Prasad <govind@example.com> (https://govindji.dev)",
  // WHY: String or object { name, email, url }.

  license: "MIT",
  // WHY: How consumers can use your code. Common: MIT, Apache-2.0, ISC, GPL-3.0

  repository: { type: "git", url: "https://github.com/govindji/kirana-app.git" },
  // WHY: Links to source code on the npm package page.

  bugs: { url: "https://github.com/govindji/kirana-app/issues" },
  // WHY: Where to report bugs. npm displays this link.

  homepage: "https://govindji.dev/kirana-app",
  // WHY: Project homepage or documentation site.

  scripts: {
    start: "node dist/index.js",     // `npm start` (no "run" needed)
    dev: "node --watch src/index.js", // `npm run dev`
    test: "jest --coverage",          // `npm test` (no "run" needed)
    build: "tsc",                     // `npm run build`
    lint: "eslint src/",
    prepublishOnly: "npm run build && npm test", // auto before publish
    pretest: "npm run lint",                     // auto before test
  },
  // WHY: npm run <name> executes these. pre/post hooks auto-run.

  dependencies: { express: "^4.18.2", lodash: "~4.17.21" },
  // WHY: RUNTIME packages. Bundled when published. Like essential supplies.

  devDependencies: { jest: "^29.7.0", eslint: "^8.50.0", typescript: "^5.2.0" },
  // WHY: BUILD/TEST only. Not installed by consumers. Use `npm install -D`.

  peerDependencies: { react: ">=17.0.0" },
  // WHY: "You must install this yourself." Used by plugins. npm 7+ auto-installs.

  engines: { node: ">=18.0.0", npm: ">=9.0.0" },
  // WHY: Declares supported versions. engine-strict=true in .npmrc enforces this.

  files: ["dist/", "LICENSE", "README.md"],
  // WHY: Whitelist for publishing. Keeps package small — no tests, no src/.
};

console.log('Sample package.json fields (the order list):');
const fields = Object.keys(samplePackageJson);
fields.forEach((field, i) => {
  const val = samplePackageJson[field];
  const type = Array.isArray(val) ? 'array' : typeof val;
  console.log(`  ${(i + 1).toString().padStart(2)}. ${field} (${type})`);
});
// Output:    1. name (string)
// Output:    2. version (string)
// Output:   ... (all fields listed)
console.log(`\n  Total fields explained: ${fields.length}`);

// ============================================================
// EXAMPLE BLOCK 2 — Semver, Resolution, npx, ESM
// ============================================================

console.log('\n--- BLOCK 2: Semver, Module Resolution, npx ---\n');

// ──────────────────────────────────────────────────────────
// Semantic Versioning (semver) — MAJOR.MINOR.PATCH
// ──────────────────────────────────────────────────────────
// WHY: Semver is a contract. It tells you what changes to expect.

console.log('Semver ranges explained (supplier version contracts):');
console.log('  MAJOR.MINOR.PATCH = breaking.feature.bugfix\n');

const semverExamples = [
  ['^1.2.3', '>=1.2.3 <2.0.0',  'Minor + patch (most common)'],
  ['~1.2.3', '>=1.2.3 <1.3.0',  'Patch only (conservative)'],
  ['1.2.3',  '=1.2.3 exactly',  'Exact version (strictest)'],
  ['*',      'any version',      'Any version (dangerous!)'],
  ['>=1.0.0','1.0.0 or higher',  'Minimum, no upper bound'],
  ['^0.2.3', '>=0.2.3 <0.3.0',  'MAJOR=0: ^ acts like ~'],
  ['1.x',    '>=1.0.0 <2.0.0',  'Any 1.x.x version'],
  ['1.2.x',  '>=1.2.0 <1.3.0',  'Any 1.2.x version'],
];

semverExamples.forEach(([range, expands, note]) => {
  console.log(`  ${range.padEnd(10)} -> ${expands.padEnd(25)} // ${note}`);
});

console.log('\n  GOTCHA with 0.x versions:');
console.log('  ^0.2.3 does NOT allow 0.3.0 — treats minor as breaking');
console.log('  ^0.0.3 allows ONLY 0.0.3 — treats patch as breaking');
console.log('  WHY: Before 1.0.0, the API is considered unstable.\n');

// ──────────────────────────────────────────────────────────
// node_modules resolution algorithm
// ──────────────────────────────────────────────────────────

console.log('node_modules resolution algorithm (godown search order):');
console.log('  require("atta") searches:');
console.log('  1. Core modules (fs, path, http — always first)');
console.log('  2. ./node_modules/atta  ->  ../node_modules/atta');
console.log('  3. ... up to filesystem root /node_modules/atta');
console.log('  4. Global folders (NODE_PATH, ~/.node_modules)\n');

console.log('module.paths for THIS file:');
module.paths.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p}`);
});

// ──────────────────────────────────────────────────────────
// require.resolve — find where a module lives
// ──────────────────────────────────────────────────────────

console.log('\nrequire.resolve examples:');
console.log(`  require.resolve('fs'):   ${require.resolve('fs')}`);
// Output:   require.resolve('fs'):   fs (core modules resolve to name)
console.log(`  require.resolve('path'): ${require.resolve('path')}`);
// Output:   require.resolve('path'): path

console.log(`\nmodule.filename: ${module.filename}`);
console.log(`__dirname:       ${__dirname}`);
console.log(`__filename:      ${__filename}`);

// ──────────────────────────────────────────────────────────
// package-lock.json — why it exists
// ──────────────────────────────────────────────────────────
// WHY: package.json has RANGES (^1.2.3). Two installs at different
// times may resolve different versions. The lock file pins EXACT
// versions for reproducibility. Always commit it.
// Use `npm ci` in CI/CD — strict, fast, uses only the lock file.

console.log('\npackage-lock.json (the fixed-price receipt):');
console.log('  - Locks exact versions for reproducibility');
console.log('  - Always commit to version control');
console.log('  - `npm ci` = strict install from lock (for CI/CD)');

// ──────────────────────────────────────────────────────────
// npx — execute packages without installing globally
// ──────────────────────────────────────────────────────────
// WHY: Checks local node_modules/.bin first, then downloads temporarily.

console.log('\nnpx usage (one-time wholesale sample):');
console.log('  npx <command>              — run local or download+run');
console.log('  npx create-react-app app   — scaffold without global install');
console.log('  npx -p node@18 node -v     — run with specific Node version');

// ──────────────────────────────────────────────────────────
// "type": "module" — ESM vs CJS
// ──────────────────────────────────────────────────────────
// "commonjs": .js uses require(), use .mjs for ESM
// "module":   .js uses import/export, use .cjs for CommonJS
// ESM: no require(), no __dirname/__filename, use import.meta.url
// ESM supports top-level await. CJS cannot require() ESM (use import()).

console.log('\n"type": "module" (ESM) vs "commonjs" (CJS):');
console.log('  CJS: require(), module.exports, __dirname, __filename');
console.log('  ESM: import/export, import.meta.url, top-level await');
console.log('  CJS can require() ESM? NO (use dynamic import())');
console.log('  ESM can import CJS?    YES');

// ──────────────────────────────────────────────────────────
// Essential npm commands reference
// ──────────────────────────────────────────────────────────

console.log('\nEssential npm commands (wholesale market operations):');
const commands = [
  ['npm init -y',          'Create package.json with defaults'],
  ['npm install <pkg>',    'Install and add to dependencies'],
  ['npm install -D <pkg>', 'Install as devDependency'],
  ['npm ci',               'Clean install from lock file (CI/CD)'],
  ['npm update',           'Update within semver range'],
  ['npm outdated',         'Show newer versions available'],
  ['npm audit',            'Check security vulnerabilities'],
  ['npm ls',               'Show dependency tree'],
  ['npm pack',             'Create tarball of your package'],
  ['npm publish',          'Publish to npm registry'],
  ['npm link',             'Symlink local package for dev'],
];

commands.forEach(([cmd, desc]) => {
  console.log(`  ${cmd.padEnd(25)} — ${desc}`);
});

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. package.json is the manifest — name, version, deps,
//    scripts, and entry points define your package.
// 2. dependencies = runtime; devDependencies = build/test;
//    peerDependencies = "you must install this yourself."
// 3. Semver: ^ = minor+patch, ~ = patch only, exact = pinned.
//    Watch out for ^0.x.y which is more restrictive.
// 4. node_modules resolution walks up the directory tree.
//    require.resolve() shows where a module was found.
// 5. package-lock.json locks exact versions. Always commit it.
//    Use `npm ci` in CI/CD for reproducible builds.
// 6. npx runs packages without global install — great for
//    one-time commands and project scaffolding.
// 7. "type": "module" switches .js files to ESM (import/export).
//    "type": "commonjs" (default) uses require().
// 8. "exports" is the modern replacement for "main" —
//    supports conditional exports and subpath mapping.
// ============================================================

console.log('\nSeth Govind ji closes the ledger. The godown is fully stocked.');
