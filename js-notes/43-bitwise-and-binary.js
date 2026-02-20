/**
 * ============================================================
 * FILE 43: Bitwise Operators & Binary Data
 * ============================================================
 * Topic: Binary number representation, bitwise operators,
 *        permission flags, color manipulation, binary conversion,
 *        and TypedArrays.
 *
 * WHY IT MATTERS:
 * Bitwise operations are the backbone of permissions systems,
 * network protocols, graphics programming, and embedded systems.
 * They're blazing fast (single CPU instruction), memory-efficient,
 * and appear in codebases from Linux kernels to React internals.
 * Understanding them unlocks a lower level of computing mastery.
 * ============================================================
 */

// ============================================================
// STORY: THE INDIAN RAILWAY SIGNAL SYSTEM
// Signal Master Pandey ji manages the railway signal cabin at
// a busy junction near Allahabad. He doesn't use slow lever
// comparisons or bloated logbooks — he uses bits. Each bit in
// a signal byte represents a specific track signal. Flipping
// a bit sets or clears a signal in a single CPU cycle.
// ============================================================


// ============================================================
// SECTION 1 — BINARY REPRESENTATION OF NUMBERS
// ============================================================

// WHY: Before using bitwise operators, you need to understand
// how numbers are stored in binary. JavaScript uses 64-bit
// floating point, but bitwise ops treat numbers as 32-bit integers.

// --- Decimal to Binary ---
console.log("=== Binary Representation ===");
console.log("5 in binary:", (5).toString(2));
// Output: 5 in binary: 101
console.log("10 in binary:", (10).toString(2));
// Output: 10 in binary: 1010
console.log("255 in binary:", (255).toString(2));
// Output: 255 in binary: 11111111

// --- Binary to Decimal ---
console.log("Binary '1010' to decimal:", parseInt("1010", 2));
// Output: Binary '1010' to decimal: 10
console.log("Binary '11111111' to decimal:", parseInt("11111111", 2));
// Output: Binary '11111111' to decimal: 255

// --- Padding binary for readability ---
function toBin(num, bits = 8) {
  return (num >>> 0).toString(2).padStart(bits, "0");
}

console.log("5 as 8-bit:", toBin(5));
// Output: 5 as 8-bit: 00000101
console.log("42 as 8-bit:", toBin(42));
// Output: 42 as 8-bit: 00101010

// How binary works (positional notation):
//   Binary:  1  0  1  0  1  0
//   Power:  32 16  8  4  2  1
//   Value:  32 + 0 + 8 + 0 + 2 + 0 = 42
console.log("42 breakdown: 32 + 8 + 2 =", 32 + 8 + 2);
// Output: 42 breakdown: 32 + 8 + 2 = 42


// ============================================================
// SECTION 2 — BITWISE OPERATORS: THE COMPLETE SET
// ============================================================

// WHY: Each operator manipulates individual bits. Knowing all
// seven operators lets you read and write low-level code fluently.

console.log("\n=== Bitwise AND (&) ===");
// Both bits must be 1 to produce 1
console.log("  0b1100 & 0b1010 =", toBin(0b1100 & 0b1010));
// Output:   0b1100 & 0b1010 = 00001000
console.log("  12 & 10 =", 12 & 10);
// Output:   12 & 10 = 8
// Use: checking if a specific signal bit is set (masking)

console.log("\n=== Bitwise OR (|) ===");
// Either bit being 1 produces 1
console.log("  0b1100 | 0b1010 =", toBin(0b1100 | 0b1010));
// Output:   0b1100 | 0b1010 = 00001110
console.log("  12 | 10 =", 12 | 10);
// Output:   12 | 10 = 14
// Use: setting (turning on) specific signal bits

console.log("\n=== Bitwise XOR (^) ===");
// Bits must differ to produce 1
console.log("  0b1100 ^ 0b1010 =", toBin(0b1100 ^ 0b1010));
// Output:   0b1100 ^ 0b1010 = 00000110
console.log("  12 ^ 10 =", 12 ^ 10);
// Output:   12 ^ 10 = 6
// Use: toggling signals, simple encryption, swap without temp

