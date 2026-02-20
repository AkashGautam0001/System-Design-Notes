/** ============================================================
 *  FILE 08: HORIZONTAL VS VERTICAL SCALING
 *  ============================================================
 *  Topic: Scale up vs out, stateless services, shared-nothing,
 *         auto-scaling, CAP theorem intro
 *
 *  WHY THIS MATTERS:
 *  Every growing app faces: upgrade the machine (vertical) or add
 *  more machines (horizontal)? This choice impacts architecture,
 *  cost, fault tolerance, and data consistency. Understanding
 *  scaling is the backbone of system design.
 *  ============================================================ */

// STORY: Indian Railways Ticket Counters
// At New Delhi station during Diwali, vertical scaling = giving the
// fastest clerk a faster computer (limited). Horizontal scaling =
// opening more counters. IRCTC auto-scales: 10 counters on normal
// days, 50 during Tatkal at 10am, 200 during Diwali week.

console.log("=".repeat(70));
console.log("  FILE 08: HORIZONTAL VS VERTICAL SCALING");
console.log("  Indian Railways — Faster Clerk vs More Counters");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Vertical Scaling Simulation
// ════════════════════════════════════════════════════════════════

// WHY: Vertical scaling (scale up) adds more CPU/RAM to one machine.
// Simple but limited by hardware ceilings, single point of failure.

console.log("SECTION 1: Vertical Scaling Simulation");
console.log("-".repeat(50));

class VerticalServer {
  constructor(cpu, ram, name = "Server") {
    this.name = name; this.cpu = cpu; this.ram = ram;
    this.rps = cpu * 100; this.cost = cpu * 500 + ram * 50;
  }
  process(incoming) {
    const handled = Math.min(incoming, this.rps);
    const dropped = incoming - handled;
    const ratio = handled / this.rps;
    const latency = ratio < 0.5 ? "5ms" : ratio < 0.8 ? "20ms" : ratio < 0.95 ? "100ms" : "500ms+";
    return { handled, dropped, latency };
  }
  scaleUp(newCpu, newRam) {
    if (newCpu > 128) { console.log(`    [LIMIT] Cannot exceed 128 CPU!`); newCpu = 128; }
    this.cpu = newCpu; this.ram = newRam;
    this.rps = newCpu * 100; this.cost = newCpu * 500 + newRam * 50;
    console.log(`    [SCALE UP] ${this.name}: ${this.rps} req/s (CPU:${newCpu}, RAM:${newRam}GB, Rs.${this.cost}/hr)`);
  }
}

console.log("\nIRCTC on a single server:\n");
const server = new VerticalServer(4, 16, "IRCTC-Main");
console.log(`  Initial: ${server.cpu} CPU, ${server.ram}GB RAM, ${server.rps} req/s\n`);

const traffic = [
  { label: "Normal day", rps: 200 }, { label: "Tatkal 10am", rps: 800 },
  { label: "Diwali rush", rps: 2000 }, { label: "Diwali+Tatkal", rps: 5000 },
];

