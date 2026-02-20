/** ============================================================
 FILE 19: Cluster Module — Multi-Process Servers
 ============================================================
 Topic: The 'cluster' module — forking worker processes
 WHY THIS MATTERS:
   A single Node.js process uses one CPU core. The cluster
   module forks multiple workers that share the same server
   port, utilizing all CPU cores. Essential for production
   HTTP servers that need to handle heavy traffic.
 ============================================================ */

const cluster = require('cluster');
const http = require('http');
const os = require('os');

// ============================================================
// STORY: Indian Railway Booking Counters
// The Station Master (primary process) at New Delhi Railway
// Station opens multiple booking counters (worker processes).
// Each booking clerk serves passengers independently, but
// the Station Master coordinates them — opening new counters
// if one shuts down, and issuing closing orders when the
// day ends. One booking clerk per CPU core.
// ============================================================

const PORT = 0; // WHY: Port 0 lets the OS pick an available port

// ── Determine run mode from argv ────────────────────────────
const mode = process.argv[2] || 'block1';

if (mode === 'block1') {
  runBlock1();
} else if (mode === 'block2-primary') {
  runBlock2Primary();
} else if (mode === 'block2-worker') {
  runBlock2Worker();
} else if (mode === 'block1-worker') {
  runBlock1Worker();
}

// ============================================================
// EXAMPLE BLOCK 1 — Cluster Basics: Station Master & Clerks
// ============================================================

function runBlock1() {
  console.log('='.repeat(60));
  console.log('  BLOCK 1: Cluster Basics — Station Master & Booking Clerks');
  console.log('='.repeat(60));

  if (cluster.isPrimary) {
    console.log(`\n  Station Master (Primary) PID : ${process.pid}`);
    console.log(`  Available CPU Cores          : ${os.cpus().length}`);
    console.log('  Opening 2 booking counters...\n');
    // Output: Station Master (Primary) PID : 12345 (varies)
    // Output: Available CPU Cores          : 8 (varies by system)

    // WHY: Fork only 2 workers for demo (not os.cpus().length)
    const NUM_CLERKS = 2;
    let exitedClerks = 0;

    for (let i = 0; i < NUM_CLERKS; i++) {
      const worker = cluster.fork({ COUNTER_NAME: `Counter-${i + 1}` });
      console.log(`  Opened counter ${worker.id} (PID: ${worker.process.pid})`);
      // Output: Opened counter 1 (PID: 12346) (varies)
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`  Clerk ${worker.id} (PID: ${worker.process.pid}) exited — code: ${code}, signal: ${signal || 'none'}`);
      // Output: Clerk 1 (PID: 12346) exited — code: 0, signal: none
      exitedClerks++;
      if (exitedClerks === NUM_CLERKS) {
        console.log('\n  All booking counters closed for the day.');
        console.log('='.repeat(60));
        runBlock2Launcher();
      }
    });
  } else {
    runBlock1Worker();
  }
}

function runBlock1Worker() {
  const counter = process.env.COUNTER_NAME || 'unknown';
  console.log(`  [${counter}] Clerk ${cluster.worker.id} (PID: ${process.pid}) — serving passengers...`);
  // Output: [Counter-1] Clerk 1 (PID: 12346) — serving passengers...

  // Simulate booking work
  let sum = 0;
  for (let i = 0; i < 1000000; i++) sum += i;

  console.log(`  [${counter}] Clerk ${cluster.worker.id} — bookings done (sum: ${sum}). Closing counter.`);
  // Output: [Counter-1] Clerk 1 — bookings done (sum: 499999500000). Closing counter.
  process.exit(0);
}

// ============================================================
// EXAMPLE BLOCK 2 — HTTP Server Cluster with Auto-Restart
// ============================================================

function runBlock2Launcher() {
  console.log('\n' + '='.repeat(60));
  console.log('  BLOCK 2: HTTP Booking Server Cluster with Auto-Restart');
  console.log('='.repeat(60));

  // WHY: We launch Block 2 as a separate cluster by spawning
  // a fresh process, since cluster state cannot be reset.
  const { fork: cpFork } = require('child_process');
  const child = cpFork(__filename, ['block2-primary'], {
    stdio: 'inherit'
  });

  child.on('exit', () => {
    console.log('\n' + '='.repeat(60));
    console.log('  ALL BLOCKS COMPLETE');
    console.log('='.repeat(60));
  });
}

