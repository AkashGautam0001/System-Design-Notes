/** ============================================================
 FILE 22: Zlib Compression — Gzip, Brotli & Streams
 ============================================================
 Topic: The 'zlib' module — compressing and decompressing data
 WHY THIS MATTERS:
   Compression reduces bandwidth for HTTP responses, shrinks
   file storage, and speeds up data transfer. Node's zlib
   supports gzip (universal), deflate, and brotli (modern,
   better ratios). Works with both buffers and streams.
 ============================================================ */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');

// ============================================================
// STORY: Mumbai Dabba Compression
// The Dabbawala (tiffin carrier) of Mumbai packs maximum
// dabbas (tiffin boxes) into minimum train compartment space.
// Block 1: He packs individual dabbas (buffers) with gzip
// and brotli — stacking efficiently, removing empty space.
// Block 2: He sets up an assembly line (streams) for packing
// entire crates of dabbas (files) efficiently.
// Compression ratio = dabbas per square meter of train space.
// ============================================================

(async function main() {
  // ============================================================
  // EXAMPLE BLOCK 1 — Buffer-Based Compression
  // ============================================================

  console.log('='.repeat(60));
  console.log('  BLOCK 1: Buffer-Based Dabba Packing');
  console.log('='.repeat(60));

  // ── Sample data to compress ───────────────────────────────
  const originalText = `DABBAWALA MANIFEST — Mumbai Tiffin Express
${'='.repeat(50)}
${Array.from({ length: 30 }, (_, i) =>
  `Dabba ${String(i + 1).padStart(3, '0')}: Tiffin-${String.fromCharCode(65 + (i % 26))} | Rotis: ${(i + 1) * 2} | Route: ${['Churchgate', 'Dadar', 'Andheri', 'Borivali'][i % 4]}`
).join('\n')}
${'='.repeat(50)}
Total dabbas: 30 | Status: READY FOR DELIVERY`;

  const originalBuffer = Buffer.from(originalText, 'utf8');

  console.log(`\n  Original size      : ${originalBuffer.length} bytes`);
  // Output: Original size      : 1234 bytes (approximate)

  // ── Gzip — synchronous ────────────────────────────────────
  // WHY: gzip is the most widely supported compression format.
  // Like stacking dabbas tightly — universal, reliable method.

  console.log('\n--- Gzip (Stacking Dabbas Tightly) ---');

  const gzipped = zlib.gzipSync(originalBuffer);
  console.log(`  Gzipped size       : ${gzipped.length} bytes`);
  // Output: Gzipped size       : 456 bytes (approximate)

  const gzipRatio = ((1 - gzipped.length / originalBuffer.length) * 100).toFixed(1);
  console.log(`  Compression ratio  : ${gzipRatio}% smaller`);
  // Output: Compression ratio  : 63.0% smaller (approximate)

  // Decompress and verify
  const gunzipped = zlib.gunzipSync(gzipped);
  console.log(`  Decompressed size  : ${gunzipped.length} bytes`);
  console.log(`  Data intact?       : ${gunzipped.toString('utf8') === originalText}`);
  // Output: Data intact?       : true

  // ── Gzip — callback (async) ───────────────────────────────
  // WHY: Async versions don't block the event loop — important
  // for servers compressing HTTP responses.

  console.log('\n--- Gzip (Callback / Async) ---');

  await new Promise((resolve, reject) => {
    zlib.gzip(originalBuffer, (err, compressed) => {
      if (err) return reject(err);
      console.log(`  Async gzip size    : ${compressed.length} bytes`);
      // Output: Async gzip size    : 456 bytes (approximate)

      zlib.gunzip(compressed, (err2, decompressed) => {
        if (err2) return reject(err2);
        console.log(`  Async gunzip match : ${decompressed.toString('utf8') === originalText}`);
        // Output: Async gunzip match : true
        resolve();
      });
    });
  });

  // ── Brotli — removing every bit of empty space ─────────────
  // WHY: Brotli achieves better ratios than gzip, especially
  // for text. Like the dabbawala removing every gap between tiffins.

  console.log('\n--- Brotli (Removing Every Gap Between Dabbas) ---');

  const brotlied = zlib.brotliCompressSync(originalBuffer);
  console.log(`  Brotli size        : ${brotlied.length} bytes`);
  // Output: Brotli size        : 390 bytes (approximate)

  const brotliRatio = ((1 - brotlied.length / originalBuffer.length) * 100).toFixed(1);
  console.log(`  Compression ratio  : ${brotliRatio}% smaller`);
  // Output: Compression ratio  : 68.4% smaller (approximate)

  const unbrotlied = zlib.brotliDecompressSync(brotlied);
  console.log(`  Data intact?       : ${unbrotlied.toString('utf8') === originalText}`);
  // Output: Data intact?       : true

  // ── Comparison table ──────────────────────────────────────
  console.log('\n--- Packing Efficiency Comparison ---');
  console.log('  ' + '-'.repeat(45));
  console.log(`  ${'Method'.padEnd(12)} | ${'Size'.padEnd(10)} | ${'Ratio'.padEnd(10)} | Match`);
  console.log('  ' + '-'.repeat(45));
  console.log(`  ${'Original'.padEnd(12)} | ${String(originalBuffer.length).padEnd(10)} | ${'—'.padEnd(10)} | —`);
  console.log(`  ${'Gzip'.padEnd(12)} | ${String(gzipped.length).padEnd(10)} | ${(gzipRatio + '%').padEnd(10)} | true`);
  console.log(`  ${'Brotli'.padEnd(12)} | ${String(brotlied.length).padEnd(10)} | ${(brotliRatio + '%').padEnd(10)} | true`);
  console.log('  ' + '-'.repeat(45));

  // ============================================================
  // EXAMPLE BLOCK 2 — Stream-Based Compression (Files)
  // ============================================================

  console.log('\n' + '='.repeat(60));
  console.log('  BLOCK 2: Stream-Based Dabba Packing (Files)');
  console.log('='.repeat(60));

  // WHY: Streams handle large shipments without loading everything
  // into memory. pipeline() handles backpressure and cleanup.

  const tmpDir = os.tmpdir();
  const srcFile = path.join(tmpDir, `dabbawala-manifest-${Date.now()}.txt`);
  const gzFile = srcFile + '.gz';
  const outFile = srcFile + '.restored.txt';

  // ── Create a source file with repetitive data ─────────────
  const fileContent = Array.from({ length: 200 }, (_, i) =>
    `Delivery route ${String(i + 1).padStart(4, '0')}: ${
      'ABCDEFGHIJ'.repeat(5)
    } — weight: ${((i + 1) * 0.5).toFixed(1)}kg — station: ${['CST', 'Dadar', 'Bandra', 'Andheri', 'Borivali', 'Thane', 'Kurla', 'Vikhroli'][i % 8]}`
  ).join('\n');

  fs.writeFileSync(srcFile, fileContent, 'utf8');
  const srcSize = fs.statSync(srcFile).size;
  console.log(`\n  Source manifest     : ${path.basename(srcFile)}`);
  console.log(`  Source size         : ${srcSize} bytes`);
  // Output: Source size         : 28000 bytes (approximate)

  // ── Compress with stream pipeline ─────────────────────────
  // WHY: pipeline() properly handles errors, backpressure, and
  // cleanup of all streams in the chain.

  console.log('\n--- Compressing with createGzip stream ---');

  await pipeline(
    fs.createReadStream(srcFile),
    zlib.createGzip({ level: 9 }),  // WHY: level 9 = max compression (tightest packing)
    fs.createWriteStream(gzFile)
  );

  const gzSize = fs.statSync(gzFile).size;
  const streamRatio = ((1 - gzSize / srcSize) * 100).toFixed(1);
  console.log(`  Compressed file    : ${path.basename(gzFile)}`);
  console.log(`  Compressed size    : ${gzSize} bytes`);
  console.log(`  Stream gzip ratio  : ${streamRatio}% smaller`);
  // Output: Compressed size    : 2800 bytes (approximate)
  // Output: Stream gzip ratio  : 90.0% smaller (approximate)

  // ── Decompress with stream pipeline ───────────────────────
  console.log('\n--- Decompressing with createGunzip stream ---');

  await pipeline(
    fs.createReadStream(gzFile),
    zlib.createGunzip(),
    fs.createWriteStream(outFile)
  );

  const outSize = fs.statSync(outFile).size;
  console.log(`  Restored manifest  : ${path.basename(outFile)}`);
  console.log(`  Restored size      : ${outSize} bytes`);
  console.log(`  Size match?        : ${outSize === srcSize}`);
  // Output: Restored size      : 28000 bytes (approximate)
  // Output: Size match?        : true

  // Verify content matches
  const restoredContent = fs.readFileSync(outFile, 'utf8');
  console.log(`  Content match?     : ${restoredContent === fileContent}`);
  // Output: Content match?     : true

  // ── File size summary ─────────────────────────────────────
  console.log('\n--- Stream Pipeline Summary ---');
  console.log(`  ${srcSize} bytes -> ${gzSize} bytes -> ${outSize} bytes`);
  console.log(`  (original)    (compressed)    (restored)`);

  // ── Cleanup temp files ────────────────────────────────────
  console.log('\n--- Cleaning up temp files ---');
  for (const f of [srcFile, gzFile, outFile]) {
    fs.unlinkSync(f);
    console.log(`  Removed: ${path.basename(f)}`);
  }
  console.log('  All temp files cleaned up.');

  console.log('\n' + '='.repeat(60));

})().catch(console.error);

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. zlib.gzipSync()/gunzipSync() — sync buffer compression
// 2. zlib.gzip()/gunzip() — async callback-based compression
// 3. zlib.brotliCompressSync()/brotliDecompressSync() — better
//    ratio than gzip, supported by modern browsers
// 4. zlib.createGzip()/createGunzip() — transform streams
// 5. stream.pipeline() — connect streams with error handling
// 6. Compression level (1-9): higher = smaller but slower
// 7. Gzip is universal; Brotli is better but newer
// 8. Streams handle large files without memory bloat
// 9. Always verify decompressed data matches the original
// 10. Clean up temp files in production code
// ============================================================
