/** ============================================================
 *  FILE 33: CONTAINERS AND DEPLOYMENT STRATEGIES
 *  ============================================================
 *  Topic: Containers, blue-green, canary, rolling update,
 *         feature flags, rollback mechanisms
 *
 *  WHY THIS MATTERS:
 *  Deploying code to production is where engineering meets risk.
 *  A bad deploy can cost millions per minute of downtime. Modern
 *  strategies like canary and blue-green minimize blast radius,
 *  enabling teams to ship 10-50 times per day with confidence.
 *  ============================================================ */

// STORY: Flipkart Big Billion Days Deploy
// During BBD 2023, Flipkart needed to deploy a checkout optimization
// for 10x traffic. They used canary: 5% traffic in Bengaluru DC got
// the new version. When canary showed a 2% error spike in payment
// callbacks, automated rollback kicked in within 90 seconds — saving
// an estimated Rs 50 crore in potential lost transactions.

console.log("=".repeat(70));
console.log("  FILE 33: CONTAINERS AND DEPLOYMENT STRATEGIES");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Container Concepts Simulation
// ════════════════════════════════════════════════════════════════

// WHY: Containers package code + deps into isolated units, solving
// "works on my machine" and enabling consistent deploys.
console.log("SECTION 1: Container Concepts Simulation");
console.log("-".repeat(50));

class Container {
  constructor(image, version, cpu = "2", mem = "4Gi") {
    this.id = `ctr-${(Math.random()*1e6|0).toString(36)}`;
    this.image = image; this.version = version;
    this.cpu = cpu; this.mem = mem;
    this.status = "created";
    this.metrics = { requests: 0, errors: 0 };
  }
  start() { this.status = "running"; return this; }
  stop() { this.status = "stopped"; return this; }
  isHealthy() { return this.status === "running" && this.metrics.errors / Math.max(this.metrics.requests, 1) < 0.05; }
  simulateTraffic(n) {
    for (let i = 0; i < n; i++) { this.metrics.requests++; if (Math.random() < 0.01) this.metrics.errors++; }
  }
  toString() { return `[${this.id}] ${this.image}:${this.version} (${this.status})`; }
}

class ContainerRegistry {
  constructor() { this.images = new Map(); }
  push(name, ver, size) {
    this.images.set(`${name}:${ver}`, { name, ver, size, digest: `sha256:${(Math.random()*1e10|0).toString(36)}` });
  }
  list(name) { return [...this.images.values()].filter(i => i.name === name); }
}

const registry = new ContainerRegistry();
registry.push("flipkart/checkout", "v3.2.0", 245e6);
registry.push("flipkart/checkout", "v3.3.0", 250e6);

console.log("\n  Registry:");
registry.list("flipkart/checkout").forEach(i => console.log(`    ${i.name}:${i.ver} (${(i.size/1e6)|0}MB)`));

const ctrs = [1,2,3].map(() => new Container("flipkart/checkout", "v3.2.0").start());
console.log("\n  Running containers:");
ctrs.forEach(c => console.log(`    ${c}`));

console.log("\n  Container vs VM:");
[["Startup","ms","minutes"],["Size","MBs","GBs"],["Isolation","Process","Hardware"],["Density","100s/host","10s/host"]].forEach(
  ([a,c,v]) => console.log(`    ${a.padEnd(14)} Container: ${c.padEnd(14)} VM: ${v}`)
);
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Blue-Green Deployment
// ════════════════════════════════════════════════════════════════

// WHY: Blue-green keeps old version running. Instant rollback via LB switch.
console.log("SECTION 2: Blue-Green Deployment");
console.log("-".repeat(50));

class BlueGreenDeploy {
  constructor(service, count = 3) {
    this.service = service; this.count = count;
    this.blue = { instances: [], version: null, active: false };
    this.green = { instances: [], version: null, active: false };
    this.active = null;
  }

  _log(msg) { console.log(`    [BG] ${msg}`); }

  deployInitial(ver) {
    this.blue.instances = Array.from({length: this.count}, () => new Container(this.service, ver).start());
    this.blue.version = ver; this.blue.active = true; this.active = this.blue;
    this._log(`Initial: ${ver} on BLUE (${this.count} instances)`);
  }

