/** ============================================================
 FILE 11: Streams — Transform and Pipeline
 ============================================================
 Topic: Transform streams, .pipe() chaining, stream.pipeline,
        stream/promises, Readable.from(), stream.finished()
 WHY THIS MATTERS:
   Transform streams are the middleware of the stream world.
   Pipeline gives you safe, error-handled piping. Together
   they let you build composable data-processing chains.
 ============================================================ */

// ============================================================
// STORY: TEHRI DAM PIPELINE (continued)
//   The Ganga now flows from Gangotri through water treatment
//   plants along the canal. Each plant transforms the water
//   as it passes — one filters, another purifies, and a
//   pipeline carries it safely from source to the fields.
// ============================================================

const fs = require("fs");
const path = require("path");
const { Transform, Readable, Writable, pipeline, finished } = require("stream");
const { pipeline: pipelinePromise } = require("stream/promises");

const TEMP_DIR = path.join(__dirname, "_temp_transform");
const TEMP_INPUT = path.join(TEMP_DIR, "raw-ganga-water.txt");
const TEMP_OUTPUT = path.join(TEMP_DIR, "treated-water.txt");
const TEMP_PIPELINE_OUT = path.join(TEMP_DIR, "pipeline-out.txt");
const TEMP_ASYNC_OUT = path.join(TEMP_DIR, "async-pipeline-out.txt");

// ──────────────────────────────────────────────────────────────
// Setup and Cleanup
// ──────────────────────────────────────────────────────────────

function setup() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  const lines = [
    "the ganga starts at gangotri glacier in the himalayas",
    "water flows through rishikesh and haridwar",
    "hilsa fish swim upstream every monsoon",
    "tehri dam controls the water level for irrigation",
    "treatment plants purify the water supply",
    "clean water reaches every field in uttarakhand",
  ];
  fs.writeFileSync(TEMP_INPUT, lines.join("\n"), "utf8");
  console.log("  [Setup] Created raw-ganga-water.txt\n");
}