for (const t of traffic) {
  const r = server.process(t.rps);
  console.log(`  ${t.label} (${t.rps} req/s): Handled=${r.handled}, Dropped=${r.dropped}, Latency=${r.latency}`);
  if (r.dropped > 0) {
    server.scaleUp(Math.min(server.cpu * 2, 128), server.ram * 2);
    const retry = server.process(t.rps);
    console.log(`    After scale-up: Handled=${retry.handled}, Dropped=${retry.dropped}`);
  }
}
console.log("\n  Limits: Hardware ceiling, single point of failure, downtime during upgrade.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Horizontal Scaling Simulation
// ════════════════════════════════════════════════════════════════

// WHY: Horizontal scaling adds more machines behind a load balancer.
// No ceiling, better fault tolerance, but adds complexity.

console.log("SECTION 2: Horizontal Scaling Simulation");
console.log("-".repeat(50));

class HorizontalCluster {
  constructor(cpu, ram) {
    this.cpu = cpu; this.ram = ram; this.instances = [];
    this.addInstance();
  }
  addInstance() {
    const id = this.instances.length + 1;
    this.instances.push(new VerticalServer(this.cpu, this.ram, `Counter-${id}`));
    console.log(`    [SCALE OUT] Instance #${id} — Total: ${this.instances.length}`);
  }
  capacity() { return this.instances.reduce((s, i) => s + i.rps, 0); }
  cost() { return this.instances.reduce((s, i) => s + i.cost, 0); }
  process(incoming) {
    const perInst = Math.ceil(incoming / this.instances.length);
    let handled = 0, dropped = 0;
    for (const inst of this.instances) { const r = inst.process(perInst); handled += r.handled; dropped += r.dropped; }
    return { handled: Math.min(handled, incoming), dropped: Math.max(0, incoming - handled), instances: this.instances.length, cost: this.cost() };
  }
}

console.log("\nIRCTC horizontal scaling:\n");
const cluster = new HorizontalCluster(4, 16);
for (const t of traffic) {
  while (cluster.capacity() < t.rps && cluster.instances.length < 50) cluster.addInstance();
  const r = cluster.process(t.rps);
  console.log(`  ${t.label}: ${r.instances} instances, Cap=${cluster.capacity()}, Handled=${r.handled}, Rs.${r.cost}/hr\n`);
}
console.log("  Advantages: No ceiling, fault tolerant, linear scaling.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Stateless vs Stateful Services
// ════════════════════════════════════════════════════════════════

// WHY: Horizontal scaling needs stateless services. Local session
// data forces sticky sessions, limiting scalability.

console.log("SECTION 3: Stateless vs Stateful Services");
console.log("-".repeat(50));

class StatefulCounter {
  constructor(id) { this.id = id; this.sessions = new Map(); }
  handle(uid, action) {
    if (action === "login") { this.sessions.set(uid, { cart: [] }); return { ok: true, msg: `Session on Counter-${this.id}` }; }
    const s = this.sessions.get(uid);
    if (!s) return { ok: false, msg: `No session on Counter-${this.id}!` };
    if (action === "book") { s.cart.push("Ticket"); return { ok: true, msg: `Booked on Counter-${this.id}` }; }
  }
}

console.log("\nStateful problem:\n");
const c1 = new StatefulCounter(1), c2 = new StatefulCounter(2);
let r = c1.handle("ravi", "login");
console.log(`  Ravi logs in at Counter-1: ${r.msg}`);
r = c2.handle("ravi", "book");
console.log(`  Ravi books at Counter-2: ${r.msg}`);
// Output: FAILS — session is on Counter-1!

class SharedStore {
  constructor() { this.data = new Map(); }
  set(k, v) { this.data.set(k, v); } get(k) { return this.data.get(k); }
}
class StatelessCounter {
  constructor(id, store) { this.id = id; this.store = store; }
  handle(uid, action) {
    if (action === "login") { this.store.set(uid, { cart: [] }); return { ok: true, msg: `Shared session, via Counter-${this.id}` }; }
    const s = this.store.get(uid);
    if (!s) return { ok: false, msg: "No session" };
    if (action === "book") { s.cart.push("Ticket"); return { ok: true, msg: `Booked via Counter-${this.id} (shared)` }; }
  }
}

console.log("\nStateless solution (shared store):\n");
const store = new SharedStore();
const sc1 = new StatelessCounter(1, store), sc2 = new StatelessCounter(2, store);
r = sc1.handle("ravi", "login");
console.log(`  Ravi logs in at Counter-1: ${r.msg}`);
r = sc2.handle("ravi", "book");
console.log(`  Ravi books at Counter-2: ${r.msg}`);
console.log("  Any counter serves any request — true horizontal scaling.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Shared-Nothing Architecture
// ════════════════════════════════════════════════════════════════

// WHY: Each node owns its data partition. No shared disk/memory.
// No contention = linear scalability.

console.log("SECTION 4: Shared-Nothing Architecture");
console.log("-".repeat(50));

class SNCluster {
  constructor(n) {
    this.nodes = Array.from({ length: n }, (_, i) => ({ id: i + 1, data: new Map(), range: [i * Math.ceil(1000 / n), Math.min((i + 1) * Math.ceil(1000 / n), 1000)] }));
  }
  hash(key) { let h = 0; for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) & 0x7fffffff; return h % 1000; }
  route(key) { const h = this.hash(key); return this.nodes.find(n => h >= n.range[0] && h < n.range[1]) || this.nodes[0]; }
  write(key, val) { const n = this.route(key); n.data.set(key, val); return n.id; }
  printDist() { for (const n of this.nodes) console.log(`    Node ${n.id}: ${n.data.size} items ${"#".repeat(n.data.size)}`); }
}

console.log("\nIRCTC: Each counter handles specific PNR ranges.\n");
const sn = new SNCluster(4);
const pnrs = ["PNR-452189", "PNR-283746", "PNR-901234", "PNR-123456", "PNR-678901", "PNR-345678",
  "PNR-890123", "PNR-567890", "PNR-111111", "PNR-222222", "PNR-333333", "PNR-444444"];
for (const pnr of pnrs) console.log(`  ${pnr} -> Node ${sn.write(pnr, { status: "confirmed" })}`);
console.log(); sn.printDist();
console.log("  No shared state = no contention = linear scale.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Session Affinity (Sticky Sessions)
// ════════════════════════════════════════════════════════════════

// WHY: When you can't go stateless, sticky sessions route same-user
// requests to the same server. Compromise between state and scale.

console.log("SECTION 5: Session Affinity (Sticky Sessions)");
console.log("-".repeat(50));

class StickyLB {
  constructor(servers) { this.servers = servers; this.map = new Map(); this.rr = 0; }
  route(uid) {
    if (this.map.has(uid)) {
      const sid = this.map.get(uid);
      const s = this.servers.find(x => x.id === sid && x.healthy);
      if (s) return { server: s.name, type: "sticky" };
      this.map.delete(uid);
    }
    const healthy = this.servers.filter(s => s.healthy);
    const s = healthy[this.rr++ % healthy.length];
    this.map.set(uid, s.id);
    return { server: s.name, type: "new-affinity" };
  }
}

const servers = [{ id: 1, name: "Counter-1", healthy: true }, { id: 2, name: "Counter-2", healthy: true }, { id: 3, name: "Counter-3", healthy: true }];
const lb = new StickyLB(servers);
console.log("\nSticky routing:");
for (const u of ["Ravi", "Priya", "Amit", "Ravi", "Priya", "Ravi"]) {
  const { server, type } = lb.route(u);
  console.log(`  ${u} -> ${server} (${type})`);
}
servers[1].healthy = false;
console.log("Counter-2 fails:");
const { server: newSrv, type: newType } = lb.route("Priya");
console.log(`  Priya (was Counter-2) -> ${newSrv} (${newType})\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Auto-Scaling Policies
// ════════════════════════════════════════════════════════════════

// WHY: Auto-scaling adjusts instance count based on CPU/load metrics.
// Optimizes cost (scale down at night) and availability (scale up).

console.log("SECTION 6: Auto-Scaling Policies");
console.log("-".repeat(50));

class AutoScaler {
  constructor(min, max, capPerInst, upThresh, downThresh) {
    this.min = min; this.max = max; this.cap = capPerInst;
    this.up = upThresh; this.down = downThresh; this.curr = min;
  }
  evaluate(load) {
    const total = this.curr * this.cap;
    const cpu = ((load / total) * 100).toFixed(1);
    let action = "steady";
    if (cpu > this.up && this.curr < this.max) {
      const needed = Math.min(Math.ceil(load / (this.cap * this.up / 100)), this.max);
      action = `scale-up +${needed - this.curr}`; this.curr = needed;
    } else if (cpu < this.down && this.curr > this.min) {
      const needed = Math.max(this.min, Math.ceil(load / (this.cap * this.up / 100)));
      if (needed < this.curr) { action = `scale-down -${this.curr - needed}`; this.curr = needed; }
    }
    return { cpu: cpu + "%", instances: this.curr, action };
  }
}

const as = new AutoScaler(2, 20, 400, 70, 30);
console.log("\nIRCTC 24-hour simulation:\n");
console.log("  Time       | Load  | CPU%  | Instances | Action");
console.log("  " + "-".repeat(55));
const hours = [
  ["00:00 Night", 100], ["04:00 Low", 50], ["08:00 Morning", 600],
  ["10:00 Tatkal!", 3000], ["10:05 Peak", 5000], ["10:30 Post", 2000],
  ["12:00 Afternoon", 800], ["16:00 Evening", 1200], ["20:00 Night", 600], ["23:00 Late", 200],
];
for (const [label, load] of hours) {
  const res = as.evaluate(load);
  console.log(`  ${label.padEnd(16)}| ${String(load).padEnd(5)} | ${res.cpu.padEnd(5)} | ${String(res.instances).padEnd(9)} | ${res.action}`);
}
console.log("\n  Auto-scaling: 20 instances 24/7 = Rs.240K/hr. With auto-scale: ~Rs.60K/hr.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 7 — CAP Theorem Introduction
// ════════════════════════════════════════════════════════════════

// WHY: CAP states a distributed system can only guarantee 2 of 3:
// Consistency, Availability, Partition tolerance.

console.log("SECTION 7: CAP Theorem Introduction");
console.log("-".repeat(50));
console.log(`
       C (Consistency)
      / \\
    CP   CA
    /     \\
   P ─ AP ─ A
`);

const cap = [
  { sys: "IRCTC Booking (CP)", behavior: "Rejects requests during split — no double-booking" },
  { sys: "Zomato Listings (AP)", behavior: "Shows stale data during split — user sees menu, not error" },
  { sys: "SBI ATM (Context)", behavior: "Withdrawals=CP (check balance), Inquiries=AP (stale OK)" },
];
for (const c of cap) console.log(`  ${c.sys}\n    ${c.behavior}\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Scaling Decision Framework
// ════════════════════════════════════════════════════════════════

// WHY: Choosing vertical vs horizontal depends on load, growth,
// team size, cost, and workload nature.

console.log("SECTION 8: Scaling Decision Framework");
console.log("-".repeat(50));

function decide(params) {
  let v = 0, h = 0;
  if (params.rps < 1000) v += 2; else h += 2;
  if (params.growth === "low") v += 1; else h += 2;
  if (params.data === "small") v += 1; else h += 2;
  if (params.team < 5) v += 2; else h += 1;
  if (params.downOk) v += 1; else h += 2;
  return v > h ? "VERTICAL" : "HORIZONTAL";
}

const eras = [
  { name: "IRCTC 2005", rps: 100, growth: "low", data: "small", team: 3, downOk: true },
  { name: "IRCTC 2015", rps: 5000, growth: "high", data: "large", team: 20, downOk: false },
  { name: "IRCTC 2024", rps: 50000, growth: "high", data: "large", team: 100, downOk: false },
];
console.log();
for (const e of eras) console.log(`  ${e.name}: ${decide(e)} (${e.rps} rps, team=${e.team})`);
console.log("\n  IRCTC migrated from single Oracle DB to distributed cloud");
console.log("  after repeated Tatkal crashes.\n");

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log(`
  1. Vertical: simpler but hits hardware ceiling, single point of failure.
  2. Horizontal: complex but unlimited capacity, fault tolerant.
  3. Stateless services: externalize state for true horizontal scaling.
  4. Shared-nothing: each node owns its data — no contention.
  5. Sticky sessions: compromise — works but uneven load.
  6. Auto-scaling: adjusts instances by metrics — saves cost.
  7. CAP theorem: choose CP (consistent) or AP (available) during partitions.
  8. Start vertical, go horizontal beyond ~10K req/s.
`);
console.log('  Station Master\'s wisdom: "One fast clerk cannot replace ten');
console.log('  during Diwali rush. But ten clerks need a good queue manager.');
console.log('  That is the art of scaling."');
console.log();
console.log("=".repeat(70));
