/** ============================================================
 FILE 20: Readline & REPL — Line-by-Line Input Processing
 ============================================================
 Topic: readline for interactive/streamed input, REPL basics
 WHY THIS MATTERS:
   CLI tools, log parsers, and interactive prompts all need
   line-by-line input processing. readline handles this
   elegantly. The REPL module powers custom shells.
   Using simulated input keeps scripts non-blocking.
 ============================================================ */

const readline = require('readline');
const { Readable } = require('stream');

// ============================================================
// STORY: Chai Pe Charcha (Tea-time Chat)
// Ramu Bhaiya runs a chai tapri (tea stall) on the street
// corner. He takes chai orders (lines of input) from customers.
// Each order is categorized — cutting chai, masala chai, or
// special sulaimani. The first shift uses traditional callbacks;
// the second shift upgrades to async/await with readline/promises.
// The REPL is the ongoing conversation at the tapri.
// ============================================================

// ============================================================
// EXAMPLE BLOCK 1 — Classic readline with Simulated Input
// ============================================================

console.log('='.repeat(60));
console.log('  BLOCK 1: Classic readline — Callback Style');
console.log('='.repeat(60));

// WHY: We use Readable.from() to simulate user input so the
// script runs and exits cleanly without waiting for stdin.

const chaiOrders = [
  'CUTTING: Half glass, less sugar',
  'MASALA: Extra adrak and elaichi',
  'REGULAR: Normal chai, two cups',
  'CUTTING: One cutting for Sharma ji',
  'MASALA: Strong masala, no sugar',
  'SPECIAL: Sulaimani chai with lemon!'
];

// ── Create a readable stream from simulated lines ───────────
const inputStream1 = Readable.from(chaiOrders.map(line => line + '\n'));

const rl1 = readline.createInterface({
  input: inputStream1,
  crlfDelay: Infinity // WHY: Treats \r\n as a single newline
});

// ── Tracking stats ──────────────────────────────────────────
const categories = {};
let orderCount = 0;

console.log('\n--- Processing chai orders at the tapri ---\n');

rl1.on('line', (line) => {
  orderCount++;
  const colonIdx = line.indexOf(':');
  const category = colonIdx > -1 ? line.slice(0, colonIdx).trim() : 'UNKNOWN';
  const message = colonIdx > -1 ? line.slice(colonIdx + 1).trim() : line.trim();

  categories[category] = (categories[category] || 0) + 1;

  // WHY: Ramu Bhaiya categorizes each order
  let response;
  switch (category) {
    case 'CUTTING':
      response = 'Pouring half glass cutting chai';
      break;
    case 'MASALA':
      response = 'Brewing special masala blend';
      break;
    case 'SPECIAL':
      response = 'Preparing sulaimani — extra care!';
      break;
    default:
      response = 'One regular chai coming up';
  }

  console.log(`  Order #${orderCount}: [${category}] "${message}"`);
  console.log(`    -> ${response}`);
  // Output: Order #1: [CUTTING] "Half glass, less sugar"
  // Output:   -> Pouring half glass cutting chai
});

rl1.on('close', () => {
  console.log('\n--- Morning Shift Summary ---');
  console.log(`  Total orders served : ${orderCount}`);
  // Output: Total orders served : 6

  console.log('  By category:');
  for (const [cat, count] of Object.entries(categories)) {
    console.log(`    ${cat.padEnd(12)}: ${count}`);
  }
  // Output: CUTTING     : 2
  // Output: MASALA      : 2
  // Output: REGULAR     : 1
  // Output: SPECIAL     : 1

  console.log('\n  Morning shift complete.\n');

  // Run Block 2 after Block 1 finishes
  runBlock2();
});

// ============================================================
// EXAMPLE BLOCK 2 — readline/promises with async/await
// ============================================================

