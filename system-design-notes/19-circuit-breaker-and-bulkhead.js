/** ============================================================
 *  FILE 19: CIRCUIT BREAKER AND BULKHEAD
 *  ============================================================
 *  Topic: Circuit breaker states, failure threshold, bulkhead
 *         isolation, timeout, retry, fallback
 *
 *  WHY THIS MATTERS:
 *  In distributed systems, one failing service can cascade and
 *  bring down everything. Circuit breakers stop calling a failing
 *  service, giving it time to recover. Bulkheads isolate failures
 *  so a problem in one area does not sink the entire ship.
 *  ============================================================ */

// STORY: Paytm Payment Gateway
// When YES Bank experienced a moratorium in 2020, Paytm's circuit
// breaker detected failing UPI calls and stopped routing to YES Bank,
// preventing cascading timeouts. Bulkhead isolation ensured SBI, HDFC,
// and ICICI pools continued independently. Users could pay through
// other banks while YES Bank recovered behind the circuit breaker.

console.log("=".repeat(65));
console.log("  FILE 19: CIRCUIT BREAKER AND BULKHEAD");
console.log("  Paytm — circuit breaker on YES Bank, bulkhead per bank");
console.log("=".repeat(65));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Why Circuit Breakers
// ════════════════════════════════════════════════════════════════

// WHY: Without circuit breakers, requests pile up on a failing
// service, consuming threads and causing cascading failure.
console.log("--- Section 1: Why Circuit Breakers ---\n");

