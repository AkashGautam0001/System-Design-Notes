/** ============================================================
 *  FILE 32: MONITORING AND OBSERVABILITY
 *  ============================================================
 *  Topic: Metrics/logs/traces, RED/USE methods, distributed
 *         tracing, SLI/SLO/SLA, alerting rules and thresholds
 *
 *  WHY THIS MATTERS:
 *  You cannot improve what you cannot measure. A single user
 *  request might touch 20+ services. Without observability, a
 *  latency spike cascades into a mystery outage affecting
 *  millions. Monitoring is the nervous system of infrastructure.
 *  ============================================================ */

// STORY: Jio Network Operations
// Reliance Jio serves 450 million subscribers across 22 telecom
// circles. Their NOC monitors 5 billion daily events — from call
// setup latency in rural Bihar to 5G throughput in Mumbai. When
// error rates spike, distributed traces pinpoint the root cause
// in under 4 minutes mean-time-to-detect.

console.log("=".repeat(70));
console.log("  FILE 32: MONITORING AND OBSERVABILITY");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Three Pillars of Observability
// ════════════════════════════════════════════════════════════════

// WHY: Metrics tell WHAT is wrong, logs tell WHY, traces tell WHERE.
console.log("SECTION 1: Three Pillars of Observability");
console.log("-".repeat(50));

