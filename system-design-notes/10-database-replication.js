/** ============================================================
 *  FILE 10: DATABASE REPLICATION
 *  ============================================================
 *  Topic: Primary-replica, multi-master, sync vs async,
 *         replication lag, read replicas, failover, split-brain
 *
 *  WHY THIS MATTERS:
 *  A single database is a single point of failure. Replication
 *  copies data across servers for fault tolerance, read scaling,
 *  and disaster recovery. The wrong strategy leads to data loss,
 *  stale reads, or split-brain disasters.
 *  ============================================================ */

// STORY: SBI Core Banking System
// SBI processes 100M+ transactions daily across 22,000 branches.
// Primary DB in Mumbai, replicas in every district. A deposit in
// Varanasi updates locally via sync, but Mumbai sees it async —
// the HQ balance may be stale for seconds. This trade-off lets
// SBI serve millions without every TX waiting for a Mumbai round-trip.

console.log("=".repeat(70));
console.log("  FILE 10: DATABASE REPLICATION");
console.log("  SBI Core Banking — Mumbai Primary, District Replicas");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Primary-Replica Setup
// ════════════════════════════════════════════════════════════════

// WHY: Primary-replica is the most common topology. One node writes,
// replicas serve reads and provide failover backup.

console.log("SECTION 1: Primary-Replica Setup");
console.log("-".repeat(50));

class DBNode {
  constructor(name, role = "primary") {
    this.name = name; this.role = role; this.data = new Map();
    this.wal = []; this.walPos = 0; this.healthy = true;
    this.writes = 0; this.reads = 0;
  }
  write(key, val) {
    if (this.role !== "primary") { console.log(`    [${this.name}] REJECTED — replica`); return false; }
    if (!this.healthy) { console.log(`    [${this.name}] REJECTED — down`); return false; }
    this.data.set(key, { val, ts: Date.now(), ver: this.walPos + 1 });
    this.wal.push({ key, val, pos: ++this.walPos }); this.writes++;
    return true;
  }
  read(key) { this.reads++; const e = this.data.get(key); return e ? { ...e, src: this.name } : { val: null, src: this.name }; }
  applyWal(entry) { this.data.set(entry.key, { val: entry.val, ver: entry.pos }); this.walPos = entry.pos; }
  walFrom(pos) { return this.wal.filter(e => e.pos > pos); }
  status() { return `${this.name}(${this.role}) WAL:${this.walPos} rows:${this.data.size}`; }
}

class ReplCluster {
  constructor(primaryName) { this.primary = new DBNode(primaryName); this.replicas = []; this.mode = "async"; }
  addReplica(name) {
    const r = new DBNode(name, "replica");
    for (const [k, v] of this.primary.data) r.data.set(k, { ...v });
    r.walPos = this.primary.walPos; this.replicas.push(r);
    console.log(`    [CLUSTER] Added "${name}" synced to WAL ${r.walPos}`);
    return r;
  }
  write(key, val) {
    const ok = this.primary.write(key, val);
    if (ok && this.mode === "sync") { const e = this.primary.wal.at(-1); for (const r of this.replicas) if (r.healthy) r.applyWal(e); }
    return ok;
  }
  syncAsync() {
    let n = 0;
    for (const r of this.replicas) { if (!r.healthy) continue; for (const e of this.primary.walFrom(r.walPos)) { r.applyWal(e); n++; } }
    return n;
  }
}

const sbi = new ReplCluster("Mumbai-Primary");
console.log("\nSBI cluster setup:\n");
sbi.addReplica("Delhi-Replica");
sbi.addReplica("Chennai-Replica");
sbi.addReplica("Kolkata-Replica");

console.log("\nWrites to primary:");
sbi.write("ACC-1001", { name: "Rajesh", balance: 50000 });
sbi.write("ACC-1002", { name: "Priya", balance: 125000 });
sbi.write("ACC-1003", { name: "Arun", balance: 75000 });
console.log(`  Primary WAL: ${sbi.primary.walPos}, Delhi WAL: ${sbi.replicas[0].walPos}`);
console.log("  (Async — replicas behind!)");

