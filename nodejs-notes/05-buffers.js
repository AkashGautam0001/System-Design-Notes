/** ============================================================
 FILE 5: Buffers — Working with Raw Binary Data
 ============================================================
 Topic: Buffer creation, encoding, binary read/write, slicing
 WHY THIS MATTERS:
   Buffers are Node's way of handling raw binary data —
   file contents, network packets, images, crypto hashes.
   Unlike strings, Buffers give you byte-level control.
 ============================================================ */

// ============================================================
// STORY: India Post Sorting Facility
//   Worker Ravi operates the binary dak room at the India Post
//   central sorting hub in Ghaziabad. Every parcel arrives as
//   raw bytes. His job: convert between formats, read binary
//   headers, slice and combine dak bags.
// ============================================================

// ============================================================
// EXAMPLE BLOCK 1 — Creating Buffers and Encoding Conversions
// ============================================================

// ────────────────────────────────────────────────────
// SECTION 1 — Buffer Creation Methods
// ────────────────────────────────────────────────────

// WHY: Buffer.alloc() creates a zero-filled buffer of a fixed size.
//      This is the safest way to create a buffer.
const emptyBuf = Buffer.alloc(10);
console.log('Buffer.alloc(10):', emptyBuf);
// Output: <Buffer 00 00 00 00 00 00 00 00 00 00>

// WHY: Buffer.from(string) converts a string into its byte representation.
const helloBuf = Buffer.from('Namaste Bharat');
console.log('Buffer.from("Namaste Bharat"):', helloBuf);
// Output: <Buffer 4e 61 6d 61 73 74 65 20 42 68 61 72 61 74>
console.log('As string:', helloBuf.toString());
// Output: As string: Namaste Bharat

// WHY: Buffer.from(array) lets you build buffers from known byte values.
const arrayBuf = Buffer.from([72, 101, 108]);
console.log('Buffer.from([72,101,108]):', arrayBuf.toString());
// Output: Buffer.from([72,101,108]): Hel

// WHY: Buffer.allocUnsafe() is faster but DANGEROUS — it may contain
//      old memory data. Use only when you will immediately overwrite
//      every byte. Never send an unsafe buffer without filling it first.
const unsafeBuf = Buffer.allocUnsafe(10);
console.log('allocUnsafe (may have garbage):', unsafeBuf);
// Output: (unpredictable old memory contents)

// ────────────────────────────────────────────────────
// SECTION 2 — Length and Basic Properties
// ────────────────────────────────────────────────────

const greetBuf = Buffer.from('Namaste Bharat');
console.log('\n--- Length and Size ---');
console.log('buf.length:', greetBuf.length);
// Output: buf.length: 14
console.log('Buffer.byteLength("Namaste Bharat"):', Buffer.byteLength('Namaste Bharat'));
// Output: Buffer.byteLength("Namaste Bharat"): 14

// WHY: For multi-byte characters, length differs from string length.
const emojiBuf = Buffer.from('cafe\u0301');
console.log('String length of "caf\u00e9":', 'cafe\u0301'.length);
// Output: String length of "cafe\u0301": 5
console.log('Buffer byte length:', emojiBuf.length);
// Output: Buffer byte length: 6

// ────────────────────────────────────────────────────
// SECTION 3 — Encoding Conversions
// ────────────────────────────────────────────────────

const source = 'Namaste Bharat';
const sourceBuf = Buffer.from(source, 'utf8');

console.log('\n--- Encoding Conversions ---');
console.log('UTF-8  :', sourceBuf.toString('utf8'));
// Output: UTF-8  : Namaste Bharat
console.log('Hex    :', sourceBuf.toString('hex'));
// Output: Hex    : 4e616d617374652042686172617...
console.log('Base64 :', sourceBuf.toString('base64'));
// Output: Base64 : TmFtYXN0ZSBCaGFyYXQ=
console.log('ASCII  :', sourceBuf.toString('ascii'));
// Output: ASCII  : Namaste Bharat

// WHY: You can also create buffers FROM hex or base64.
const fromHex = Buffer.from('48656c6c6f', 'hex');
console.log('From hex:', fromHex.toString());
// Output: From hex: Hello

const fromBase64 = Buffer.from('TmFtYXN0ZSBCaGFyYXQ=', 'base64');
console.log('From base64:', fromBase64.toString());
// Output: From base64: Namaste Bharat

