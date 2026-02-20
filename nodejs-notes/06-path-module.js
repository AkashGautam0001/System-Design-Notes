/** ============================================================
 FILE 6: The Path Module — Cross-Platform File Paths
 ============================================================
 Topic: path.join, resolve, parse, format, normalize, relative
 WHY THIS MATTERS:
   File paths differ between OS's — Windows uses backslashes,
   POSIX uses forward slashes. The path module handles this
   so your code works everywhere without string hacking.
 ============================================================ */

const path = require('path');

// ============================================================
// STORY: Sarkari File System
//   Clerk Pandey ji manages an enormous government office
//   archive. Every file has a department (directory) and a
//   label (filename). He needs tools to navigate, combine, and
//   normalize file addresses so nothing ever gets lost — no
//   matter which ministry building (operating system) the
//   office branch is in.
// ============================================================

// ============================================================
// EXAMPLE BLOCK 1 — Building and Dissecting Paths
// ============================================================

// ────────────────────────────────────────────────────
// SECTION 1 — path.join()
// ────────────────────────────────────────────────────

// WHY: join() concatenates path segments using the OS separator
//      and normalizes the result. Never use string concatenation
//      for paths — it breaks across platforms.
const shelved = path.join('ministry', 'revenue', 'taxation', 'gst-circular.txt');
console.log('join:', shelved);
// Output: join: ministry/revenue/taxation/gst-circular.txt

// WHY: join handles .. and . intelligently.
const backtracked = path.join('ministry', 'revenue', '..', 'defence', 'procurement.txt');
console.log('join with ..:', backtracked);
// Output: join with ..: ministry/defence/procurement.txt

const withDot = path.join('ministry', '.', 'revenue', 'budget.txt');
console.log('join with .:', withDot);
// Output: join with .: ministry/revenue/budget.txt

// ────────────────────────────────────────────────────
// SECTION 2 — path.resolve()
// ────────────────────────────────────────────────────

// WHY: resolve() builds an ABSOLUTE path by processing segments
//      right-to-left until an absolute path is formed.
//      If no segment is absolute, it prepends the cwd.
const resolved1 = path.resolve('revenue', 'gst-circular.txt');
console.log('\nresolve("revenue","gst-circular.txt"):', resolved1);
// Output: resolve("revenue","gst-circular.txt"): /Users/.../revenue/gst-circular.txt
// WHY: This will be cwd + revenue/gst-circular.txt — always absolute.

const resolved2 = path.resolve('/ministry', 'revenue', 'gst-circular.txt');
console.log('resolve("/ministry","revenue","gst-circular.txt"):', resolved2);
// Output: resolve("/ministry","revenue","gst-circular.txt"): /ministry/revenue/gst-circular.txt

// WHY: A later absolute segment resets the resolution.
const resolved3 = path.resolve('/ministry', '/archive', 'old-record.txt');
console.log('resolve("/ministry","/archive","old-record.txt"):', resolved3);
// Output: resolve("/ministry","/archive","old-record.txt"): /archive/old-record.txt

// ────────────────────────────────────────────────────
// SECTION 3 — path.basename(), dirname(), extname()
// ────────────────────────────────────────────────────

const filePath = '/ministry/revenue/taxation/gst-circular.txt';

console.log('\n--- Dissecting a path ---');
console.log('basename:', path.basename(filePath));
// Output: basename: gst-circular.txt
console.log('basename without ext:', path.basename(filePath, '.txt'));
// Output: basename without ext: gst-circular
console.log('dirname:', path.dirname(filePath));
// Output: dirname: /ministry/revenue/taxation
console.log('extname:', path.extname(filePath));
// Output: extname: .txt

// WHY: extname returns the LAST extension — important for .tar.gz files.
console.log('extname of "archive.tar.gz":', path.extname('archive.tar.gz'));
// Output: extname of "archive.tar.gz": .gz

// ────────────────────────────────────────────────────
// SECTION 4 — path.parse() and path.format()
// ────────────────────────────────────────────────────

// WHY: parse() splits a path into all its components at once.
const parsed = path.parse('/ministry/revenue/taxation/gst-circular.txt');
console.log('\n--- parse() ---');
console.log('Parsed object:', parsed);
// Output: Parsed object: {
//   root: '/',
//   dir: '/ministry/revenue/taxation',
//   base: 'gst-circular.txt',
//   ext: '.txt',
//   name: 'gst-circular'
// }

console.log('  root:', parsed.root);
// Output:   root: /
console.log('  dir:', parsed.dir);
// Output:   dir: /ministry/revenue/taxation
console.log('  base:', parsed.base);
// Output:   base: gst-circular.txt
console.log('  ext:', parsed.ext);
// Output:   ext: .txt
console.log('  name:', parsed.name);
// Output:   name: gst-circular

// WHY: format() is the exact reverse — builds a path from an object.
const formatted = path.format({
  dir: '/ministry/defence',
  name: 'procurement-policy',
  ext: '.pdf'
});
console.log('\nformat():', formatted);
// Output: format(): /ministry/defence/procurement-policy.pdf

// WHY: If base is provided, name and ext are ignored.
const formatted2 = path.format({
  dir: '/ministry',
  base: 'readme.md',
  name: 'ignored',
  ext: '.ignored'
});
console.log('format() with base:', formatted2);
// Output: format() with base: /ministry/readme.md

console.log('\nPandey ji can dissect and rebuild any sarkari file address!\n');

// ============================================================
// EXAMPLE BLOCK 2 — Normalizing, Comparing, and Cross-Platform
// ============================================================

