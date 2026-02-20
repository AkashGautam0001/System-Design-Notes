/** ============================================================
 *  FILE 24: SERVERLESS AND FUNCTIONS
 *  ============================================================
 *  Topic: FaaS, cold start, event triggers, step functions,
 *         cost model
 *
 *  WHY THIS MATTERS:
 *  Serverless lets you run code without provisioning servers. You
 *  pay only when your code executes. For bursty workloads like
 *  IRCTC's 10 AM Tatkal rush, serverless scales from zero to
 *  thousands of instances in seconds — saving enormous cost.
 *  ============================================================ */

// STORY: IRCTC Tatkal Surge
// Every morning at 10:00 AM, millions of Indians open IRCTC to book
// Tatkal tickets. Traffic spikes from near-zero to lakhs of requests
// in seconds. Serverless handles this by spinning up thousands of
// function instances automatically. But cold start delay can mean
// the difference between a confirmed ticket and the waitlist.

console.log("=".repeat(70));
console.log("  FILE 24: SERVERLESS AND FUNCTIONS");
console.log("  FaaS, Cold Start, Event Triggers, Step Functions, Cost");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — What is Serverless / FaaS
// ════════════════════════════════════════════════════════════════

// WHY: Serverless means you do not manage servers. The cloud
// provider handles provisioning, scaling, and patching.

console.log("--- SECTION 1: What is Serverless / FaaS ---\n");

console.log("  Serverless = Developer writes function code ONLY");
console.log("  Cloud provider handles: provisioning, scaling, patching, HA\n");
[["Aspect", "Traditional Server", "Serverless / FaaS"],
 ["Provisioning", "You choose instance type", "Automatic"],
 ["Scaling", "Configure auto-scaling", "Instant, per-request"],
 ["Billing", "Pay for uptime (24/7)", "Pay per invocation"],
 ["Cold Start", "N/A (always running)", "Possible delay"],
 ["Max Runtime", "Unlimited", "5-15 minutes"],
 ["State", "Stateful (disk, memory)", "Stateless (ephemeral)"],
].forEach(([a, t, s]) => console.log(`  ${a.padEnd(16)} | ${t.padEnd(28)} | ${s}`));
console.log("\n  Providers: AWS Lambda | Google Cloud Functions | Azure Functions\n");

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Function Lifecycle (Cold/Warm/Idle)
// ════════════════════════════════════════════════════════════════

// WHY: Cold starts add latency on first invocation. Understanding
// the lifecycle helps optimize for low-latency use cases.

console.log("--- SECTION 2: Function Lifecycle ---\n");

class FaaSRuntime {
  constructor() { this.instances = {}; this.log = []; this.nextId = 0; }
  invoke(fnName, payload) {
    let inst = this.instances[fnName];
    let coldStart = false, initTime = 0;
    if (!inst || inst.state === "terminated") {
      coldStart = true;
      initTime = 200 + Math.floor(Math.random() * 300);
      inst = { id: `inst-${++this.nextId}`, fnName, state: "running", invocations: 0 };
      this.instances[fnName] = inst;
      console.log(`  [COLD START] ${fnName} (${inst.id}): Init ${initTime}ms`);
    } else {
      console.log(`  [WARM START] ${fnName} (${inst.id}): Reusing warm container`);
    }
    const execTime = 10 + Math.floor(Math.random() * 50);
    inst.invocations++;
    const total = (coldStart ? initTime : 0) + execTime;
    console.log(`    Execution: ${execTime}ms | Total: ${total}ms | Invocations: ${inst.invocations}`);
    this.log.push({ fnName, coldStart, initTime, execTime, total });
    return { status: 200, duration: total, coldStart };
  }
  idle(fnName) {
    if (this.instances[fnName]) {
      this.instances[fnName].state = "terminated";
      console.log(`  [IDLE] ${fnName}: Container terminated after inactivity`);
    }
  }
  getStats() {
    const cold = this.log.filter((l) => l.coldStart);
    const warm = this.log.filter((l) => !l.coldStart);
    return {
      total: this.log.length, coldStarts: cold.length, warmStarts: warm.length,
      avgCold: cold.length ? Math.round(cold.reduce((s, l) => s + l.total, 0) / cold.length) : 0,
      avgWarm: warm.length ? Math.round(warm.reduce((s, l) => s + l.total, 0) / warm.length) : 0,
    };
  }
}