console.log("Without Circuit Breaker — 10 calls to failing YES Bank:");
let totalWait = 0;
for (let i = 0; i < 10; i++) totalWait += 30000; // each waits 30s for timeout
console.log(`  10 timeouts x 30s = ${totalWait/1000}s total wasted!`);
console.log("  Meanwhile SBI/HDFC calls slow due to thread starvation.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Circuit Breaker States (Closed/Open/Half-Open)
// ════════════════════════════════════════════════════════════════

// WHY: Three states control the flow of requests.
console.log("--- Section 2: Circuit Breaker States ---\n");

console.log("  CLOSED  --[failure threshold]--> OPEN  --[timeout]--> HALF-OPEN");
console.log("  HALF-OPEN --[success]--> CLOSED");
console.log("  HALF-OPEN --[failure]--> OPEN\n");
console.log("  CLOSED: normal, count failures. OPEN: fast-fail all.");
console.log("  HALF-OPEN: let one probe through to test recovery.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Circuit Breaker Implementation
// ════════════════════════════════════════════════════════════════

// WHY: Track failures, transition states, provide fast-fail.
console.log("--- Section 3: Circuit Breaker Implementation ---\n");

class CircuitBreaker {
  constructor(name, opts = {}) {
    this.name = name; this.state = "CLOSED"; this.failureCount = 0;
    this.successCount = 0; this.failThreshold = opts.failThreshold || 5;
    this.successThreshold = opts.successThreshold || 3;
    this.resetTimeoutMs = opts.resetTimeoutMs || 30000;
    this.lastFailTime = 0; this.halfOpenAttempts = 0;
    this.simTime = 0; this.history = [];
    this.logTransition("CLOSED", "initial");
  }
  logTransition(to, reason) { this.history.push({ from: this.state, to, reason }); this.state = to; }
  canExecute() {
    if (this.state === "CLOSED") return true;
    if (this.state === "OPEN") {
      if (this.simTime - this.lastFailTime >= this.resetTimeoutMs) {
        this.logTransition("HALF_OPEN", "reset timeout elapsed"); this.halfOpenAttempts = 0; return true;
      }
      return false;
    }
    return true; // HALF_OPEN
  }
  recordSuccess() {
    this.successCount++;
    if (this.state === "HALF_OPEN") {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.successThreshold) {
        this.failureCount = 0; this.logTransition("CLOSED", `${this.successThreshold} successes`);
      }
    }
  }
  recordFailure() {
    this.failureCount++; this.lastFailTime = this.simTime;
    if (this.state === "HALF_OPEN") this.logTransition("OPEN", "failure in half-open");
    else if (this.failureCount >= this.failThreshold) this.logTransition("OPEN", `${this.failThreshold} failures`);
  }
  execute(fn) {
    if (!this.canExecute()) return { status: "CIRCUIT_OPEN" };
    const result = fn();
    result.success ? this.recordSuccess() : this.recordFailure();
    return result;
  }
  advanceTime(ms) { this.simTime += ms; }
}

const yesCB = new CircuitBreaker("YES-Bank-UPI", { failThreshold: 3, successThreshold: 2, resetTimeoutMs: 5000 });

console.log("Paytm CB for YES Bank:\n");
console.log("  Phase 1: YES Bank failing");
for (let i = 0; i < 5; i++) {
  const r = yesCB.execute(() => ({ success: false }));
  console.log(`    Req ${i+1}: state=${yesCB.state}, result=${r.status || "FAILURE"}`);
}

console.log("\n  Phase 2: Circuit OPEN — fast-fail");
for (let i = 0; i < 3; i++) {
  const r = yesCB.execute(() => ({ success: true }));
  console.log(`    Req ${i+6}: state=${yesCB.state}, result=${r.status}`);
}

console.log("\n  Phase 3: Wait 5s, probe (HALF_OPEN)");
yesCB.advanceTime(5000);
for (let i = 0; i < 2; i++) {
  const r = yesCB.execute(() => ({ success: true }));
  console.log(`    Probe ${i+1}: state=${yesCB.state}, result=${r.status || "SUCCESS"}`);
}

console.log("\n  State transitions:");
yesCB.history.forEach(h => console.log(`    ${h.from} -> ${h.to}: ${h.reason}`));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Bulkhead Pattern (Thread Pool Isolation)
// ════════════════════════════════════════════════════════════════

// WHY: Isolate resources so one failing partition cannot affect others.
console.log("--- Section 4: Bulkhead Pattern ---\n");

class BulkheadPool {
  constructor(name, maxConcurrent, queueSize) {
    this.name = name; this.maxConcurrent = maxConcurrent; this.queueSize = queueSize;
    this.active = 0; this.queued = 0; this.completed = 0; this.rejected = 0;
  }
  submit(task) {
    if (this.active < this.maxConcurrent) {
      this.active++;
      try { task(); this.completed++; } catch(e) { /* failure */ }
      this.active--;
      return "EXECUTED";
    }
    if (this.queued < this.queueSize) { this.queued++; return "QUEUED"; }
    this.rejected++; return "REJECTED";
  }
  getStats() { return { pool: this.name, active: this.active, completed: this.completed, rejected: this.rejected }; }
}

const sbiPool = new BulkheadPool("SBI", 5, 3);
const yesPool = new BulkheadPool("YES-Bank", 3, 2);

console.log("SBI Pool (cap=5, queue=3):");
for (let i = 0; i < 7; i++) console.log(`  Task ${i}: ${sbiPool.submit(() => "ok")}`);
console.log(`  Stats: ${JSON.stringify(sbiPool.getStats())}`);

console.log("\nYES Bank Pool (cap=3, queue=2) — overloaded:");
for (let i = 0; i < 8; i++) {
  const r = yesPool.submit(() => { throw new Error("timeout"); });
  console.log(`  Task ${i}: ${r}`);
}
console.log(`  Stats: ${JSON.stringify(yesPool.getStats())}`);
console.log(`\n  YES Bank isolated — SBI unaffected: ${JSON.stringify(sbiPool.getStats())}\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Timeout Pattern
// ════════════════════════════════════════════════════════════════

// WHY: Without timeouts, a hanging service ties up resources indefinitely.
console.log("--- Section 5: Timeout Pattern ---\n");

class TimeoutWrapper {
  constructor(timeoutMs) { this.timeoutMs = timeoutMs; this.stats = { success: 0, timeout: 0 }; }
  execute(name, latency, fn) {
    if (latency > this.timeoutMs) { this.stats.timeout++; return { status: "TIMEOUT", name, latency }; }
    this.stats.success++; return { status: "SUCCESS", name, data: fn() };
  }
}

const timeout = new TimeoutWrapper(2000);
[{ name: "SBI-UPI", lat: 800 }, { name: "HDFC-UPI", lat: 1500 }, { name: "YES-UPI", lat: 5000 },
 { name: "ICICI-UPI", lat: 1900 }, { name: "YES-NEFT", lat: 15000 }
].forEach(op => {
  const r = timeout.execute(op.name, op.lat, () => "OK");
  console.log(`  ${op.name}: ${r.status} (${op.lat}ms, limit: 2000ms)`);
});
console.log(`  Stats: ${JSON.stringify(timeout.stats)}\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Retry with Backoff
// ════════════════════════════════════════════════════════════════

// WHY: Transient failures recover with retries. Backoff avoids
// overwhelming a recovering service.
console.log("--- Section 6: Retry with Backoff ---\n");

class RetryHandler {
  constructor(maxRetries, baseMs, maxMs) { this.maxRetries = maxRetries; this.baseMs = baseMs; this.maxMs = maxMs; }
  calcDelay(attempt) { return Math.min(this.maxMs, this.baseMs * Math.pow(2, attempt)) + (attempt * 137 + 42) % 100; }
  execute(name, failUntil) {
    const attempts = [];
    for (let a = 0; a <= this.maxRetries; a++) {
      const delay = a > 0 ? this.calcDelay(a-1) : 0;
      const ok = a >= failUntil;
      attempts.push({ attempt: a+1, delay, success: ok });
      if (ok) return { name, status: "SUCCESS", attempts: a+1, totalDelay: attempts.reduce((s,x)=>s+x.delay,0), log: attempts };
    }
    return { name, status: "EXHAUSTED", attempts: this.maxRetries+1, log: attempts };
  }
}

const retry = new RetryHandler(4, 200, 5000);

const r1 = retry.execute("YES-Bank-Payment", 2);
console.log(`  ${r1.name}: ${r1.status} after ${r1.attempts} attempts`);
r1.log.forEach(a => console.log(`    Attempt ${a.attempt}: ${a.success?"OK":"FAIL"} (delay: ${a.delay}ms)`));

const r2 = retry.execute("YES-Bank-Balance", 99);
console.log(`\n  ${r2.name}: ${r2.status} after ${r2.attempts} attempts`);

const r3 = retry.execute("SBI-Payment", 0);
console.log(`  ${r3.name}: ${r3.status} on first attempt\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Fallback Strategies
// ════════════════════════════════════════════════════════════════

// WHY: When primary fails and retries exhausted, fallback provides
// degraded but functional experience.
console.log("--- Section 7: Fallback Strategies ---\n");

class FallbackChain {
  constructor(name) { this.name = name; this.strategies = []; }
  add(name, fn) { this.strategies.push({ name, fn }); return this; }
  execute() {
    for (const s of this.strategies) {
      try { const r = s.fn(); if (r.success) return { status: "OK", via: s.name, data: r.data }; } catch(e) { /* next */ }
    }
    return { status: "ALL_FAILED" };
  }
}

const fb = new FallbackChain("Paytm-Payment");
fb.add("YES-Bank-UPI", () => { throw new Error("moratorium"); })
  .add("SBI-UPI", () => ({ success: true, data: "Paid via SBI UPI" }))
  .add("Paytm-Wallet", () => ({ success: true, data: "Paid via Wallet" }));

const fbr = fb.execute();
console.log(`  Result: ${fbr.status} via "${fbr.via}" -> ${fbr.data}`);

const scenarios = [
  { name: "All healthy", chain: new FallbackChain("h").add("YES", () => ({ success: true, data: "YES OK" })) },
  { name: "Primary down", chain: new FallbackChain("p").add("YES", () => { throw new Error(); }).add("HDFC", () => ({ success: true, data: "HDFC fallback" })) },
  { name: "All down", chain: new FallbackChain("a").add("YES", () => { throw new Error(); }).add("SBI", () => { throw new Error(); }).add("cache", () => ({ success: true, data: "cached: pending" })) },
];
scenarios.forEach(s => { const r = s.chain.execute(); console.log(`  ${s.name}: "${r.via}" -> ${r.data}`); });
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Combining Patterns (Resilience Pipeline)
// ════════════════════════════════════════════════════════════════

// WHY: In production, combine CB + bulkhead + timeout + retry + fallback.
console.log("--- Section 8: Resilience Pipeline ---\n");

class ResiliencePipeline {
  constructor(name, opts = {}) {
    this.name = name;
    this.cb = new CircuitBreaker(`${name}-CB`, { failThreshold: opts.cbThreshold || 3, successThreshold: 2, resetTimeoutMs: 5000 });
    this.bh = new BulkheadPool(`${name}-BH`, opts.maxConcurrent || 5, 3);
    this.timeoutMs = opts.timeoutMs || 2000;
    this.fallbackFn = opts.fallback || null;
    this.metrics = { success: 0, cbOpen: 0, timeout: 0, fallback: 0 };
  }
  execute(latency, fn) {
    if (!this.cb.canExecute()) {
      this.metrics.cbOpen++;
      if (this.fallbackFn) { this.metrics.fallback++; return { status: "FALLBACK", reason: "circuit-open", data: this.fallbackFn() }; }
      return { status: "REJECTED", reason: "circuit-open" };
    }
    if (latency > this.timeoutMs) {
      this.cb.recordFailure(); this.metrics.timeout++;
      if (this.fallbackFn) { this.metrics.fallback++; return { status: "FALLBACK", reason: "timeout", data: this.fallbackFn() }; }
      return { status: "TIMEOUT" };
    }
    this.cb.recordSuccess(); this.metrics.success++;
    return { status: "SUCCESS", data: fn() };
  }
  advanceTime(ms) { this.cb.advanceTime(ms); }
}

const sbiPipe = new ResiliencePipeline("SBI", { fallback: () => "SBI queued" });
const yesPipe = new ResiliencePipeline("YES", { cbThreshold: 3, maxConcurrent: 3, fallback: () => "route to SBI" });

console.log("  SBI Pipeline — healthy:");
for (let i = 0; i < 5; i++) {
  const r = sbiPipe.execute(500, () => `SBI payment ${i} OK`);
  console.log(`    Req ${i}: ${r.status} — ${r.data}`);
}

console.log("\n  YES Bank Pipeline — failing:");
for (let i = 0; i < 6; i++) {
  const r = yesPipe.execute(5000, () => "YES OK");
  console.log(`    Req ${i}: ${r.status} (${r.reason||"ok"}) CB=${yesPipe.cb.state}`);
}

yesPipe.advanceTime(5000);
console.log("\n  After 5s — probe:");
const probe = yesPipe.execute(500, () => "YES recovered!");
console.log(`    Probe: ${probe.status} — ${probe.data}`);

console.log(`\n  SBI metrics: ${JSON.stringify(sbiPipe.metrics)}`);
console.log(`  YES metrics: ${JSON.stringify(yesPipe.metrics)}`);

// Pattern comparison summary
console.log("\n  Pattern Comparison Summary:");
console.log("  Pattern          Purpose                    When to Use");
console.log("  " + "-".repeat(62));
console.log("  Circuit Breaker  Stop calling failing svc   Downstream dependency fails");
console.log("  Bulkhead         Isolate resource pools     Multiple downstream services");
console.log("  Timeout          Bound max wait time        Slow/hanging dependencies");
console.log("  Retry            Recover transient errors   Network glitches, 503s");
console.log("  Fallback         Degraded functionality     All else fails");
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════
console.log("=".repeat(65));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(65));
console.log(`
  1. Circuit breakers detect failures and fast-fail, preventing
     cascading failures across the system.
  2. Three states: CLOSED (normal), OPEN (fast-fail), HALF-OPEN
     (probing) with configurable thresholds.
  3. Bulkhead isolates resource pools — one failing dependency
     cannot consume all available resources.
  4. Timeout bounds maximum wait, preventing indefinite hangs.
  5. Retry with backoff recovers transient failures without
     overwhelming a recovering service.
  6. Fallback provides degraded but functional service when
     primary fails — cache, alternate provider, or queue.
  7. Combine into a pipeline: CB -> Bulkhead -> Timeout ->
     Retry -> Fallback.
  8. Monitor CB state transitions and bulkhead saturation.

  Paytm Wisdom: "When one bank goes down, the payment must still
  flow — resilience is not optional, it is the product itself."
`);