// ────────────────────────────────────────────────────
// SECTION 1 — path.relative()
// ────────────────────────────────────────────────────

// WHY: relative() calculates how to get from one path to another.
//      Essential for generating import paths or relative links.
const from = '/ministry/revenue/taxation';
const to = '/ministry/defence/procurement';

console.log('--- relative() ---');
console.log(`From ${from}`);
console.log(`To   ${to}`);
console.log('Relative:', path.relative(from, to));
// Output: Relative: ../../defence/procurement

const fromFile = '/project/src/utils/helpers.js';
const toFile = '/project/src/components/Header.js';
console.log('\nrelative for imports:', path.relative(path.dirname(fromFile), toFile));
// Output: relative for imports: ../components/Header.js

// ────────────────────────────────────────────────────
// SECTION 2 — path.normalize()
// ────────────────────────────────────────────────────

// WHY: normalize() cleans up messy paths — removes double slashes,
//      resolves dots, fixes trailing slashes.
console.log('\n--- normalize() ---');
console.log(path.normalize('/ministry//revenue///taxation'));
// Output: /ministry/revenue/taxation
console.log(path.normalize('/ministry/revenue/../defence/./procurement'));
// Output: /ministry/defence/procurement
console.log(path.normalize('ministry/revenue/taxation/'));
// Output: ministry/revenue/taxation

// ────────────────────────────────────────────────────
// SECTION 3 — path.sep, path.delimiter, path.isAbsolute()
// ────────────────────────────────────────────────────

console.log('\n--- Platform Constants ---');
console.log('path.sep:', JSON.stringify(path.sep));
// Output: path.sep: "/"   (on POSIX)  or  "\\"  (on Windows)

console.log('path.delimiter:', JSON.stringify(path.delimiter));
// Output: path.delimiter: ":"   (on POSIX)  or  ";"  (on Windows)
// WHY: delimiter is what separates entries in PATH environment variable.

console.log('\n--- isAbsolute() ---');
console.log('isAbsolute("/ministry/revenue"):', path.isAbsolute('/ministry/revenue'));
// Output: isAbsolute("/ministry/revenue"): true
console.log('isAbsolute("revenue/taxation"):', path.isAbsolute('revenue/taxation'));
// Output: isAbsolute("revenue/taxation"): false
console.log('isAbsolute("./relative"):', path.isAbsolute('./relative'));
// Output: isAbsolute("./relative"): false

// ────────────────────────────────────────────────────
// SECTION 4 — Cross-Platform: path.posix vs path.win32
// ────────────────────────────────────────────────────

// WHY: path methods use the current OS convention by default.
//      path.posix always uses forward slashes (Linux/Mac).
//      path.win32 always uses backslashes (Windows).
//      Use these when you need to generate paths for a specific OS.
console.log('\n--- Cross-Platform ---');
console.log('posix.join:', path.posix.join('ministry', 'revenue', 'gst-circular.txt'));
// Output: posix.join: ministry/revenue/gst-circular.txt
console.log('win32.join:', path.win32.join('ministry', 'revenue', 'gst-circular.txt'));
// Output: win32.join: ministry\revenue\gst-circular.txt

console.log('posix.parse("/dept/file.txt"):', path.posix.parse('/dept/file.txt'));
// Output: posix.parse("/dept/file.txt"): { root: '/', dir: '/dept', base: 'file.txt', ext: '.txt', name: 'file' }
console.log('win32.parse("C:\\\\dept\\\\file.txt"):', path.win32.parse('C:\\dept\\file.txt'));
// Output: win32.parse("C:\\dept\\file.txt"): { root: 'C:\\', dir: 'C:\\dept', base: 'file.txt', ext: '.txt', name: 'file' }

// ────────────────────────────────────────────────────
// SECTION 5 — Practical Example: Building Project Paths
// ────────────────────────────────────────────────────

console.log('\n--- Practical: Project Path Builder ---');

// WHY: In real projects, use __dirname (the directory of the current file)
//      as the anchor, then join relative paths from there.
const projectRoot = __dirname;
const srcDir = path.join(projectRoot, 'src');
const configFile = path.join(projectRoot, 'config', 'settings.json');
const outputDir = path.join(projectRoot, 'dist', 'build');

console.log('Project root:', projectRoot);
console.log('Source dir:', srcDir);
console.log('Config file:', configFile);
console.log('Output dir:', outputDir);

// Building a relative import path between two source files
const fileA = path.join(srcDir, 'routes', 'api', 'users.js');
const fileB = path.join(srcDir, 'models', 'User.js');
const importPath = path.relative(path.dirname(fileA), fileB);
console.log(`\nFrom: ${fileA}`);
console.log(`To:   ${fileB}`);
console.log(`Import path: ./${importPath.split(path.sep).join('/')}`);
// WHY: We convert separators to / for JavaScript import statements.

console.log('\nPandey ji has organized every file in the sarkari office!\n');

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. NEVER concatenate paths with + or template literals.
//    Always use path.join() for relative or path.resolve()
//    for absolute paths.
//
// 2. path.parse() decomposes a path into {root, dir, base,
//    ext, name}. path.format() rebuilds it. They are inverses.
//
// 3. path.relative() is essential for generating import paths
//    or relative links between two known locations.
//
// 4. path.normalize() cleans up messy paths with double
//    slashes, trailing slashes, and unnecessary dots.
//
// 5. Use path.posix or path.win32 when you need to generate
//    paths for a specific platform regardless of current OS.
//
// 6. Anchor project paths to __dirname (current file's
//    directory) rather than relying on process.cwd().
// ============================================================