const faas = new FaaSRuntime();
console.log("  Simulating IRCTC Tatkal function invocations:\n");
faas.invoke("irctc-search", { from: "DEL", to: "BOM" });
faas.invoke("irctc-search", { from: "BLR", to: "CHN" });
faas.invoke("irctc-search", { from: "KOL", to: "PAT" });
console.log();
faas.idle("irctc-search");
console.log();
faas.invoke("irctc-search", { from: "MUM", to: "GOA" });
console.log("\n  Stats:", JSON.stringify(faas.getStats()), "\n");

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Event Triggers
// ════════════════════════════════════════════════════════════════

// WHY: Serverless functions are event-driven. They trigger from
// HTTP requests, queues, schedules, uploads, and DB changes.

console.log("--- SECTION 3: Event Triggers ---\n");

class TriggerSystem {
  constructor(runtime) { this.runtime = runtime; this.triggers = []; }
  register(type, config, fnName) {
    this.triggers.push({ type, config, fnName });
    console.log(`  [Trigger] ${type} -> ${fnName} (${JSON.stringify(config)})`);
  }
  fire(type, payload) {
    const matching = this.triggers.filter((t) => t.type === type);
    console.log(`\n  [Event] ${type} — ${matching.length} function(s) triggered`);
    matching.forEach((t) => this.runtime.invoke(t.fnName, payload));
  }
}

const triggers = new TriggerSystem(new FaaSRuntime());
triggers.register("HTTP", { method: "POST", path: "/book" }, "irctc-book");
triggers.register("Queue", { queue: "payment-queue" }, "process-payment");
triggers.register("Schedule", { cron: "0 10 * * *" }, "tatkal-opener");
triggers.register("S3Upload", { bucket: "receipts" }, "generate-pdf");
triggers.register("DBChange", { collection: "bookings" }, "sync-analytics");
triggers.fire("HTTP", { trainId: "12301", class: "3A" });
triggers.fire("Queue", { bookingId: "BK-5001", amount: 1250 });
triggers.fire("Schedule", { time: "10:00 AM" });
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Step Functions / Workflow Orchestration
// ════════════════════════════════════════════════════════════════

// WHY: Complex processes like booking involve ordered steps with
// error handling. Step functions orchestrate this as a state machine.

console.log("--- SECTION 4: Step Functions — IRCTC Booking Workflow ---\n");

class StepFunction {
  constructor(name) { this.name = name; this.steps = []; this.ctx = {}; }
  addStep(name, handler, compensator = null) { this.steps.push({ name, handler, compensator }); }
  execute(input) {
    this.ctx = { ...input };
    console.log(`  [StepFn:${this.name}] Starting workflow`);
    console.log(`    Input: ${JSON.stringify(input)}\n`);
    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      console.log(`  Step ${i + 1}/${this.steps.length}: ${step.name}`);
      try {
        const result = step.handler(this.ctx);
        this.ctx = { ...this.ctx, ...result };
        console.log(`    Result: ${JSON.stringify(result)}\n`);
      } catch (err) {
        console.log(`    FAILED: ${err.message}\n`);
        console.log("  --- Compensating Transactions (Rollback) ---");
        for (let j = i - 1; j >= 0; j--) {
          if (this.steps[j].compensator) {
            console.log(`  Compensate: ${this.steps[j].name}`);
            this.steps[j].compensator(this.ctx);
          }
        }
        return { status: "FAILED", error: err.message };
      }
    }
    console.log(`  [StepFn:${this.name}] Workflow COMPLETED\n`);
    return { status: "COMPLETED" };
  }
}

const booking = new StepFunction("IRCTC-Tatkal");
booking.addStep("SearchTrains", (ctx) => {
  console.log(`    Searching: ${ctx.from} -> ${ctx.to}`);
  return { trainId: "12301-Rajdhani", fare: 1850 };
});
booking.addStep("ReserveSeat", (ctx) => {
  console.log(`    Reserving on ${ctx.trainId} for ${ctx.passengers} pax`);
  return { pnr: "PNR-" + Math.floor(Math.random() * 9000000 + 1000000), seats: ["B3-42"] };
}, (ctx) => console.log(`    Releasing reservation: PNR ${ctx.pnr}`));
booking.addStep("ProcessPayment", (ctx) => {
  console.log(`    Charging Rs.${ctx.fare * ctx.passengers}`);
  return { paymentId: "PAY-" + Math.floor(Math.random() * 90000 + 10000) };
}, (ctx) => console.log(`    Refunding: ${ctx.paymentId}`));
booking.addStep("Confirm", (ctx) => {
  console.log(`    Confirming PNR ${ctx.pnr}`);
  return { bookingStatus: "CONFIRMED" };
});
booking.addStep("Notify", (ctx) => {
  console.log(`    SMS: Booking ${ctx.bookingStatus}, PNR: ${ctx.pnr}`);
  return { notified: true };
});
booking.execute({ from: "New Delhi", to: "Mumbai", passengers: 2, class: "3A" });