console.log("\n=== Bitwise NOT (~) ===");
// Flips every bit (0 becomes 1, 1 becomes 0)
console.log("  ~5 =", ~5);
// Output:   ~5 = -6
console.log("  ~5 in 32-bit:", toBin(~5, 32));
// Output:   ~5 in 32-bit: 11111111111111111111111111111010
// Note: ~n === -(n + 1) due to two's complement representation

console.log("\n=== Left Shift (<<) ===");
// Shifts bits left, filling with 0s on the right
console.log("  5 << 1 =", 5 << 1, " (", toBin(5), "=>", toBin(5 << 1), ")");
// Output:   5 << 1 = 10  ( 00000101 => 00001010 )
console.log("  5 << 3 =", 5 << 3);
// Output:   5 << 3 = 40
// Left shift by n is equivalent to multiplying by 2^n

console.log("\n=== Right Shift (>>) ===");
// Shifts bits right, preserving the sign bit
console.log("  40 >> 3 =", 40 >> 3, " (", toBin(40), "=>", toBin(40 >> 3), ")");
// Output:   40 >> 3 = 5  ( 00101000 => 00000101 )
console.log("  -8 >> 2 =", -8 >> 2);
// Output:   -8 >> 2 = -2
// Sign-preserving: negative stays negative

console.log("\n=== Unsigned Right Shift (>>>) ===");
// Shifts right, filling with 0s (no sign preservation)
console.log("  -1 >>> 0 =", -1 >>> 0);
// Output:   -1 >>> 0 = 4294967295
// This converts -1 to its unsigned 32-bit representation (all 1s)
console.log("  -1 >>> 0 in binary:", toBin(-1 >>> 0, 32));
// Output:   -1 >>> 0 in binary: 11111111111111111111111111111111


// ============================================================
// SECTION 3 — PRACTICAL: FLAGS / SIGNAL SYSTEM
// ============================================================

// WHY: This is the #1 real-world use of bitwise operators.
// Unix file permissions, database roles, feature flags — they
// all use this pattern. Pandey ji's bread and butter.

console.log("\n=== Railway Signal Flags System ===");

// Define signals as powers of 2 (each occupies one bit)
const SIGNALS = {
  RED:     0b00000001, // 1  — Stop
  GREEN:   0b00000010, // 2  — All clear
  YELLOW:  0b00000100, // 4  — Caution/slow
  DISTANT: 0b00001000, // 8  — Distant signal
  SHUNT:   0b00010000, // 16 — Shunting allowed
  ROUTE:   0b00100000, // 32 — Route set
};

// --- Set signals with OR (|) ---
let pandeySignals = 0b00000000; // no signals active

pandeySignals = pandeySignals | SIGNALS.RED;
pandeySignals = pandeySignals | SIGNALS.GREEN;
pandeySignals = pandeySignals | SIGNALS.ROUTE;
// Shorthand: pandeySignals |= SIGNALS.RED | SIGNALS.GREEN | SIGNALS.ROUTE;

console.log("Pandey ji's signals:", toBin(pandeySignals));
// Output: Pandey ji's signals: 00100011

// --- Check signals with AND (&) ---
function hasSignal(signalState, signal) {
  return (signalState & signal) !== 0;
}

console.log("RED is set:", hasSignal(pandeySignals, SIGNALS.RED));
// Output: RED is set: true
console.log("DISTANT is set:", hasSignal(pandeySignals, SIGNALS.DISTANT));
// Output: DISTANT is set: false
console.log("ROUTE is set:", hasSignal(pandeySignals, SIGNALS.ROUTE));
// Output: ROUTE is set: true

// --- Clear signals with AND + NOT (& ~) ---
pandeySignals = pandeySignals & ~SIGNALS.ROUTE;
console.log("After clearing ROUTE:", toBin(pandeySignals));
// Output: After clearing ROUTE: 00000011
console.log("ROUTE is set now:", hasSignal(pandeySignals, SIGNALS.ROUTE));
// Output: ROUTE is set now: false