function runBlock2Primary() {
  if (!cluster.isPrimary) {
    runBlock2Worker();
    return;
  }

  const NUM_CLERKS = 2;
  const MAX_RESTARTS = 1; // WHY: Cap restarts to prevent infinite loop in demo
  let restartCount = 0;
  let shuttingDown = false;
  const workers = new Set();

  console.log(`\n  Station Master PID    : ${process.pid}`);
  console.log(`  Opening ${NUM_CLERKS} booking counters...\n`);

  // Fork initial booking clerks
  for (let i = 0; i < NUM_CLERKS; i++) {
    const w = cluster.fork();
    workers.add(w.id);
  }

  // ── Handle worker messages (port discovery) ───────────────
  let serverPort = null;
  let readyClerks = 0;

  cluster.on('message', (worker, msg) => {
    if (msg.type === 'listening' && !serverPort) {
      serverPort = msg.port;
      console.log(`  Booking server listening on port ${serverPort}`);
    }
    if (msg.type === 'listening') {
      readyClerks++;
      if (readyClerks === NUM_CLERKS) {
        // All clerks ready — make a test booking request
        makeTestRequest(serverPort);
      }
    }
  });

  // ── Auto-restart on exit ──────────────────────────────────
  // WHY: In production, clerks might crash. Auto-restart keeps
  // the booking service running. We cap restarts to prevent storms.
  cluster.on('exit', (worker, code, signal) => {
    workers.delete(worker.id);
    console.log(`  Clerk ${worker.id} exited (code: ${code}, signal: ${signal || 'none'})`);

    if (!shuttingDown && restartCount < MAX_RESTARTS) {
      restartCount++;
      console.log(`  Reopening counter... (restart ${restartCount}/${MAX_RESTARTS})`);
      const newWorker = cluster.fork();
      workers.add(newWorker.id);
    }
  });

  // ── Graceful shutdown ─────────────────────────────────────
  function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n  Station Master: Initiating closing time...');

    for (const id in cluster.workers) {
      const w = cluster.workers[id];
      if (w) {
        w.send({ type: 'shutdown' });
        // WHY: Force kill after timeout in case clerk hangs
        setTimeout(() => {
          try { w.kill(); } catch (e) { /* already dead */ }
        }, 2000);
      }
    }

    setTimeout(() => {
      console.log('  Station Master: All counters closed. Station shut down.');
      process.exit(0);
    }, 3000);
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // ── Test request then shutdown ────────────────────────────
  function makeTestRequest(port) {
    console.log(`\n  Making test booking at http://localhost:${port}...`);

    http.get(`http://localhost:${port}/`, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        console.log(`  Response: ${body.trim()}`);
        // Output: Response: Booking Clerk N (PID: XXXXX) — Ticket issued!
        console.log('  Test booking successful!');

        // Trigger shutdown after test
        setTimeout(shutdown, 500);
      });
    }).on('error', (err) => {
      console.log(`  Request error: ${err.message}`);
      shutdown();
    });
  }

  // Safety timeout — ensure we exit
  setTimeout(() => {
    console.log('  Station Master: Safety timeout — forcing exit.');
    process.exit(0);
  }, 10000);
}

function runBlock2Worker() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Booking Clerk ${cluster.worker.id} (PID: ${process.pid}) — Ticket issued!\n`);
  });

  server.listen(0, () => {
    const port = server.address().port;
    process.send({ type: 'listening', port });
    console.log(`  Clerk ${cluster.worker.id} (PID: ${process.pid}) — counter ready on port ${port}`);
    // Output: Clerk 1 (PID: 12347) — counter ready on port 54321 (varies)
  });

  // ── Graceful shutdown handling ────────────────────────────
  process.on('message', (msg) => {
    if (msg.type === 'shutdown') {
      console.log(`  Clerk ${cluster.worker.id} — closing counter...`);
      server.close(() => {
        console.log(`  Clerk ${cluster.worker.id} — counter closed. Going home.`);
        process.exit(0);
      });
    }
  });
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. cluster.isPrimary — detect if you're the coordinator
// 2. cluster.fork() — spawn a worker sharing the same port
// 3. Workers are full processes (separate memory, own PID)
// 4. Primary manages lifecycle: fork, monitor, restart, shutdown
// 5. cluster.on('exit') — detect and auto-restart crashed workers
// 6. Cap restart count to prevent infinite restart storms
// 7. Graceful SIGTERM shutdown — close servers then exit
// 8. Workers share the same server port via OS load balancing
// 9. Use process.send/process.on('message') for IPC
// 10. For demo: fork 2 workers, not os.cpus().length
// ============================================================
