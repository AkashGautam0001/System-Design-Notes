/** ============================================================
 FILE 18: Worker Threads — True Parallelism in Node.js
 ============================================================
 Topic: The 'worker_threads' module — multi-threaded execution
 WHY THIS MATTERS:
   Node.js is single-threaded. Worker threads let you run
   CPU-intensive JavaScript in parallel WITHOUT spawning a
   new process. They share memory via SharedArrayBuffer and
   communicate via message passing — lighter than fork().
 ============================================================ */

const {
  isMainThread,
  Worker,
  parentPort,
  workerData,
  MessageChannel
} = require('worker_threads');
const { performance } = require('perf_hooks');

// ============================================================
// STORY: ISRO Parallel Computing Lab
// Mission Director Sivan oversees the Parallel Computing Lab
// at ISRO. He's the main thread — assigning orbit calculations
// to computation nodes (Worker threads) running independently.
// Each node processes trajectory data in parallel. They share
// telemetry data (SharedArrayBuffer) and communicate via
// inter-node messaging (message passing).
// ============================================================

// ── Worker thread code path ─────────────────────────────────
if (!isMainThread) {
  const task = workerData;

  if (task.type === 'basic') {
    // Block 1: Basic computation node — receive data, compute, send back
    const result = task.num * task.num;
    parentPort.postMessage({
      node: `ComputeNode-${task.id}`,
      input: task.num,
      squared: result
    });
  } else if (task.type === 'primes') {
    // Block 2: CPU-intensive — count primes up to N (orbit factor computation)
    function countPrimes(max) {
      let count = 0;
      for (let i = 2; i <= max; i++) {
        let isPrime = true;
        for (let j = 2; j * j <= i; j++) {
          if (i % j === 0) { isPrime = false; break; }
        }
        if (isPrime) count++;
      }
      return count;
    }
    const start = performance.now();
    const count = countPrimes(task.max);
    const elapsed = performance.now() - start;
    parentPort.postMessage({ count, elapsed });
  } else if (task.type === 'shared') {
    // Block 3: SharedArrayBuffer — increment shared telemetry counter
    const sharedArray = new Int32Array(task.sharedBuffer);
    for (let i = 0; i < task.iterations; i++) {
      Atomics.add(sharedArray, 0, 1);
    }
    parentPort.postMessage({ done: true, threadId: task.id });
  } else if (task.type === 'channel') {
    // Block 3: MessageChannel — communicate via port
    parentPort.once('message', (msg) => {
      if (msg.port) {
        msg.port.postMessage({ from: `ComputeNode-${task.id}`, message: 'Telemetry channel established!' });
        msg.port.close();
        parentPort.postMessage({ done: true });
      }
    });
  }

  // Exit worker code path
  return;
}

// ── Main thread (Mission Director Sivan) ────────────────────

