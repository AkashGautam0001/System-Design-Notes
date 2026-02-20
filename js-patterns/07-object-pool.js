/**
 * ============================================================
 *  FILE 7 : The Auto-Rickshaw Stand — Object Pool Pattern
 *  Topic : Object Pool, Connection Pool
 *  WHY THIS MATTERS:
 *    Creating and destroying objects is expensive when they
 *    require heavy initialization (DB connections, threads,
 *    DOM nodes). An Object Pool pre-creates a fixed set of
 *    reusable objects — acquire one when needed, release it
 *    back when done. This is how connection pools, thread
 *    pools, and game object pools work in production systems.
 * ============================================================
 */

// STORY: Munna bhai manages the auto-rickshaw stand outside the
// railway station. There are limited autos — passengers must grab
// one when available, then return it when done. If all autos are
// taken, passengers wait in line.

"use strict";

// ────────────────────────────────────
// BLOCK 1: Generic Object Pool (acquire/release with array-based pool)
// ────────────────────────────────────

// WHY: A pool pre-allocates objects so consumers don't pay the creation
// cost repeatedly. Munna bhai parks his autos at the stand once at the start of the day.

class AutoRickshaw {
  constructor(id) { this.id = id; this.passenger = null; }
  // WHY: Resetting state is critical — a returned object must be clean
  reset() { this.passenger = null; }
  use(name) { this.passenger = name; return `Auto ${this.id} is now carrying ${name}`; }
}

class ObjectPool {
  constructor(factory, resetFn, initialSize) {
    this._factory = factory;
    this._resetFn = resetFn;
    this._available = [];
    this._inUse = new Set();
    // WHY: The pool pre-creates objects — pay the cost once upfront
    for (let i = 0; i < initialSize; i++) this._available.push(this._factory(i + 1));
  }
  acquire() {
    // WHY: Pull from the available stack — O(1) pop from the end
    if (this._available.length === 0) return null;
    const obj = this._available.pop();
    this._inUse.add(obj);
    return obj;
  }
  release(obj) {
    if (!this._inUse.has(obj)) throw new Error("Object not from this pool");
    this._resetFn(obj);  // WHY: Always reset before returning to the pool
    this._inUse.delete(obj);
    this._available.push(obj);
  }
  status() { return `Available: ${this._available.length}, In use: ${this._inUse.size}`; }
}

console.log("--- Block 1: Generic Object Pool ---");
console.log("Munna bhai opens the auto stand with 3 rickshaws.\n");

const autoPool = new ObjectPool((id) => new AutoRickshaw(id), (r) => r.reset(), 3);
console.log("Pool status:", autoPool.status()); // Output: Pool status: Available: 3, In use: 0

const auto1 = autoPool.acquire();
console.log(auto1.use("Ramesh")); // Output: Auto 3 is now carrying Ramesh
const auto2 = autoPool.acquire();
console.log(auto2.use("Suresh")); // Output: Auto 2 is now carrying Suresh
const auto3 = autoPool.acquire();
console.log(auto3.use("Priya")); // Output: Auto 1 is now carrying Priya

console.log("Pool status:", autoPool.status()); // Output: Pool status: Available: 0, In use: 3

const auto4 = autoPool.acquire();
console.log("Fourth passenger gets:", auto4); // Output: Fourth passenger gets: null

autoPool.release(auto1);
console.log("After Ramesh alights:", autoPool.status()); // Output: After Ramesh alights: Available: 1, In use: 2

// WHY: Dinesh gets Auto 3 — the same auto Ramesh had, now clean and reused
const autoForDinesh = autoPool.acquire();
console.log(autoForDinesh.use("Dinesh")); // Output: Auto 3 is now carrying Dinesh
console.log("Auto passenger reset worked?", autoForDinesh.passenger === "Dinesh"); // Output: Auto passenger reset worked? true

autoPool.release(auto2);
autoPool.release(auto3);
autoPool.release(autoForDinesh);
console.log("End of day:", autoPool.status()); // Output: End of day: Available: 3, In use: 0

// ────────────────────────────────────
// BLOCK 2: Database Connection Pool Simulation
// (max connections, timeouts, async acquire with Promise-based waiting)
// ────────────────────────────────────

// WHY: Real connection pools handle async operations — when no connection
// is available, callers wait in a queue until one is released or a timeout expires.

console.log("\n--- Block 2: Database Connection Pool Sim ---");

