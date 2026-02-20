/** ============================================================
 *  FILE 20: FAULT TOLERANCE PATTERNS
 *  ============================================================
 *  Topic: Active-active/passive, health checks, leader election,
 *         idempotency keys, chaos engineering
 *
 *  WHY THIS MATTERS:
 *  Systems will fail — hardware crashes, networks partition, and
 *  software has bugs. Fault tolerance ensures systems continue
 *  functioning despite individual component failures. These
 *  patterns ensure availability, data integrity, and graceful
 *  degradation when the inevitable happens.
 *  ============================================================ */

// STORY: Railway Signal Redundancy
// Indian Railways operates 7,000+ stations. Signal cabins use dual-
// redundant systems: primary controls signals while standby monitors
// via health pings every 30s. If primary fails, standby takes over
// through leader election by node ID. Every signal command uses
// idempotency keys so replays never cause duplicate transitions.

console.log("=".repeat(65));
console.log("  FILE 20: FAULT TOLERANCE PATTERNS");
console.log("  Railway Signal Redundancy — dual cabins, leader election");
console.log("=".repeat(65));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Active-Passive Redundancy
// ════════════════════════════════════════════════════════════════

// WHY: Simplest redundancy — one node handles traffic, standby waits.
// On failure, standby takes over (failover).
console.log("--- Section 1: Active-Passive Redundancy ---\n");

class SignalCabin {
  constructor(id, role) { this.id = id; this.role = role; this.healthy = true; this.commands = 0; }
  process(cmd) {
    if (!this.healthy) return { status: "FAILED", cabin: this.id };
    if (this.role !== "PRIMARY") return { status: "REJECTED", cabin: this.id };
    this.commands++; return { status: "OK", cabin: this.id, cmd };
  }
  promote() { this.role = "PRIMARY"; }
  demote() { this.role = "STANDBY"; }
}

class ActivePassiveCluster {
  constructor(pId, sId) {
    this.primary = new SignalCabin(pId, "PRIMARY");
    this.standby = new SignalCabin(sId, "STANDBY");
    this.failovers = 0; this.log = [`Init: primary=${pId}, standby=${sId}`];
  }
  processCommand(cmd) {
    let r = this.primary.process(cmd);
    if (r.status === "FAILED") { this.failover(); r = this.primary.process(cmd); }
    return r;
  }
  failover() {
    this.failovers++;
    this.log.push(`Failover: ${this.primary.id} -> ${this.standby.id}`);
    this.standby.promote();
    const tmp = this.primary; this.primary = this.standby; this.standby = tmp;
    this.standby.demote();
  }
  fail(id) { if (this.primary.id === id) this.primary.healthy = false; if (this.standby.id === id) this.standby.healthy = false; }
}

const cluster = new ActivePassiveCluster("cabin-A", "cabin-B");

console.log("  Phase 1: Normal (cabin-A primary)");
for (let i = 0; i < 3; i++) { const r = cluster.processCommand(`signal-${i}`); console.log(`    Cmd ${i}: ${r.status} via ${r.cabin}`); }

console.log("\n  Phase 2: cabin-A fails!");
cluster.fail("cabin-A");
const fr = cluster.processCommand("signal-3");
console.log(`    Cmd after failure: ${fr.status} via ${fr.cabin}`);

console.log("\n  Phase 3: cabin-B is primary");
for (let i = 4; i < 7; i++) { const r = cluster.processCommand(`signal-${i}`); console.log(`    Cmd ${i}: ${r.status} via ${r.cabin}`); }
console.log(`  Failovers: ${cluster.failovers}`);
cluster.log.forEach(l => console.log(`  Log: ${l}`));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Active-Active Redundancy
// ════════════════════════════════════════════════════════════════

// WHY: All nodes handle traffic simultaneously. Better utilization,
// no failover delay, but requires conflict resolution.
console.log("--- Section 2: Active-Active Redundancy ---\n");

class ActiveActiveCluster {
  constructor(count) {
    this.nodes = [];
    for (let i = 0; i < count; i++) this.nodes.push({ id: `node-${i+1}`, healthy: true, processed: 0 });
    this.total = 0;
  }
  route(req) {
    const healthy = this.nodes.filter(n => n.healthy);
    if (!healthy.length) return { status: "ALL_DOWN" };
    healthy.sort((a,b) => a.processed - b.processed);
    healthy[0].processed++; this.total++;
    return { status: "OK", node: healthy[0].id };
  }
  fail(id) { const n = this.nodes.find(n => n.id === id); if (n) n.healthy = false; }
  recover(id) { const n = this.nodes.find(n => n.id === id); if (n) n.healthy = true; }
}

