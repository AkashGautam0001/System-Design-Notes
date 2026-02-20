/** ============================================================
    FILE 29: KaamKaro — Daily Kaam Manager
    ============================================================
    Topic: Building a complete CLI application
    Combines: process.argv, fs/promises, path, readline/promises,
              crypto (for short UUIDs)

    WHY THIS MATTERS:
    Real CLI tools combine argument parsing, file I/O, and
    formatted output. This project ties together core Node.js
    modules into a practical, everyday tool.

    FULL CLI USAGE (interactive mode):
      node 29-project-cli-task-manager.js add "Process pension application"
      node 29-project-cli-task-manager.js list
      node 29-project-cli-task-manager.js done <id>
      node 29-project-cli-task-manager.js delete <id>
      node 29-project-cli-task-manager.js clear

    DEMO MODE (no arguments):
      node 29-project-cli-task-manager.js
      Runs a full walkthrough then cleans up.
    ============================================================ */

'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// ============================================================
// SECTION 1: Configuration
// ============================================================
const DEMO_MODE = process.argv.length <= 2 || process.argv[2] === '--demo';
const KAAM_DIR = DEMO_MODE
  ? path.join(os.tmpdir(), 'kaamkaro-demo-' + process.pid)
  : path.dirname(process.argv[1]);
const KAAM_FILE = path.join(KAAM_DIR, 'kaam.json');

// ============================================================
// SECTION 2: Utility Helpers
// ============================================================
function shortId() {
  return crypto.randomBytes(4).toString('hex');
}

