/** ============================================================
 FILE 7: File System — Sync, Callbacks, and Promises
 ============================================================
 Topic: Three paradigms for file I/O in Node.js
 WHY THIS MATTERS:
   Node's fs module offers three ways to work with files:
   synchronous (blocking), callback (Node-classic), and
   promise-based (modern async/await). Understanding all
   three is essential because you will encounter each in
   real codebases.
 ============================================================ */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

// ============================================================
// STORY: Doordarshan Newsroom
//   Editor Kavita has lived through three eras at Doordarshan:
//   The TELEGRAM era — everything blocking, one bulletin at
//   a time (sync). The SWITCHBOARD era — operators route
//   calls with callbacks via teleprinters. The DIGITAL era —
//   clean async/await pipelines powering modern DD bulletins.
// ============================================================

// Temp directory for all our file operations
const TEMP_DIR = path.join(__dirname, '_temp_dd_newsroom_07');

// ============================================================
// EXAMPLE BLOCK 1 — The Telegram Era (Synchronous)
// ============================================================

console.log('=== BLOCK 1: The Telegram Era (Synchronous) ===\n');

// ────────────────────────────────────────────────────
// SECTION 1 — Setup and Writing Files
// ────────────────────────────────────────────────────

// WHY: mkdirSync with recursive:true creates parent dirs as needed
//      and does not throw if the directory already exists.
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const telegramFile = path.join(TEMP_DIR, 'telegram.txt');

// WHY: writeFileSync blocks the entire process until the write completes.
//      Simple for scripts, but never use in a server — it freezes all users.
fs.writeFileSync(telegramFile, 'BREAKING: Republic Day parade coverage begins!\n', 'utf8');
console.log('writeFileSync — file written');
// Output: writeFileSync — file written

// ────────────────────────────────────────────────────
// SECTION 2 — Reading Files
// ────────────────────────────────────────────────────

// WHY: Without the encoding argument, readFileSync returns a Buffer.
//      Pass 'utf8' to get a string directly.
const content = fs.readFileSync(telegramFile, 'utf8');
console.log('readFileSync — content:', content.trim());
// Output: readFileSync — content: BREAKING: Republic Day parade coverage begins!

// ────────────────────────────────────────────────────
// SECTION 3 — Appending to Files
// ────────────────────────────────────────────────────

// WHY: appendFileSync adds data to the end without overwriting.
fs.appendFileSync(telegramFile, 'UPDATE: Monsoon update from IMD!\n', 'utf8');
const updated = fs.readFileSync(telegramFile, 'utf8');
console.log('After append:');
console.log(updated.trim());
// Output: BREAKING: Republic Day parade coverage begins!
//         UPDATE: Monsoon update from IMD!

// ────────────────────────────────────────────────────
// SECTION 4 — Checking Existence
// ────────────────────────────────────────────────────

// WHY: existsSync is the ONLY recommended existence check.
//      The async fs.exists() is deprecated. For async code,
//      use fs.promises.access() or just try the operation.
console.log('\nexistsSync(telegramFile):', fs.existsSync(telegramFile));
// Output: existsSync(telegramFile): true
console.log('existsSync("nope.txt"):', fs.existsSync(path.join(TEMP_DIR, 'nope.txt')));
// Output: existsSync("nope.txt"): false

// ────────────────────────────────────────────────────
// SECTION 5 — Error Handling with try/catch
// ────────────────────────────────────────────────────

// WHY: Sync methods throw on error. You MUST wrap them in try/catch
//      to handle missing files, permission errors, etc.
try {
  fs.readFileSync(path.join(TEMP_DIR, 'does-not-exist.txt'), 'utf8');
} catch (err) {
  console.log('\nSync error caught:', err.code);
  // Output: Sync error caught: ENOENT
}

// WHY: Blocking behavior demonstration — everything after writeFileSync
//      is guaranteed to see the written data, but the event loop is frozen
//      until the OS finishes the I/O.
console.log('\nBlocking nature: this line runs AFTER all sync I/O above.');
// Output: Blocking nature: this line runs AFTER all sync I/O above.

console.log('\nKavita finishes the Telegram era at DD.\n');

// ============================================================
// EXAMPLE BLOCK 2 — The Switchboard Era (Callbacks)
// ============================================================

