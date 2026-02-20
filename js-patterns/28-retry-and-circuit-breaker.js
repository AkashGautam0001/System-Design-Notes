/**
 * ============================================================
 *  FILE 28 : Retry & Circuit Breaker Patterns
 *  Topic   : Retry with Backoff, Circuit Breaker, Timeout
 *  WHY THIS MATTERS:
 *    Distributed systems fail. Retry with backoff recovers
 *    from transient errors; circuit breakers prevent cascading
 *    failures; timeouts ensure nothing hangs forever.
 * ============================================================
 */

// STORY: Electrician Noor installs MCBs (miniature circuit breakers)
// to protect the colony during monsoon power surges. Retry = try
// reconnecting after power cut. Circuit breaker = MCB trips after
// too many surges. Timeout = generator auto-shutoff.

(async () => {

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Retry with Exponential Backoff
// ────────────────────────────────────────────────────────────
console.log("=== BLOCK 1: Retry with Backoff ===");

// WHY: Transient power cuts often resolve on their own — but
// hammering the grid makes things worse. Backoff spaces retries.
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function retry(fn, { maxRetries = 3, baseDelay = 10, jitter = true } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      // WHY: Exponential backoff — delay doubles each time
      let delay = baseDelay * Math.pow(2, attempt);
      // WHY: Jitter prevents thundering herd when many inverters retry
      if (jitter) delay += Math.floor(Math.random() * baseDelay);
      console.log(`  Noor retries reconnection ${attempt + 1}/${maxRetries}, wait ~${delay}ms`);
      await sleep(delay);
    }
  }
  throw lastError;
}

// Flaky power supply: fails twice then stabilizes
let powerAttempts = 0;
async function powerSupply() {
  powerAttempts++;
  if (powerAttempts <= 2) throw new Error(`Power surge #${powerAttempts}`);
  return "Colony power stable";
}

try {
  const result = await retry(powerSupply, { maxRetries: 3, baseDelay: 5 });
  console.log("Noor's retry result:", result);
  // Output: Noor's retry result: Colony power stable
} catch (e) { console.log("Gave up:", e.message); }

// Exhausted retries
try {
  await retry(() => { throw new Error("Transformer burnt"); }, { maxRetries: 2, baseDelay: 5 });
} catch (e) {
  console.log("Noor gives up after retries:", e.message);
  // Output: Noor gives up after retries: Transformer burnt
}

// ────────────────────────────────────────────────────────────
// BLOCK 2 — MCB (Circuit Breaker)
// ────────────────────────────────────────────────────────────
console.log("\n=== BLOCK 2: MCB (Circuit Breaker) ===");

// WHY: When the power grid is down, retrying every appliance wastes
// resources. An MCB "trips" after N surges and rejects load
// immediately, then cautiously tests recovery.
class MCB {
  constructor(fn, { surgeThreshold = 3, resetTimeout = 100 } = {}) {
    this._fn = fn;
    this._state = "ON";
    this._surges = 0;
    this._surgeThreshold = surgeThreshold;
    this._resetTimeout = resetTimeout;
    this._nextAttempt = 0;
  }
  get state() { return this._state; }

  async call(...args) {
    if (this._state === "TRIPPED") {
      if (Date.now() < this._nextAttempt)
        throw new Error("MCB TRIPPED — load rejected");
      // WHY: Testing lets one appliance through to check recovery
      this._state = "TESTING";
      console.log("  Noor's MCB -> TESTING (checking supply)");
    }
    try {
      const result = await this._fn(...args);
      this._onSuccess();
      return result;
    } catch (err) { this._onFailure(); throw err; }
  }
  _onSuccess() {
    this._surges = 0;
    if (this._state === "TESTING") console.log("  Noor's MCB -> ON (power recovered)");
    this._state = "ON";
  }
  _onFailure() {
    this._surges++;
    if (this._surges >= this._surgeThreshold || this._state === "TESTING") {
      this._state = "TRIPPED";
      this._nextAttempt = Date.now() + this._resetTimeout;
      console.log("  Noor's MCB -> TRIPPED (too many surges)");
    }
  }
}