console.log('\nRavi has mastered format conversions at India Post Ghaziabad!\n');

// ============================================================
// EXAMPLE BLOCK 2 — Binary Reading and Writing
// ============================================================

// ────────────────────────────────────────────────────
// SECTION 1 — Reading Integers from Buffers
// ────────────────────────────────────────────────────

const dataBuf = Buffer.from([0xFF, 0x03, 0xE8, 0x00, 0x00, 0x01, 0x00]);

// WHY: readUInt8 reads a single unsigned byte at a given offset.
console.log('--- Binary Reading ---');
console.log('readUInt8(0):', dataBuf.readUInt8(0));
// Output: readUInt8(0): 255

// WHY: readUInt16BE reads 2 bytes as a big-endian unsigned 16-bit integer.
//      BE = Big Endian (most significant byte first).
console.log('readUInt16BE(1):', dataBuf.readUInt16BE(1));
// Output: readUInt16BE(1): 1000

// WHY: readInt32LE reads 4 bytes as a little-endian signed 32-bit integer.
//      LE = Little Endian (least significant byte first).
console.log('readInt32LE(3):', dataBuf.readInt32LE(3));
// Output: readInt32LE(3): 256

// ────────────────────────────────────────────────────
// SECTION 2 — Writing Integers to Buffers
// ────────────────────────────────────────────────────

const writeBuf = Buffer.alloc(6);

writeBuf.writeUInt8(42, 0);
writeBuf.writeUInt16BE(1000, 1);
writeBuf.writeUInt16BE(500, 3);
writeBuf.writeUInt8(99, 5);

console.log('\n--- Binary Writing ---');
console.log('Written buffer:', writeBuf);
// Output: Written buffer: <Buffer 2a 03 e8 01 f4 63>
console.log('Read back — UInt8(0):', writeBuf.readUInt8(0));
// Output: Read back — UInt8(0): 42
console.log('Read back — UInt16BE(1):', writeBuf.readUInt16BE(1));
// Output: Read back — UInt16BE(1): 1000

// ────────────────────────────────────────────────────
// SECTION 3 — Building a Binary Message Header
// ────────────────────────────────────────────────────

// WHY: Real protocols (TCP, HTTP/2, WebSocket) use binary headers.
//      Format: [type: 1 byte] [length: 2 bytes BE] [payload: variable]

function createMessage(type, payload) {
  const payloadBuf = Buffer.from(payload, 'utf8');
  const header = Buffer.alloc(3);                // 1 + 2 bytes
  header.writeUInt8(type, 0);                    // message type
  header.writeUInt16BE(payloadBuf.length, 1);    // payload length
  return Buffer.concat([header, payloadBuf]);
}

function parseMessage(messageBuf) {
  const type = messageBuf.readUInt8(0);
  const length = messageBuf.readUInt16BE(1);
  const payload = messageBuf.subarray(3, 3 + length).toString('utf8');
  return { type, length, payload };
}

console.log('\n--- Binary Message Protocol ---');
const msg = createMessage(1, 'Dak delivered to Ghaziabad hub');
console.log('Raw message:', msg);
// Output: Raw message: <Buffer 01 00 1d 44 61 6b ...>
console.log('Total bytes:', msg.length);
// Output: Total bytes: 32

const parsed = parseMessage(msg);
console.log('Parsed:', parsed);
// Output: Parsed: { type: 1, length: 29, payload: 'Dak delivered to Ghaziabad hub' }

const msg2 = createMessage(2, 'Return to sender');
const parsed2 = parseMessage(msg2);
console.log('Message 2:', parsed2);
// Output: Message 2: { type: 2, length: 16, payload: 'Return to sender' }

console.log('\nRavi can build and parse binary protocols!\n');

// ============================================================
// EXAMPLE BLOCK 3 — Slicing, Combining, and Searching
// ============================================================

// ────────────────────────────────────────────────────
// SECTION 1 — subarray (Shared Memory!)
// ────────────────────────────────────────────────────

// WHY: buf.subarray() returns a VIEW into the same memory.
//      Modifying the slice modifies the original — this is by design
//      for performance but can be a trap if you forget.
const original = Buffer.from('ABCDEF');
const slice = original.subarray(2, 5);

console.log('--- subarray (shared memory) ---');
console.log('Original:', original.toString());
// Output: Original: ABCDEF
console.log('Slice (2..5):', slice.toString());
// Output: Slice (2..5): CDE