const synced = sbi.syncAsync();
console.log(`  Synced: ${synced} entries. Delhi WAL: ${sbi.replicas[0].walPos}\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Synchronous Replication
// ════════════════════════════════════════════════════════════════

// WHY: Sync replication waits for all replicas to confirm. Zero
// data loss but higher write latency.

console.log("SECTION 2: Synchronous Replication");
console.log("-".repeat(50));

function simSync() {
  const c = new ReplCluster("SBI-Mumbai"); c.mode = "sync";
  c.addReplica("SBI-Delhi"); c.addReplica("SBI-Chennai");

  console.log("\n  Sync mode — writes wait for all replicas:\n");
  const txs = [
    { key: "TX-001", val: { type: "deposit", amt: 10000 } },
    { key: "TX-002", val: { type: "withdrawal", amt: 5000 } },
    { key: "TX-003", val: { type: "transfer", amt: 25000 } },
  ];
  for (const tx of txs) {
    c.write(tx.key, tx.val);
    const latency = Math.max(2, 15, 25); // Primary 2ms, Delhi 15ms, Chennai 25ms
    console.log(`    ${tx.key}: ${tx.val.type} Rs.${tx.val.amt} — ack after ${latency}ms (slowest replica)`);
  }
  console.log("\n  Consistency check:");
  for (const tx of txs) {
    const p = c.primary.read(tx.key), r1 = c.replicas[0].read(tx.key), r2 = c.replicas[1].read(tx.key);
    console.log(`    ${tx.key}: all consistent = ${JSON.stringify(p.val) === JSON.stringify(r1.val) && JSON.stringify(p.val) === JSON.stringify(r2.val)}`);
  }
  console.log("\n  Pro: Zero data loss. Con: Latency = max(all replicas).");
}
simSync();
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Asynchronous Replication
// ════════════════════════════════════════════════════════════════

// WHY: Async acknowledges on primary write only. Lower latency but
// risk of data loss if primary crashes before replication.

console.log("SECTION 3: Asynchronous Replication");
console.log("-".repeat(50));

function simAsync() {
  const c = new ReplCluster("SBI-Mumbai"); c.mode = "async";
  c.addReplica("SBI-Delhi"); c.addReplica("SBI-Chennai");

  console.log("\n  Async mode — ack on primary write only:\n");
  c.write("TX-101", { type: "deposit", amt: 50000 });
  c.write("TX-102", { type: "withdrawal", amt: 8000 });
  c.write("TX-103", { type: "deposit", amt: 15000 });

  console.log(`\n  Primary WAL: ${c.primary.walPos}, Delhi: ${c.replicas[0].walPos} (behind ${c.primary.walPos - c.replicas[0].walPos})`);
  console.log("  Write ack: 2ms (primary only)\n");

  const n = c.syncAsync();
  console.log(`  Async catch-up: ${n} entries synced. All at WAL ${c.replicas[0].walPos}.`);
  console.log("\n  Pro: Low latency (2ms). Con: Data loss window on crash.");
}
simAsync();
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Replication Lag Demo
// ════════════════════════════════════════════════════════════════

// WHY: Async replicas are always behind. This lag causes stale reads.

console.log("SECTION 4: Replication Lag Demo");
console.log("-".repeat(50));

const primary = new DBNode("Mumbai", "primary");
const replica = new DBNode("Varanasi", "replica");
primary.write("ACC-5001", { balance: 100000 }); replica.applyWal(primary.wal[0]);

console.log("\n  Amit's balance: Rs.100,000");
console.log("  10:00:00 — Amit deposits Rs.25,000");
primary.write("ACC-5001", { balance: 125000 });

const pRead = primary.read("ACC-5001"), rRead = replica.read("ACC-5001");
console.log(`  10:00:01 — Primary: Rs.${pRead.val.balance}, Replica: Rs.${rRead.val.balance} (STALE!)`);
console.log(`  Lag: ${primary.walPos - replica.walPos} WAL entries behind`);
console.log("  10:00:03 — Amit checks app (routed to replica) — confused!\n");

for (const e of primary.walFrom(replica.walPos)) replica.applyWal(e);
console.log(`  10:00:05 — Replication catches up: Rs.${replica.read("ACC-5001").val.balance}`);
console.log("\n  Mitigations: read-your-writes, monotonic reads, causal consistency.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Read Replica Routing
// ════════════════════════════════════════════════════════════════

// WHY: Read replicas handle read-heavy workloads. Smart routing
// balances consistency vs performance.

console.log("SECTION 5: Read Replica Routing");
console.log("-".repeat(50));

class ReplicaRouter {
  constructor(primary, replicas) {
    this.primary = primary; this.replicas = replicas; this.rr = 0;
    this.recentWriters = new Map();
  }
  write(key, val, uid) { this.primary.write(key, val); this.recentWriters.set(uid, Date.now()); }
  read(key, uid) {
    const last = this.recentWriters.get(uid);
    if (last && Date.now() - last < 5000) {
      console.log(`    [READ] "${key}" -> ${this.primary.name} (read-your-writes for ${uid})`);
      return this.primary.read(key);
    }
    const healthy = this.replicas.filter(r => r.healthy);
    if (!healthy.length) return this.primary.read(key);
    const r = healthy[this.rr++ % healthy.length];
    console.log(`    [READ] "${key}" -> ${r.name} (round-robin)`);
    return r.read(key);
  }
}

const rp = new DBNode("Mumbai-Primary", "primary");
rp.write("ACC-2001", { balance: 80000 }); rp.write("ACC-2002", { balance: 45000 });
const reps = [new DBNode("Delhi-Rep", "replica"), new DBNode("Chennai-Rep", "replica")];
for (const rep of reps) for (const e of rp.wal) rep.applyWal(e);

const router = new ReplicaRouter(rp, reps);
console.log("\nSBI read routing:\n");
router.write("ACC-2001", { balance: 90000 }, "amit");
router.read("ACC-2001", "amit"); // Should go to primary
console.log();
router.read("ACC-2001", "priya"); // Replica
router.read("ACC-2002", "ravi"); // Replica
router.read("ACC-2001", "deepa"); // Replica

console.log("\n  Write distribution:");
console.log(`    ${rp.name}: ${rp.writes} writes, ${rp.reads} reads`);
reps.forEach(r => console.log(`    ${r.name}: ${r.writes} writes, ${r.reads} reads`));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Automatic Failover
// ════════════════════════════════════════════════════════════════

// WHY: When primary fails, a replica must be promoted. Without
// failover, all writes halt.

console.log("SECTION 6: Automatic Failover");
console.log("-".repeat(50));

class FailoverMgr {
  constructor(cluster) { this.cluster = cluster; this.missed = 0; this.threshold = 3; }
  heartbeat() {
    if (this.cluster.primary.healthy) { this.missed = 0; return { status: "healthy" }; }
    this.missed++;
    console.log(`    [HB] ${this.cluster.primary.name} missed #${this.missed}`);
    if (this.missed >= this.threshold) return this.failover();
    return { status: "degraded" };
  }
  failover() {
    console.log(`\n    [FAILOVER] "${this.cluster.primary.name}" declared DEAD`);
    const candidates = this.cluster.replicas.filter(r => r.healthy).sort((a, b) => b.walPos - a.walPos);
    if (!candidates.length) { console.log("    CRITICAL: No healthy replicas!"); return { status: "failed" }; }
    const promoted = candidates[0];
    const loss = this.cluster.primary.walPos - promoted.walPos;
    console.log(`    [FAILOVER] Promoting "${promoted.name}" (WAL gap: ${loss})`);
    promoted.role = "primary"; this.cluster.primary = promoted;
    this.cluster.replicas = this.cluster.replicas.filter(r => r !== promoted);
    this.missed = 0;
    return { status: "completed", newPrimary: promoted.name, dataLoss: loss };
  }
}