function cleanup() {
  for (const f of [TEMP_INPUT, TEMP_OUTPUT, TEMP_PIPELINE_OUT, TEMP_ASYNC_OUT]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  if (fs.existsSync(TEMP_DIR)) fs.rmdirSync(TEMP_DIR);
  console.log("  [Cleanup] Temp files removed.\n");
}

// ============================================================
// EXAMPLE BLOCK 1 — Transform Streams
// ============================================================

function block1_transformStreams() {
  return new Promise((resolve) => {
    console.log("=== BLOCK 1: Transform Streams ===\n");

    // ──────────────────────────────────────────────────────────
    // 1a — Uppercase Transform
    // ──────────────────────────────────────────────────────────

    // WHY: A Transform stream is both Readable and Writable.
    //   Data flows in, gets transformed, and flows out. This
    //   is the "water treatment plant" of the stream world.

    class UppercaseTransform extends Transform {
      _transform(chunk, encoding, callback) {
        // Transform the chunk and push it downstream
        const upper = chunk.toString().toUpperCase();
        this.push(upper);
        // WHY: callback() signals this chunk is done processing.
        //   You can also pass an error: callback(new Error(...))
        callback();
      }
    }

    console.log("  --- Uppercase Transform ---");

    const upper = new UppercaseTransform();
    const collected = [];

    upper.on("data", (chunk) => collected.push(chunk.toString()));
    upper.on("end", () => {
      console.log("  Input:  'hello streams'");
      console.log(`  Output: '${collected.join("")}'`);
      // Output: Output: 'HELLO STREAMS'
      console.log("");

      // ────────────────────────────────────────────────────────
      // 1b — Line-Numbering Transform
      // ────────────────────────────────────────────────────────

      console.log("  --- Line-Numbering Transform ---");

      class LineNumberTransform extends Transform {
        constructor(options) {
          super(options);
          this.lineNumber = 0;
          this.buffer = "";
        }

        _transform(chunk, encoding, callback) {
          this.buffer += chunk.toString();
          const lines = this.buffer.split("\n");
          // Keep the last element — it may be an incomplete line
          this.buffer = lines.pop();

          for (const line of lines) {
            this.lineNumber++;
            this.push(`${String(this.lineNumber).padStart(3, " ")} | ${line}\n`);
          }
          callback();
        }

        _flush(callback) {
          // WHY: _flush is called when the stream ends, letting
          //   you push any remaining buffered data.
          if (this.buffer.length > 0) {
            this.lineNumber++;
            this.push(`${String(this.lineNumber).padStart(3, " ")} | ${this.buffer}\n`);
          }
          callback();
        }
      }

      // Pipe file through both transforms into output
      const reader = fs.createReadStream(TEMP_INPUT, { encoding: "utf8" });
      const upperTransform = new UppercaseTransform();
      const lineTransform = new LineNumberTransform();
      const writer = fs.createWriteStream(TEMP_OUTPUT);

      // ────────────────────────────────────────────────────────
      // 1c — Chaining transforms with .pipe()
      // ────────────────────────────────────────────────────────

      console.log("  Piping: file → uppercase → line-numbers → file\n");

      reader.pipe(upperTransform).pipe(lineTransform).pipe(writer);

      writer.on("finish", () => {
        const result = fs.readFileSync(TEMP_OUTPUT, "utf8");
        console.log("  Output file contents:");
        result.split("\n").filter(Boolean).forEach((line) => {
          console.log(`    ${line}`);
        });
        console.log("");
        resolve();
      });
    });

    upper.write("hello streams");
    upper.end();
  });
}

// ============================================================
// EXAMPLE BLOCK 2 — .pipe() Chaining and stream.pipeline()
// ============================================================

function block2_pipeline() {
  return new Promise((resolve) => {
    console.log("=== BLOCK 2: .pipe() Chaining & stream.pipeline() ===\n");

    // ──────────────────────────────────────────────────────────
    // 2a — The problem with .pipe()
    // ──────────────────────────────────────────────────────────

    // WHY: .pipe() does NOT forward errors through the chain.
    //   If a middle stream errors, the writable can hang open.
    //   stream.pipeline() fixes this by destroying all streams
    //   on error and calling a final callback.

    console.log("  .pipe() is simple but has a flaw:");
    console.log("    readable.pipe(transform).pipe(writable)");
    console.log("    → Errors in transform do NOT auto-propagate!\n");

    // ──────────────────────────────────────────────────────────
    // 2b — stream.pipeline() with callback
    // ──────────────────────────────────────────────────────────

    class ExclamationTransform extends Transform {
      _transform(chunk, encoding, callback) {
        const lines = chunk.toString().split("\n").filter(Boolean);
        const transformed = lines.map((l) => `${l.trim()}!!!\n`).join("");
        this.push(transformed);
        callback();
      }
    }

    console.log("  --- stream.pipeline() with callback ---\n");

    const source = fs.createReadStream(TEMP_INPUT, { encoding: "utf8" });
    const exclaim = new ExclamationTransform();
    const dest = fs.createWriteStream(TEMP_PIPELINE_OUT);

    pipeline(source, exclaim, dest, (err) => {
      if (err) {
        console.log("  Pipeline failed:", err.message);
      } else {
        console.log("  Pipeline succeeded!");
        const result = fs.readFileSync(TEMP_PIPELINE_OUT, "utf8");
        console.log("  Output preview:");
        result.split("\n").filter(Boolean).slice(0, 3).forEach((line) => {
          console.log(`    ${line}`);
        });
        // Output: the ganga starts at gangotri glacier in the himalayas!!!
      }

      // ────────────────────────────────────────────────────────
      // 2c — pipeline error handling demo
      // ────────────────────────────────────────────────────────

      console.log("\n  --- Pipeline error handling ---\n");

      class FailingTransform extends Transform {
        constructor() {
          super();
          this.count = 0;
        }
        _transform(chunk, encoding, callback) {
          this.count++;
          if (this.count > 1) {
            callback(new Error("Treatment plant malfunction at Tehri!"));
            return;
          }
          this.push(chunk);
          callback();
        }
      }

      // Create a multi-chunk source
      const errorSource = new Readable({
        read() {
          this.push("chunk one\n");
          this.push("chunk two\n");
          this.push(null);
        },
      });

      const failTransform = new FailingTransform();
      const devNull = new Writable({
        write(chunk, enc, cb) { cb(); },
      });

      pipeline(errorSource, failTransform, devNull, (err) => {
        if (err) {
          console.log("  Pipeline caught error: " + err.message);
          // Output: Pipeline caught error: Treatment plant malfunction at Tehri!
          console.log("  All streams destroyed cleanly — no leaks!\n");
        }
        resolve();
      });
    });
  });
}

// ============================================================
// EXAMPLE BLOCK 3 — stream/promises, Readable.from(), finished()
// ============================================================

async function block3_asyncStreams() {
  console.log("=== BLOCK 3: Async Streams — Promises & Generators ===\n");

  // ──────────────────────────────────────────────────────────
  // 3a — stream/promises pipeline with async/await
  // ──────────────────────────────────────────────────────────

  // WHY: The promise-based pipeline is cleaner for modern
  //   async code — no callbacks, just try/catch.

  console.log("  --- stream/promises pipeline ---\n");

  class StarTransform extends Transform {
    _transform(chunk, encoding, callback) {
      const lines = chunk.toString().split("\n").filter(Boolean);
      const starred = lines.map((l) => `★ ${l.trim()}`).join("\n") + "\n";
      this.push(starred);
      callback();
    }
  }

  try {
    const src = fs.createReadStream(TEMP_INPUT, { encoding: "utf8" });
    const star = new StarTransform();
    const dst = fs.createWriteStream(TEMP_ASYNC_OUT);

    await pipelinePromise(src, star, dst);

    console.log("  Async pipeline completed!");
    const result = fs.readFileSync(TEMP_ASYNC_OUT, "utf8");
    result.split("\n").filter(Boolean).slice(0, 3).forEach((line) => {
      console.log(`    ${line}`);
    });
    // Output: ★ the ganga starts at gangotri glacier in the himalayas
  } catch (err) {
    console.log("  Async pipeline error:", err.message);
  }

  // ──────────────────────────────────────────────────────────
  // 3b — Readable.from() with an array
  // ──────────────────────────────────────────────────────────

  console.log("\n  --- Readable.from() with array ---\n");

  // WHY: Readable.from() creates a stream from any iterable —
  //   arrays, strings, generators. Perfect for testing or
  //   adapting synchronous data into stream pipelines.

  const waterSamples = ["sample-Rishikesh\n", "sample-Haridwar\n", "sample-Tehri\n"];
  const arrayStream = Readable.from(waterSamples);

  const fromChunks = [];
  for await (const chunk of arrayStream) {
    fromChunks.push(chunk.toString().trim());
  }
  console.log("  Readable.from(array):", fromChunks);
  // Output: Readable.from(array): [ 'sample-Rishikesh', 'sample-Haridwar', 'sample-Tehri' ]

  // ──────────────────────────────────────────────────────────
  // 3c — Readable.from() with an async generator
  // ──────────────────────────────────────────────────────────

  console.log("\n  --- Readable.from() with async generator ---\n");

  async function* gangaFlow() {
    const readings = ["pH=7.4", "temp=22C", "clarity=high", "flow=steady"];
    for (const reading of readings) {
      // Simulate async sensor delay
      await new Promise((r) => setTimeout(r, 20));
      yield `[Tehri Sensor] ${reading}\n`;
    }
  }

  // WHY: Async generators are a natural fit for streams —
  //   they produce values lazily over time, just like streams.

  const sensorStream = Readable.from(gangaFlow());
  const sensorData = [];

  for await (const chunk of sensorStream) {
    sensorData.push(chunk.toString().trim());
  }
  sensorData.forEach((d) => console.log(`    ${d}`));
  // Output: [Tehri Sensor] pH=7.4
  // Output: [Tehri Sensor] temp=22C
  // Output: [Tehri Sensor] clarity=high
  // Output: [Tehri Sensor] flow=steady

  // ──────────────────────────────────────────────────────────
  // 3d — stream.finished() — detect when a stream is done
  // ──────────────────────────────────────────────────────────

  console.log("\n  --- stream.finished() ---\n");

  // WHY: finished() reliably detects when a stream is done,
  //   whether it ended normally, errored, or was destroyed.

  const shortStream = Readable.from(["done\n"]);

  await new Promise((resolve, reject) => {
    shortStream.resume(); // Start consuming
    finished(shortStream, (err) => {
      if (err) {
        console.log("  Stream ended with error:", err.message);
        reject(err);
      } else {
        console.log("  stream.finished() detected clean end");
        // Output: stream.finished() detected clean end
        resolve();
      }
    });
  });

  console.log("");
}

// ──────────────────────────────────────────────────────────────
// Main — run all blocks then clean up
// ──────────────────────────────────────────────────────────────

async function main() {
  setup();

  await block1_transformStreams();
  await block2_pipeline();
  await block3_asyncStreams();

  cleanup();

  // ============================================================
  // KEY TAKEAWAYS
  // ============================================================
  console.log("============================================================");
  console.log("KEY TAKEAWAYS");
  console.log("============================================================");
  console.log("1. Transform streams are both Readable and Writable — data in, transformed data out.");
  console.log("2. Implement _transform(chunk, enc, cb) and optionally _flush(cb) for leftovers.");
  console.log("3. .pipe() chains are simple but do NOT propagate errors.");
  console.log("4. stream.pipeline() destroys all streams on error — always prefer it.");
  console.log("5. stream/promises pipeline works with async/await and try/catch.");
  console.log("6. Readable.from() creates streams from arrays, strings, or async generators.");
  console.log("7. stream.finished() reliably detects when any stream is done or errored.");
  console.log("8. Async generators + Readable.from() = elegant custom data sources.");
  console.log("============================================================\n");
}

main();