// Payment failure scenario
console.log("  --- Payment Failure Scenario ---\n");
const failBooking = new StepFunction("IRCTC-Fail");
failBooking.addStep("Search", () => { console.log("    Searching..."); return { trainId: "12951" }; });
failBooking.addStep("Reserve", () => {
  console.log("    Reserving..."); return { pnr: "PNR-8765432" };
}, (ctx) => console.log(`    COMPENSATE: Releasing PNR ${ctx.pnr}`));
failBooking.addStep("Payment", () => { throw new Error("UPI server down"); });
failBooking.execute({ from: "BLR", to: "CHN", passengers: 1 });
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Cold Start Optimization
// ════════════════════════════════════════════════════════════════

// WHY: For latency-sensitive apps, even 500ms cold start matters.

console.log("--- SECTION 5: Cold Start Optimization ---\n");

[["Provisioned Concurrency", "Pre-warm N instances before rush", "Set 500 instances at 9:55 AM"],
 ["Smaller Package", "Reduce bundle size for faster download", "Tree-shake, use layers: save 100-300ms"],
 ["Language Choice", "Node.js ~100ms vs Java ~1-3s cold start", "Move search from Java to Node.js"],
 ["Keep-Alive Ping", "Scheduled pings every 5 min keep warm", "CloudWatch pings critical functions"],
 ["Init Optimization", "DB connections at module scope, not per call", "Connection pool outside handler"],
].forEach(([name, desc, ex], i) => {
  console.log(`  ${i + 1}. ${name}: ${desc}`);
  console.log(`     E.g.: ${ex}\n`);
});

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Cost Model (Pay Per Invocation)
// ════════════════════════════════════════════════════════════════

// WHY: Serverless billing is per-request and per GB-second.
// Great for bursty workloads, costly for sustained high traffic.

console.log("--- SECTION 6: Cost Model ---\n");

const lambdaPerReq = 0.0000002, lambdaPerGBs = 0.0000166667, memGB = 0.512, avgDur = 0.2;
const ec2Monthly = 30, ec2RPS = 100;