class Connection {
  constructor(id) { this.id = id; this.queryCount = 0; }
  async query(sql) {
    this.queryCount++;
    await new Promise((r) => setTimeout(r, 10));
    return `[Conn ${this.id}] Result of: ${sql} (queries run: ${this.queryCount})`;
  }
  reset() { /* WHY: In real pools, reset transaction state, temp tables, etc. */ }
}

class ConnectionPool {
  constructor(maxSize, timeoutMs = 2000) {
    this._maxSize = maxSize;
    this._timeoutMs = timeoutMs;
    this._available = [];
    this._inUse = new Set();
    this._waitQueue = []; // WHY: Promises that resolve when a connection frees up
    this._nextId = 1;
  }
  get size() { return this._available.length + this._inUse.size; }

  async acquire() {
    if (this._available.length > 0) {
      const c = this._available.pop(); this._inUse.add(c); return c;
    }
    if (this.size < this._maxSize) {
      const c = new Connection(this._nextId++); this._inUse.add(c); return c;
    }
    // WHY: Async waiting prevents busy-looping; callers resume when freed
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this._waitQueue.indexOf(entry);
        if (idx !== -1) this._waitQueue.splice(idx, 1);
        reject(new Error("Connection pool timeout — Munna bhai says: all autos taken, wait karo!"));
      }, this._timeoutMs);
      const entry = { resolve, timer };
      this._waitQueue.push(entry);
    });
  }

  release(conn) {
    if (!this._inUse.has(conn)) throw new Error("Not managed by this pool");
    conn.reset();
    this._inUse.delete(conn);
    // WHY: Hand directly to a waiter instead of putting back in available list
    if (this._waitQueue.length > 0) {
      const waiter = this._waitQueue.shift();
      clearTimeout(waiter.timer);
      this._inUse.add(conn);
      waiter.resolve(conn);
    } else {
      this._available.push(conn);
    }
  }

  status() {
    return `[Pool] available=${this._available.length} inUse=${this._inUse.size} waiting=${this._waitQueue.length}`;
  }
}

async function runConnectionPoolDemo() {
  const pool = new ConnectionPool(2, 500);
  console.log("Munna bhai's digital auto stand: max 2 connections\n");

  const connA = await pool.acquire();
  const connB = await pool.acquire();
  console.log(pool.status()); // Output: [Pool] available=0 inUse=2 waiting=0

  console.log(await connA.query("SELECT * FROM routes")); // Output: [Conn 1] Result of: SELECT * FROM routes (queries run: 1)
  console.log(await connB.query("SELECT * FROM passengers")); // Output: [Conn 2] Result of: SELECT * FROM passengers (queries run: 1)

  // WHY: Third request waits — pool is full. We release connA after 50ms.
  const waitPromise = pool.acquire();
  console.log("Third request waiting...", pool.status()); // Output: Third request waiting... [Pool] available=0 inUse=2 waiting=1

  setTimeout(() => { console.log("Releasing connection 1..."); pool.release(connA); }, 50);

  const connC = await waitPromise;
  console.log("Third request got:", `Conn ${connC.id}`); // Output: Third request got: Conn 1

  console.log(await connC.query("INSERT INTO trips VALUES(1)")); // Output: [Conn 1] Result of: INSERT INTO trips VALUES(1) (queries run: 2)

  // Demonstrate timeout — pool full, nobody releases
  pool.release(connB);
  const connD = await pool.acquire();
  try {
    await pool.acquire();
  } catch (err) {
    console.log("Timeout error:", err.message); // Output: Timeout error: Connection pool timeout — Munna bhai says: all autos taken, wait karo!
  }

  pool.release(connC);
  pool.release(connD);
  console.log("Final status:", pool.status()); // Output: Final status: [Pool] available=2 inUse=0 waiting=0
  console.log("Munna bhai closes the auto stand. All rickshaws returned.");
}

runConnectionPoolDemo();

// ────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────
// 1. Object Pool pre-allocates and recycles expensive objects (like autos at the stand)
// 2. Always reset objects before returning them to the pool
// 3. Connection pools add async waiting with timeouts for real-world use
// 4. Waiting queues prevent busy-looping and hand off resources fairly
// 5. Pool size limits prevent resource exhaustion (memory, file handles, etc.)
// 6. The pattern trades memory (pre-allocated autos) for speed (no re-creation)
