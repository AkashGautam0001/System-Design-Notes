/** ============================================================
    FILE 28: Debugging Node.js
    ============================================================
    Topic: Console methods, inspector, memory, diagnostics
    WHY THIS MATTERS:
    Debugging is where developers spend most of their time.
    Node.js provides rich built-in tools beyond console.log —
    timers, tables, groups, memory profiling, and a full
    Chrome DevTools integration. Mastering these cuts debug
    time from hours to minutes.
    ============================================================ */

// ============================================================
// STORY: Railway Fault Detection
// The Indian Railway fault detection team inspects tracks
// across the network. console.log = visual track inspection.
// debugger = ultrasonic rail testing. --inspect = connecting
// the diagnostic computer. Breakpoints = checkpoints along
// the track. Each tool reveals different types of faults.
// ============================================================

// ============================================================
// EXAMPLE BLOCK 1 — Console Methods Deep Dive
// ============================================================

console.log('=== Railway Fault Detection team opens the toolkit ===\n');

// ──────────────────────────────────────────────────────────
// console.dir() — inspect objects with depth control
// ──────────────────────────────────────────────────────────
// WHY: console.log uses util.inspect with default depth 2.
// For deep objects, it shows [Object]. console.dir controls depth.

const deepObject = {
  level1: { level2: { level3: { level4: { fault: 'Rail fracture detected!', readings: [1, 2, 3] } } } },
};

console.log('console.log (default depth — truncates):');
console.log(deepObject);
// Output: { level1: { level2: { level3: [Object] } } }

console.log('\nconsole.dir with depth: null (shows everything):');
console.dir(deepObject, { depth: null, colors: true });
// Output: Full nested structure visible
// WHY: depth: null = no limit. colors: true = syntax highlighting.

// ──────────────────────────────────────────────────────────
// console.table() — tabular data display
// ──────────────────────────────────────────────────────────
// WHY: Renders arrays of objects as readable ASCII tables.

console.log('\nconsole.table() with array of objects:');
const trackSections = [
  { name: 'Delhi-Agra',      faultType: 'Rail wear',     cleared: false },
  { name: 'Mumbai-Pune',     faultType: 'Fishplate crack', cleared: true },
  { name: 'Chennai-Bangalore', faultType: 'Alignment shift', cleared: false },
  { name: 'Howrah-Patna',    faultType: 'Weld defect',   cleared: true },
];
console.table(trackSections);
// Output: ASCII table with columns: (index), name, faultType, cleared

console.log('console.table with selected columns:');
console.table(trackSections, ['name', 'cleared']);
// Output: Only name and cleared columns shown

// ──────────────────────────────────────────────────────────
// console.time() / console.timeLog() / console.timeEnd()
// ──────────────────────────────────────────────────────────
// WHY: Precise timing with high-resolution timers.

console.log('\nconsole.time/timeLog/timeEnd:');
console.time('track-inspection');

let sum = 0;
for (let i = 0; i < 1_000_000; i++) sum += i;
console.timeLog('track-inspection', '— finished measuring rail segments');
// Output: track-inspection: 5.123ms — finished measuring rail segments
// WHY: timeLog prints elapsed WITHOUT stopping the timer.

const arr = Array.from({ length: 10_000 }, (_, i) => i);
arr.sort(() => Math.random() - 0.5);
console.timeEnd('track-inspection');
// Output: track-inspection: 12.456ms
// WHY: timeEnd prints elapsed AND stops the timer.

// ──────────────────────────────────────────────────────────
// console.count() / console.countReset()
// ──────────────────────────────────────────────────────────
// WHY: Track execution frequency without manual counters.

console.log('\nconsole.count/countReset:');
function logFault(type) { console.count(type); }

logFault('rail-crack');    // Output: rail-crack: 1
logFault('rail-crack');    // Output: rail-crack: 2
logFault('signal-failure');// Output: signal-failure: 1
logFault('rail-crack');    // Output: rail-crack: 3
console.countReset('rail-crack');
logFault('rail-crack');    // Output: rail-crack: 1 (reset!)

// ──────────────────────────────────────────────────────────
// console.group() / console.groupEnd()
// ──────────────────────────────────────────────────────────
// WHY: Visually nests output with indentation.

console.log('\nconsole.group/groupEnd:');
console.group('Route #42 — Delhi-Howrah Inspection');
console.log('Section: Kanpur to Allahabad');
console.group('Faults detected');
console.log('1. Rail wear at km 234');
console.log('2. Signal malfunction at km 289');
console.groupEnd();
console.group('Checkpoints cleared');
console.log('Lucknow junction — all clear');
console.log('Varanasi junction — all clear');
console.groupEnd();
console.groupEnd();

// ──────────────────────────────────────────────────────────
// console.trace() — print stack trace
// ──────────────────────────────────────────────────────────
// WHY: Shows call stack at any point. Find "who called this?"

console.log('\nconsole.trace():');
function outerInspection() { innerInspection(); }
function innerInspection() {
  console.trace('Stack trace from ultrasonicTest');
}
outerInspection();
// Output: Trace: Stack trace from ultrasonicTest
//     at innerInspection -> at outerInspection -> at Object.<anonymous>

// ============================================================
// EXAMPLE BLOCK 2 — Inspector, Diagnostics, and Memory
// ============================================================