const pillars = {
  metrics: { what: "Numeric measurements over time", bestFor: "Alerting, dashboards", tools: "Prometheus, Datadog" },
  logs:    { what: "Timestamped discrete events", bestFor: "Debugging, forensics", tools: "ELK, Loki, Splunk" },
  traces:  { what: "End-to-end request path", bestFor: "Latency analysis, bottlenecks", tools: "Jaeger, Zipkin, X-Ray" }
};
Object.entries(pillars).forEach(([name, info]) => {
  console.log(`\n  ${name.toUpperCase()}: ${info.what}`);
  console.log(`    Best for: ${info.bestFor} | Tools: ${info.tools}`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Metrics Collection and Aggregation
// ════════════════════════════════════════════════════════════════

// WHY: Jio collects 500K metrics/sec. Need counters, gauges, histograms.
console.log("SECTION 2: Metrics Collection and Aggregation");
console.log("-".repeat(50));

class MetricsCollector {
  constructor(service) {
    this.service = service;
    this.counters = {};
    this.gauges = {};
    this.histograms = {};
  }

  incCounter(name, labels = {}, val = 1) {
    const k = `${name}:${JSON.stringify(labels)}`;
    if (!this.counters[k]) this.counters[k] = { name, labels, value: 0 };
    this.counters[k].value += val;
  }

  setGauge(name, labels = {}, val) {
    const k = `${name}:${JSON.stringify(labels)}`;
    this.gauges[k] = { name, labels, value: val };
  }

  recordHist(name, labels = {}, val) {
    const k = `${name}:${JSON.stringify(labels)}`;
    if (!this.histograms[k]) this.histograms[k] = { name, labels, values: [], count: 0, sum: 0 };
    const h = this.histograms[k];
    h.values.push(val); h.count++; h.sum += val;
  }

  percentiles(name, labels = {}) {
    const h = this.histograms[`${name}:${JSON.stringify(labels)}`];
    if (!h || !h.values.length) return null;
    const s = [...h.values].sort((a, b) => a - b);
    const n = s.length;
    return { p50: s[n * 0.5 | 0], p90: s[n * 0.9 | 0], p95: s[n * 0.95 | 0], p99: s[n * 0.99 | 0], avg: +(h.sum / h.count).toFixed(1), count: h.count };
  }
}

const jioMetrics = new MetricsCollector("jio-gateway");
const circles = ["mumbai", "delhi", "chennai", "kolkata", "bengaluru"];

for (let i = 0; i < 1000; i++) {
  const circle = circles[i % circles.length];
  const status = Math.random() < 0.03 ? "5xx" : "2xx";
  const latency = status === "5xx" ? 500 + Math.random() * 4500 : 5 + Math.random() * 200;
  jioMetrics.incCounter("http_requests_total", { circle, status });
  jioMetrics.recordHist("request_duration_ms", { circle }, Math.round(latency));
}
circles.forEach(c => jioMetrics.setGauge("active_connections", { circle: c }, Math.floor(5000 + Math.random() * 15000)));

console.log("\n  Latency Percentiles by Circle:");
circles.forEach(c => {
  const p = jioMetrics.percentiles("request_duration_ms", { circle: c });
  if (p) console.log(`    ${c.padEnd(12)} p50=${p.p50}ms p90=${p.p90}ms p99=${p.p99}ms avg=${p.avg}ms (n=${p.count})`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Structured Logging
// ════════════════════════════════════════════════════════════════

// WHY: JSON logs enable filtering and correlation across millions of events.
console.log("SECTION 3: Structured Logging");
console.log("-".repeat(50));

class Logger {
  constructor(service, minLevel = "INFO") {
    this.service = service;
    this.levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, FATAL: 4 };
    this.minLevel = minLevel;
    this.logs = [];
  }

  _log(level, msg, ctx = {}) {
    if (this.levels[level] < this.levels[this.minLevel]) return null;
    const entry = { ts: new Date().toISOString(), level, service: this.service, msg, ...ctx };
    this.logs.push(entry);
    return entry;
  }

  info(msg, ctx) { return this._log("INFO", msg, ctx); }
  warn(msg, ctx) { return this._log("WARN", msg, ctx); }
  error(msg, ctx) { return this._log("ERROR", msg, ctx); }

  child(defaults) {
    const c = new Logger(this.service, this.minLevel);
    c.logs = this.logs;
    const orig = c._log.bind(c);
    c._log = (level, msg, ctx = {}) => orig(level, msg, { ...defaults, ...ctx });
    return c;
  }

  query(filters = {}) {
    return this.logs.filter(l => {
      if (filters.level && l.level !== filters.level) return false;
      if (filters.traceId && l.traceId !== filters.traceId) return false;
      return true;
    });
  }
}

const logger = new Logger("jio-call-service");
const reqLog = logger.child({ traceId: "trace-jio-abc123", circle: "mumbai" });
reqLog.info("Call setup initiated", { callee: "9123456789", type: "VoLTE" });
reqLog.info("Auth successful", { authMethod: "SIM", latencyMs: 12 });
reqLog.warn("High latency on SGW", { sgwNode: "sgw-mum-03", latencyMs: 450 });
reqLog.error("Call setup timeout", { reason: "MSC_UNREACHABLE", mscNode: "msc-mum-07", timeoutMs: 5000 });
reqLog.info("Retry on alternate MSC succeeded", { mscNode: "msc-mum-08", totalMs: 5800 });

console.log("\n  Structured Logs:");
logger.logs.forEach((e, i) => console.log(`    ${i+1}. [${e.level}] ${e.msg}${e.reason ? " reason="+e.reason : ""}`));
console.log("\n  Error query for trace-jio-abc123:");
logger.query({ level: "ERROR", traceId: "trace-jio-abc123" }).forEach(e => console.log(`    ${e.msg}: ${e.reason} at ${e.mscNode}`));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Distributed Tracing
// ════════════════════════════════════════════════════════════════

// WHY: A Jio call setup touches 8+ elements. Tracing shows timing per hop.
console.log("SECTION 4: Distributed Tracing");
console.log("-".repeat(50));

class DistributedTracer {
  constructor() { this.traces = new Map(); this.spanId = 0; }

  startTrace(op, service) {
    const traceId = `trace-${Date.now()}-${(Math.random()*1e6|0).toString(36)}`;
    const span = { traceId, spanId: `s-${++this.spanId}`, parentId: null, op, service, start: Date.now(), duration: 0, status: "OK", tags: {} };
    this.traces.set(traceId, [span]);
    return span;
  }

  addSpan(traceId, op, service, parentId, durationMs, status = "OK") {
    const span = { traceId, spanId: `s-${++this.spanId}`, parentId, op, service, start: Date.now(), duration: durationMs, status, tags: {} };
    if (!this.traces.has(traceId)) this.traces.set(traceId, []);
    this.traces.get(traceId).push(span);
    return span;
  }

  visualize(traceId) {
    const spans = this.traces.get(traceId) || [];
    const maxDur = Math.max(...spans.map(s => s.duration), 1);
    console.log(`\n  Trace: ${traceId}`);
    console.log(`  ${"Service".padEnd(18)} ${"Operation".padEnd(20)} ${"Dur".padEnd(8)} ${"Status".padEnd(8)} Waterfall`);
    console.log("  " + "-".repeat(75));
    spans.forEach(sp => {
      const barLen = Math.max(1, Math.round((sp.duration / maxDur) * 30));
      const bar = sp.status === "ERROR" ? "X".repeat(barLen) : "#".repeat(barLen);
      console.log(`  ${sp.service.padEnd(18)} ${sp.op.padEnd(20)} ${(sp.duration+"ms").padEnd(8)} ${sp.status.padEnd(8)} |${bar}`);
    });
  }
}

const tracer = new DistributedTracer();
const root = tracer.startTrace("volte-call-setup", "api-gateway");
root.duration = 120;
const tid = root.traceId;
tracer.addSpan(tid, "authenticate-sim", "hss-auth", root.spanId, 15);
tracer.addSpan(tid, "locate-subscriber", "vlr-location", root.spanId, 25);
tracer.addSpan(tid, "route-call", "msc-routing", root.spanId, 35);
tracer.addSpan(tid, "allocate-media", "mgw-media", root.spanId, 20);
tracer.addSpan(tid, "start-billing", "ocs-billing", root.spanId, 10);
tracer.visualize(tid);

// Failed trace
const fRoot = tracer.startTrace("volte-call-setup", "api-gateway");
fRoot.duration = 5020; fRoot.status = "ERROR";
const fid = fRoot.traceId;
tracer.addSpan(fid, "authenticate-sim", "hss-auth", fRoot.spanId, 12);
tracer.addSpan(fid, "route-call", "msc-routing", fRoot.spanId, 5000, "ERROR");
console.log("\n  FAILED trace (Delhi):");
tracer.visualize(fid);
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — RED Method (Rate, Errors, Duration)
// ════════════════════════════════════════════════════════════════

// WHY: RED is the standard for monitoring request-driven services.
console.log("SECTION 5: RED Method (Rate, Errors, Duration)");
console.log("-".repeat(50));

class REDMonitor {
  constructor(name, windowSec = 60) { this.name = name; this.window = windowSec; this.requests = []; }
  record(status, durationMs) { this.requests.push({ ts: Date.now(), status, duration: durationMs }); }
  getMetrics() {
    const r = this.requests;
    if (!r.length) return { rate: 0, errorRate: 0, p50: 0, p95: 0, p99: 0 };
    const rate = +(r.length / this.window).toFixed(2);
    const errs = r.filter(x => x.status >= 500).length;
    const errRate = +((errs / r.length) * 100).toFixed(2);
    const d = r.map(x => x.duration).sort((a, b) => a - b);
    return { rate, errorRate: errRate, p50: d[d.length*0.5|0], p95: d[d.length*0.95|0], p99: d[d.length*0.99|0] };
  }
}

const redServices = {
  "call-setup": new REDMonitor("call-setup"), "data-session": new REDMonitor("data-session"),
  "sms-gateway": new REDMonitor("sms-gateway"), "billing-ocs": new REDMonitor("billing-ocs")
};

Object.entries(redServices).forEach(([name, mon]) => {
  const base = name === "billing-ocs" ? 15 : name === "call-setup" ? 80 : 30;
  const errP = name === "call-setup" ? 0.02 : 0.005;
  for (let i = 0; i < 500; i++) {
    const st = Math.random() < errP ? 500 : 200;
    mon.record(st, Math.round(st === 500 ? base*10+Math.random()*2000 : base+Math.random()*base*2));
  }
});

console.log("\n  " + "Service".padEnd(16) + "Rate".padEnd(10) + "Err%".padEnd(10) + "p50".padEnd(8) + "p95".padEnd(8) + "p99");
Object.entries(redServices).forEach(([name, mon]) => {
  const m = mon.getMetrics();
  console.log(`  ${name.padEnd(16)}${(m.rate+"rps").padEnd(10)}${(m.errorRate+"%").padEnd(10)}${(m.p50+"ms").padEnd(8)}${(m.p95+"ms").padEnd(8)}${m.p99}ms`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — USE Method (Utilization, Saturation, Errors)
// ════════════════════════════════════════════════════════════════

// WHY: USE monitors infrastructure resources — CPU, memory, disk, network.
console.log("SECTION 6: USE Method (Utilization, Saturation, Errors)");
console.log("-".repeat(50));

class USEMonitor {
  constructor(name) { this.name = name; this.snapshots = []; }
  record(util, sat, errs) { this.snapshots.push({ util, sat, errs }); }
  avg() {
    const n = this.snapshots.length || 1;
    const s = this.snapshots.reduce((a, x) => ({ u: a.u+x.util, s: a.s+x.sat, e: a.e+x.errs }), { u:0, s:0, e:0 });
    return { util: +(s.u/n).toFixed(1), sat: +(s.s/n).toFixed(1), errs: +(s.e/n).toFixed(1) };
  }
  diagnose() {
    const a = this.avg();
    const issues = [];
    if (a.util > 80) issues.push("HIGH UTIL");
    if (a.sat > 10) issues.push("SATURATED");
    if (a.errs > 0) issues.push("ERRORS");
    return issues.length ? issues.join(", ") : "HEALTHY";
  }
}

const resources = {
  "cpu-msc-mum": new USEMonitor("CPU MSC Mumbai"),
  "mem-msc-mum": new USEMonitor("Memory MSC Mumbai"),
  "disk-hss": new USEMonitor("Disk HSS"),
  "net-sgw": new USEMonitor("Network SGW"),
  "cpu-billing": new USEMonitor("CPU Billing")
};
for (let i = 0; i < 20; i++) {
  resources["cpu-msc-mum"].record(65+Math.random()*20, Math.random()*5|0, 0);
  resources["mem-msc-mum"].record(72+Math.random()*15, Math.random()*3|0, 0);
  resources["disk-hss"].record(45+Math.random()*30, Math.random()*8|0, Math.random()<0.1?1:0);
  resources["net-sgw"].record(55+Math.random()*35, Math.random()*15|0, Math.random()<0.05?1:0);
  resources["cpu-billing"].record(85+Math.random()*12, 10+Math.random()*20|0, Math.random()<0.15?2:0);
}

console.log("\n  " + "Resource".padEnd(20) + "Util%".padEnd(10) + "Sat".padEnd(10) + "Errs".padEnd(10) + "Diagnosis");
Object.entries(resources).forEach(([k, m]) => {
  const a = m.avg();
  console.log(`  ${k.padEnd(20)}${(a.util+"%").padEnd(10)}${String(a.sat).padEnd(10)}${String(a.errs).padEnd(10)}${m.diagnose()}`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — SLI/SLO/SLA Definitions and Tracking
// ════════════════════════════════════════════════════════════════

// WHY: SLIs measure quality, SLOs set targets, SLAs are contracts with penalties.
console.log("SECTION 7: SLI/SLO/SLA Tracking");
console.log("-".repeat(50));

class SLOTracker {
  constructor(name, sloTarget, slaTarget) {
    this.name = name; this.sloTarget = sloTarget; this.slaTarget = slaTarget;
    this.good = 0; this.total = 0;
  }
  record(isGood) { this.total++; if (isGood) this.good++; }
  status() {
    const sli = this.total > 0 ? +(this.good / this.total * 100).toFixed(3) : 100;
    const budget = (100 - this.sloTarget * 100);
    const used = (100 - sli);
    const remaining = budget - used;
    const burnRate = budget > 0 ? +((used / budget) * 100).toFixed(1) : 0;
    return { sli: sli+"%", slo: (this.sloTarget*100)+"%", sla: (this.slaTarget*100)+"%",
             budgetTotal: budget.toFixed(3)+"%", budgetUsed: used.toFixed(3)+"%",
             remaining: remaining.toFixed(3)+"%", burnRate: burnRate+"%",
             verdict: remaining > 0 ? "WITHIN BUDGET" : "BUDGET EXHAUSTED" };
  }
}

const slos = [
  new SLOTracker("Call Completion", 0.9995, 0.999),
  new SLOTracker("Data Session <500ms", 0.999, 0.995),
  new SLOTracker("SMS Delivery <30s", 0.998, 0.995)
];

slos.forEach(tracker => {
  const failP = tracker.name.includes("Call") ? 0.0003 : tracker.name.includes("SMS") ? 0.0015 : 0.0008;
  for (let i = 0; i < 10000; i++) tracker.record(Math.random() > failP);
});

console.log("\n  Error Budget Status:");
slos.forEach(t => {
  const s = t.status();
  console.log(`\n    ${t.name}: SLI=${s.sli} SLO=${s.slo} SLA=${s.sla}`);
  console.log(`      Budget: total=${s.budgetTotal} used=${s.budgetUsed} remaining=${s.remaining} burn=${s.burnRate}`);
  console.log(`      Verdict: ${s.verdict}`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Alerting Rules and Thresholds
// ════════════════════════════════════════════════════════════════

// WHY: Alerts bridge monitoring data and human action.
console.log("SECTION 8: Alerting Rules and Thresholds");
console.log("-".repeat(50));

class AlertManager {
  constructor() { this.rules = []; this.active = []; }

  addRule(name, severity, condition, team) {
    this.rules.push({ name, severity, condition, team });
  }

  evaluate(metrics) {
    const fired = [];
    this.rules.forEach(rule => {
      try {
        if (rule.condition(metrics)) {
          const alert = { name: rule.name, severity: rule.severity, team: rule.team };
          fired.push(alert);
          this.active.push(alert);
        }
      } catch(e) { /* skip */ }
    });
    return fired;
  }

  summary() {
    const s = { critical: 0, warning: 0 };
    this.active.forEach(a => s[a.severity] = (s[a.severity]||0)+1);
    return s;
  }
}

const alertMgr = new AlertManager();
alertMgr.addRule("HighCallErrorRate", "critical", m => m.callErrorRate > 1.0, "network-core");
alertMgr.addRule("HighP99Latency", "warning", m => m.p99 > 500, "network-core");
alertMgr.addRule("CPUOverload", "critical", m => m.cpu > 90, "infrastructure");
alertMgr.addRule("ErrorBudgetBurn", "warning", m => m.burnRate > 80, "sre");
alertMgr.addRule("DiskSpaceLow", "warning", m => m.disk > 85, "infrastructure");

const circleMetrics = [
  { circle: "mumbai", callErrorRate: 0.3, p99: 120, cpu: 65, burnRate: 30, disk: 60 },
  { circle: "delhi", callErrorRate: 2.1, p99: 850, cpu: 92, burnRate: 95, disk: 70 },
  { circle: "chennai", callErrorRate: 0.5, p99: 200, cpu: 55, burnRate: 20, disk: 88 }
];

console.log("\n  Alert Evaluation:");
circleMetrics.forEach(m => {
  const alerts = alertMgr.evaluate(m);
  if (alerts.length) {
    console.log(`\n    ${m.circle.toUpperCase()}:`);
    alerts.forEach(a => console.log(`      [${a.severity.toUpperCase()}] ${a.name} -> team: ${a.team}`));
  } else {
    console.log(`\n    ${m.circle.toUpperCase()}: All clear`);
  }
});

const sum = alertMgr.summary();
console.log(`\n  Summary: critical=${sum.critical||0}, warning=${sum.warning||0}`);

console.log("\n  Best Practices:");
["Alert on symptoms, not causes", "Every alert needs a runbook", "Use burn-rate alerting for SLOs",
 "Page for critical; ticket for warning", "Deduplicate to avoid alert storms"].forEach((p, i) => console.log(`    ${i+1}. ${p}`));
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log(`
  1. Three pillars: Metrics=WHAT, Logs=WHY, Traces=WHERE.
  2. RED for services: Rate, Errors, Duration cover 90% of monitoring.
  3. USE for resources: Utilization, Saturation, Errors per resource.
  4. SLIs must be user-centric — measure latency and availability.
  5. Error budgets drive priorities: exhausted = freeze features.
  6. Structured JSON logs with trace IDs enable cross-service correlation.
  7. Alert on burn rate, not instantaneous spikes — noise vs signal.
  8. Every alert needs a runbook with remediation steps.
`);
console.log('  "In a network serving 450M subscribers, every second');
console.log('   without observability is a second flying blind."');
console.log("   - Jio Network Operations Team");
console.log();
console.log("=".repeat(70));
console.log("  END OF FILE 32");
console.log("=".repeat(70));