[["Low Traffic (off-peak)", 10000], ["Medium Traffic", 1000000], ["High Traffic (Tatkal)", 50000000]].forEach(([name, daily]) => {
  const monthly = daily * 30;
  const lambdaCost = monthly * lambdaPerReq + monthly * avgDur * memGB * lambdaPerGBs;
  const servers = Math.max(Math.ceil(daily / (ec2RPS * 86400)), 1);
  const ec2Cost = servers * ec2Monthly;
  const winner = lambdaCost < ec2Cost ? "SERVERLESS" : "EC2";
  console.log(`  ${name} (${daily.toLocaleString()} req/day):`);
  console.log(`    Lambda: $${lambdaCost.toFixed(2)}/mo | EC2: $${ec2Cost.toFixed(2)}/mo (${servers} server) | Winner: ${winner}`);
});
console.log("\n  Key: Serverless wins for bursty/low traffic. EC2 for sustained high throughput.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Serverless vs Containers
// ════════════════════════════════════════════════════════════════

// WHY: Understanding when to use each prevents over-engineering.

console.log("--- SECTION 7: Serverless vs Containers ---\n");

[["Scaling", "Per-request, instant", "Per-pod, seconds"],
 ["Min Cost", "$0 (scale to zero)", "1 container always running"],
 ["Max Runtime", "15 min (Lambda)", "Unlimited"],
 ["State", "Stateless only", "Stateful possible"],
 ["Cold Start", "100ms - 3s", "None (always running)"],
 ["Vendor Lock", "High", "Lower (K8s portable)"],
 ["Use Case", "Events, webhooks, spikes", "APIs, long processes"],
].forEach(([a, s, c]) => console.log(`  ${a.padEnd(14)} | ${s.padEnd(28)} | ${c}`));
console.log("\n  IRCTC Hybrid: Tatkal search=Serverless | PNR API=Container | Reports=Serverless\n");

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Serverless Design Patterns
// ════════════════════════════════════════════════════════════════

// WHY: Serverless requires different architecture patterns than
// traditional server-based apps.

console.log("--- SECTION 8: Serverless Design Patterns ---\n");

[["Fan-Out / Fan-In", "Process batch in parallel", "10M PNR statuses fan-out to N functions"],
 ["Event Pipeline", "Chain of event-triggered steps", "PDF -> S3 -> email to passenger"],
 ["API Composition", "Aggregate multiple services", "Train details + availability + fare in one call"],
 ["Scheduled Jobs", "Periodic tasks without a server", "Clear expired Tatkal reservations every 30 min"],
 ["Circuit Breaker", "Handle downstream failures", "Payment gateway down -> cached info + retry later"],
 ["Idempotent Handler", "Prevent duplicate processing", "Same payment event replayed -> skip via idempotency key"],
].forEach(([name, desc, ex]) => console.log(`  ${name}: ${desc}\n    E.g.: ${ex}\n`));

// ════════════════════════════════════════════════════════════════
// SECTION 9 — IRCTC Tatkal Surge Simulation
// ════════════════════════════════════════════════════════════════

// WHY: Simulating the 10 AM surge with scaling and cold starts.

console.log("--- SECTION 9: IRCTC Tatkal Surge Simulation ---\n");

console.log("  Time        | Requests | Instances | Cold Starts | Avg Latency");
console.log("  ------------|----------|-----------|-------------|------------");
let active = 0, totalCold = 0;
[["9:55 AM", 100], ["9:58 AM", 500], ["9:59 AM", 5000], ["10:00 AM", 50000],
 ["10:01 AM", 80000], ["10:05 AM", 30000], ["10:15 AM", 5000], ["10:30 AM", 1000], ["11:00 AM", 200],
].forEach(([time, reqs]) => {
  const needed = Math.ceil(reqs / 100);
  const cold = Math.max(0, needed - active);
  totalCold += cold;
  active = needed;
  const lat = cold > 0 ? `${50 + Math.floor(cold * 0.5)}ms` : "30ms";
  console.log(`  ${time.padEnd(12)} | ${String(reqs).padStart(8)} | ${String(active).padStart(9)} | ${String(cold).padStart(11)} | ${lat.padStart(10)}`);
});
console.log(`\n  Total cold starts: ${totalCold} | Peak instances: 800`);
console.log("  After surge: all instances scale to zero. Pay only for invocations.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 10 — When to Use and Avoid Serverless
// ════════════════════════════════════════════════════════════════

// WHY: Knowing when NOT to use serverless is as important.

console.log("--- SECTION 10: When to Use and Avoid Serverless ---\n");

console.log("  USE When:");
["Traffic is bursty (Tatkal rush, flash sales)",
 "Workload is event-driven (uploads, queues, webhooks)",
 "You want zero infrastructure management",
 "Functions are short-lived (< 15 min)",
].forEach((u) => console.log(`    - ${u}`));
console.log("\n  AVOID When:");
["Sustained high-throughput (cheaper on containers)",
 "Functions need > 15 min execution",
 "Need persistent WebSocket connections",
 "Cold start latency is unacceptable",
 "Vendor lock-in is a concern",
].forEach((a) => console.log(`    - ${a}`));
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log();
console.log("  1. Serverless runs functions without managing servers.");
console.log("  2. Cold starts add latency; mitigate with provisioned concurrency.");
console.log("  3. Functions trigger from HTTP, queues, schedules, uploads, DB changes.");
console.log("  4. Step functions orchestrate multi-step workflows with saga rollback.");
console.log("  5. Pay-per-invocation is cheaper for bursty, costlier for sustained.");
console.log("  6. Serverless is stateless — use DynamoDB/S3/Redis for state.");
console.log("  7. Hybrid works best: serverless for spikes, containers for steady APIs.");
console.log("  8. Design for idempotency — functions may be invoked multiple times.");
console.log();
console.log('  "When the 10 AM Tatkal rush hits, IRCTC does not need 800 servers');
console.log('   running 24/7 — it needs 800 function instances for 30 minutes and');
console.log('   zero for the rest of the day. That is the promise of serverless."');
console.log();
