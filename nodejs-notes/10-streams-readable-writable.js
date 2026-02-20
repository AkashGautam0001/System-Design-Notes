/** ============================================================
 FILE 10: Streams — Readable and Writable
 ============================================================
 Topic: fs.createReadStream, fs.createWriteStream, custom
        Readable and Writable streams, backpressure
 WHY THIS MATTERS:
   Streams let you process data piece by piece instead of
   loading everything into memory. A 4GB file? No problem —
   streams handle it in small chunks. This is how Node scales.
 ============================================================ */

// ============================================================
// STORY: TEHRI DAM ON THE GANGA
//   The Ganga flows steadily from Gangotri in the Himalayas.
//   Data pours downstream chunk by chunk — never all at once.
//   Tehri Dam controls the flow (backpressure), and engineers
//   can build custom rivers and irrigation canals.
// ============================================================

const fs = require("fs");
const path = require("path");
const { Readable, Writable } = require("stream");

const TEMP_DIR = path.join(__dirname, "_temp_streams");
const TEMP_READ_FILE = path.join(TEMP_DIR, "gangotri-source.txt");
const TEMP_WRITE_FILE = path.join(TEMP_DIR, "irrigation-canal.txt");
const TEMP_CUSTOM_FILE = path.join(TEMP_DIR, "custom-pipe-output.txt");

// ──────────────────────────────────────────────────────────────
// Setup: create temp directory and sample file
// ──────────────────────────────────────────────────────────────

function setup() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  // Create a file with enough content to see multiple chunks
  const lines = [];
  for (let i = 1; i <= 200; i++) {
    lines.push(`Line ${i}: The Ganga flows from Gangotri carrying data...`);
  }
  fs.writeFileSync(TEMP_READ_FILE, lines.join("\n"), "utf8");
  console.log(`  [Setup] Created temp file: ${path.basename(TEMP_READ_FILE)}`);
  console.log(`  [Setup] File size: ${fs.statSync(TEMP_READ_FILE).size} bytes\n`);
}

// ──────────────────────────────────────────────────────────────
// Cleanup: remove temp files and directory
// ──────────────────────────────────────────────────────────────

function cleanup() {
  const files = [TEMP_READ_FILE, TEMP_WRITE_FILE, TEMP_CUSTOM_FILE];
  for (const f of files) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  if (fs.existsSync(TEMP_DIR)) fs.rmdirSync(TEMP_DIR);
  console.log("  [Cleanup] Temp files removed.\n");
}

// ============================================================
// EXAMPLE BLOCK 1 — fs.createReadStream
// ============================================================

function block1_readStream() {
  return new Promise((resolve) => {
    console.log("=== BLOCK 1: fs.createReadStream ===\n");

    // ──────────────────────────────────────────────────────────
    // 1a — Basic reading with 'data' and 'end' events
    // ──────────────────────────────────────────────────────────

    // WHY: highWaterMark controls the chunk size in bytes.
    //   Default is 64KB (65536). We set it small to see
    //   multiple chunks from our small test file.

    const reader = fs.createReadStream(TEMP_READ_FILE, {
      encoding: "utf8",
      highWaterMark: 1024, // 1KB chunks instead of default 64KB
    });

    let chunkCount = 0;
    let totalBytes = 0;

    reader.on("data", (chunk) => {
      chunkCount++;
      totalBytes += Buffer.byteLength(chunk, "utf8");
      if (chunkCount <= 3) {
        console.log(`  Chunk ${chunkCount}: ${Buffer.byteLength(chunk, "utf8")} bytes`);
        console.log(`    Preview: "${chunk.slice(0, 50)}..."`);
      }
    });

    reader.on("end", () => {
      console.log(`\n  Stream ended.`);
      console.log(`  Total chunks: ${chunkCount}`);
      console.log(`  Total bytes read: ${totalBytes}`);
      // Output: Stream ended.
    });

    // ──────────────────────────────────────────────────────────
    // 1b — Handling errors
    // ──────────────────────────────────────────────────────────

    // WHY: Always listen for 'error' on streams. Without it,
    //   an unreadable file would crash your process.

    reader.on("error", (err) => {
      console.log("  [Error] Read stream error:", err.message);
    });

    reader.on("close", () => {
      console.log("  [Close] Read stream closed.\n");

      // Demonstrate an error case
      const badReader = fs.createReadStream("/nonexistent/file.txt");
      badReader.on("error", (err) => {
        console.log("  [Error demo] Tried reading nonexistent file:", err.code);
        // Output: [Error demo] Tried reading nonexistent file: ENOENT
        console.log("");
        resolve();
      });
    });
  });
}

// ============================================================
// EXAMPLE BLOCK 2 — fs.createWriteStream and Backpressure
// ============================================================

