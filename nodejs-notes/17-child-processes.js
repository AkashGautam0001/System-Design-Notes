/** ============================================================
 FILE 17: Child Processes — exec, spawn, fork
 ============================================================
 Topic: The 'child_process' module — running external commands
 WHY THIS MATTERS:
   Node is single-threaded. Child processes let you run system
   commands, shell scripts, and other Node programs in separate
   processes. Essential for CLI tools, build systems, and
   offloading heavy work.
 ============================================================ */

const { execSync, exec, execFile, spawn, fork } = require('child_process');
const path = require('path');

// ============================================================
// STORY: Indian Army Command
// Brigadier Chauhan (main process) dispatches missions to
// field officers and jawans (child processes). execSync is a
// direct radio command that the Brigadier waits for.
// exec/execFile are async radio dispatches.
// spawn deploys a platoon that streams intel back in real-time.
// fork creates an independent squad with its own comms channel
// (IPC) for ongoing communication.
// ============================================================

// ── Handle forked child mode first ──────────────────────────
// WHY: fork() runs THIS SAME FILE in a child process.
// We use a flag to detect if we're the child.
if (process.argv[2] === '--child') {
  // We are the forked squad member
  process.on('message', (msg) => {
    const result = {
      squad: `Squad-${process.pid}`,
      mission: msg.mission,
      status: 'COMPLETED',
      intel: `Target "${msg.mission}" secured at sector ${Math.floor(Math.random() * 100)}`
    };
    process.send(result);
  });

  // Signal ready
  process.send({ squad: `Squad-${process.pid}`, status: 'READY' });
  return; // Exit child code path
}

// ── Main process (Brigadier Chauhan) ────────────────────────

