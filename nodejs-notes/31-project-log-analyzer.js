/** ============================================================
    FILE 31: Railway Log Analyzer — Streaming Log Analyzer
    ============================================================
    Topic: Stream pipelines for large-file processing
    Combines: streams (Transform, pipeline), fs, readline,
              zlib, path, crypto

    WHY THIS MATTERS:
    Production systems generate massive log files. You can't
    load a 10GB log into memory. Stream pipelines let you
    process line-by-line with constant memory, and Transform
    streams make each pipeline stage composable and testable.

    FULL USAGE:
      node 31-project-log-analyzer.js <logfile>
      node 31-project-log-analyzer.js <logfile.gz>

    DEMO MODE (no arguments or --demo):
      node 31-project-log-analyzer.js
      Generates sample log, analyzes it, compresses it,
      re-analyzes the .gz version, then cleans up.
    ============================================================ */

'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const os = require('os');
const { Transform, pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

// ============================================================
// SECTION 1: Configuration
// ============================================================
const DEMO_MODE = process.argv.length <= 2 || process.argv[2] === '--demo';
const DEMO_DIR = path.join(os.tmpdir(), 'railway-log-demo-' + process.pid);

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const CYAN   = '\x1b[36m';
const DIM    = '\x1b[2m';
const BOLD   = '\x1b[1m';

function banner(text) {
  const rule = '='.repeat(60);
  console.log(`\n${CYAN}${rule}${RESET}`);
  console.log(`${BOLD}  ${text}${RESET}`);
  console.log(`${CYAN}${rule}${RESET}`);
}

function thinRule() {
  console.log(DIM + '\u2500'.repeat(60) + RESET);
}

// ============================================================
// SECTION 2: Log Generator
// ============================================================

/** ──────────────────────────────────────────────────────────
    Story: We need realistic IRCTC/Railway server logs to
    analyze. Each line has a timestamp, log level, source
    module, and message. The generator creates patterns —
    bursts of errors during tatkal window, periodic warnings
    — to make the stats interesting.
    ────────────────────────────────────────────────────────── */

const LOG_LEVELS = ['INFO', 'INFO', 'INFO', 'INFO', 'WARN', 'WARN', 'ERROR', 'DEBUG', 'DEBUG', 'INFO'];
const SOURCES = ['pnr-service', 'booking-engine', 'db-pool', 'payment-gateway', 'tatkal-scheduler', 'seat-allocator'];
const MESSAGES = {
  INFO:  ['PNR status checked successfully', 'Ticket booked for passenger', 'Seat availability fetched',
          'Health check passed', 'Payment confirmation received', 'Waitlist updated'],
  WARN:  ['High load during tatkal window', 'Slow query on seat-availability: 2340ms', 'Rate limit approaching for PNR checks',
          'Deprecated API version used by agent', 'Connection pool nearly full'],
  ERROR: ['Database connection timeout during booking', 'Payment gateway timeout for transaction',
          'Null pointer in seat allocation handler', 'IRCTC server overloaded', 'Unhandled rejection in tatkal worker'],
  DEBUG: ['Parsing PNR request body', 'Cache lookup for train schedule', 'Entering booking middleware chain',
          'Serializing seat availability response']
};

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateLogLine(baseTime, offsetMs) {
  const ts = new Date(baseTime.getTime() + offsetMs).toISOString();
  const level = randomItem(LOG_LEVELS);
  const source = randomItem(SOURCES);
  const msg = randomItem(MESSAGES[level]);
  const reqId = crypto.randomBytes(6).toString('hex');
  return `${ts} [${level.padEnd(5)}] ${source.padEnd(18)} | ${msg} (req:${reqId})`;
  // Output: 2024-01-15T10:00:01.442Z [INFO ] pnr-service        | PNR status checked (req:a1b2c3)
}

async function generateLogFile(filePath, lineCount) {
  const baseTime = new Date('2024-06-15T10:00:00Z');
  const lines = [];
  for (let i = 0; i < lineCount; i++) {
    const offsetMs = i * 1200 + Math.floor(Math.random() * 800);
    lines.push(generateLogLine(baseTime, offsetMs));
  }
  await fsp.writeFile(filePath, lines.join('\n') + '\n', 'utf-8');
  return lines.length;
}

// ============================================================
// SECTION 3: Custom Transform Streams
// ============================================================

/** ──────────────────────────────────────────────────────────
    Story: Each Transform stream handles one job in the
    pipeline. The parser converts raw IRCTC log text to
    structured objects. The filter selects levels of interest.
    The aggregator collects stats — routes like /pnr-status,
    /seat-availability, /book-ticket — without storing all lines.
    ────────────────────────────────────────────────────────── */

// 3a — Line Parser: raw text -> structured log objects
class LogParser extends Transform {
  constructor() {
    super({ objectMode: true });
    this._buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this._buffer += chunk.toString();
    const lines = this._buffer.split('\n');
    this._buffer = lines.pop(); // keep incomplete last line

    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = this._parseLine(line);
      if (parsed) this.push(parsed);
    }
    callback();
  }

  _flush(callback) {
    if (this._buffer.trim()) {
      const parsed = this._parseLine(this._buffer);
      if (parsed) this.push(parsed);
    }
    callback();
  }

  _parseLine(line) {
    // Format: ISO_TS [LEVEL] source | message (req:id)
    const match = line.match(
      /^(\S+)\s+\[(\w+)\s*\]\s+(\S+)\s+\|\s+(.+)$/
    );
    if (!match) return null;
    return {
      timestamp: match[1],
      level: match[2].trim(),
      source: match[3].trim(),
      message: match[4].trim()
    };
  }
}