function block2_writeStream() {
  return new Promise((resolve) => {
    console.log("=== BLOCK 2: fs.createWriteStream & Backpressure ===\n");

    // ──────────────────────────────────────────────────────────
    // 2a — Basic writing
    // ──────────────────────────────────────────────────────────

    const writer = fs.createWriteStream(TEMP_WRITE_FILE, {
      encoding: "utf8",
      highWaterMark: 256, // Small buffer to trigger backpressure
    });

    // WHY: write() returns a boolean. true means the internal
    //   buffer is not full. false means the buffer is full and
    //   you should wait for the 'drain' event before writing
    //   more. This is backpressure in action.

    console.log("  Writing data to irrigation-canal.txt...");

    let writeCount = 0;
    let drainCount = 0;
    let backpressureHit = false;

    // ──────────────────────────────────────────────────────────
    // 2b — Demonstrating backpressure with 'drain'
    // ──────────────────────────────────────────────────────────

    function writeMore() {
      let ok = true;
      while (writeCount < 100 && ok) {
        writeCount++;
        const data = `Tehri Dam log entry #${writeCount}: Ganga water level nominal.\n`;
        ok = writer.write(data);

        if (!ok && !backpressureHit) {
          backpressureHit = true;
          console.log(`  Backpressure hit at write #${writeCount}!`);
          console.log(`  write() returned false — dam gates are full.`);
          // Output: write() returned false — dam gates are full.
        }
      }

      if (writeCount < 100) {
        // WHY: When write() returns false, we must wait for
        //   'drain' before writing again. Ignoring this wastes
        //   memory and defeats the purpose of streams.
        writer.once("drain", () => {
          drainCount++;
          writeMore();
        });
      } else {
        writer.end(); // Signal we are done writing
      }
    }

    writeMore();

    writer.on("finish", () => {
      const stats = fs.statSync(TEMP_WRITE_FILE);
      console.log(`\n  Write stream finished.`);
      console.log(`  Total writes: ${writeCount}`);
      console.log(`  Drain events fired: ${drainCount}`);
      console.log(`  Output file size: ${stats.size} bytes\n`);
      resolve();
    });

    writer.on("error", (err) => {
      console.log("  [Error] Write stream error:", err.message);
      resolve();
    });
  });
}

// ============================================================
// EXAMPLE BLOCK 3 — Custom Readable and Writable Streams
// ============================================================

function block3_customStreams() {
  return new Promise((resolve) => {
    console.log("=== BLOCK 3: Custom Readable & Writable Streams ===\n");

    // ──────────────────────────────────────────────────────────
    // 3a — Custom Readable stream
    // ──────────────────────────────────────────────────────────

    // WHY: Sometimes your data source is not a file — it could
    //   be an algorithm, a database cursor, or a sensor feed.
    //   Custom Readable lets you create a stream from anything.

    class GangotriSource extends Readable {
      constructor(options) {
        super(options);
        this.flowCount = 0;
        this.maxFlows = 8;
      }

      _read(size) {
        // _read is called when the consumer wants more data
        this.flowCount++;
        if (this.flowCount > this.maxFlows) {
          // WHY: push(null) signals the end of the stream.
          //   Without it, the stream would never end.
          this.push(null);
          return;
        }
        const chunk = `[Ganga flow #${this.flowCount}] Water volume: ${size} liters\n`;
        this.push(chunk);
      }
    }

    console.log("  --- Custom Readable: GangotriSource ---");
    const ganga = new GangotriSource({ highWaterMark: 64 });

    const readChunks = [];
    ganga.on("data", (chunk) => {
      readChunks.push(chunk.toString());
    });

    ganga.on("end", () => {
      console.log(`  GangotriSource emitted ${readChunks.length} chunks:`);
      readChunks.forEach((c) => console.log(`    ${c.trim()}`));
      console.log("");

      // ────────────────────────────────────────────────────────
      // 3b — Custom Writable stream
      // ────────────────────────────────────────────────────────

      // WHY: Custom Writables let you send data anywhere —
      //   a database, a network socket, or a custom format.

      class IrrigationCanal extends Writable {
        constructor(options) {
          super(options);
          this.storage = [];
        }

        _write(chunk, encoding, callback) {
          // _write processes one chunk at a time
          const line = chunk.toString().trim();
          this.storage.push(line.toUpperCase());
          // WHY: You must call callback() when done processing.
          //   Pass an error to callback(err) to signal failure.
          callback();
        }
      }

      console.log("  --- Custom Writable: IrrigationCanal ---");
      const canal = new IrrigationCanal();

      // ────────────────────────────────────────────────────────
      // 3c — Pipe custom Readable into custom Writable
      // ────────────────────────────────────────────────────────

      // WHY: .pipe() automatically handles backpressure —
      //   it pauses the readable when the writable is full.

      console.log("  Piping GangotriSource → IrrigationCanal...\n");

      const ganga2 = new GangotriSource({ highWaterMark: 64 });
      ganga2.pipe(canal);

      canal.on("finish", () => {
        console.log(`  IrrigationCanal received ${canal.storage.length} items:`);
        canal.storage.forEach((item) => {
          console.log(`    ${item}`);
        });
        console.log("");
        resolve();
      });
    });
  });
}

// ──────────────────────────────────────────────────────────────
// Main — run all blocks sequentially, then clean up
// ──────────────────────────────────────────────────────────────

async function main() {
  setup();

  await block1_readStream();
  await block2_writeStream();
  await block3_customStreams();

  cleanup();

  // ============================================================
  // KEY TAKEAWAYS
  // ============================================================
  console.log("============================================================");
  console.log("KEY TAKEAWAYS");
  console.log("============================================================");
  console.log("1. ReadStream emits 'data' chunks — never loads the whole file.");
  console.log("2. highWaterMark controls chunk size (default 64KB for files).");
  console.log("3. Always handle 'error' events on streams.");
  console.log("4. write() returning false means backpressure — wait for 'drain'.");
  console.log("5. Custom Readable: implement _read(), push data, push(null) to end.");
  console.log("6. Custom Writable: implement _write(), call callback() when done.");
  console.log("7. .pipe() handles backpressure automatically between streams.");
  console.log("8. Streams are memory-efficient — process GBs with only KBs of RAM.");
  console.log("============================================================\n");
}

main();