const aa = new ActiveActiveCluster(3);
console.log("  All healthy — load balanced:");
for (let i = 0; i < 6; i++) { const r = aa.route(`req-${i}`); console.log(`    Req ${i}: ${r.node}`); }

aa.fail("node-2");
console.log("\n  node-2 fails:");
for (let i = 6; i < 9; i++) { const r = aa.route(`req-${i}`); console.log(`    Req ${i}: ${r.node}`); }

aa.recover("node-2");
console.log("\n  node-2 recovers:");
for (let i = 9; i < 12; i++) { const r = aa.route(`req-${i}`); console.log(`    Req ${i}: ${r.node}`); }
console.log(`  Distribution: ${aa.nodes.map(n => `${n.id}=${n.processed}`).join(", ")}\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Health Check Mechanisms
// ════════════════════════════════════════════════════════════════

// WHY: Detect failures early so traffic can be redirected.
console.log("--- Section 3: Health Check Mechanisms ---\n");

class HealthChecker {
  constructor() { this.targets = {}; }
  register(id, checkFn) { this.targets[id] = { id, checkFn, status: "UNKNOWN", failures: 0 }; }
  check(id) {
    const t = this.targets[id]; if (!t) return null;
    const r = t.checkFn();
    if (r.healthy) { t.status = "HEALTHY"; t.failures = 0; }
    else { t.failures++; t.status = t.failures >= 3 ? "DOWN" : "DEGRADED"; }
    return { target: id, status: t.status, failures: t.failures, latency: r.latencyMs };
  }
  checkAll() { return Object.keys(this.targets).map(id => this.check(id)); }
}

const hc = new HealthChecker();
let cabinADown = false;
hc.register("cabin-A-shallow", () => ({ healthy: !cabinADown, latencyMs: cabinADown ? -1 : 5 }));
hc.register("cabin-A-deep", () => ({ healthy: !cabinADown, latencyMs: cabinADown ? -1 : 45 }));
hc.register("cabin-B-shallow", () => ({ healthy: true, latencyMs: 3 }));
hc.register("cabin-B-deep", () => ({ healthy: true, latencyMs: 38 }));

console.log("  Round 1 — All healthy:");
hc.checkAll().forEach(r => console.log(`    ${r.target}: ${r.status} (${r.latency}ms)`));

cabinADown = true;
console.log("\n  Rounds 2-4 — cabin-A failing:");
for (let round = 2; round <= 4; round++) {
  const results = hc.checkAll().filter(r => r.target.startsWith("cabin-A"));
  results.forEach(r => console.log(`    Round ${round} ${r.target}: ${r.status} (failures: ${r.failures})`));
}
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Leader Election (Bully Algorithm)
// ════════════════════════════════════════════════════════════════

// WHY: When leader fails, remaining nodes must agree on a new one.
// Bully algorithm elects the highest-priority alive node.
console.log("--- Section 4: Leader Election (Bully Algorithm) ---\n");

class BullyElection {
  constructor() { this.nodes = {}; this.leader = null; this.log = []; }
  addNode(id, priority) { this.nodes[id] = { id, priority, alive: true }; }
  elect(initiatorId) {
    this.log = [];
    const init = this.nodes[initiatorId];
    if (!init || !init.alive) return null;
    this.log.push(`${initiatorId} starts election`);
    const higher = Object.values(this.nodes).filter(n => n.priority > init.priority && n.alive);
    this.log.push(`${higher.length} higher-priority nodes respond`);
    if (higher.length === 0) { this.declareLeader(initiatorId); return this.leader; }
    const highest = higher.sort((a,b) => b.priority - a.priority)[0];
    this.declareLeader(highest.id);
    return this.leader;
  }
  declareLeader(id) { this.leader = id; this.log.push(`${id} becomes LEADER`); }
  kill(id) { if (this.nodes[id]) this.nodes[id].alive = false; }
  revive(id) { if (this.nodes[id]) this.nodes[id].alive = true; }
}

const elec = new BullyElection();
for (let i = 1; i <= 5; i++) elec.addNode(`signal-${i}`, i);

console.log("  Scenario 1: node-2 initiates");
elec.elect("signal-2");
elec.log.forEach(l => console.log(`    ${l}`));
console.log(`  Leader: ${elec.leader}\n`);

console.log("  Scenario 2: node-5 fails, node-3 detects");
elec.kill("signal-5");
elec.elect("signal-3");
elec.log.forEach(l => console.log(`    ${l}`));
console.log(`  Leader: ${elec.leader}\n`);

console.log("  Scenario 3: node-4 also fails");
elec.kill("signal-4");
elec.elect("signal-1");
elec.log.forEach(l => console.log(`    ${l}`));
console.log(`  Leader: ${elec.leader}\n`);

console.log("  Scenario 4: node-5 recovers and bullies back");
elec.revive("signal-5");
elec.elect("signal-5");
elec.log.forEach(l => console.log(`    ${l}`));
console.log(`  Leader: ${elec.leader}\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Idempotency Keys for Safe Retries
// ════════════════════════════════════════════════════════════════

// WHY: Network failures cause duplicates. Idempotency keys ensure
// processing twice has the same effect as once.
console.log("--- Section 5: Idempotency Keys ---\n");

class IdempotentProcessor {
  constructor() { this.processed = {}; this.state = {}; this.stats = { exec: 0, dedup: 0 }; }
  process(cmd) {
    const key = cmd.idempotencyKey;
    if (this.processed[key]) { this.stats.dedup++; return { status: "ALREADY_PROCESSED", key }; }
    if (cmd.type === "SET_SIGNAL") this.state[cmd.signalId] = cmd.value;
    if (cmd.type === "SET_POINTS") this.state[cmd.pointsId] = cmd.position;
    this.processed[key] = true; this.stats.exec++;
    return { status: "PROCESSED", key };
  }
}

const proc = new IdempotentProcessor();
const cmds = [
  { type: "SET_SIGNAL", signalId: "SIG-42", value: "RED", idempotencyKey: "cmd-001" },
  { type: "SET_SIGNAL", signalId: "SIG-42", value: "GREEN", idempotencyKey: "cmd-002" },
  { type: "SET_POINTS", pointsId: "PT-15", position: "NORMAL", idempotencyKey: "cmd-003" },
];

console.log("  First processing:");
cmds.forEach(c => { const r = proc.process(c); console.log(`    ${c.idempotencyKey}: ${r.status}`); });

console.log("\n  Retry (duplicates):");
cmds.forEach(c => { const r = proc.process(c); console.log(`    ${c.idempotencyKey}: ${r.status}`); });

const cmd4 = { type: "SET_SIGNAL", signalId: "SIG-42", value: "YELLOW", idempotencyKey: "cmd-004" };
console.log(`\n  New command: ${proc.process(cmd4).status}`);
console.log(`  Stats: ${JSON.stringify(proc.stats)}`);
console.log(`  State: ${JSON.stringify(proc.state)}`);
console.log("  3 retries, 0 duplicate effects.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Chaos Engineering Basics
// ════════════════════════════════════════════════════════════════

// WHY: Test fault tolerance by deliberately injecting failures.
console.log("--- Section 6: Chaos Engineering ---\n");

class ChaosMonkey {
  constructor() { this.experiments = []; this.findings = []; }
  add(name, hypothesis, inject, verify) { this.experiments.push({ name, hypothesis, inject, verify }); }
  run() {
    return this.experiments.map(exp => {
      console.log(`  Experiment: ${exp.name}`);
      console.log(`  Hypothesis: ${exp.hypothesis}`);
      exp.inject();
      const v = exp.verify();
      console.log(`  Result: ${v.passed ? "PASSED" : "FAILED"} — ${v.details}\n`);
      if (!v.passed) this.findings.push(exp.name);
      return { name: exp.name, passed: v.passed };
    });
  }
}

const chaos = new ChaosMonkey();

const testCluster = new ActivePassiveCluster("main", "backup");
chaos.add("Primary Failure", "Standby takes over on failure",
  () => testCluster.fail("main"),
  () => { const r = testCluster.processCommand("test"); return { passed: r.status === "OK" && r.cabin === "backup", details: `Routed to ${r.cabin}` }; }
);

const testProc = new IdempotentProcessor();
chaos.add("Duplicate Storm", "100 dupes produce 1 state change",
  () => { for (let i = 0; i < 100; i++) testProc.process({ type: "SET_SIGNAL", signalId: "SIG-99", value: "RED", idempotencyKey: "dup-001" }); },
  () => { const s = testProc.stats; return { passed: s.exec === 1 && s.dedup === 99, details: `exec=${s.exec}, dedup=${s.dedup}` }; }
);

const testAA = new ActiveActiveCluster(3);
chaos.add("Active-Active Node Loss", "Losing 1 of 3 nodes still serves all",
  () => testAA.fail("node-2"),
  () => { let ok = true; for (let i = 0; i < 5; i++) { if (testAA.route(`r-${i}`).status !== "OK") ok = false; } return { passed: ok, details: "All requests served" }; }
);

chaos.run();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Graceful Degradation
// ════════════════════════════════════════════════════════════════

// WHY: Shed non-critical functionality to protect core services.
console.log("--- Section 7: Graceful Degradation ---\n");

class DegradationManager {
  constructor() { this.levels = []; this.features = []; }
  addFeature(name, priority) { this.features.push({ name, priority, enabled: true }); }
  defineLevel(level, name, disabled) { this.levels[level] = { name, disabled }; }
  setLevel(level) {
    this.features.forEach(f => f.enabled = true);
    for (let l = 1; l <= level; l++) {
      if (this.levels[l]) this.levels[l].disabled.forEach(d => {
        const f = this.features.find(x => x.name === d);
        if (f) f.enabled = false;
      });
    }
  }
  getStatus(level) { return { level, name: this.levels[level] ? this.levels[level].name : "NORMAL",
    active: this.features.filter(f => f.enabled).map(f => f.name),
    disabled: this.features.filter(f => !f.enabled).map(f => f.name) }; }
}

const deg = new DegradationManager();
["signal-control", "train-tracking", "passenger-info", "analytics", "logging"].forEach((f,i) => deg.addFeature(f, i+1));
deg.defineLevel(0, "NORMAL", []);
deg.defineLevel(1, "ELEVATED", ["analytics"]);
deg.defineLevel(2, "HIGH", ["analytics", "logging"]);
deg.defineLevel(3, "CRITICAL", ["analytics", "logging", "passenger-info"]);
deg.defineLevel(4, "EMERGENCY", ["analytics", "logging", "passenger-info", "train-tracking"]);

for (let l = 0; l <= 4; l++) {
  deg.setLevel(l);
  const s = deg.getStatus(l);
  console.log(`  Level ${l} (${s.name}): active=[${s.active.join(", ")}]`);
}
console.log("  signal-control NEVER degrades — most critical feature.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Disaster Recovery Strategies
// ════════════════════════════════════════════════════════════════

// WHY: DR plans define RPO (data loss tolerance) and RTO (recovery speed).
console.log("--- Section 8: Disaster Recovery ---\n");

const strategies = [
  { name: "Backup & Restore", rpo: 1440, rto: 480, cost: 1 },
  { name: "Pilot Light", rpo: 60, rto: 120, cost: 2 },
  { name: "Warm Standby", rpo: 15, rto: 30, cost: 3 },
  { name: "Multi-Site Active", rpo: 1, rto: 5, cost: 4 },
];

const fmt = m => m < 60 ? `${m} min` : `${(m/60).toFixed(0)} hrs`;
console.log("  Strategy              RPO        RTO        Cost");
console.log("  " + "-".repeat(52));
strategies.forEach(s => {
  console.log(`  ${s.name.padEnd(22)} ${fmt(s.rpo).padEnd(10)} ${fmt(s.rto).padEnd(10)} ${"$".repeat(s.cost)}`);
});

console.log("\n  Simulated 60-minute outage:");
strategies.forEach(s => {
  console.log(`  ${s.name}: data at risk=${fmt(Math.min(60, s.rpo))}, recovery=${fmt(s.rto)}`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════
console.log("=".repeat(65));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(65));
console.log(`
  1. Active-passive: standby takes over on failure (some downtime).
  2. Active-active: all nodes serve traffic (no failover delay).
  3. Health checks (shallow + deep) detect failures early.
  4. Leader election (bully) ensures one coordinator — highest
     priority wins.
  5. Idempotency keys guarantee safe retries — no duplicate effects.
  6. Chaos engineering tests fault tolerance with real failures.
  7. Graceful degradation sheds non-critical features to protect
     core functionality under stress.
  8. DR strategies trade cost vs speed: RPO (data loss) and
     RTO (recovery time).

  Railway Wisdom: "A signal that fails must fail safe — in the
  business of moving a nation, redundancy is not a luxury,
  it is the foundation upon which every journey is built."
`);
