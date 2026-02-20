/** ============================================================
 *  FILE 17: STREAM PROCESSING
 *  ============================================================
 *  Topic: Batch vs stream, windowing (tumbling/sliding/session),
 *         watermarks, late data, backpressure
 *
 *  WHY THIS MATTERS:
 *  Modern applications demand real-time insights, not day-old
 *  batch reports. Stream processing analyzes data as it arrives,
 *  enabling live dashboards, fraud detection, and instant
 *  recommendations. Windowing strategies determine how infinite
 *  streams are chunked into finite, computable segments.
 *  ============================================================ */

// STORY: Hotstar Viewer Analytics
// During an IPL match, Hotstar serves 25+ million concurrent viewers.
// Tumbling windows count viewers every minute for the live ticker.
// Sliding windows compute rolling 5-minute averages for trend charts.
// Session windows track individual user watch sessions to measure
// engagement. Without proper windowing, the analytics pipeline would
// either drown in data or miss critical patterns.

console.log("=".repeat(65));
console.log("  FILE 17: STREAM PROCESSING");
console.log("  Hotstar Viewer Analytics — windows on live IPL data");
console.log("=".repeat(65));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Batch vs Stream Processing
// ════════════════════════════════════════════════════════════════

// WHY: Batch processes all data at once. Stream processes data as
// it arrives — real-time, low latency.
console.log("--- Section 1: Batch vs Stream Processing ---\n");

function generateViewerEvents(count) {
  const matches = ["MI-vs-CSK", "RCB-vs-KKR", "DC-vs-SRH"];
  const cities = ["Mumbai", "Chennai", "Bangalore", "Delhi", "Hyderabad"];
  const events = [];
  for (let i = 0; i < count; i++) {
    events.push({ userId: `user-${1000+i}`, matchId: matches[i%3],
      city: cities[i%5], timestamp: Date.now()+i*100, duration: 30+(i*37)%180 });
  }
  return events;
}

const viewerData = generateViewerEvents(20);

// Batch: collect all, then process
const batchResult = { total: viewerData.length,
  uniqueMatches: new Set(viewerData.map(r => r.matchId)).size,
  avgDuration: viewerData.reduce((s,r) => s+r.duration, 0) / viewerData.length };
console.log("Batch Processing:");
console.log(`  Collected ${batchResult.total} records, processed at once`);
console.log(`  Avg duration: ${batchResult.avgDuration.toFixed(1)}s`);
console.log(`  Latency: ALL data must arrive before ANY result\n`);