console.log('\n--- BLOCK 2: Inspector, Diagnostics, Memory ---\n');

// ──────────────────────────────────────────────────────────
// --inspect and --inspect-brk
// ──────────────────────────────────────────────────────────
// node --inspect app.js       — start inspector on :9229
//   Open chrome://inspect to connect. Execution starts immediately.
// node --inspect-brk app.js   — pause on first line
//   WHY: Gives time to attach before anything runs.
// node --inspect=0.0.0.0:9229 — listen on all interfaces (Docker)
// In Chrome DevTools: breakpoints, CPU profiling, heap snapshots.

console.log('--inspect / --inspect-brk (connecting the diagnostic computer):');
console.log('  node --inspect app.js     — start inspector on :9229');
console.log('  node --inspect-brk app.js — pause on first line');

// ──────────────────────────────────────────────────────────
// The `debugger` statement
// ──────────────────────────────────────────────────────────
// Place `debugger;` in code — pauses when --inspect is active.
// Ignored when running normally (no inspector attached).

console.log('\n`debugger` statement: ultrasonic test pauses when --inspect is active');

// ──────────────────────────────────────────────────────────
// NODE_DEBUG and --trace-warnings
// ──────────────────────────────────────────────────────────
// NODE_DEBUG=http,net node app.js  — verbose core module logging
// NODE_DEBUG=fs,module             — debug file ops and module loading
// --trace-warnings                 — add stack traces to warnings

console.log('\nNODE_DEBUG=http,net node app.js — verbose core logging');
console.log('--trace-warnings — stack traces for Node warnings');

// ──────────────────────────────────────────────────────────
// process.memoryUsage() — detect memory leaks
// ──────────────────────────────────────────────────────────
// WHY: Track heap growth. If it grows linearly, you have a leak.

console.log('\n--- Memory leak detection (track diagnostic data growth) ---\n');

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function showMemory(label) {
  const mem = process.memoryUsage();
  console.log(`  [${label}]`);
  console.log(`    rss:       ${formatBytes(mem.rss)}`);
  // WHY: RSS = total memory allocated to process
  console.log(`    heapTotal: ${formatBytes(mem.heapTotal)}`);
  // WHY: heapTotal = V8 heap space allocated
  console.log(`    heapUsed:  ${formatBytes(mem.heapUsed)}`);
  // WHY: heapUsed = V8 heap space actually in use
  console.log(`    external:  ${formatBytes(mem.external)}`);
  // WHY: external = C++ objects bound to JS (Buffers)
  return mem;
}

const before = showMemory('Before loading track data');

// Allocate large array to show heap growth
const trackReadings = [];
for (let i = 0; i < 100_000; i++) {
  trackReadings.push({ index: i, data: `reading-${i}-segment` });
}

console.log('');
const after = showMemory('After loading 100k track readings');
console.log(`\n  Heap growth: ${formatBytes(after.heapUsed - before.heapUsed)}`);
// Output:   Heap growth: ~8-12 MB (varies)

console.log('\n  Leak detection strategy:');
console.log('  1. Snapshot memoryUsage() before operation');
console.log('  2. Run operation many times');
console.log('  3. Compare heapUsed — linear growth = leak');
console.log('  4. Use Chrome DevTools heap snapshots for details');

// ──────────────────────────────────────────────────────────
// process.resourceUsage() — OS-level resource stats
// ──────────────────────────────────────────────────────────

console.log('\nprocess.resourceUsage():');
const usage = process.resourceUsage();
console.log(`  userCPUTime:   ${(usage.userCPUTime / 1000).toFixed(1)} ms`);
console.log(`  systemCPUTime: ${(usage.systemCPUTime / 1000).toFixed(1)} ms`);
console.log(`  maxRSS:        ${formatBytes(usage.maxRSS * 1024)}`);
// WHY: Peak memory — the high-water mark
console.log(`  fsRead:  ${usage.fsRead} ops, fsWrite: ${usage.fsWrite} ops`);

// ──────────────────────────────────────────────────────────
// process.cpuUsage() — measure CPU time delta
// ──────────────────────────────────────────────────────────

console.log('\nprocess.cpuUsage():');
const cpuBefore = process.cpuUsage();
let x = 0;
for (let i = 0; i < 5_000_000; i++) x += Math.sqrt(i);
const cpuAfter = process.cpuUsage(cpuBefore);
// WHY: Passing previous reading computes the delta.
console.log(`  user:   ${(cpuAfter.user / 1000).toFixed(1)} ms`);
console.log(`  system: ${(cpuAfter.system / 1000).toFixed(1)} ms`);

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. console.dir({ depth: null }) reveals deeply nested objects.
// 2. console.table() renders arrays of objects as ASCII tables.
// 3. console.time/timeLog/timeEnd measure execution duration.
// 4. console.count() tracks execution frequency by label.
// 5. console.group/groupEnd nests output for clarity.
// 6. console.trace() prints the call stack at any point.
// 7. --inspect opens Chrome DevTools; --inspect-brk pauses
//    on the first line. `debugger;` sets inline breakpoints.
// 8. NODE_DEBUG=module,http enables core module debug output.
// 9. process.memoryUsage() tracks heap growth for leak detection.
// 10. process.resourceUsage() shows CPU, I/O, and peak memory.
// ============================================================

console.log('\nRailway Fault Detection team closes the inspection. All tracks examined.');