async function runBlock2() {
  console.log('='.repeat(60));
  console.log('  BLOCK 2: readline/promises — Async/Await Style');
  console.log('='.repeat(60));

  // WHY: readline/promises provides a modern async API that works
  // beautifully with for-await-of and async iteration.

  const { createInterface } = require('readline/promises');

  // ── Simulated input for async processing ──────────────────
  const tapriAlerts = [
    'CHAI_SPILL customer=Sharma_ji table=3',
    'SUGAR_LOW stock=200g threshold=500g',
    'RUSH_HOUR counter=main queue=12',
    'CHAI_SPILL customer=Gupta_ji table=7',
    'MILK_LOW stock=2L threshold=5L'
  ];

  const inputStream2 = Readable.from(tapriAlerts.map(t => t + '\n'));

  const rl2 = createInterface({
    input: inputStream2,
    crlfDelay: Infinity
  });

  // ── Process lines with for-await-of ───────────────────────
  // WHY: Async iteration is cleaner than event callbacks for
  // sequential processing of input lines.

  console.log('\n--- Processing tapri alerts (async) ---\n');

  const alerts = { critical: 0, warning: 0, info: 0 };
  let alertNum = 0;

  for await (const line of rl2) {
    alertNum++;
    const parts = line.split(' ');
    const alertType = parts[0];

    // Parse key=value pairs
    const details = {};
    for (let i = 1; i < parts.length; i++) {
      const [key, val] = parts[i].split('=');
      details[key] = val;
    }

    // Determine severity
    let severity;
    if (alertType === 'SUGAR_LOW' || alertType === 'MILK_LOW') {
      severity = 'CRITICAL';
      alerts.critical++;
    } else if (alertType === 'RUSH_HOUR' || alertType === 'CHAI_SPILL') {
      severity = 'WARNING';
      alerts.warning++;
    } else {
      severity = 'INFO';
      alerts.info++;
    }

    console.log(`  Alert #${alertNum}: ${alertType} [${severity}]`);
    console.log(`    Details: ${JSON.stringify(details)}`);
    // Output: Alert #1: CHAI_SPILL [WARNING]
    // Output:   Details: {"customer":"Sharma_ji","table":"3"}
  }

  console.log('\n--- Evening Shift Summary ---');
  console.log(`  Total alerts   : ${alertNum}`);
  console.log(`  Critical       : ${alerts.critical}`);
  console.log(`  Warning        : ${alerts.warning}`);
  console.log(`  Info           : ${alerts.info}`);
  // Output: Total alerts   : 5
  // Output: Critical       : 2
  // Output: Warning        : 3
  // Output: Info           : 0

  // ── rl.question() alternative (simulated) ─────────────────
  // WHY: question() prompts the user and waits for a response.
  // Here we simulate it with a pre-loaded input stream.

  console.log('\n--- Simulated question() prompt ---');

  const answerStream = Readable.from(['Ramu Bhaiya\n']);
  const rl3 = createInterface({
    input: answerStream
  });

  const name = await rl3.question('  Tapri owner name: ');
  console.log(`  Namaste, ${name}!`);
  // Output: Tapri owner name: Ramu Bhaiya
  // Output: Namaste, Ramu Bhaiya!
  rl3.close();

  // ── REPL module (reference only) ──────────────────────────
  // WHY: repl.start() creates an interactive JavaScript shell.
  // We only document it here — actually starting it would hang.
  // Think of it as the ongoing charcha (conversation) at the tapri.

  console.log('\n--- REPL Module (Reference — The Ongoing Charcha) ---');
  console.log('  // const repl = require(\'repl\');');
  console.log('  // repl.start({ prompt: \'tapri> \' });');
  console.log('  //');
  console.log('  // Options:');
  console.log('  //   prompt    — custom prompt string');
  console.log('  //   eval      — custom eval function');
  console.log('  //   useGlobal — use global context (default: false)');
  console.log('  //   writer    — custom output formatter');
  console.log('  //');
  console.log('  // repl.start() opens an interactive JS shell.');
  console.log('  // Not started here to avoid hanging the script.');

  console.log('\n' + '='.repeat(60));
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. readline.createInterface({ input, output }) — create reader
// 2. Readable.from() — simulate input without blocking on stdin
// 3. rl.on('line', cb) — process each line via callback
// 4. rl.on('close', cb) — fires when input stream ends
// 5. crlfDelay: Infinity — handle both \n and \r\n line endings
// 6. readline/promises — modern async API for line processing
// 7. for await (const line of rl) — async iteration over lines
// 8. rl.question(prompt) — ask a question and await the answer
// 9. repl.start() — create custom interactive shells (don't
//    start in scripts that need to exit cleanly)
// 10. Always use simulated input in automated scripts to
//     prevent hanging on stdin
// ============================================================