// --- Toggle signals with XOR (^) ---
pandeySignals = pandeySignals ^ SIGNALS.YELLOW;
console.log("After toggling YELLOW:", toBin(pandeySignals));
// Output: After toggling YELLOW: 00000111
pandeySignals = pandeySignals ^ SIGNALS.YELLOW;
console.log("After toggling YELLOW again:", toBin(pandeySignals));
// Output: After toggling YELLOW again: 00000011

// --- Check multiple signals at once ---
function hasAllSignals(signalState, ...sigs) {
  const combined = sigs.reduce((acc, s) => acc | s, 0);
  return (signalState & combined) === combined;
}

function hasAnySignal(signalState, ...sigs) {
  const combined = sigs.reduce((acc, s) => acc | s, 0);
  return (signalState & combined) !== 0;
}

console.log("Has RED and GREEN:", hasAllSignals(pandeySignals, SIGNALS.RED, SIGNALS.GREEN));
// Output: Has RED and GREEN: true
console.log("Has RED and DISTANT:", hasAllSignals(pandeySignals, SIGNALS.RED, SIGNALS.DISTANT));
// Output: Has RED and DISTANT: false
console.log("Has RED or DISTANT:", hasAnySignal(pandeySignals, SIGNALS.RED, SIGNALS.DISTANT));
// Output: Has RED or DISTANT: true

// --- List all active signals ---
function listSignals(signalState) {
  const names = [];
  for (const [name, bit] of Object.entries(SIGNALS)) {
    if ((signalState & bit) !== 0) {
      names.push(name);
    }
  }
  return names;
}

console.log("Pandey ji's active signals:", listSignals(pandeySignals));
// Output: Pandey ji's active signals: [ 'RED', 'GREEN' ]


// ============================================================
// SECTION 4 — PRACTICAL: COLOR MANIPULATION
// ============================================================

// WHY: Colors in graphics are stored as packed integers (0xRRGGBB).
// Extracting and modifying channels requires bitwise shifts and masks.

console.log("\n=== Color Manipulation ===");

// A color stored as a 24-bit integer: 0xRRGGBB
const dangerRed = 0xff3322;

// --- Extract individual channels ---
const red   = (dangerRed >> 16) & 0xff;
const green = (dangerRed >> 8) & 0xff;
const blue  = dangerRed & 0xff;

console.log(`Color 0x${dangerRed.toString(16)}: R=${red}, G=${green}, B=${blue}`);
// Output: Color 0xff3322: R=255, G=51, B=34