function timestamp() {
  return new Date().toISOString();
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

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
// SECTION 3: Task Storage (JSON file I/O)
// ============================================================

/** ──────────────────────────────────────────────────────────
    Story: Babu Tripathi's sarkari office needs persistence.
    We store pending files as a JSON array in a single file.
    Each operation loads the file, mutates, and saves — simple
    and reliable, just like the office filing system.
    ────────────────────────────────────────────────────────── */

async function ensureDir() {
  await fsp.mkdir(KAAM_DIR, { recursive: true });
}

async function loadKaam() {
  try {
    const data = await fsp.readFile(KAAM_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveKaam(tasks) {
  await ensureDir();
  await fsp.writeFile(KAAM_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

// ============================================================
// SECTION 4: Core Commands
// ============================================================

async function addKaam(title) {
  const tasks = await loadKaam();
  const task = {
    id: shortId(),
    title,
    status: 'pending',
    createdAt: timestamp()
  };
  tasks.push(task);
  await saveKaam(tasks);
  console.log(`${GREEN}  + New file added:${RESET} [${task.id}] ${task.title}`);
  return task;
}

async function listKaam() {
  const tasks = await loadKaam();
  if (tasks.length === 0) {
    console.log(`${DIM}  (desk is empty — no pending files)${RESET}`);
    return tasks;
  }
  for (const t of tasks) {
    const icon = t.status === 'done'
      ? `${GREEN}\u2713${RESET}`      // Output: checkmark for cleared
      : `${YELLOW}\u2610${RESET}`;    // Output: ballot box for pending
    const titleStr = t.status === 'done'
      ? `${DIM}${t.title}${RESET}`
      : t.title;
    const dateStr = `${DIM}${formatDate(t.createdAt)}${RESET}`;
    console.log(`  ${icon}  [${CYAN}${t.id}${RESET}] ${titleStr}  ${dateStr}`);
  }
  return tasks;
}

async function markDone(id) {
  const tasks = await loadKaam();
  const task = tasks.find(t => t.id === id);
  if (!task) {
    console.log(`${RED}  ! File not found: ${id}${RESET}`);
    return null;
  }
  task.status = 'done';
  await saveKaam(tasks);
  console.log(`${GREEN}  \u2713 File cleared:${RESET} ${task.title}`);
  return task;
}

async function deleteKaam(id) {
  const tasks = await loadKaam();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) {
    console.log(`${RED}  ! File not found: ${id}${RESET}`);
    return null;
  }
  const [removed] = tasks.splice(idx, 1);
  await saveKaam(tasks);
  console.log(`${RED}  - File closed:${RESET} ${removed.title}`);
  return removed;
}

async function clearDesk() {
  await saveKaam([]);
  console.log(`${YELLOW}  ~ Desk cleanup complete — all files cleared${RESET}`);
}

// ============================================================
// SECTION 5: CLI Argument Router
// ============================================================

async function runCLI(args) {
  const [command, ...rest] = args;

  switch (command) {
    case 'add': {
      const title = rest.join(' ');
      if (!title) {
        console.log(`${RED}Usage: add <task description>${RESET}`);
        return;
      }
      await addKaam(title);
      break;
    }
    case 'list':
      await listKaam();
      break;
    case 'done': {
      if (!rest[0]) {
        console.log(`${RED}Usage: done <file-id>${RESET}`);
        return;
      }
      await markDone(rest[0]);
      break;
    }
    case 'delete': {
      if (!rest[0]) {
        console.log(`${RED}Usage: delete <file-id>${RESET}`);
        return;
      }
      await deleteKaam(rest[0]);
      break;
    }
    case 'clear':
      await clearDesk();
      break;
    default:
      console.log(`${RED}Unknown command: ${command}${RESET}`);
      console.log('Commands: add, list, done, delete, clear');
  }
}

// ============================================================
// SECTION 6: Demo Mode
// ============================================================

/** ──────────────────────────────────────────────────────────
    Story: The demo walks through every feature so you can
    see KaamKaro in action without remembering the CLI args.
    Babu Tripathi processes files at his sarkari desk.
    It creates a temp directory, runs all commands, then
    cleans up after itself.
    ────────────────────────────────────────────────────────── */

async function runDemo() {
  banner('KaamKaro \u2014 Daily Kaam Manager (DEMO MODE)');
  console.log(`  Storage: ${DIM}${KAAM_FILE}${RESET}\n`);

  // Step 1 — Add tasks (new files on Babu Tripathi's desk)
  thinRule();
  console.log(`${BOLD}  Step 1: Adding three files to Babu Tripathi's desk${RESET}`);
  thinRule();
  const t1 = await addKaam('Process pension application');
  // Output: + New file added: [xxxxxxxx] Process pension application
  const t2 = await addKaam('Draft reply to RTI query');
  // Output: + New file added: [xxxxxxxx] Draft reply to RTI query
  const t3 = await addKaam('Forward file to Under Secretary');
  // Output: + New file added: [xxxxxxxx] Forward file to Under Secretary

  // Step 2 — List all tasks
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 2: Listing all pending files${RESET}`);
  thinRule();
  await listKaam();
  // Output: three tasks, all with ballot-box icon (pending)

  // Step 3 — Mark one done (file cleared)
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 3: Marking "${t1.title}" as cleared${RESET}`);
  thinRule();
  await markDone(t1.id);
  // Output: checkmark File cleared: Process pension application

  // Step 4 — Delete one (file closed)
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 4: Closing "${t3.title}"${RESET}`);
  thinRule();
  await deleteKaam(t3.id);
  // Output: - File closed: Forward file to Under Secretary

  // Step 5 — List again to see changes
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 5: Listing files after changes${RESET}`);
  thinRule();
  await listKaam();
  // Output: two files — one cleared (checkmark), one pending (ballot box)

  // Step 6 — Show raw JSON
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 6: Raw JSON on disk (the register)${RESET}`);
  thinRule();
  const raw = await fsp.readFile(KAAM_FILE, 'utf-8');
  console.log(DIM + raw + RESET);
  // Output: pretty-printed JSON array with 2 tasks

  // Step 7 — Clear and verify (desk cleanup)
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 7: Desk cleanup — clearing all files${RESET}`);
  thinRule();
  await clearDesk();
  // Output: ~ Desk cleanup complete — all files cleared
  await listKaam();
  // Output: (desk is empty — no pending files)

  // Cleanup
  console.log('');
  thinRule();
  console.log(`${BOLD}  Cleanup: Removing temp files${RESET}`);
  thinRule();
  await fsp.rm(KAAM_DIR, { recursive: true, force: true });
  console.log(`${DIM}  Removed ${KAAM_DIR}${RESET}`);

  // ============================================================
  // KEY TAKEAWAYS
  // ============================================================
  banner('KEY TAKEAWAYS');
  console.log(`
  1. process.argv slicing gives clean command routing
  2. fs/promises keeps file I/O async and non-blocking
  3. crypto.randomBytes generates compact unique IDs
  4. JSON.stringify with indent makes human-readable storage
  5. Colored console output makes CLI tools feel polished
  6. Always clean up temp resources in demo/test modes
  7. A switch-based router scales well for simple CLIs
`);
}

// ============================================================
// SECTION 7: Entry Point
// ============================================================

async function main() {
  if (DEMO_MODE) {
    await runDemo();
  } else {
    await ensureDir();
    await runCLI(process.argv.slice(2));
  }
}

main().catch(err => {
  console.error(`${RED}Fatal: ${err.message}${RESET}`);
  process.exit(1);
});