  deployNew(ver) {
    const inactive = this.active === this.blue ? this.green : this.blue;
    const name = inactive === this.blue ? "BLUE" : "GREEN";
    this._log(`Deploy ${ver} to ${name}`);
    inactive.instances = Array.from({length: this.count}, () => new Container(this.service, ver).start());
    inactive.instances.forEach(c => c.simulateTraffic(100));
    inactive.version = ver;
    if (!inactive.instances.every(c => c.isHealthy())) { this._log("ABORT: health check failed"); return false; }
    this._log("Health check passed");
    this.active.active = false; inactive.active = true; this.active = inactive;
    this._log(`Traffic switched to ${name} (${ver})`);
    return true;
  }

  rollback() {
    const fallback = this.active === this.blue ? this.green : this.blue;
    if (!fallback.version) { this._log("No previous version!"); return false; }
    this._log(`ROLLBACK: ${this.active.version} -> ${fallback.version}`);
    this.active.active = false; fallback.active = true; this.active = fallback;
    this._log(`Restored to ${fallback.version}`);
    return true;
  }

  status() {
    return { blue: { ver: this.blue.version, active: this.blue.active },
             green: { ver: this.green.version, active: this.green.active } };
  }
}

console.log("\n  Blue-Green deploy:");
const bg = new BlueGreenDeploy("flipkart/checkout", 3);
bg.deployInitial("v3.2.0");
console.log(`    Status: ${JSON.stringify(bg.status())}`);
bg.deployNew("v3.3.0");
console.log(`    Status: ${JSON.stringify(bg.status())}`);
console.log("\n  Issue detected — rollback:");
bg.rollback();
console.log(`    Status: ${JSON.stringify(bg.status())}`);
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Canary Deployment with Traffic Splitting
// ════════════════════════════════════════════════════════════════

// WHY: Canary sends small % to new version. Only that % is affected if bad.
console.log("SECTION 3: Canary Deployment");
console.log("-".repeat(50));

class CanaryDeploy {
  constructor(service, total = 20) {
    this.service = service; this.total = total;
    this.stableVer = null; this.canaryVer = null;
    this.stableInst = []; this.canaryInst = []; this.canaryPct = 0;
    this.metrics = { stable: { reqs: 0, errs: 0 }, canary: { reqs: 0, errs: 0 } };
  }
  _log(msg) { console.log(`    [Canary] ${msg}`); }

  deployStable(ver) {
    this.stableVer = ver;
    this.stableInst = Array.from({length: this.total}, () => new Container(this.service, ver).start());
    this._log(`Stable: ${ver} on ${this.total} instances`);
  }

  startCanary(ver, pct = 5) {
    this.canaryVer = ver; this.canaryPct = pct;
    const n = Math.max(1, Math.ceil(this.total * pct / 100));
    this.canaryInst = Array.from({length: n}, () => new Container(this.service, ver).start());
    this._log(`Canary: ${ver} at ${pct}% (${n} instances)`);
  }

  simulateTraffic(total) {
    const canaryReqs = Math.floor(total * this.canaryPct / 100);
    this.metrics.stable.reqs += total - canaryReqs;
    this.metrics.stable.errs += Math.floor((total - canaryReqs) * 0.005);
    this.metrics.canary.reqs += canaryReqs;
  }

  injectCanaryErrors(rate) { this.metrics.canary.errs = Math.floor(this.metrics.canary.reqs * rate); }

  analyze() {
    const sErr = this.metrics.stable.reqs > 0 ? +(this.metrics.stable.errs/this.metrics.stable.reqs*100).toFixed(2) : 0;
    const cErr = this.metrics.canary.reqs > 0 ? +(this.metrics.canary.errs/this.metrics.canary.reqs*100).toFixed(2) : 0;
    const diff = +(cErr - sErr).toFixed(2);
    const verdict = diff > 1.0 ? "ROLLBACK" : diff > 0.5 ? "HOLD" : "PROMOTE";
    return { stableErr: sErr, canaryErr: cErr, diff, verdict };
  }

  promote(pct) {
    this.canaryPct = pct;
    const n = Math.ceil(this.total * pct / 100);
    while (this.canaryInst.length < n) this.canaryInst.push(new Container(this.service, this.canaryVer).start());
    this._log(`Promoted canary to ${pct}% (${n} instances)`);
  }

  fullRollout() {
    this.stableInst.forEach(c => c.stop());
    this.stableVer = this.canaryVer;
    this.stableInst = [...this.canaryInst];
    while (this.stableInst.length < this.total) this.stableInst.push(new Container(this.service, this.stableVer).start());
    this.canaryInst = []; this.canaryPct = 0; this.canaryVer = null;
    this._log(`Full rollout: ${this.stableVer} on all ${this.total}`);
  }