async function main() {
  // ============================================================
  // EXAMPLE BLOCK 1 — execSync, exec, execFile
  // ============================================================

  console.log('='.repeat(60));
  console.log('  BLOCK 1: execSync, exec, execFile');
  console.log('='.repeat(60));

  // ── execSync — synchronous, blocks until complete ─────────
  // WHY: Simplest way to run a command and capture output.
  // Blocks the event loop — use only for scripts/CLI tools.
  console.log('\n--- execSync (Radio Command — Brigadier waits) ---');

  const echoResult = execSync('echo "Operation Vijay confirmed"').toString().trim();
  console.log(`  echo result    : "${echoResult}"`);
  // Output: echo result    : "Operation Vijay confirmed"

  const dateResult = execSync('date').toString().trim();
  console.log(`  date result    : "${dateResult}"`);
  // Output: date result    : Sat Feb 14 10:30:00 UTC 2026 (varies by system)

  // ── execSync error handling ───────────────────────────────
  try {
    execSync('nonexistent-command-xyz 2>/dev/null');
  } catch (err) {
    console.log(`  Error caught   : status ${err.status}`);
    // Output: Error caught   : status 127
  }

  // ── exec — asynchronous with callback ─────────────────────
  // WHY: Non-blocking, but buffers ALL output into memory.
  // Good for short commands, bad for large output streams.
  console.log('\n--- exec (Async Radio Dispatch) ---');

  await new Promise((resolve) => {
    exec('echo "Field report from platoon alpha"', (error, stdout, stderr) => {
      if (error) {
        console.log(`  exec error: ${error.message}`);
        resolve();
        return;
      }
      console.log(`  exec stdout    : "${stdout.trim()}"`);
      // Output: exec stdout    : "Field report from platoon alpha"
      if (stderr) console.log(`  exec stderr    : "${stderr.trim()}"`);
      resolve();
    });
  });

  // ── execFile — safer, no shell interpretation ─────────────
  // WHY: execFile runs a file directly (no shell). Safer against
  // injection since arguments aren't parsed by a shell.
  console.log('\n--- execFile (Direct Execution) ---');

  await new Promise((resolve) => {
    execFile('node', ['-e', 'console.log("Intel from jawans: sector " + (40+2))'], (error, stdout) => {
      if (error) {
        console.log(`  execFile error: ${error.message}`);
        resolve();
        return;
      }
      console.log(`  execFile out   : "${stdout.trim()}"`);
      // Output: execFile out   : "Intel from jawans: sector 42"
      resolve();
    });
  });

  // ============================================================
  // EXAMPLE BLOCK 2 — spawn (Deploy Platoon — Streaming)
  // ============================================================

  console.log('\n' + '='.repeat(60));
  console.log('  BLOCK 2: spawn (Deploy Platoon — Streaming Intel)');
  console.log('='.repeat(60));

  // WHY: spawn streams stdout/stderr as data arrives — perfect
  // for long-running processes or large output.

  console.log('\n--- spawn with streaming output ---');

  await new Promise((resolve) => {
    const code = `
      console.log("Sector Rajputana clear");
      console.log("Sector Maratha clear");
      console.error("WARNING: Sector Gorkha activity detected");
      console.log("Sector Sikh clear");
    `;

    const child = spawn('node', ['-e', code]);
    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on('data', (data) => {
      stdoutChunks.push(data.toString().trim());
    });

    child.stderr.on('data', (data) => {
      stderrChunks.push(data.toString().trim());
    });

    child.on('close', (exitCode) => {
      console.log(`  stdout lines   :`);
      stdoutChunks.forEach((line) => console.log(`    ${line}`));
      // Output: Sector Rajputana clear
      // Output: Sector Maratha clear
      // Output: Sector Sikh clear
      console.log(`  stderr lines   :`);
      stderrChunks.forEach((line) => console.log(`    ${line}`));
      // Output: WARNING: Sector Gorkha activity detected
      console.log(`  Exit code      : ${exitCode}`);
      // Output: Exit code      : 0
      resolve();
    });
  });

  // ── spawn with options ────────────────────────────────────
  console.log('\n--- spawn with options (cwd, env, timeout) ---');

  await new Promise((resolve) => {
    const child = spawn('node', ['-e', 'console.log("CWD:", process.cwd()); console.log("OPERATION:", process.env.OPERATION)'], {
      cwd: '/tmp',
      env: { ...process.env, OPERATION: 'operation-parakram' },
      timeout: 5000
    });

    let output = '';
    child.stdout.on('data', (data) => { output += data.toString(); });

    child.on('close', () => {
      output.trim().split('\n').forEach((line) => {
        console.log(`  ${line.trim()}`);
      });
      // Output: CWD: /tmp
      // Output: OPERATION: operation-parakram
      resolve();
    });
  });

  // ============================================================
  // EXAMPLE BLOCK 3 — fork (Independent Squad with Own Comms)
  // ============================================================

  console.log('\n' + '='.repeat(60));
  console.log('  BLOCK 3: fork (Independent Squad — IPC Communication)');
  console.log('='.repeat(60));

  // WHY: fork() creates a new Node.js process with a built-in
  // IPC channel. Parent and child can send/receive messages.
  // Perfect for offloading CPU work while staying in Node.

  console.log('\n--- Forking independent squads ---');

  const missions = ['Recon Leh', 'Patrol Siachen'];

  // Fork two child processes (squads)
  const squads = missions.map(() => {
    return fork(__filename, ['--child']);
  });

  // Wait for all squads to report
  const results = await Promise.all(squads.map((child, index) => {
    return new Promise((resolve) => {
      let readyReceived = false;

      child.on('message', (msg) => {
        if (msg.status === 'READY' && !readyReceived) {
          readyReceived = true;
          console.log(`  ${msg.squad} reporting for duty`);
          // Output: Squad-12345 reporting for duty (PID varies)

          // Send mission
          child.send({ mission: missions[index] });
        } else if (msg.status === 'COMPLETED') {
          console.log(`  ${msg.squad}: ${msg.intel}`);
          // Output: Squad-12345: Target "Recon Leh" secured at sector 47
          child.disconnect();
          resolve(msg);
        }
      });

      // Safety timeout
      setTimeout(() => {
        try { child.kill(); } catch (e) { /* already exited */ }
        resolve({ status: 'TIMEOUT' });
      }, 5000);
    });
  }));

  console.log(`\n  Missions completed: ${results.filter(r => r.status === 'COMPLETED').length}/${missions.length}`);
  // Output: Missions completed: 2/2

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. execSync — synchronous, blocks, returns Buffer (toString)
// 2. exec — async + callback, buffers ALL output in memory
// 3. execFile — like exec but no shell (safer, no injection)
// 4. spawn — async + streams, best for large/continuous output
// 5. fork — spawn + IPC channel for Node-to-Node messaging
// 6. spawn/exec options: cwd, env, timeout, shell, stdio
// 7. Always handle errors — child processes can fail
// 8. Use --child flag pattern for fork() in same file
// 9. process.send()/process.on('message') for IPC in fork
// 10. Prefer spawn over exec for long-running or large output
// ============================================================