let gridCall = 0;
async function unstableGrid() {
  gridCall++;
  if (gridCall <= 4) throw new Error(`Surge #${gridCall}`);
  return "Power restored to colony";
}

const mcb = new MCB(unstableGrid, { surgeThreshold: 3, resetTimeout: 50 });

// Calls 1-3: surges accumulate, MCB trips on 3rd
for (let i = 1; i <= 3; i++) {
  try { await mcb.call(); }
  catch (e) { console.log(`Call ${i}: ${e.message}, state=${mcb.state}`); }
}
// Output: Call 1: Surge #1, state=ON
// Output: Call 2: Surge #2, state=ON
// Output: Call 3: Surge #3, state=TRIPPED

// Call 4: rejected immediately (MCB tripped)
try { await mcb.call(); }
catch (e) { console.log(`Call 4: ${e.message}`); }
// Output: Call 4: MCB TRIPPED — load rejected

await sleep(60); // wait for reset timeout

// Call 5: testing, grid still surges (gridCall=4)
try { await mcb.call(); }
catch (e) { console.log(`Call 5: ${e.message}, state=${mcb.state}`); }

await sleep(60); // wait again

// Call 6: testing, grid recovers (gridCall=5)
try {
  const r = await mcb.call();
  console.log(`Call 6: ${r}, state=${mcb.state}`);
} catch (e) { console.log(`Call 6: ${e.message}`); }

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Generator Auto-Shutoff & Combined Patterns
// ────────────────────────────────────────────────────────────
console.log("\n=== BLOCK 3: Timeout & Combined ===");

// WHY: A generator that never shuts off wastes diesel and overheats.
// Timeout via Promise.race guarantees a deadline.
function withTimeout(promise, ms) {
  let tid;
  const timeout = new Promise((_, reject) => {
    tid = setTimeout(() => reject(new Error("Generator auto-shutoff")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(tid));
}

try {
  const fast = await withTimeout(new Promise(r => setTimeout(() => r("Inverter switchover done"), 10)), 50);
  console.log("Noor's fast task:", fast);
  // Output: Noor's fast task: Inverter switchover done
} catch (e) { console.log("Timed out:", e.message); }

try {
  await withTimeout(new Promise(r => setTimeout(() => r("Generator warmup"), 200)), 20);
} catch (e) {
  console.log("Noor's slow task:", e.message);
  // Output: Noor's slow task: Generator auto-shutoff
}

// WHY: AbortController lets you actually cancel work, not just ignore results.
async function cancellableWork(signal) {
  for (let i = 0; i < 5; i++) {
    if (signal.aborted) return "Generator shutdown cancelled";
    await sleep(10);
  }
  return "Generator warmup completed";
}

const controller = new AbortController();
setTimeout(() => controller.abort(), 25);
const abortResult = await cancellableWork(controller.signal);
console.log("Noor's abortable task:", abortResult);
// Output: Noor's abortable task: Generator shutdown cancelled

// WHY: Combine all three for maximum monsoon resilience.
console.log("\n--- Combined monsoon resilience ---");
let combinedCalls = 0;
async function colonyGrid() {
  combinedCalls++;
  if (combinedCalls <= 1) throw new Error("Monsoon surge");
  await sleep(5);
  return "All appliances running";
}

const resilientMCB = new MCB(colonyGrid, { surgeThreshold: 5, resetTimeout: 100 });
async function resilientCall() {
  return retry(() => withTimeout(resilientMCB.call(), 50), { maxRetries: 3, baseDelay: 5, jitter: false });
}

try {
  const finalResult = await resilientCall();
  console.log("Noor's resilient call:", finalResult);
  // Output: Noor's resilient call: All appliances running
} catch (e) { console.log("All resilience exhausted:", e.message); }

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Retry + exponential backoff recovers from transient power
//    cuts without overwhelming the colony grid.
// 2. Jitter prevents thundering herd when many inverters retry.
// 3. MCB (ON -> TRIPPED -> TESTING) stops wasting resources
//    on a grid that is clearly down during monsoon surges.
// 4. Timeout via Promise.race guarantees a generator deadline;
//    AbortController lets you truly cancel in-flight work.
// 5. Combining all three creates monsoon-proof resilience.

})();
