/** ============================================================
 FILE 21: Util Module — The Jugaad Toolkit
 ============================================================
 Topic: The 'util' module — promisify, inspect, types, etc.
 WHY THIS MATTERS:
   The util module is Node's toolbox of conversion helpers,
   debugging aids, and type checkers. promisify bridges
   callback-based APIs to modern async/await. inspect gives
   you deep visibility into any object. types validates
   without guessing.
 ============================================================ */

const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================================
// STORY: Jugaad Toolkit
// Every Indian engineer carries a jugaad toolkit — the art
// of creative, resourceful problem-solving. Raju the engineer
// has a tool for every situation — converting old-style jugaad
// to modern solutions (promisify), examining the contraption
// under a magnifying glass (inspect), identifying unknown
// parts (types), and labeling components properly (format).
// util.deprecate = marking old jugaad as "time to upgrade".
// ============================================================

// ============================================================
// EXAMPLE BLOCK 1 — promisify, callbackify, format, inspect
// ============================================================

console.log('='.repeat(60));
console.log('  BLOCK 1: promisify, callbackify, format, inspect');
console.log('='.repeat(60));

// ── util.promisify() ────────────────────────────────────────
// WHY: Many Node APIs use callbacks. promisify converts them
// to promise-based functions for use with async/await.
// Like converting old-style jugaad to modern engineering.

console.log('\n--- util.promisify() (Old Jugaad -> Modern) ---');

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
const unlinkAsync = util.promisify(fs.unlink);

const tmpFile = path.join(os.tmpdir(), 'raju-contraption-' + Date.now() + '.txt');

async function testPromisify() {
  // Write a temp file, read it back with the promisified function
  await writeFileAsync(tmpFile, 'Jugaad blueprint: solar cooker from old satellite dish');
  const content = await readFileAsync(tmpFile, 'utf8');
  console.log(`  promisified readFile: "${content}"`);
  // Output: promisified readFile: "Jugaad blueprint: solar cooker from old satellite dish"

  // Clean up
  await unlinkAsync(tmpFile);
  console.log('  Temp file cleaned up');
}

// ── util.callbackify() ─────────────────────────────────────
// WHY: The reverse of promisify — wraps an async function to
// accept a callback. Useful when legacy code expects callbacks.

console.log('\n--- util.callbackify() ---');

async function asyncGreet(name) {
  return `Namaste, Engineer ${name}!`;
}

const callbackGreet = util.callbackify(asyncGreet);

function testCallbackify() {
  return new Promise((resolve) => {
    callbackGreet('Raju', (err, result) => {
      if (err) {
        console.log(`  Error: ${err.message}`);
      } else {
        console.log(`  callbackified result: "${result}"`);
        // Output: callbackified result: "Namaste, Engineer Raju!"
      }
      resolve();
    });
  });
}

// ── util.format() ───────────────────────────────────────────
// WHY: printf-style string formatting. %s=string, %d=number,
// %j=JSON, %o=object with options. Like labeling parts.

function testFormat() {
  console.log('\n--- util.format() (Labeling Parts) ---');

  const formatted1 = util.format('Engineer %s built %d contraptions', 'Raju', 7);
  console.log(`  %%s, %%d : ${formatted1}`);
  // Output: %s, %d : Engineer Raju built 7 contraptions

  const formatted2 = util.format('Blueprint: %j', { type: 'cooler', cost: 150 });
  console.log(`  %%j     : ${formatted2}`);
  // Output: %j     : Blueprint: {"type":"cooler","cost":150}

  const formatted3 = util.format('Parts: %o', { motor: true, fan: 3 });
  console.log(`  %%o     : ${formatted3}`);
  // Output: %o     : Parts: { motor: true, fan: 3 }

  // Extra arguments are concatenated with spaces
  const formatted4 = util.format('Workshop', 'Shed', 'Raju');
  console.log(`  extras  : ${formatted4}`);
  // Output: extras  : Workshop Shed Raju
}

// ── util.inspect() ──────────────────────────────────────────
// WHY: Deep, configurable visualization of any JavaScript object.
// Far more control than JSON.stringify. Like examining the contraption.