// 3b — Aggregator: collects stats from parsed log objects
class LogAggregator extends Transform {
  constructor() {
    super({ objectMode: true, readableObjectMode: true });
    this.stats = {
      totalLines: 0,
      byLevel: {},
      bySrc: {},
      errorMessages: {},
      firstTs: null,
      lastTs: null
    };
  }

  _transform(entry, encoding, callback) {
    const s = this.stats;
    s.totalLines++;

    // Count by level
    s.byLevel[entry.level] = (s.byLevel[entry.level] || 0) + 1;

    // Count by source (railway service)
    s.bySrc[entry.source] = (s.bySrc[entry.source] || 0) + 1;

    // Track error messages
    if (entry.level === 'ERROR') {
      // Strip the (req:...) suffix for grouping
      const cleanMsg = entry.message.replace(/\s*\(req:\w+\)$/, '');
      s.errorMessages[cleanMsg] = (s.errorMessages[cleanMsg] || 0) + 1;
    }

    // Time range
    if (!s.firstTs) s.firstTs = entry.timestamp;
    s.lastTs = entry.timestamp;

    // Pass through for potential further stages
    this.push(entry);
    callback();
  }
}

// ============================================================
// SECTION 4: Analysis Pipeline
// ============================================================

/** ──────────────────────────────────────────────────────────
    Story: The pipeline wires together: file read stream ->
    (optional gzip decompress) -> parser -> aggregator.
    pipeline() handles backpressure and error propagation
    automatically — like the signal chain along railway tracks.
    ────────────────────────────────────────────────────────── */

async function analyzeLog(filePath) {
  const isGz = filePath.endsWith('.gz');
  const readStream = fs.createReadStream(filePath);
  const parser = new LogParser();
  const aggregator = new LogAggregator();

  // Build pipeline stages
  const stages = [readStream];
  if (isGz) {
    stages.push(zlib.createGunzip());
    // Output: gunzip stage inserted for .gz files
  }
  stages.push(parser);
  stages.push(aggregator);

  // Consume the readable end (discard output, we want stats)
  const devNull = new Transform({
    objectMode: true,
    transform(chunk, enc, cb) { cb(); }
  });
  stages.push(devNull);

  await pipelineAsync(...stages);
  return aggregator.stats;
}