// WHY: We wrap Blocks 2 and 3 in an async IIFE so we can
//      await the callback-based code (promisified) and the
//      native promise-based code in sequence, and clean up at the end.
(async () => {
  console.log('=== BLOCK 2: The Switchboard Era (Callbacks) ===\n');

  // ────────────────────────────────────────────────────
  // SECTION 1 — Writing with Callbacks
  // ────────────────────────────────────────────────────

  const switchboardFile = path.join(TEMP_DIR, 'switchboard.txt');

  // WHY: Callback-style fs functions take an error-first callback.
  //      The pattern is always: (err, result) => { ... }
  //      If err is truthy, something went wrong.
  await new Promise((resolve, reject) => {
    fs.writeFile(switchboardFile, 'FLASH: DD correspondent reports from Parliament!\n', 'utf8', (err) => {
      if (err) {
        console.error('writeFile error:', err.message);
        return reject(err);
      }
      console.log('fs.writeFile — callback fired, file written');
      // Output: fs.writeFile — callback fired, file written
      resolve();
    });
  });

  // ────────────────────────────────────────────────────
  // SECTION 2 — Reading with Callbacks
  // ────────────────────────────────────────────────────

  await new Promise((resolve, reject) => {
    fs.readFile(switchboardFile, 'utf8', (err, data) => {
      if (err) {
        console.error('readFile error:', err.message);
        return reject(err);
      }
      console.log('fs.readFile — content:', data.trim());
      // Output: fs.readFile — content: FLASH: DD correspondent reports from Parliament!
      resolve();
    });
  });

  // ────────────────────────────────────────────────────
  // SECTION 3 — Appending with Callbacks
  // ────────────────────────────────────────────────────

  await new Promise((resolve, reject) => {
    fs.appendFile(switchboardFile, 'UPDATE: India wins cricket match at Eden Gardens!\n', 'utf8', (err) => {
      if (err) return reject(err);
      console.log('fs.appendFile — appended');
      // Output: fs.appendFile — appended
      resolve();
    });
  });

  // ────────────────────────────────────────────────────
  // SECTION 4 — Nested Callbacks (The Problem)
  // ────────────────────────────────────────────────────

  // WHY: Real-world operations chain — write, then read, then process.
  //      With callbacks, this creates nesting (aka "callback hell").
  await new Promise((resolve, reject) => {
    const nestedFile = path.join(TEMP_DIR, 'nested.txt');

    fs.writeFile(nestedFile, 'Step 1: Written\n', 'utf8', (err) => {
      if (err) return reject(err);

      fs.appendFile(nestedFile, 'Step 2: Appended\n', 'utf8', (err) => {
        if (err) return reject(err);

        fs.readFile(nestedFile, 'utf8', (err, data) => {
          if (err) return reject(err);

          console.log('\nNested callback result:');
          console.log(data.trim());
          // Output: Step 1: Written
          //         Step 2: Appended
          console.log('(Notice the deep nesting — this is callback hell)');
          // Output: (Notice the deep nesting — this is callback hell)
          resolve();
        });
      });
    });
  });

  // ────────────────────────────────────────────────────
  // SECTION 5 — Error Handling in Callbacks
  // ────────────────────────────────────────────────────

  await new Promise((resolve) => {
    fs.readFile(path.join(TEMP_DIR, 'ghost-file.txt'), 'utf8', (err, data) => {
      if (err) {
        console.log('\nCallback error code:', err.code);
        // Output: Callback error code: ENOENT
        console.log('Callback error message:', err.message.split(',')[0]);
        // Output: Callback error message: ENOENT: no such file or directory
      }
      resolve();
    });
  });

  console.log('\nKavita retires the DD switchboard.\n');

  // ============================================================
  // EXAMPLE BLOCK 3 — The Digital Era (Promises / async-await)
  // ============================================================

  console.log('=== BLOCK 3: The Digital Era (Promises + async/await) ===\n');

  // ────────────────────────────────────────────────────
  // SECTION 1 — Writing with Promises
  // ────────────────────────────────────────────────────

  const digitalFile = path.join(TEMP_DIR, 'digital.txt');

  // WHY: fs/promises (aliased as fsp) returns native Promises.
  //      Combined with async/await, the code reads like synchronous
  //      code but runs asynchronously — the best of both worlds.
  await fsp.writeFile(digitalFile, 'HEADLINE: DD goes digital with async bulletins!\n', 'utf8');
  console.log('fsp.writeFile — done');
  // Output: fsp.writeFile — done

  // ────────────────────────────────────────────────────
  // SECTION 2 — Reading with Promises
  // ────────────────────────────────────────────────────

  const digitalContent = await fsp.readFile(digitalFile, 'utf8');
  console.log('fsp.readFile — content:', digitalContent.trim());
  // Output: fsp.readFile — content: HEADLINE: DD goes digital with async bulletins!

  // ────────────────────────────────────────────────────
  // SECTION 3 — Appending with Promises
  // ────────────────────────────────────────────────────

  await fsp.appendFile(digitalFile, 'FOLLOW-UP: Monsoon session of Parliament concludes.\n', 'utf8');
  const appendedContent = await fsp.readFile(digitalFile, 'utf8');
  console.log('After append:');
  console.log(appendedContent.trim());
  // Output: HEADLINE: DD goes digital with async bulletins!
  //         FOLLOW-UP: Monsoon session of Parliament concludes.

  // ────────────────────────────────────────────────────
  // SECTION 4 — Sequential Operations (No Nesting!)
  // ────────────────────────────────────────────────────

  // WHY: Compare this flat, readable flow to the nested callbacks above.
  const pipelineFile = path.join(TEMP_DIR, 'pipeline.txt');

  await fsp.writeFile(pipelineFile, 'Pipeline Step 1\n', 'utf8');
  await fsp.appendFile(pipelineFile, 'Pipeline Step 2\n', 'utf8');
  await fsp.appendFile(pipelineFile, 'Pipeline Step 3\n', 'utf8');
  const pipelineResult = await fsp.readFile(pipelineFile, 'utf8');

  console.log('\nPromise pipeline result:');
  console.log(pipelineResult.trim());
  // Output: Pipeline Step 1
  //         Pipeline Step 2
  //         Pipeline Step 3
  console.log('(Flat and readable — no callback hell!)');
  // Output: (Flat and readable — no callback hell!)

  // ────────────────────────────────────────────────────
  // SECTION 5 — Error Handling with try/catch on await
  // ────────────────────────────────────────────────────

  // WHY: With async/await, errors become regular exceptions.
  //      Use try/catch exactly like synchronous code.
  try {
    await fsp.readFile(path.join(TEMP_DIR, 'phantom.txt'), 'utf8');
  } catch (err) {
    console.log('\nAsync error caught:', err.code);
    // Output: Async error caught: ENOENT
  }

  // WHY: You can also catch specific error codes to handle
  //      different failure scenarios differently.
  try {
    await fsp.readFile(path.join(TEMP_DIR, 'phantom.txt'), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('File not found — handled gracefully');
      // Output: File not found — handled gracefully
    } else if (err.code === 'EACCES') {
      console.log('Permission denied');
    } else {
      throw err;  // Re-throw unexpected errors
    }
  }

  console.log('\nKavita embraces the digital future at Doordarshan.\n');

  // ────────────────────────────────────────────────────
  // CLEANUP — Remove all temp files and directory
  // ────────────────────────────────────────────────────

  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  console.log('Cleanup complete — temp directory removed.');
  // Output: Cleanup complete — temp directory removed.
  console.log('existsSync after cleanup:', fs.existsSync(TEMP_DIR));
  // Output: existsSync after cleanup: false

})();

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. Sync methods (writeFileSync, readFileSync) block the
//    event loop. Use only for startup scripts, CLI tools, or
//    one-off operations — never in a server request handler.
//
// 2. Callback methods (writeFile, readFile) are non-blocking
//    but lead to deeply nested "callback hell" when chaining
//    multiple operations.
//
// 3. Promise methods (fs/promises) combined with async/await
//    give you non-blocking I/O with flat, readable code.
//    This is the modern standard.
//
// 4. Always handle errors: try/catch for sync and async/await,
//    error-first parameter for callbacks.
//
// 5. Common error codes: ENOENT (file not found),
//    EACCES (permission denied), EEXIST (already exists).
//
// 6. Always clean up temp files in scripts and tests to avoid
//    leaving artifacts on disk.
// ============================================================