function testInspect() {
  console.log('\n--- util.inspect() (Examining the Contraption) ---');

  const contraption = {
    name: 'Solar Water Heater',
    cost: 500,
    origin: {
      inventor: 'Raju',
      location: { state: 'Rajasthan', city: 'Jaipur' }
    },
    materials: ['copper pipe', 'old mirror'],
    specs: new Map([['certified', true], ['id', 'JGD-0042']]),
    builtOn: new Date('2024-06-15'),
    modelPattern: /jugaad-\d+/gi
  };

  // Default inspect
  const defaultInspect = util.inspect(contraption, { colors: false });
  console.log(`  Default:\n    ${defaultInspect.split('\n').join('\n    ')}`);

  // With options: depth, compact, showHidden
  const deepInspect = util.inspect(contraption, {
    depth: null,       // WHY: null = unlimited depth (default is 2)
    colors: false,     // WHY: false for non-terminal output
    compact: false,    // WHY: false = multi-line, more readable
    showHidden: false  // WHY: true would show non-enumerable properties
  });
  console.log(`\n  Deep inspect (depth:null, compact:false):`);
  deepInspect.split('\n').forEach(line => console.log(`    ${line}`));

  // Inspect with maxArrayLength
  const bigInventory = { items: Array.from({ length: 20 }, (_, i) => `part-${i}`) };
  const truncated = util.inspect(bigInventory, { maxArrayLength: 5, colors: false });
  console.log(`\n  maxArrayLength:5 :\n    ${truncated.split('\n').join('\n    ')}`);
  // Output: { items: [ 'part-0', 'part-1', 'part-2', 'part-3', 'part-4', ... 15 more items ] }

  // Custom inspect symbol
  class JugaadProject {
    constructor(name, parts) {
      this.name = name;
      this.parts = parts;
    }
    [util.inspect.custom](depth, opts) {
      return `JugaadProject<${this.name}, ${this.parts} parts>`;
    }
  }
  const project = new JugaadProject('Cooler-2024', 8);
  console.log(`\n  Custom inspect : ${util.inspect(project, { colors: false })}`);
  // Output: Custom inspect : JugaadProject<Cooler-2024, 8 parts>
}

// ============================================================
// EXAMPLE BLOCK 2 — util.types, deprecate, TextEncoder/Decoder
// ============================================================