slice[0] = 88;  // ASCII for 'X'
console.log('After modifying slice[0] to "X":');
console.log('  Slice:', slice.toString());
// Output:   Slice: XDE
console.log('  Original:', original.toString());
// Output:   Original: ABXDEF
// WHY: The original changed too — they share the same memory!

// ────────────────────────────────────────────────────
// SECTION 2 — Buffer.concat and Buffer.compare
// ────────────────────────────────────────────────────

const part1 = Buffer.from('Namaste ');
const part2 = Buffer.from('Bharat');
const combined = Buffer.concat([part1, part2]);
console.log('\n--- concat ---');
console.log('Concatenated:', combined.toString());
// Output: Concatenated: Namaste Bharat

// WHY: Buffer.compare() returns -1, 0, or 1 — perfect for sorting.
const bufs = [Buffer.from('chai'), Buffer.from('aam'), Buffer.from('dosa')];
bufs.sort(Buffer.compare);
console.log('\n--- compare (sorting) ---');
console.log('Sorted:', bufs.map(b => b.toString()));
// Output: Sorted: [ 'aam', 'chai', 'dosa' ]

// ────────────────────────────────────────────────────
// SECTION 3 — indexOf, includes, fill, copy
// ────────────────────────────────────────────────────

const searchBuf = Buffer.from('Ravi sorts dak parcels at India Post Ghaziabad');

console.log('\n--- indexOf and includes ---');
console.log('indexOf("sorts"):', searchBuf.indexOf('sorts'));
// Output: indexOf("sorts"): 5
console.log('indexOf("missing"):', searchBuf.indexOf('missing'));
// Output: indexOf("missing"): -1
console.log('includes("parcels"):', searchBuf.includes('parcels'));
// Output: includes("parcels"): true
console.log('includes("trucks"):', searchBuf.includes('trucks'));
// Output: includes("trucks"): false

// WHY: fill() overwrites every byte — useful for zeroing sensitive data.
const sensitiveBuf = Buffer.from('secret-password');
console.log('\n--- fill ---');
console.log('Before fill:', sensitiveBuf.toString());
// Output: Before fill: secret-password
sensitiveBuf.fill(0);
console.log('After fill(0):', sensitiveBuf);
// Output: After fill(0): <Buffer 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00>

// WHY: copy() copies bytes from one buffer into another at specified offsets.
const src = Buffer.from('NODE');
const dest = Buffer.alloc(10);
dest.fill(0x2D);  // fill with '-'
src.copy(dest, 3); // copy src into dest starting at offset 3
console.log('\n--- copy ---');
console.log('dest after copy:', dest.toString());
// Output: dest after copy: ---NODE---

// ────────────────────────────────────────────────────
// SECTION 4 — Buffer.isBuffer
// ────────────────────────────────────────────────────

console.log('\n--- isBuffer ---');
console.log('Buffer.isBuffer(Buffer.alloc(1)):', Buffer.isBuffer(Buffer.alloc(1)));
// Output: Buffer.isBuffer(Buffer.alloc(1)): true
console.log('Buffer.isBuffer("string"):', Buffer.isBuffer('string'));
// Output: Buffer.isBuffer("string"): false
console.log('Buffer.isBuffer(new Uint8Array(1)):', Buffer.isBuffer(new Uint8Array(1)));
// Output: Buffer.isBuffer(new Uint8Array(1)): false

console.log('\nRavi has mastered every tool at the India Post Ghaziabad sorting facility!\n');

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Use Buffer.alloc() for safe zero-filled buffers,
//    Buffer.from() for strings/arrays. Avoid allocUnsafe
//    unless you will immediately overwrite every byte.
//
// 2. Buffers support multiple encodings: utf8, hex, base64,
//    ascii. Convert freely with toString(encoding) and
//    Buffer.from(string, encoding).
//
// 3. Binary reading/writing (readUInt8, writeUInt16BE, etc.)
//    lets you build and parse real binary protocols.
//
// 4. subarray() shares memory with the original buffer —
//    mutations in the slice affect the parent.
//
// 5. Buffer.concat() joins buffers, Buffer.compare() sorts
//    them, indexOf/includes search within them.
//
// 6. fill(0) is essential for clearing sensitive data from
//    memory before discarding a buffer.
// ============================================================
