/** ============================================================
 *  FILE 18: RATE LIMITING AND THROTTLING
 *  ============================================================
 *  Topic: Token bucket, leaky bucket, fixed/sliding window,
 *         distributed rate limiting, exponential backoff
 *
 *  WHY THIS MATTERS:
 *  Without rate limiting, a single misbehaving client can bring
 *  down an entire API. Rate limiting protects services from abuse,
 *  ensures fair resource sharing, and prevents cascading failures.
 *  Every production API relies on rate limiting for stability.
 *  ============================================================ */

// STORY: Aadhaar eKYC API
// India's UIDAI operates the Aadhaar eKYC API, used by banks and
// telecoms to verify identity. Each entity (SBI, HDFC, Jio) is
// limited to 1000 calls/min. Exceeding the quota returns HTTP 429,
// requiring exponential backoff. This prevents any single bank from
// overwhelming infrastructure serving 1.4 billion identities.

console.log("=".repeat(65));
console.log("  FILE 18: RATE LIMITING AND THROTTLING");
console.log("  Aadhaar eKYC API — UIDAI limits each bank to 1000/min");
console.log("=".repeat(65));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Why Rate Limit
// ════════════════════════════════════════════════════════════════

// WHY: Protects backend, ensures fairness, prevents abuse.
console.log("--- Section 1: Why Rate Limit ---\n");

class SimpleServer {
  constructor(max) { this.max = max; this.load = 0; this.served = 0; this.rejected = 0; }
  handle() {
    if (this.load >= this.max) { this.rejected++; return 503; }
    this.load++; this.served++; this.load--; return 200;
  }
}

const server = new SimpleServer(5);
for (let i = 0; i < 20; i++) { server.load = Math.min(server.load + 1, 8); server.handle(); }
server.load = 0;
console.log(`Without rate limiting: served=${server.served}, rejected=${server.rejected}`);
console.log("One abusive client hogs resources, legitimate users get 503.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Token Bucket Algorithm
// ════════════════════════════════════════════════════════════════

// WHY: Allows bursts while enforcing average rate. Tokens refill
// at steady rate; each request consumes a token.
console.log("--- Section 2: Token Bucket Algorithm ---\n");

class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity; this.tokens = capacity;
    this.refillRate = refillRate; this.stats = { allowed: 0, rejected: 0 };
  }
  tryConsume() {
    if (this.tokens >= 1) { this.tokens--; this.stats.allowed++; return true; }
    this.stats.rejected++; return false;
  }
  simulateRefill(intervals) { this.tokens = Math.min(this.capacity, this.tokens + intervals * this.refillRate); }
  getState() { return { tokens: this.tokens, ...this.stats }; }
}

const bucket = new TokenBucket(10, 2);
console.log("Token Bucket: capacity=10, refill=2/sec\n");

const burst = [];
for (let i = 0; i < 12; i++) burst.push(bucket.tryConsume() ? "OK" : "REJECTED");
console.log(`  Burst of 12: [${burst.join(", ")}]`);
console.log(`  State: ${JSON.stringify(bucket.getState())}`);