// ============================================================
// SECTION 5: Stats Formatter
// ============================================================

function printStats(stats, label) {
  thinRule();
  console.log(`${BOLD}  Analysis: ${label}${RESET}`);
  thinRule();

  console.log(`\n  Total lines parsed: ${BOLD}${stats.totalLines}${RESET}`);
  console.log(`  Time range: ${DIM}${stats.firstTs}${RESET}`);
  console.log(`           to ${DIM}${stats.lastTs}${RESET}`);

  // By level
  console.log(`\n  ${BOLD}Lines by Level:${RESET}`);
  const levelColors = { INFO: GREEN, WARN: YELLOW, ERROR: RED, DEBUG: DIM };
  const sortedLevels = Object.entries(stats.byLevel)
    .sort((a, b) => b[1] - a[1]);
  for (const [level, count] of sortedLevels) {
    const color = levelColors[level] || RESET;
    const bar = '\u2588'.repeat(Math.round(count / stats.totalLines * 40));
    const pct = ((count / stats.totalLines) * 100).toFixed(1);
    console.log(`    ${color}${level.padEnd(6)}${RESET} ${String(count).padStart(5)}  ${DIM}${bar}${RESET} ${pct}%`);
  }
  // Output: INFO   520  ████████████████████ 52.0%

  // By source (railway service)
  console.log(`\n  ${BOLD}Lines by Railway Service:${RESET}`);
  const sortedSrc = Object.entries(stats.bySrc)
    .sort((a, b) => b[1] - a[1]);
  for (const [src, count] of sortedSrc) {
    console.log(`    ${CYAN}${src.padEnd(20)}${RESET} ${String(count).padStart(5)}`);
  }

  // Top error messages
  if (Object.keys(stats.errorMessages).length > 0) {
    console.log(`\n  ${BOLD}Top Error Messages:${RESET}`);
    const sortedErrors = Object.entries(stats.errorMessages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    for (const [msg, count] of sortedErrors) {
      console.log(`    ${RED}${String(count).padStart(4)}x${RESET} ${msg}`);
    }
    // Output:   12x Database connection timeout during booking
  }

  console.log('');
}

// ============================================================
// SECTION 6: Compression Utility
// ============================================================

async function compressFile(srcPath, destPath) {
  await pipelineAsync(
    fs.createReadStream(srcPath),
    zlib.createGzip({ level: 6 }),
    fs.createWriteStream(destPath)
  );
  const srcStat = await fsp.stat(srcPath);
  const dstStat = await fsp.stat(destPath);
  const ratio = ((1 - dstStat.size / srcStat.size) * 100).toFixed(1);
  console.log(`  Compressed: ${srcStat.size} -> ${dstStat.size} bytes (${ratio}% reduction)`);
  // Output: Compressed: 85432 -> 12345 bytes (85.6% reduction)
}

// ============================================================
// SECTION 7: Demo Mode
// ============================================================

/** ──────────────────────────────────────────────────────────
    Story: The demo generates a realistic IRCTC server log
    file, analyzes it with the streaming pipeline, then
    compresses it and re-analyzes the .gz version to prove
    the pipeline handles both plain and compressed logs
    identically — peak hours during the tatkal window included.
    ────────────────────────────────────────────────────────── */

async function runDemo() {
  banner('Railway Log Analyzer \u2014 Streaming Log Analyzer (DEMO MODE)');

  await fsp.mkdir(DEMO_DIR, { recursive: true });
  const logFile = path.join(DEMO_DIR, 'irctc-server.log');
  const gzFile = path.join(DEMO_DIR, 'irctc-server.log.gz');

  // Step 1 — Generate sample log file
  thinRule();
  console.log(`${BOLD}  Step 1: Generating sample IRCTC server log (1200 lines)${RESET}`);
  thinRule();
  const lineCount = await generateLogFile(logFile, 1200);
  const stat = await fsp.stat(logFile);
  console.log(`  Created: ${DIM}${logFile}${RESET}`);
  console.log(`  Lines: ${lineCount}, Size: ${stat.size} bytes`);

  // Show sample lines
  console.log(`\n  ${BOLD}Sample lines:${RESET}`);
  const sample = (await fsp.readFile(logFile, 'utf-8')).split('\n').slice(0, 3);
  for (const line of sample) {
    console.log(`  ${DIM}${line}${RESET}`);
  }

  // Step 2 — Analyze plain log
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 2: Analyzing plain .log file via stream pipeline${RESET}`);
  thinRule();
  console.log(`\n  Pipeline: ReadStream -> LogParser -> LogAggregator`);
  const stats1 = await analyzeLog(logFile);
  printStats(stats1, 'irctc-server.log (plain text)');

  // Step 3 — Compress log
  thinRule();
  console.log(`${BOLD}  Step 3: Compressing log file with gzip${RESET}`);
  thinRule();
  await compressFile(logFile, gzFile);

  // Step 4 — Analyze compressed log
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 4: Analyzing .gz file via stream pipeline${RESET}`);
  thinRule();
  console.log(`\n  Pipeline: ReadStream -> Gunzip -> LogParser -> LogAggregator`);
  const stats2 = await analyzeLog(gzFile);
  printStats(stats2, 'irctc-server.log.gz (gzip compressed)');

  // Step 5 — Verify results match
  thinRule();
  console.log(`${BOLD}  Step 5: Verification${RESET}`);
  thinRule();
  const match = stats1.totalLines === stats2.totalLines;
  const icon = match ? `${GREEN}\u2713${RESET}` : `${RED}\u2717${RESET}`;
  console.log(`  ${icon}  Plain and gzip analyses match: ${stats1.totalLines} == ${stats2.totalLines} lines`);

  const levelsMatch = JSON.stringify(stats1.byLevel) === JSON.stringify(stats2.byLevel);
  const icon2 = levelsMatch ? `${GREEN}\u2713${RESET}` : `${RED}\u2717${RESET}`;
  console.log(`  ${icon2}  Level counts are identical`);
  // Output: checkmark  Plain and gzip analyses match: 1200 == 1200 lines

  // Cleanup
  console.log('');
  thinRule();
  console.log(`${BOLD}  Cleanup: Removing temp files${RESET}`);
  thinRule();
  await fsp.rm(DEMO_DIR, { recursive: true, force: true });
  console.log(`  Removed ${DIM}${DEMO_DIR}${RESET}`);

  // ============================================================
  // KEY TAKEAWAYS
  // ============================================================
  banner('KEY TAKEAWAYS');
  console.log(`
  1. Transform streams process data chunk-by-chunk with constant memory
  2. pipeline() handles backpressure and error propagation automatically
  3. objectMode lets Transform streams pass JS objects (not just buffers)
  4. Detecting .gz extension and inserting zlib.createGunzip() is seamless
  5. Aggregation in a Transform stream avoids storing all lines in memory
  6. promisify(pipeline) gives clean async/await error handling
  7. Stream composition makes each stage independently testable
`);
}

// ============================================================
// SECTION 8: CLI Mode
// ============================================================

async function runCLI(filePath) {
  const resolved = path.resolve(filePath);
  try {
    await fsp.access(resolved);
  } catch {
    console.error(`${RED}File not found: ${resolved}${RESET}`);
    process.exit(1);
  }

  banner(`Railway Log Analyzer \u2014 Analyzing ${path.basename(resolved)}`);
  const stats = await analyzeLog(resolved);
  printStats(stats, path.basename(resolved));
}

// ============================================================
// SECTION 9: Entry Point
// ============================================================

async function main() {
  if (DEMO_MODE) {
    await runDemo();
  } else {
    await runCLI(process.argv[2]);
  }
}

main().catch(err => {
  console.error(`${RED}Fatal: ${err.message}${RESET}`);
  process.exit(1);
});