  rollbackCanary() {
    this._log(`ROLLBACK: killing canary ${this.canaryVer}`);
    this.canaryInst.forEach(c => c.stop());
    this.canaryInst = []; this.canaryPct = 0; this.canaryVer = null;
    this._log(`100% traffic restored to stable ${this.stableVer}`);
  }
}

console.log("\n  Flipkart BBD Canary:");
const canary = new CanaryDeploy("flipkart/checkout", 20);
canary.deployStable("v3.2.0");
canary.startCanary("v3.3.0", 5);
canary.simulateTraffic(10000);
let a = canary.analyze();
console.log(`    Analysis: stable=${a.stableErr}% canary=${a.canaryErr}% -> ${a.verdict}`);

canary.promote(25);
canary.simulateTraffic(10000);

console.log("\n  Simulating error spike:");
canary.injectCanaryErrors(0.035);
a = canary.analyze();
console.log(`    Analysis: stable=${a.stableErr}% canary=${a.canaryErr}% diff=${a.diff}% -> ${a.verdict}`);
if (a.verdict === "ROLLBACK") canary.rollbackCanary();
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Rolling Update Strategy
// ════════════════════════════════════════════════════════════════

// WHY: Rolling replaces instances batch-by-batch. No extra infra needed.
console.log("SECTION 4: Rolling Update Strategy");
console.log("-".repeat(50));

class RollingUpdate {
  constructor(service, count = 10) {
    this.service = service;
    this.instances = Array.from({length: count}, (_, i) => ({ id: i, version: null, status: "pending" }));
    this.maxUnavail = 2;
  }

  deployInitial(ver) {
    this.instances.forEach(i => { i.version = ver; i.status = "running"; });
    console.log(`    [Rolling] Initial: all ${this.instances.length} on ${ver}`);
  }

  update(newVer, failAt = -1) {
    console.log(`    [Rolling] Updating to ${newVer} (batch=${this.maxUnavail})`);
    const batches = Math.ceil(this.instances.length / this.maxUnavail);
    for (let b = 0; b < batches; b++) {
      const start = b * this.maxUnavail;
      const end = Math.min(start + this.maxUnavail, this.instances.length);
      console.log(`      Batch ${b+1}/${batches}: instances ${start}-${end-1}`);
      let failed = false;
      for (let i = start; i < end; i++) {
        if (this.instances[i].id === failAt) {
          this.instances[i].status = "failed"; this.instances[i].version = newVer;
          console.log(`      FAILURE at instance ${i}!`);
          failed = true;
        } else {
          this.instances[i].version = newVer; this.instances[i].status = "running";
        }
      }
      if (failed) {
        console.log("      Auto-rollback triggered");
        const prev = this.instances.find(x => x.version !== newVer && x.status === "running");
        const rbVer = prev ? prev.version : "v3.2.0";
        this.instances.forEach(x => { if (x.version === newVer || x.status === "failed") x.version = rbVer; x.status = "running"; });
        console.log(`      Rolled back to ${rbVer}`);
        return false;
      }
    }
    console.log(`    [Rolling] Complete: all on ${newVer}`);
    return true;
  }

  status() {
    const counts = {};
    this.instances.forEach(i => { const k = `${i.version}(${i.status})`; counts[k] = (counts[k]||0)+1; });
    return counts;
  }
}

console.log("\n  Successful rolling update:");
const r1 = new RollingUpdate("flipkart/cart", 8);
r1.deployInitial("v2.1.0");
r1.update("v2.2.0");
console.log(`    Final: ${JSON.stringify(r1.status())}`);

console.log("\n  Rolling update with failure:");
const r2 = new RollingUpdate("flipkart/cart", 8);
r2.deployInitial("v2.1.0");
r2.update("v2.2.0", 5);
console.log(`    Final: ${JSON.stringify(r2.status())}`);
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Feature Flags Implementation
// ════════════════════════════════════════════════════════════════

// WHY: Feature flags decouple deploy from release. Deploy to all
// servers but enable for 0% or specific users/cities.
console.log("SECTION 5: Feature Flags");
console.log("-".repeat(50));

class FeatureFlagService {
  constructor() { this.flags = new Map(); this.log = []; }

  create(name, config) {
    this.flags.set(name, { enabled: config.enabled || false, pct: config.pct || 0,
      users: config.users || [], cities: config.cities || [] });
  }