const foCluster = new ReplCluster("Mumbai-HQ");
foCluster.addReplica("Delhi-Rep"); foCluster.addReplica("Chennai-Rep");
foCluster.write("ACC-3001", { balance: 500000 }); foCluster.write("ACC-3002", { balance: 250000 });
foCluster.syncAsync();
foCluster.write("ACC-3003", { balance: 100000 }); // Not replicated

console.log(`\n  Primary WAL: ${foCluster.primary.walPos}, Replicas: ${foCluster.replicas[0].walPos} (1 behind)\n`);
console.log("  Simulating Mumbai failure...\n");
foCluster.primary.healthy = false;
const fm = new FailoverMgr(foCluster);
for (let i = 0; i < 4; i++) { const r = fm.heartbeat(); if (r.status === "completed") { console.log(`\n    New primary: ${r.newPrimary}, Data loss: ${r.dataLoss} entries`); break; } }

console.log("  Write to new primary:");
console.log(`    Success: ${foCluster.write("ACC-3004", { balance: 75000 })}\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Multi-Master Replication
// ════════════════════════════════════════════════════════════════

// WHY: Multi-master lets any node accept writes. Lower latency for
// geo-distributed systems but introduces write conflicts.

console.log("SECTION 7: Multi-Master Replication");
console.log("-".repeat(50));

class MultiMaster {
  constructor(name) { this.name = name; this.data = new Map(); this.ver = new Map(); }
  write(key, val) {
    const ts = Date.now(); this.data.set(key, val); this.ver.set(key, { ts, origin: this.name });
    return { key, val, ts, origin: this.name };
  }
  receive(key, val, ts, origin) {
    const local = this.ver.get(key);
    if (!local || ts > local.ts || (ts === local.ts && origin > local.origin)) {
      this.data.set(key, val); this.ver.set(key, { ts, origin });
      return "accepted (LWW)";
    }
    return "rejected (local newer)";
  }
}

console.log("\nSBI Multi-Master: Mumbai + Delhi both write.\n");
const mm1 = new MultiMaster("Mumbai"), mm2 = new MultiMaster("Delhi");

const w1 = mm1.write("ACC-7001", { balance: 100000 });
console.log(`  Mumbai writes ACC-7001: Rs.100,000`);
const w2 = mm2.write("ACC-7002", { balance: 50000 });
console.log(`  Delhi writes ACC-7002: Rs.50,000`);
console.log(`  Cross-replicate: Delhi gets ACC-7001: ${mm2.receive(w1.key, w1.val, w1.ts, w1.origin)}`);
console.log(`  Cross-replicate: Mumbai gets ACC-7002: ${mm1.receive(w2.key, w2.val, w2.ts, w2.origin)}`);

console.log("\n  CONFLICT: Both update ACC-7001 simultaneously:");
const c1w = mm1.write("ACC-7001", { balance: 120000 });
const c2w = mm2.write("ACC-7001", { balance: 110000 });
console.log(`  Mumbai: Rs.120,000 at t=${c1w.ts}`);
console.log(`  Delhi:  Rs.110,000 at t=${c2w.ts}`);
console.log(`  Mumbai receives Delhi: ${mm1.receive(c2w.key, c2w.val, c2w.ts, c2w.origin)}`);
console.log(`  Delhi receives Mumbai: ${mm2.receive(c1w.key, c1w.val, c1w.ts, c1w.origin)}`);
console.log(`  Converged: ${mm1.data.get("ACC-7001").balance === mm2.data.get("ACC-7001").balance}`);
console.log("\n  Pro: Low write latency. Con: Conflicts need LWW/CRDT resolution.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Split-Brain Detection
// ════════════════════════════════════════════════════════════════

// WHY: Split-brain = two nodes both think they're primary. Both
// accept writes, causing divergent data that's hard to reconcile.

console.log("SECTION 8: Split-Brain Detection");
console.log("-".repeat(50));

class SplitBrainDetector {
  constructor(nodeCount, quorum) { this.n = nodeCount; this.q = quorum; this.fenceToken = 0; this.tokens = new Map(); }
  partition(g1, g2) {
    console.log(`\n  Network partition: Group1=[${g1.join(",")}](${g1.length}) Group2=[${g2.join(",")}](${g2.length})`);
    console.log(`  Quorum: ${this.q} of ${this.n}`);
    const g1q = g1.length >= this.q, g2q = g2.length >= this.q;
    console.log(`  Group1 quorum: ${g1q}, Group2 quorum: ${g2q}`);
    if (g1q && !g2q) console.log("  -> Group1 continues, Group2 fenced off.");
    else if (g2q && !g1q) console.log("  -> Group2 continues, Group1 fenced off.");
    else if (!g1q && !g2q) console.log("  -> NEITHER has quorum — system halts writes.");
    else console.log("  -> DANGER: Both have quorum — should not happen with N/2+1!");
  }
  fence(node) { this.tokens.set(node, ++this.fenceToken); console.log(`  [FENCE] Token #${this.fenceToken} -> "${node}"`); return this.fenceToken; }
  validate(node, token) {
    const valid = this.tokens.get(node) === token;
    console.log(`  [FENCE] "${node}" token #${token}: ${valid ? "VALID" : "STALE — REJECTED"}`);
    return valid;
  }
}