bucket.simulateRefill(3);
console.log(`\n  After 3s (6 tokens refilled): tokens=${bucket.getState().tokens}`);
const after = [];
for (let i = 0; i < 8; i++) after.push(bucket.tryConsume() ? "OK" : "REJECTED");
console.log(`  8 requests: [${after.join(", ")}]\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Leaky Bucket Algorithm
// ════════════════════════════════════════════════════════════════

// WHY: Smooths traffic to constant output rate. Requests queue up
// and "leak" at fixed rate.
console.log("--- Section 3: Leaky Bucket Algorithm ---\n");

class LeakyBucket {
  constructor(capacity, leakRate) {
    this.capacity = capacity; this.leakRate = leakRate;
    this.queue = []; this.stats = { enqueued: 0, dropped: 0, leaked: 0 };
  }
  add(req) {
    if (this.queue.length >= this.capacity) { this.stats.dropped++; return { status: "DROPPED", queueSize: this.queue.length }; }
    this.queue.push(req); this.stats.enqueued++;
    return { status: "QUEUED", queueSize: this.queue.length };
  }
  leak(count) { const l = this.queue.splice(0, count); this.stats.leaked += l.length; }
}

const leaky = new LeakyBucket(5, 2);
console.log("Leaky Bucket: capacity=5, leak=2/sec\n");

console.log("  Adding 8 requests:");
for (let i = 0; i < 8; i++) {
  const r = leaky.add({ id: i }); console.log(`    Request ${i}: ${r.status} (queue: ${r.queueSize})`);
}

leaky.leak(2);
console.log(`\n  After 1s (2 leaked): queue=${leaky.queue.length}`);
for (let i = 8; i < 10; i++) { const r = leaky.add({ id: i }); console.log(`    Request ${i}: ${r.status}`); }
console.log(`  Stats: ${JSON.stringify(leaky.stats)}\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Fixed Window Counter
// ════════════════════════════════════════════════════════════════

// WHY: Simplest rate limiter — count requests in fixed time windows.
// Easy but has the boundary problem (2x burst at edges).
console.log("--- Section 4: Fixed Window Counter ---\n");

class FixedWindowCounter {
  constructor(windowMs, maxReq) { this.windowMs = windowMs; this.maxReq = maxReq; this.windows = {}; this.stats = { allowed: 0, rejected: 0 }; }
  getKey(ts) { return Math.floor(ts / this.windowMs); }
  allow(clientId, ts) {
    const k = `${clientId}:${this.getKey(ts)}`;
    if (!this.windows[k]) this.windows[k] = 0;
    if (this.windows[k] >= this.maxReq) { this.stats.rejected++; return { allowed: false, count: this.windows[k] }; }
    this.windows[k]++; this.stats.allowed++;
    return { allowed: true, count: this.windows[k] };
  }
}

const fw = new FixedWindowCounter(60000, 5);
const now = 1700000000000;

console.log("Fixed Window: 5 req per 60s\n");
console.log("  SBI requests:");
for (let i = 0; i < 7; i++) {
  const r = fw.allow("SBI", now + i * 1000);
  console.log(`    Request ${i+1}: ${r.allowed ? "ALLOWED" : "REJECTED"} (${r.count}/5)`);
}

// Boundary problem
const bp = new FixedWindowCounter(60000, 5);
for (let i = 0; i < 5; i++) bp.allow("HDFC", now + 58000 + i * 100);
for (let i = 0; i < 5; i++) bp.allow("HDFC", now + 60000 + i * 100);
console.log(`\n  Boundary Problem: HDFC got ${bp.stats.allowed} through in ~2s across edge!\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Sliding Window Log
// ════════════════════════════════════════════════════════════════

// WHY: Fixes boundary problem by storing timestamps. Accurate but memory-heavy.
console.log("--- Section 5: Sliding Window Log ---\n");

class SlidingWindowLog {
  constructor(windowMs, maxReq) { this.windowMs = windowMs; this.maxReq = maxReq; this.logs = {}; this.stats = { allowed: 0, rejected: 0 }; }
  allow(clientId, ts) {
    if (!this.logs[clientId]) this.logs[clientId] = [];
    this.logs[clientId] = this.logs[clientId].filter(t => t > ts - this.windowMs);
    if (this.logs[clientId].length >= this.maxReq) { this.stats.rejected++; return false; }
    this.logs[clientId].push(ts); this.stats.allowed++; return true;
  }
}

const sl = new SlidingWindowLog(60000, 5);
for (let i = 0; i < 5; i++) sl.allow("HDFC", now + 58000 + i * 100);
let rejected = 0;
for (let i = 0; i < 5; i++) { if (!sl.allow("HDFC", now + 60000 + i * 100)) rejected++; }
console.log(`  Boundary test: 5 at t=58s all allowed, 5 at t=60s: ${rejected} REJECTED`);
console.log(`  Sliding window correctly prevents boundary burst!`);
console.log(`  Memory per client: ${(sl.logs["HDFC"]||[]).length} timestamps stored\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Sliding Window Counter
// ════════════════════════════════════════════════════════════════

// WHY: Combines fixed window efficiency with sliding window accuracy.
// Uses weighted count from current and previous windows.
console.log("--- Section 6: Sliding Window Counter ---\n");

class SlidingWindowCounter {
  constructor(windowMs, maxReq) { this.windowMs = windowMs; this.maxReq = maxReq; this.windows = {}; this.stats = { allowed: 0, rejected: 0 }; }
  getStart(ts) { return Math.floor(ts / this.windowMs) * this.windowMs; }
  allow(clientId, ts) {
    const ws = this.getStart(ts);
    if (!this.windows[clientId]) this.windows[clientId] = { prevCount: 0, currCount: 0, currStart: ws };
    const s = this.windows[clientId];
    if (ws !== s.currStart) {
      s.prevCount = ws - s.currStart === this.windowMs ? s.currCount : 0;
      s.currCount = 0; s.currStart = ws;
    }
    const prevWeight = 1 - (ts - ws) / this.windowMs;
    const weighted = s.prevCount * prevWeight + s.currCount;
    if (weighted >= this.maxReq) { this.stats.rejected++; return { allowed: false, weighted: weighted.toFixed(1) }; }
    s.currCount++; this.stats.allowed++;
    return { allowed: true, weighted: (weighted + 1).toFixed(1) };
  }
}

const sc = new SlidingWindowCounter(60000, 10);
console.log("Sliding Window Counter: 10 req per 60s (weighted)\n");

for (let i = 0; i < 8; i++) sc.allow("Jio", now + i * 1000); // fill prev window
const halfway = now + 60000 + 30000; // 30s into new window
console.log("  Prev window had 8 req, now 30s in (weight=0.5, phantom=4)\n");
for (let i = 0; i < 8; i++) {
  const r = sc.allow("Jio", halfway + i * 100);
  console.log(`    Request ${i+1}: ${r.allowed ? "ALLOWED" : "REJECTED"} (weighted: ${r.weighted}/10)`);
}
console.log(`\n  Memory: only 3 values per client vs full timestamp log.\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Distributed Rate Limiting
// ════════════════════════════════════════════════════════════════

// WHY: Multi-server deployments need global limits via shared store.
console.log("--- Section 7: Distributed Rate Limiting ---\n");

class DistributedRateLimiter {
  constructor(maxReq, windowMs) { this.maxReq = maxReq; this.windowMs = windowMs; this.store = {}; }
  allow(clientId, serverId, ts) {
    const k = `${clientId}:${Math.floor(ts / this.windowMs)}`;
    if (!this.store[k]) this.store[k] = 0;
    this.store[k]++;
    const ok = this.store[k] <= this.maxReq;
    return { allowed: ok, count: this.store[k], remaining: Math.max(0, this.maxReq - this.store[k]), server: serverId };
  }
}

const dist = new DistributedRateLimiter(10, 60000);
const servers = ["api-1", "api-2", "api-3"];
console.log("Aadhaar eKYC: 10 req/min per bank, across 3 servers\n");

["SBI", "HDFC", "ICICI"].forEach(bank => {
  const results = [];
  for (let i = 0; i < 12; i++) {
    const r = dist.allow(bank, servers[i%3], now + i * 100);
    results.push(`${r.allowed ? "OK" : "429"}(${servers[i%3].split("-")[1]})`);
  }
  console.log(`  ${bank}: [${results.join(", ")}]`);
});
console.log("\n  Counter shared across servers — 11th request rejected globally.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Exponential Backoff with Jitter
// ════════════════════════════════════════════════════════════════

// WHY: When rate-limited (429), retry intelligently. Backoff prevents
// thundering herds. Jitter spreads retries.
console.log("--- Section 8: Exponential Backoff with Jitter ---\n");

class ExponentialBackoff {
  constructor(baseMs, maxMs, maxRetries) {
    this.baseMs = baseMs; this.maxMs = maxMs; this.maxRetries = maxRetries; this.seed = 42;
  }
  random() { this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff; return (this.seed % 1000) / 1000; }
  delay(attempt, strategy) {
    const exp = Math.min(this.maxMs, this.baseMs * Math.pow(2, attempt));
    switch (strategy) {
      case "none": return this.baseMs;
      case "exponential": return exp;
      case "full-jitter": return Math.floor(this.random() * exp);
      case "equal-jitter": return Math.floor(exp/2 + this.random() * exp/2);
      default: return this.baseMs;
    }
  }
  simulate(strategy) {
    this.seed = 42;
    const attempts = [];
    for (let i = 0; i < this.maxRetries; i++) attempts.push(this.delay(i, strategy));
    return attempts;
  }
}

const bo = new ExponentialBackoff(100, 10000, 6);
["none", "exponential", "full-jitter", "equal-jitter"].forEach(s => {
  const delays = bo.simulate(s);
  console.log(`  ${s}: [${delays.map(d => d+"ms").join(", ")}] total=${delays.reduce((a,b)=>a+b)}ms`);
});

// Aadhaar retry simulation
console.log("\n--- Aadhaar eKYC Retry Simulation ---\n");

class AadhaarClient {
  constructor(bank, limiter) { this.bank = bank; this.limiter = limiter; this.success = 0; this.retries = 0; this.failed = 0; }
  request(id, ts) {
    const r = this.limiter.allow(this.bank, "s1", ts);
    if (r.allowed) { this.success++; return { status: 200, attempt: 1 }; }
    // Retry in next window
    this.retries++;
    const retry = this.limiter.allow(this.bank, "s1", ts + 60000);
    if (retry.allowed) { this.success++; return { status: 200, attempt: 2 }; }
    this.failed++; return { status: 429 };
  }
}

const aadhaarLimiter = new DistributedRateLimiter(10, 60000);
const sbi = new AadhaarClient("SBI-retry", aadhaarLimiter);

console.log("SBI makes 15 eKYC requests (limit: 10/min):");
for (let i = 0; i < 15; i++) {
  const r = sbi.request(i, now + i * 100);
  console.log(`  Request ${i}: ${r.status === 200 ? `OK (attempt ${r.attempt})` : "FAILED"}`);
}
console.log(`  Stats: success=${sbi.success}, retries=${sbi.retries}, failed=${sbi.failed}`);

// HDFC stays within limit — no retries needed
const hdfc = new AadhaarClient("HDFC-retry", aadhaarLimiter);
console.log("\nHDFC makes 8 eKYC requests (within limit):");
for (let i = 0; i < 8; i++) {
  const r = hdfc.request(i, now + i * 200);
  console.log(`  Request ${i}: ${r.status === 200 ? `OK (attempt ${r.attempt})` : "FAILED"}`);
}
console.log(`  Stats: success=${hdfc.success}, retries=${hdfc.retries}, failed=${hdfc.failed}`);

// Summary comparison
console.log("\n  Algorithm Comparison Summary:");
console.log("  Algorithm            Accuracy    Memory     Burst");
console.log("  " + "-".repeat(52));
console.log("  Token Bucket         Medium      O(1)       Allows");
console.log("  Leaky Bucket         High        O(N)       Smooths");
console.log("  Fixed Window         Low         O(1)       2x at edge");
console.log("  Sliding Log          Exact       O(N)       Prevents");
console.log("  Sliding Counter      High        O(1)       Approximates");
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════
console.log("=".repeat(65));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(65));
console.log(`
  1. Token bucket allows bursts while maintaining average rate.
  2. Leaky bucket enforces strict constant output rate.
  3. Fixed window is simple but allows 2x burst at boundaries.
  4. Sliding window log is precise but stores every timestamp.
  5. Sliding window counter approximates with minimal memory.
  6. Distributed rate limiting uses shared store (Redis) for
     global enforcement across all API servers.
  7. Exponential backoff with jitter prevents thundering herds.
  8. Always return rate limit headers so clients self-regulate.

  Aadhaar Wisdom: "In a nation of 1.4 billion identities, rate
  limiting is not a restriction — it is the guardian of fairness."
`);