  evaluate(name, ctx = {}) {
    const f = this.flags.get(name);
    if (!f) return { on: false, reason: "not_found" };
    if (!f.enabled) return { on: false, reason: "disabled" };
    if (f.users.length && ctx.userId && f.users.includes(ctx.userId)) return { on: true, reason: "user_targeted" };
    if (f.cities.length && ctx.city && f.cities.includes(ctx.city)) return { on: true, reason: "city_targeted" };
    if (f.pct > 0 && ctx.userId) {
      let h = 0; for (const c of ctx.userId + name) h = ((h << 5) - h) + c.charCodeAt(0) & 0x7fffffff;
      return { on: (h % 100) < f.pct, reason: `pct_rollout(${h%100})` };
    }
    return { on: f.enabled && f.pct === 100, reason: "default" };
  }
}

const ff = new FeatureFlagService();
ff.create("bbd_flash_banner", { enabled: true, pct: 100 });
ff.create("new_checkout_flow", { enabled: true, pct: 20, cities: ["bengaluru"] });
ff.create("ai_recs_v2", { enabled: true, users: ["vip_001"], pct: 10 });
ff.create("crypto_pay", { enabled: false });

const users = [
  { userId: "vip_001", city: "mumbai" }, { userId: "user_42", city: "bengaluru" },
  { userId: "user_88", city: "delhi" }, { userId: "user_99", city: "chennai" }
];
const flagNames = ["bbd_flash_banner", "new_checkout_flow", "ai_recs_v2", "crypto_pay"];