async function main() {
  // ============================================================
  // EXAMPLE BLOCK 1 — Worker Basics
  // ============================================================

  console.log('='.repeat(60));
  console.log('  BLOCK 1: Computation Node Basics');
  console.log('='.repeat(60));

  console.log(`\n  Main thread? : ${isMainThread}`);
  // Output: Main thread? : true

  // WHY: Inline worker pattern — use __filename so the worker
  // runs THIS file, then the !isMainThread branch handles it.

  console.log('\n--- Dispatching computation nodes with workerData ---');

  const computeNodes = [10, 20, 30].map((num, i) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: { type: 'basic', id: i + 1, num }
      });

      worker.on('message', (msg) => {
        console.log(`  ${msg.node}: ${msg.input}^2 = ${msg.squared}`);
        resolve(msg);
      });

      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
      });
    });
  });

  await Promise.all(computeNodes);
  // Output: ComputeNode-1: 10^2 = 100
  // Output: ComputeNode-2: 20^2 = 400
  // Output: ComputeNode-3: 30^2 = 900

  // ============================================================
  // EXAMPLE BLOCK 2 — CPU-Intensive Work: Main vs Worker
  // ============================================================

  console.log('\n' + '='.repeat(60));
  console.log('  BLOCK 2: CPU-Intensive — Mission Control vs Compute Node');
  console.log('='.repeat(60));

  const PRIME_MAX = 100000;

  // WHY: Counting primes is CPU-heavy (like orbit calculations).
  // Doing it on the main thread blocks everything.
  // Doing it in a compute node keeps mission control responsive.

  // ── Count primes on main thread ───────────────────────────
  function countPrimesMain(max) {
    let count = 0;
    for (let i = 2; i <= max; i++) {
      let isPrime = true;
      for (let j = 2; j * j <= i; j++) {
        if (i % j === 0) { isPrime = false; break; }
      }
      if (isPrime) count++;
    }
    return count;
  }

  console.log(`\n--- Orbit factor computation up to ${PRIME_MAX.toLocaleString()} ---`);

  const mainStart = performance.now();
  const mainCount = countPrimesMain(PRIME_MAX);
  const mainTime = (performance.now() - mainStart).toFixed(2);

  console.log(`  Mission Control : ${mainCount} primes in ${mainTime}ms`);
  // Output: Mission Control : 9592 primes in 45.23ms (varies by system)

  // ── Count primes in a compute node ────────────────────────
  const nodeResult = await new Promise((resolve, reject) => {
    const w = new Worker(__filename, {
      workerData: { type: 'primes', max: PRIME_MAX }
    });
    w.on('message', resolve);
    w.on('error', reject);
  });

  console.log(`  Compute Node   : ${nodeResult.count} primes in ${nodeResult.elapsed.toFixed(2)}ms`);
  // Output: Compute Node   : 9592 primes in 42.17ms (varies by system)
  console.log(`  Same result    : ${mainCount === nodeResult.count}`);
  // Output: Same result    : true

  // WHY: For a single computation the times are similar. The real
  // benefit is that the compute node does NOT block mission control,
  // so the system can keep handling telemetry.
  console.log('  Note: Compute node advantage is non-blocking, not raw speed');

  // ============================================================
  // EXAMPLE BLOCK 3 — SharedArrayBuffer, Atomics & MessageChannel
  // ============================================================

  console.log('\n' + '='.repeat(60));
  console.log('  BLOCK 3: Shared Telemetry Buffer, Atomics & MessageChannel');
  console.log('='.repeat(60));

  // ── SharedArrayBuffer with Atomics ────────────────────────
  // WHY: SharedArrayBuffer lets threads access the SAME memory.
  // Atomics ensure thread-safe reads/writes (no race conditions).
  // Like shared telemetry data across ISRO computation nodes.

  console.log('\n--- SharedArrayBuffer + Atomics (Shared Telemetry) ---');

  const ITERATIONS = 10000;
  const NODE_COUNT = 3;

  // Create shared memory — 4 bytes for one Int32
  const sharedBuffer = new SharedArrayBuffer(4);
  const mainView = new Int32Array(sharedBuffer);
  mainView[0] = 0; // Initialize telemetry counter to 0

  const sharedNodes = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    sharedNodes.push(
      new Promise((resolve, reject) => {
        const w = new Worker(__filename, {
          workerData: {
            type: 'shared',
            id: i + 1,
            sharedBuffer,
            iterations: ITERATIONS
          }
        });
        w.on('message', (msg) => {
          console.log(`  ComputeNode-${msg.threadId} finished telemetry update`);
          resolve();
        });
        w.on('error', reject);
      })
    );
  }

  await Promise.all(sharedNodes);

  const finalCount = mainView[0];
  const expected = NODE_COUNT * ITERATIONS;
  console.log(`  Final counter : ${finalCount}`);
  console.log(`  Expected      : ${expected}`);
  console.log(`  Atomic safe?  : ${finalCount === expected}`);
  // Output: Final counter : 30000
  // Output: Expected      : 30000
  // Output: Atomic safe?  : true

  // ── MessageChannel — direct port communication ────────────
  // WHY: MessageChannel creates a pair of connected ports.
  // Transfer a port to a compute node for direct communication
  // (like a dedicated telemetry channel between ISRO nodes).

  console.log('\n--- MessageChannel (Dedicated Telemetry Channel) ---');

  const { port1, port2 } = new MessageChannel();

  const channelResult = await new Promise((resolve, reject) => {
    const w = new Worker(__filename, {
      workerData: { type: 'channel', id: 1 }
    });

    // Listen on our end of the channel
    port1.on('message', (msg) => {
      console.log(`  Channel msg  : from=${msg.from}, "${msg.message}"`);
      // Output: Channel msg  : from=ComputeNode-1, "Telemetry channel established!"
      port1.close();
    });

    w.on('message', (msg) => {
      if (msg.done) resolve(msg);
    });
    w.on('error', reject);

    // Transfer port2 to the compute node
    // WHY: transferList moves ownership — mission control can no longer use port2
    w.postMessage({ port: port2 }, [port2]);
  });

  console.log('  Telemetry channel communication complete');

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. isMainThread — detect if running in main or worker
// 2. new Worker(__filename, { workerData }) — inline pattern
// 3. parentPort.postMessage/on('message') — worker comms
// 4. Workers don't block the main thread — key advantage
// 5. Same-file pattern: if (!isMainThread) { ... } else { ... }
// 6. SharedArrayBuffer — zero-copy shared memory between threads
// 7. Atomics.add/load/store — thread-safe shared memory ops
// 8. MessageChannel — create port pairs for direct communication
// 9. transferList in postMessage moves ownership of ports/buffers
// 10. Workers are lighter than child processes but heavier than
//     promises — use for CPU-bound work, not I/O
// ============================================================