// Stream: process each as it arrives
let streamCount = 0;
viewerData.slice(0,5).forEach(() => streamCount++);
console.log("Stream Processing:");
console.log(`  Processed ${streamCount} records one-by-one`);
console.log(`  Latency: result available after EACH record\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Tumbling Windows
// ════════════════════════════════════════════════════════════════

// WHY: Fixed, non-overlapping time intervals. Perfect for "viewers per minute".
console.log("--- Section 2: Tumbling Windows ---\n");

class TumblingWindow {
  constructor(sizeMs) { this.sizeMs = sizeMs; this.windows = {}; }
  getKey(ts) { return Math.floor(ts / this.sizeMs) * this.sizeMs; }
  add(event) {
    const k = this.getKey(event.timestamp);
    if (!this.windows[k]) this.windows[k] = { start: k, end: k + this.sizeMs, events: [], count: 0 };
    this.windows[k].events.push(event);
    this.windows[k].count++;
  }
  getResults() { return Object.values(this.windows).map(w => ({ start: w.start, end: w.end, count: w.count, events: w.events })); }
}

const baseTime = 1700000000000;
const hotstarEvents = [];
for (let i = 0; i < 30; i++) {
  hotstarEvents.push({ userId: `viewer-${i}`, matchId: "MI-vs-CSK",
    timestamp: baseTime + i * 4000, city: ["Mumbai","Chennai","Pune","Delhi","Kolkata"][i%5] });
}

const tumbling = new TumblingWindow(60000);
hotstarEvents.forEach(e => tumbling.add(e));

console.log("Hotstar — Tumbling Windows (1-minute intervals):");
tumbling.getResults().forEach(w => {
  const cities = {};
  w.events.forEach(e => { cities[e.city] = (cities[e.city]||0) + 1; });
  const cityStr = Object.entries(cities).map(([c,n]) => `${c}:${n}`).join(", ");
  console.log(`  Window [${w.start}..${w.end}]: ${w.count} viewers (${cityStr})`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Sliding Windows
// ════════════════════════════════════════════════════════════════

// WHY: Overlapping windows provide smoother trend views.
console.log("--- Section 3: Sliding Windows ---\n");

class SlidingWindow {
  constructor(sizeMs, slideMs) { this.sizeMs = sizeMs; this.slideMs = slideMs; this.events = []; }
  add(event) { this.events.push(event); }
  compute(startTime, endTime) {
    const windows = [];
    for (let s = startTime; s + this.sizeMs <= endTime + this.slideMs; s += this.slideMs) {
      const wEnd = s + this.sizeMs;
      const evts = this.events.filter(e => e.timestamp >= s && e.timestamp < wEnd);
      if (evts.length > 0) {
        const avg = evts.reduce((sum,e) => sum+(e.duration||0), 0) / evts.length;
        windows.push({ start: s, end: wEnd, count: evts.length, avgDuration: avg });
      }
    }
    return windows;
  }
}

const sliding = new SlidingWindow(120000, 30000);
for (let i = 0; i < 30; i++) sliding.add({ userId: `v-${i}`, timestamp: baseTime+i*4000, duration: 60+(i*13)%120 });

console.log("Sliding Window (2-min window, 30s slide):");
sliding.compute(baseTime, baseTime+120000).forEach(w => {
  const bar = "#".repeat(w.count);
  console.log(`  [${(w.start-baseTime)/1000}s..${(w.end-baseTime)/1000}s]: ${w.count} viewers, avg ${w.avgDuration.toFixed(0)}s  ${bar}`);
});
console.log("  Same events appear in multiple windows — smooths trends.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Session Windows
// ════════════════════════════════════════════════════════════════

// WHY: Gap-based windows close when a user is inactive. Perfect for engagement.
console.log("--- Section 4: Session Windows ---\n");

class SessionWindow {
  constructor(gapMs) { this.gapMs = gapMs; this.sessions = {}; }
  add(event) {
    const uid = event.userId;
    if (!this.sessions[uid]) this.sessions[uid] = [];
    const last = this.sessions[uid][this.sessions[uid].length - 1];
    if (last && (event.timestamp - last.lastActivity) <= this.gapMs) {
      last.events.push(event); last.lastActivity = event.timestamp; last.end = event.timestamp;
    } else {
      this.sessions[uid].push({ start: event.timestamp, end: event.timestamp, lastActivity: event.timestamp, events: [event] });
    }
  }
  getSessions(uid) {
    return (this.sessions[uid]||[]).map(s => ({ userId: uid, duration: s.end-s.start, eventCount: s.events.length }));
  }
  getAllSessions() {
    const all = [];
    for (const uid of Object.keys(this.sessions)) all.push(...this.getSessions(uid));
    return all;
  }
}

const sessionWin = new SessionWindow(60000);
// User 1: two sessions (gap > 60s between events 4 and 5)
[0, 10000, 25000, 50000, 170000, 200000].forEach((t,i) =>
  sessionWin.add({ userId: "user-1001", timestamp: baseTime+t, action: ["play","seek","quality","pause","resume","seek"][i] })
);
// User 2: one short session
[5000, 15000, 20000].forEach((t,i) =>
  sessionWin.add({ userId: "user-1002", timestamp: baseTime+t, action: ["play","pause","stop"][i] })
);

console.log("Session Windows (60s gap):");
console.log("User 1001:", sessionWin.getSessions("user-1001").map((s,i) => `Session ${i+1}: ${s.duration/1000}s, ${s.eventCount} events`).join(" | "));
console.log("User 1002:", sessionWin.getSessions("user-1002").map((s,i) => `Session ${i+1}: ${s.duration/1000}s, ${s.eventCount} events`).join(" | "));
console.log("User 1001 has 2 sessions (gap > 60s), User 1002 has 1.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Watermarks and Event Time vs Processing Time
// ════════════════════════════════════════════════════════════════

// WHY: Events arrive out of order. Watermarks track event-time progress.
console.log("--- Section 5: Watermarks ---\n");

class WatermarkTracker {
  constructor(maxLatenessMs) { this.maxLateness = maxLatenessMs; this.maxEventTime = 0; this.watermark = 0; this.stats = { processed: 0, outOfOrder: 0, late: 0 }; }
  process(event) {
    this.stats.processed++;
    if (event.eventTime < this.maxEventTime) this.stats.outOfOrder++;
    else this.maxEventTime = event.eventTime;
    this.watermark = this.maxEventTime - this.maxLateness;
    const isLate = event.eventTime < this.watermark;
    if (isLate) this.stats.late++;
    return { eventTime: event.eventTime, watermark: this.watermark, skew: event.processingTime - event.eventTime, isLate };
  }
}

const wm = new WatermarkTracker(10000);
const wmEvents = [
  { eventTime: baseTime+1000, processingTime: baseTime+1200 },
  { eventTime: baseTime+3000, processingTime: baseTime+3100 },
  { eventTime: baseTime+2000, processingTime: baseTime+5000 },   // out of order
  { eventTime: baseTime+8000, processingTime: baseTime+8500 },
  { eventTime: baseTime+15000, processingTime: baseTime+15200 },
  { eventTime: baseTime+1500, processingTime: baseTime+16000 },  // LATE
];

console.log("  EventTime  ProcTime  Skew     Watermark  Status");
console.log("  " + "-".repeat(52));
wmEvents.forEach(e => {
  const r = wm.process(e);
  const et = ((e.eventTime-baseTime)/1000).toFixed(1), pt = ((e.processingTime-baseTime)/1000).toFixed(1);
  const wmOff = ((r.watermark-baseTime)/1000).toFixed(1);
  console.log(`  ${et}s\t${pt}s\t${r.skew}ms\t${wmOff}s\t${r.isLate ? "LATE!" : "ok"}`);
});
console.log(`  Summary: ${wm.stats.processed} processed, ${wm.stats.outOfOrder} out-of-order, ${wm.stats.late} late\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Handling Late Data
// ════════════════════════════════════════════════════════════════

// WHY: Late data is inevitable. Strategies: drop, side-output, or retraction.
console.log("--- Section 6: Handling Late Data ---\n");

class LateDataHandler {
  constructor(windowMs, latenessMs) { this.windowMs = windowMs; this.latenessMs = latenessMs; this.windows = {}; this.sideOutput = []; this.retractions = []; }
  getKey(ts) { return Math.floor(ts / this.windowMs) * this.windowMs; }
  process(event, watermark) {
    const wk = this.getKey(event.eventTime), wEnd = wk + this.windowMs;
    if (watermark > wEnd + this.latenessMs) { this.sideOutput.push(event); return "DROPPED"; }
    if (!this.windows[wk]) this.windows[wk] = { count: 0 };
    this.windows[wk].count++;
    if (watermark > wEnd) { this.retractions.push({ wk, newCount: this.windows[wk].count }); return "RETRACTED"; }
    return "ACCEPTED";
  }
}

const lh = new LateDataHandler(60000, 30000);
const wmark = baseTime + 70000;
[{ et: 10000, desc: "on-time" }, { et: 40000, desc: "on-time" }, { et: 25000, desc: "late, within window" },
 { et: 5000, desc: "late, within lateness" }, { et: -50000, desc: "too late" }
].forEach(e => {
  const r = lh.process({ eventTime: baseTime+e.et }, wmark);
  console.log(`  Event +${e.et/1000}s: ${r} (${e.desc})`);
});
console.log(`  Side output: ${lh.sideOutput.length}, Retractions: ${lh.retractions.length}\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Backpressure in Streams
// ════════════════════════════════════════════════════════════════

// WHY: When producers outpace consumers, backpressure prevents OOM.
console.log("--- Section 7: Backpressure ---\n");

class BackpressureStream {
  constructor(maxBuf) { this.buffer = []; this.maxBuf = maxBuf; this.stats = { accepted: 0, throttled: 0, processed: 0 }; }
  produce(event) {
    if (this.buffer.length >= this.maxBuf) { this.stats.throttled++; return "THROTTLED"; }
    this.buffer.push(event); this.stats.accepted++; return "ACCEPTED";
  }
  consume(n) { const c = this.buffer.splice(0, n); this.stats.processed += c.length; return c.length; }
}

const bp = new BackpressureStream(10);
console.log("Phase 1: Surge — 25 events");
for (let i = 0; i < 25; i++) bp.produce({ id: i });
console.log(`  Buffer: ${bp.buffer.length}, Accepted: ${bp.stats.accepted}, Throttled: ${bp.stats.throttled}`);

console.log("Phase 2: Consumer processes 8");
bp.consume(8);
console.log(`  Buffer: ${bp.buffer.length}, Processed: ${bp.stats.processed}`);

console.log("Phase 3: 5 more events");
for (let i = 0; i < 5; i++) bp.produce({ id: 25+i });
console.log(`  Buffer: ${bp.buffer.length}`);

console.log("Phase 4: Drain all");
bp.consume(100);
console.log(`  Buffer: ${bp.buffer.length}, Total processed: ${bp.stats.processed}\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Stream Processing Pipeline
// ════════════════════════════════════════════════════════════════

// WHY: Real systems chain operators: source -> filter -> map -> window -> aggregate -> sink.
console.log("--- Section 8: Stream Processing Pipeline ---\n");

class StreamPipeline {
  constructor(name) { this.name = name; this.stages = []; }
  addStage(name, fn) { this.stages.push({ name, fn }); return this; }
  process(events) {
    let current = [...events];
    const log = [];
    for (const s of this.stages) { const before = current.length; current = s.fn(current); log.push({ stage: s.name, in: before, out: current.length }); }
    return { results: current, log };
  }
}

const pipeline = new StreamPipeline("Hotstar Live Analytics");
const pipeEvents = [];
for (let i = 0; i < 50; i++) {
  pipeEvents.push({ userId: `user-${1000+i%20}`, matchId: i < 35 ? "MI-vs-CSK" : "RCB-vs-KKR",
    city: ["Mumbai","Chennai","Bangalore","Delhi","Hyderabad"][i%5],
    action: ["play","pause","seek","buffer","quality"][i%5], bufferTimeMs: i%5===3 ? 200+(i*17)%500 : 0 });
}

pipeline
  .addStage("filter:live-match", evts => evts.filter(e => e.matchId === "MI-vs-CSK"))
  .addStage("filter:active", evts => evts.filter(e => e.action !== "pause"))
  .addStage("enrich:region", evts => evts.map(e => ({ ...e,
    region: ["Mumbai"].includes(e.city) ? "West" : ["Chennai","Bangalore","Hyderabad"].includes(e.city) ? "South" : "North" })))
  .addStage("aggregate:by-region", evts => {
    const r = {};
    evts.forEach(e => { if (!r[e.region]) r[e.region] = { region: e.region, viewers: 0, bufTotal: 0, bufCount: 0 };
      r[e.region].viewers++; if (e.bufferTimeMs) { r[e.region].bufTotal += e.bufferTimeMs; r[e.region].bufCount++; } });
    return Object.values(r).map(x => ({ ...x, avgBuffer: x.bufCount ? (x.bufTotal/x.bufCount).toFixed(0) : 0 }));
  });

const pr = pipeline.process(pipeEvents);
console.log(`Pipeline: ${pipeline.name}`);
pr.log.forEach(s => console.log(`  ${s.stage}: ${s.in} -> ${s.out}`));
console.log("\nAggregated:");
pr.results.forEach(r => console.log(`  ${r.region}: ${r.viewers} viewers, avg buffer: ${r.avgBuffer}ms`));

// Full IPL match simulation — combining all window types
console.log("\n--- Full IPL Match Simulation ---\n");

const matchTumbling = new TumblingWindow(30000);
const matchSession = new SessionWindow(45000);
const matchSliding = new SlidingWindow(60000, 15000);

for (let i = 0; i < 60; i++) {
  const event = { userId: `fan-${100+i%15}`, timestamp: baseTime+i*2000,
    action: ["cheer","react","share","comment","emoji"][i%5], duration: 30+(i*7)%90 };
  matchTumbling.add(event);
  matchSession.add(event);
  matchSliding.add(event);
}

console.log("Tumbling (30s windows):");
matchTumbling.getResults().forEach((w,i) => {
  console.log(`  Window ${i}: ${w.count} events`);
});

const allSess = matchSession.getAllSessions();
const avgSess = allSess.reduce((s,x) => s+x.duration, 0) / (allSess.length||1) / 1000;
console.log(`\nSession windows: ${allSess.length} sessions, avg ${avgSess.toFixed(1)}s`);
console.log(`Longest session: ${Math.max(...allSess.map(s=>s.duration))/1000}s\n`);

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════
console.log("=".repeat(65));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(65));
console.log(`
  1. Batch processes bounded data at once; stream processes
     unbounded data with low latency as it arrives.
  2. Tumbling windows: fixed, non-overlapping — viewers/minute.
  3. Sliding windows: overlapping — smoother rolling averages.
  4. Session windows: gap-based — user engagement tracking.
  5. Watermarks track event-time progress and determine when
     windows are "complete" despite out-of-order arrivals.
  6. Late data: drop, side-output, or retract and recompute.
  7. Backpressure prevents consumer overload by signaling
     producers to slow down or by dropping events.
  8. Stream pipelines chain filter/map/window/aggregate stages.

  Hotstar Wisdom: "In cricket and streaming alike, every ball
  is an event — the scoreboard is just a projection of the stream."
`);