async function testBlock2() {
  console.log('\n' + '='.repeat(60));
  console.log('  BLOCK 2: types, deprecate, TextEncoder, errors');
  console.log('='.repeat(60));

  // ── util.types — type checking ────────────────────────────
  // WHY: Reliable type checks that work across realms (unlike instanceof)

  console.log('\n--- util.types ---');

  console.log(`  isDate(new Date())       : ${util.types.isDate(new Date())}`);
  // Output: isDate(new Date())       : true
  console.log(`  isDate("2024-01-01")     : ${util.types.isDate('2024-01-01')}`);
  // Output: isDate("2024-01-01")     : false

  console.log(`  isRegExp(/abc/)          : ${util.types.isRegExp(/abc/)}`);
  // Output: isRegExp(/abc/)          : true

  console.log(`  isPromise(Promise.resolve()) : ${util.types.isPromise(Promise.resolve())}`);
  // Output: isPromise(Promise.resolve()) : true
  console.log(`  isPromise({ then(){} })  : ${util.types.isPromise({ then() {} })}`);
  // Output: isPromise({ then(){} })  : false

  const asyncFn = async () => {};
  const normalFn = () => {};
  console.log(`  isAsyncFunction(async)   : ${util.types.isAsyncFunction(asyncFn)}`);
  // Output: isAsyncFunction(async)   : true
  console.log(`  isAsyncFunction(normal)  : ${util.types.isAsyncFunction(normalFn)}`);
  // Output: isAsyncFunction(normal)  : false

  console.log(`  isMap(new Map())         : ${util.types.isMap(new Map())}`);
  // Output: isMap(new Map())         : true
  console.log(`  isSet(new Set())         : ${util.types.isSet(new Set())}`);
  // Output: isSet(new Set())         : true
  console.log(`  isArrayBuffer(new ArrayBuffer(8)) : ${util.types.isArrayBuffer(new ArrayBuffer(8))}`);
  // Output: isArrayBuffer(new ArrayBuffer(8)) : true

  // ── util.deprecate() ─────────────────────────────────────
  // WHY: Wraps a function to emit a deprecation warning on first call.
  // Used to phase out old APIs gracefully. Like marking old jugaad
  // as "time to upgrade to modern solution".

  console.log('\n--- util.deprecate() (Old Jugaad Warning) ---');

  const oldMethod = util.deprecate(() => {
    return 'Using hand-crank water pump';
  }, 'oldMethod() is deprecated. Use electricPump() instead.', 'DEP_RAJU_001');

  // WHY: Capture the warning to display it ourselves
  const originalWarn = process.emitWarning;
  let capturedWarning = null;

  process.on('warning', (warning) => {
    if (warning.code === 'DEP_RAJU_001') {
      capturedWarning = warning.message;
    }
  });

  const oldResult = oldMethod();
  console.log(`  oldMethod() returned: "${oldResult}"`);
  // Output: oldMethod() returned: "Using hand-crank water pump"

  // Give event loop a tick to process the warning
  await new Promise(resolve => setTimeout(resolve, 50));

  if (capturedWarning) {
    console.log(`  Deprecation warning: "${capturedWarning}"`);
  } else {
    console.log('  Deprecation warning emitted (may appear in stderr)');
  }
  // Output: Deprecation warning: "oldMethod() is deprecated. Use electricPump() instead."

  // ── TextEncoder / TextDecoder ─────────────────────────────
  // WHY: Convert between strings and byte arrays (Uint8Array).
  // Essential for binary protocols, WebSocket frames, etc.

  console.log('\n--- TextEncoder / TextDecoder ---');

  const encoder = new util.TextEncoder();
  const decoder = new util.TextDecoder('utf-8');

  const encoded = encoder.encode('Raju builds the contraption');
  console.log(`  Encoded type   : ${encoded.constructor.name}`);
  // Output: Encoded type   : Uint8Array
  console.log(`  Encoded length : ${encoded.length} bytes`);
  // Output: Encoded length : 27 bytes
  console.log(`  First 5 bytes  : [${Array.from(encoded.slice(0, 5)).join(', ')}]`);
  // Output: First 5 bytes  : [82, 97, 106, 117, 32]

  const decoded = decoder.decode(encoded);
  console.log(`  Decoded        : "${decoded}"`);
  // Output: Decoded        : "Raju builds the contraption"

  // Decode with different encoding
  const latin1Decoder = new util.TextDecoder('latin1');
  const latin1Buf = Buffer.from([0xC9, 0x6C, 0xE8, 0x76, 0x65]); // Eleve in Latin-1
  console.log(`  Latin-1 decode : "${latin1Decoder.decode(latin1Buf)}"`);
  // Output: Latin-1 decode : "Eleve" (with accents)

  // ── util.getSystemErrorName() ─────────────────────────────
  // WHY: Convert numeric errno codes to human-readable names
  // (e.g., -2 = ENOENT on most systems)

  console.log('\n--- util.getSystemErrorName() ---');

  // Common error codes
  const errorCodes = [-1, -2, -13, -17];
  for (const code of errorCodes) {
    try {
      const name = util.getSystemErrorName(code);
      console.log(`  errno ${String(code).padStart(3)} -> ${name}`);
    } catch (e) {
      console.log(`  errno ${String(code).padStart(3)} -> (unknown on this platform)`);
    }
  }
  // Output: errno  -1 -> EPERM
  // Output: errno  -2 -> ENOENT
  // Output: errno -13 -> EACCES
  // Output: errno -17 -> EEXIST (varies by platform)

  console.log('\n' + '='.repeat(60));
}

// ── Run everything ──────────────────────────────────────────
async function main() {
  await testPromisify();
  await testCallbackify();
  testFormat();
  testInspect();
  await testBlock2();
}

main().catch(console.error);

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. util.promisify(fn) — convert callback APIs to promises
// 2. util.callbackify(fn) — convert async functions to callbacks
// 3. util.format('%s %d %j %o') — printf-style formatting
// 4. util.inspect(obj, opts) — deep, configurable object display
// 5. inspect options: depth, colors, compact, showHidden,
//    maxArrayLength, and [util.inspect.custom] symbol
// 6. util.types.isDate/isPromise/isRegExp/isAsyncFunction etc.
//    — reliable type checks that work across realms
// 7. util.deprecate(fn, msg) — emit warning on first call
// 8. TextEncoder/TextDecoder — string <-> Uint8Array conversion
// 9. util.getSystemErrorName(errno) — numeric to error name
// 10. util is always available — no npm install needed
// ============================================================