// --- Build a color from channels ---
function rgbToHex(r, g, b) {
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

const signalGreen = rgbToHex(0, 255, 65);
console.log("Signal green:", "0x" + signalGreen.toString(16).padStart(6, "0"));
// Output: Signal green: 0x00ff41

// --- Invert a color ---
function invertColor(color) {
  return (~color) & 0xffffff; // mask to 24 bits after NOT
}

const inverted = invertColor(dangerRed);
console.log("Inverted:", "0x" + inverted.toString(16).padStart(6, "0"));
// Output: Inverted: 0x00ccdd

// --- Blend two colors (average) ---
function blendColors(c1, c2) {
  const r = ((c1 >> 16 & 0xff) + (c2 >> 16 & 0xff)) >> 1;
  const g = ((c1 >> 8 & 0xff) + (c2 >> 8 & 0xff)) >> 1;
  const b = ((c1 & 0xff) + (c2 & 0xff)) >> 1;
  return (r << 16) | (g << 8) | b;
}

const blended = blendColors(0xff0000, 0x0000ff); // red + blue
console.log("Red + Blue blend:", "0x" + blended.toString(16).padStart(6, "0"));
// Output: Red + Blue blend: 0x7f007f

// --- With alpha (32-bit ARGB) ---
function extractARGB(color32) {
  return {
    a: (color32 >>> 24) & 0xff,
    r: (color32 >> 16) & 0xff,
    g: (color32 >> 8) & 0xff,
    b: color32 & 0xff,
  };
}

const semiTransparent = 0x80ff3322; // 50% opaque red-ish
// Must use >>> for alpha to avoid sign issues
console.log("ARGB channels:", extractARGB(semiTransparent));
// Output: ARGB channels: { a: 128, r: 255, g: 51, b: 34 }


// ============================================================
// SECTION 5 — BINARY CONVERSION UTILITIES
// ============================================================

// WHY: Converting between binary strings and numbers is essential
// for debugging, network protocols, and data encoding.

console.log("\n=== Binary Conversion ===");

// --- parseInt with radix 2 ---
console.log("parseInt('11010', 2) =", parseInt("11010", 2));
// Output: parseInt('11010', 2) = 26

// --- .toString(2) for any base ---
console.log("(255).toString(2)  =", (255).toString(2));
// Output: (255).toString(2)  = 11111111
console.log("(255).toString(16) =", (255).toString(16));
// Output: (255).toString(16) = ff
console.log("(255).toString(8)  =", (255).toString(8));
// Output: (255).toString(8)  = 377

// --- Binary literals in JavaScript ---
const binaryLiteral = 0b11010110;
console.log("0b11010110 =", binaryLiteral);
// Output: 0b11010110 = 214

// --- Hex and octal literals ---
console.log("0xff =", 0xff);
// Output: 0xff = 255
console.log("0o377 =", 0o377);
// Output: 0o377 = 255

// --- Useful bit tricks ---

// Count set bits (Hamming weight / popcount)
function countBits(n) {
  let count = 0;
  let num = n;
  while (num) {
    count += num & 1;
    num >>>= 1;
  }
  return count;
}

console.log("Bits set in 255:", countBits(255));
// Output: Bits set in 255: 8
console.log("Bits set in 42:", countBits(42));
// Output: Bits set in 42: 3

// Check if number is power of 2
function isPowerOf2(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

console.log("Is 64 power of 2:", isPowerOf2(64));
// Output: Is 64 power of 2: true
console.log("Is 65 power of 2:", isPowerOf2(65));
// Output: Is 65 power of 2: false

// Swap two variables without a temp (XOR swap)
let trackA = 42;
let trackB = 99;
console.log(`Before swap: A=${trackA}, B=${trackB}`);
// Output: Before swap: A=42, B=99
trackA ^= trackB;
trackB ^= trackA;
trackA ^= trackB;
console.log(`After swap:  A=${trackA}, B=${trackB}`);
// Output: After swap:  A=99, B=42

// Floor a positive number (faster than Math.floor for positives)
console.log("7.9 | 0 =", 7.9 | 0);
// Output: 7.9 | 0 = 7
console.log("~~7.9 =", ~~7.9);
// Output: ~~7.9 = 7
// WARNING: This truncates to 32-bit integer range. Use Math.floor
// for large numbers or negative numbers.


// ============================================================
// SECTION 6 — TYPED ARRAYS AND ARRAYBUFFER
// ============================================================

// WHY: TypedArrays let you work with raw binary data — essential
// for WebGL, audio processing, file I/O, and network protocols.
// They provide fixed-type, fixed-size arrays stored in contiguous
// memory, like arrays in C.

console.log("\n=== TypedArrays & ArrayBuffer ===");

// --- ArrayBuffer: raw chunk of binary memory ---
const buffer = new ArrayBuffer(16); // 16 bytes of raw memory
console.log("Buffer byte length:", buffer.byteLength);
// Output: Buffer byte length: 16

// You can't read/write an ArrayBuffer directly — you need a "view"

// --- Uint8Array: each element is 1 byte (0-255) ---
const bytes = new Uint8Array(buffer);
bytes[0] = 0x52; // 'R'
bytes[1] = 0x61; // 'a'
bytes[2] = 0x69; // 'i'
bytes[3] = 0x6c; // 'l'
console.log("Bytes:", bytes.slice(0, 4));
// Output: Bytes: Uint8Array(4) [ 82, 97, 105, 108 ]

// Decode to string
const decoded = String.fromCharCode(...bytes.slice(0, 4));
console.log("Decoded:", decoded);
// Output: Decoded: Rail

// --- Int32Array: each element is 4 bytes (signed 32-bit int) ---
const int32View = new Int32Array(buffer);
console.log("Int32 view length:", int32View.length); // 16 / 4 = 4
// Output: Int32 view length: 4
console.log("Int32[0] (same bytes, different view):", int32View[0]);
// Output: Int32[0] (same bytes, different view): 1818321490
// The same 4 bytes interpreted as one 32-bit integer!

// --- Common TypedArray types ---
const typeExamples = {
  Uint8Array:    { bytes: 1, range: "0 to 255" },
  Int8Array:     { bytes: 1, range: "-128 to 127" },
  Uint16Array:   { bytes: 2, range: "0 to 65,535" },
  Int16Array:    { bytes: 2, range: "-32,768 to 32,767" },
  Uint32Array:   { bytes: 4, range: "0 to 4,294,967,295" },
  Int32Array:    { bytes: 4, range: "-2B to 2B" },
  Float32Array:  { bytes: 4, range: "IEEE 754 float" },
  Float64Array:  { bytes: 8, range: "IEEE 754 double" },
  BigInt64Array: { bytes: 8, range: "-2^63 to 2^63-1" },
  BigUint64Array:{ bytes: 8, range: "0 to 2^64-1" },
};

console.log("\nTypedArray reference:");
for (const [name, info] of Object.entries(typeExamples)) {
  console.log(`  ${name.padEnd(16)} | ${info.bytes} byte(s) | ${info.range}`);
}
// Output: (formatted table of all TypedArray types)

// --- DataView: fine-grained control over byte order ---
const dataView = new DataView(buffer);
dataView.setUint16(0, 0xCAFE, false); // big-endian
console.log("DataView read (big-endian):", "0x" + dataView.getUint16(0, false).toString(16));
// Output: DataView read (big-endian): 0xcafe

// --- Practical: encoding a simple signal packet ---
function createPacket(type, id, payload) {
  const payloadBytes = new TextEncoder().encode(payload);
  const packetBuffer = new ArrayBuffer(4 + payloadBytes.length);
  const view = new DataView(packetBuffer);

  view.setUint8(0, type);        // 1 byte: packet type
  view.setUint16(1, id, false);  // 2 bytes: packet id (big-endian)
  view.setUint8(3, payloadBytes.length); // 1 byte: payload length

  const packetBytes = new Uint8Array(packetBuffer);
  packetBytes.set(payloadBytes, 4); // copy payload after header

  return packetBytes;
}

const packet = createPacket(1, 4096, "RAIL");
console.log("Signal packet:", Array.from(packet).map(b => "0x" + b.toString(16).padStart(2, "0")).join(" "));
// Output: Signal packet: 0x01 0x10 0x00 0x04 0x52 0x41 0x49 0x4c


// ============================================================
// SECTION 7 — PANDEY JI'S FULL TRACK ACCESS CONTROL DEMO
// ============================================================

// WHY: Bringing it all together — a complete, realistic permissions
// system that Pandey ji would actually deploy at the junction.

console.log("\n=== Pandey ji's Track Access Control System ===");

class TrackAccessControl {
  static FLAGS = {
    NONE:       0,
    READ:       1 << 0,  // 1  — View track status
    WRITE:      1 << 1,  // 2  — Update signal
    EXECUTE:    1 << 2,  // 4  — Operate lever
    DELETE:     1 << 3,  // 8  — Cancel route
    CREATE:     1 << 4,  // 16 — Set new route
    ADMIN:      1 << 5,  // 32 — Station master access
    SUPERUSER:  1 << 6,  // 64 — Divisional control
  };

  static ROLES = {
    VIEWER:  this.FLAGS.READ,
    EDITOR:  this.FLAGS.READ | this.FLAGS.WRITE,
    DEPLOYER: this.FLAGS.READ | this.FLAGS.EXECUTE,
    MANAGER: this.FLAGS.READ | this.FLAGS.WRITE | this.FLAGS.CREATE | this.FLAGS.DELETE,
    ROOT:    0b01111111, // all 7 flags set
  };

  constructor(name, initialAccess = 0) {
    this.name = name;
    this.access = initialAccess;
  }

  grant(...permissions) {
    for (const perm of permissions) {
      this.access |= perm;
    }
    return this;
  }

  revoke(...permissions) {
    for (const perm of permissions) {
      this.access &= ~perm;
    }
    return this;
  }

  toggle(permission) {
    this.access ^= permission;
    return this;
  }

  has(permission) {
    return (this.access & permission) === permission;
  }

  hasAny(...permissions) {
    const combined = permissions.reduce((a, b) => a | b, 0);
    return (this.access & combined) !== 0;
  }

  toString() {
    const flags = [];
    for (const [name, bit] of Object.entries(TrackAccessControl.FLAGS)) {
      if (bit !== 0 && (this.access & bit) !== 0) {
        flags.push(name);
      }
    }
    return `${this.name} [${toBin(this.access)}] => ${flags.join(", ") || "NONE"}`;
  }
}

const { FLAGS, ROLES } = TrackAccessControl;

// Create users
const pandeyJi = new TrackAccessControl("Pandey ji", ROLES.ROOT);
const trainee = new TrackAccessControl("Trainee", ROLES.VIEWER);
const signalHelper = new TrackAccessControl("SignalBot", ROLES.DEPLOYER);

console.log(pandeyJi.toString());
// Output: Pandey ji [01111111] => READ, WRITE, EXECUTE, DELETE, CREATE, ADMIN, SUPERUSER
console.log(trainee.toString());
// Output: Trainee [00000001] => READ
console.log(signalHelper.toString());
// Output: SignalBot [00000101] => READ, EXECUTE

// Promote the trainee
trainee.grant(FLAGS.WRITE, FLAGS.CREATE);
console.log("After promotion:", trainee.toString());
// Output: After promotion: Trainee [00010011] => READ, WRITE, CREATE

// Pandey ji detects wrong signal — revoke helper's execute
signalHelper.revoke(FLAGS.EXECUTE);
console.log("Helper after revoke:", signalHelper.toString());
// Output: Helper after revoke: SignalBot [00000001] => READ

// Permission check before dangerous operation
function attemptCancelRoute(user, target) {
  if (user.has(FLAGS.DELETE)) {
    console.log(`[ALLOWED] ${user.name} cancelled route ${target}`);
  } else {
    console.log(`[DENIED] ${user.name} cannot cancel route ${target}`);
  }
}

attemptCancelRoute(pandeyJi, "Prayagraj-Express");
// Output: [ALLOWED] Pandey ji cancelled route Prayagraj-Express
attemptCancelRoute(trainee, "Rajdhani-Route");
// Output: [DENIED] Trainee cannot cancel route Rajdhani-Route


// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. JavaScript treats numbers as 32-bit integers for bitwise ops.
//    Use .toString(2) and parseInt(str, 2) for binary conversion.
//
// 2. The seven bitwise operators:
//    & (AND), | (OR), ^ (XOR), ~ (NOT),
//    << (left shift), >> (signed right shift), >>> (unsigned right shift)
//
// 3. Permission flags: use powers of 2 (1 << n) so each permission
//    occupies exactly one bit. Grant with |, check with &, revoke
//    with & ~, toggle with ^.
//
// 4. Color manipulation: 0xRRGGBB stores 3 channels in one number.
//    Extract with >> and & 0xff. Combine with << and |.
//
// 5. Bit tricks: isPowerOf2 with (n & (n-1)) === 0, popcount with
//    loop, XOR swap, and | 0 for truncation.
//
// 6. TypedArrays (Uint8Array, Int32Array, Float64Array, etc.)
//    provide direct access to binary data via ArrayBuffer. Essential
//    for I/O, WebGL, audio, and network protocols.
//
// 7. DataView gives byte-level, endianness-aware access to buffers.
//    Perfect for parsing binary file formats and network packets.
//
// Pandey ji's creed: "Ek bit. Ek signal. Ek CPU cycle.
// Railway mein efficiency optional nahi hai — yeh pehli suraksha hai."
// ============================================================