const sbd = new SplitBrainDetector(5, 3);
console.log("\nScenario 1: 3-2 split (majority in one group)");
sbd.partition(["Mumbai", "Delhi", "Chennai"], ["Kolkata", "Bengaluru"]);

console.log("\nScenario 2: Even split — system halts");
sbd.partition(["Mumbai", "Delhi"], ["Chennai", "Kolkata", "Bengaluru"]);

console.log("\n  Fencing tokens prevent stale primary writes:\n");
const oldToken = sbd.fence("Mumbai");
const newToken = sbd.fence("Delhi");
console.log("\n  Mumbai recovers, tries old token:");
sbd.validate("Mumbai", oldToken);
console.log("  Delhi writes with current token:");
sbd.validate("Delhi", newToken);

console.log("\n  Prevention: Odd nodes, majority quorum, fencing tokens, STONITH.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 9 — Full SBI Day Simulation
// ════════════════════════════════════════════════════════════════

// WHY: Combining replication, failover, and routing in a realistic
// banking day scenario.

console.log("SECTION 9: Full SBI Banking Day");
console.log("-".repeat(50));

const dayCluster = new ReplCluster("Mumbai-HQ");
dayCluster.addReplica("Delhi-Branch"); dayCluster.addReplica("Chennai-Branch");

console.log("\n  09:00 — Deposits:");
for (let i = 1; i <= 8; i++) dayCluster.write(`ACC-${9000 + i}`, { bal: Math.floor(Math.random() * 100000) + 10000 });
console.log(`    8 accounts, Primary WAL: ${dayCluster.primary.walPos}, Replicas behind: ${dayCluster.primary.walPos - dayCluster.replicas[0].walPos}`);
dayCluster.syncAsync();

console.log("  12:00 — Balance checks on replicas:");
let readCount = 0;
for (let i = 0; i < 20; i++) { dayCluster.replicas[i % 2].read(`ACC-${9000 + (i % 8) + 1}`); readCount++; }
console.log(`    ${readCount} reads served by replicas`);

console.log("  14:30 — Mumbai goes DOWN!");
dayCluster.primary.healthy = false;
const dayFm = new FailoverMgr(dayCluster);
for (let i = 0; i < 4; i++) { const r = dayFm.heartbeat(); if (r.status === "completed") { console.log(`    New primary: ${r.newPrimary}`); break; } }

console.log("  17:00 — Mumbai recovered, rejoins as replica.");
const recov = new DBNode("Mumbai-Recovered", "replica");
for (const e of dayCluster.primary.wal) recov.applyWal(e);
dayCluster.replicas.push(recov);
console.log(`    ${recov.name} synced to WAL ${recov.walPos}`);
console.log(`    Active replicas: ${dayCluster.replicas.map(r => r.name).join(", ")}\n`);

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log(`
  1. Primary-replica: one writes, replicas serve reads + failover.
  2. Sync replication: zero data loss, write latency = max(replicas).
  3. Async replication: low latency, but data loss window on crash.
  4. Replication lag causes stale reads — use read-your-writes.
  5. Read replicas distribute load — smart routing for consistency.
  6. Auto-failover promotes highest-WAL replica when primary dies.
  7. Multi-master: any node writes, conflicts need LWW/CRDT.
  8. Split-brain: prevent with majority quorum + fencing tokens.
`);
console.log('  SBI DBA\'s wisdom: "A bank\'s database is like its vault —');
console.log('  copies in every city, guards that never sleep, and a clear');
console.log('  chain of command when the main vault goes offline."');
console.log();
console.log("=".repeat(70));