console.log("\n  " + "User".padEnd(16) + "City".padEnd(14) + flagNames.map(f => f.substring(0,12).padEnd(14)).join(""));
users.forEach(u => {
  const results = flagNames.map(f => (ff.evaluate(f, u).on ? "ON" : "OFF").padEnd(14));
  console.log(`  ${u.userId.padEnd(16)}${u.city.padEnd(14)}${results.join("")}`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Rollback Mechanisms
// ════════════════════════════════════════════════════════════════

// WHY: Every deploy needs a rollback plan. Speed varies by strategy.
console.log("SECTION 6: Rollback Mechanisms");
console.log("-".repeat(50));

class RollbackManager {
  constructor() { this.history = []; this.current = null; }

  recordDeploy(ver, strategy) { this.history.push({ ver, strategy, status: "active" }); this.current = ver; }

  rollback(reason) {
    const prev = this.history.filter(d => d.ver !== this.current && d.status !== "rolled_back").pop();
    if (!prev) { console.log("    No previous version!"); return; }
    console.log(`    [Rollback] ${this.current} -> ${prev.ver} (reason: ${reason})`);
    this.history[this.history.length - 1].status = "rolled_back";
    this.current = prev.ver;
    const steps = {
      "blue-green": ["Switch LB (<1s)", "Old env becomes standby"],
      "canary": ["Stop canary traffic", "Terminate canary pods", "100% to stable"],
      "rolling": ["Re-roll batch by batch", "Health check each batch"]
    };
    (steps[prev.strategy] || ["Redeploy"]).forEach((s, i) => console.log(`      ${i+1}. ${s}`));
  }
}

const rbm = new RollbackManager();
rbm.recordDeploy("v3.1.0", "rolling");
rbm.recordDeploy("v3.2.0", "canary");
rbm.recordDeploy("v3.3.0", "blue-green");

console.log("\n  Deploy history:", rbm.history.map(d => `${d.ver}(${d.strategy})`).join(" -> "));
rbm.rollback("Payment error rate exceeded 2%");
console.log(`  Current: ${rbm.current}`);

console.log("\n  Rollback Speed Comparison:");
[["Blue-Green","<1s","Very Low","2x cost"],["Canary","<30s","Low","Small"],
 ["Rolling","1-10min","Medium","Minimal"],["Feature Flag","Instant","Very Low","Flag svc"]].forEach(
  ([s,spd,risk,cost]) => console.log(`    ${s.padEnd(16)}${spd.padEnd(14)}Risk: ${risk.padEnd(14)}Cost: ${cost}`)
);
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Deployment Pipeline Simulation
// ════════════════════════════════════════════════════════════════

// WHY: Pipelines automate the path from commit to production.
console.log("SECTION 7: Deployment Pipeline");
console.log("-".repeat(50));

class Pipeline {
  constructor(service) { this.service = service; this.stages = []; }
  addStage(name, action) { this.stages.push({ name, action, status: "pending" }); }
  run(version) {
    console.log(`\n  Pipeline: ${this.service} ${version}`);
    let artifacts = { version };
    for (let i = 0; i < this.stages.length; i++) {
      const s = this.stages[i];
      const result = s.action(artifacts);
      s.status = result.ok ? "pass" : "fail";
      console.log(`    ${i+1}. [${s.status.toUpperCase()}] ${s.name}: ${result.msg}`);
      if (result.artifacts) Object.assign(artifacts, result.artifacts);
      if (!result.ok) { console.log("    Pipeline FAILED"); return false; }
    }
    console.log("    Pipeline SUCCESS");
    return true;
  }
}

const pipe = new Pipeline("flipkart/checkout");
pipe.addStage("Lint + Static Analysis", () => ({ ok: true, msg: "0 issues" }));
pipe.addStage("Unit Tests", () => ({ ok: true, msg: "1247 passed, 87% coverage" }));
pipe.addStage("Integration Tests", () => ({ ok: true, msg: "342 passed" }));
pipe.addStage("Build Image", (a) => ({ ok: true, msg: `${a.version} (247MB)`, artifacts: { image: `flipkart/checkout:${a.version}` } }));
pipe.addStage("Security Scan", () => ({ ok: true, msg: "0 critical CVEs" }));
pipe.addStage("Deploy Staging", (a) => ({ ok: true, msg: `${a.image} on staging` }));
pipe.addStage("Smoke Tests", () => ({ ok: true, msg: "Health OK, API validated" }));
pipe.addStage("Canary 5%", (a) => ({ ok: true, msg: `5% traffic to ${a.image}` }));
pipe.addStage("Canary Validation", () => ({ ok: true, msg: "err=0.3%, p99=95ms" }));
pipe.addStage("Full Rollout", (a) => ({ ok: true, msg: `${a.image} on all instances` }));
pipe.run("v3.3.0");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Deployment Strategy Comparison
// ════════════════════════════════════════════════════════════════

// WHY: No single strategy fits all. Choice depends on risk, budget, change type.
console.log("SECTION 8: Deployment Strategy Comparison");
console.log("-".repeat(50));

const strategies = [
  { name: "Recreate", how: "Stop all -> Start all", down: "Yes", rb: "Slow", cost: "1x", best: "Dev/staging" },
  { name: "Rolling", how: "Batch-by-batch replace", down: "No", rb: "Slow", cost: "1x+surge", best: "K8s default" },
  { name: "Blue-Green", how: "Two envs, switch LB", down: "No", rb: "Instant", cost: "2x", best: "Critical services" },
  { name: "Canary", how: "Small % first, grow", down: "No", rb: "Fast", cost: "1x+small", best: "User-facing" },
  { name: "Feature Flag", how: "Deploy code, toggle", down: "No", rb: "Instant", cost: "1x", best: "A/B tests" }
];

console.log("\n  " + "Strategy".padEnd(14) + "Downtime".padEnd(10) + "Rollback".padEnd(10) + "Cost".padEnd(12) + "Best For");
strategies.forEach(s => console.log(`  ${s.name.padEnd(14)}${s.down.padEnd(10)}${s.rb.padEnd(10)}${s.cost.padEnd(12)}${s.best}`));

console.log("\n  Decision Tree:");
console.log("    Critical revenue service?");
console.log("    |-- YES: Afford 2x infra? -> Blue-Green : Canary");
console.log("    |-- NO:  Need zero-downtime? -> Rolling : Recreate");
console.log("    Always consider: Feature Flags for user-facing changes");
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log(`
  1. Containers standardize packaging: same image in dev and prod.
  2. Blue-green gives instant rollback at 2x cost: switch at LB.
  3. Canary limits blast radius: 5% see new version; auto-analyze.
  4. Rolling is the default: batch replace, no extra infra needed.
  5. Feature flags decouple deploy from release: toggle remotely.
  6. Every deploy needs a rollback plan: not IF, but WHEN and HOW FAST.
  7. Pipelines automate safety: lint, test, scan, stage, canary, promote.
  8. Match strategy to risk: canary for BBD, rolling for regular services.
`);
console.log('  "During BBD, we deploy 200+ times a day. Each deploy is');
console.log('   a calculated risk — canary and feature flags are our');
console.log('   safety nets over a revenue tightrope."');
console.log("   - Flipkart Platform Engineering");
console.log();
console.log("=".repeat(70));
console.log("  END OF FILE 33");
console.log("=".repeat(70));
