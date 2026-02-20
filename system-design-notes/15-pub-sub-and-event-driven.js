/** ============================================================
 *  FILE 15: PUB/SUB AND EVENT-DRIVEN ARCHITECTURE
 *  ============================================================
 *  Topic: Pub/sub, topic routing, event bus, consumer groups,
 *         ordering guarantees
 *
 *  WHY THIS MATTERS:
 *  When Virat Kohli hits a six in an IPL match, the score update
 *  must reach the leaderboard, notification service, and fantasy
 *  points engine simultaneously. Pub/sub decouples the match
 *  engine from all subscribers — add new services without changing
 *  the publisher.
 *  ============================================================ */

// STORY: Dream11 Live Scores
// Dream11 serves 150 million fantasy sports users during IPL season.
// The match engine emits ball-by-ball events. The leaderboard service,
// notification service, fantasy points engine, and analytics pipeline
// all subscribe to these events independently. If the notification
// service is slow, it doesn't block the leaderboard from updating.
// Consumer groups let Dream11 scale each subscriber horizontally.

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║  FILE 15 — PUB/SUB AND EVENT-DRIVEN ARCHITECTURE           ║");
console.log("║  Dream11: IPL match events -> leaderboard, fantasy, alerts  ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Simple Pub/Sub
// ════════════════════════════════════════════════════════════════

// WHY: Pub/sub lets publishers fire events without knowing who listens.

console.log("=== SECTION 1: Simple Pub/Sub ===\n");

class SimplePubSub {
  constructor() { this.subscribers = {}; this.messageLog = []; }

  subscribe(topic, name, callback) {
    if (!this.subscribers[topic]) this.subscribers[topic] = [];
    this.subscribers[topic].push({ name, callback });
  }

  publish(topic, message) {
    const subs = this.subscribers[topic] || [];
    const deliveries = [];
    subs.forEach((sub) => {
      try { sub.callback(message); deliveries.push({ subscriber: sub.name, status: "delivered" }); }
      catch (err) { deliveries.push({ subscriber: sub.name, status: "failed" }); }
    });
    this.messageLog.push({ topic, deliveries }); return deliveries;
  }

  topicStats() {
    const s = {};
    for (const [t, subs] of Object.entries(this.subscribers)) s[t] = subs.length;
    return s;
  }
}

function simplePubSubDemo() {
  const pubsub = new SimplePubSub();
  const receivedMessages = {};

  function track(service) {
    return (msg) => {
      if (!receivedMessages[service]) receivedMessages[service] = [];
      receivedMessages[service].push(msg);
    };
  }

  // Dream11 services subscribe to match events
  pubsub.subscribe("match.score", "leaderboard-service", track("leaderboard"));
  pubsub.subscribe("match.score", "fantasy-points-engine", track("fantasy"));
  pubsub.subscribe("match.score", "notification-service", track("notifications"));
  pubsub.subscribe("match.score", "analytics-pipeline", track("analytics"));

  console.log("Dream11 subscribers on 'match.score':");
  console.log(`  ${JSON.stringify(pubsub.topicStats())}\n`);

  // Match engine publishes ball events
  const ballEvent = {
    match: "CSK vs MI",
    over: 18,
    ball: 4,
    batsman: "MS Dhoni",
    runs: 6,
    type: "SIX",
    totalScore: "185/4",
  };

  console.log(`Publishing: ${ballEvent.batsman} hits a ${ballEvent.type}!`);
  const deliveries = pubsub.publish("match.score", ballEvent);
  console.log(`  Delivered to ${deliveries.length} subscribers:`);
  deliveries.forEach((d) => console.log(`    ${d.subscriber}: ${d.status}`));

  // Each service received the same event
  console.log("\nEach service processes independently:");
  Object.entries(receivedMessages).forEach(([service, msgs]) => {
    console.log(`  ${service}: received ${msgs.length} event(s)`);
  });
}

simplePubSubDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Topic-Based Routing
// ════════════════════════════════════════════════════════════════

// WHY: Not every subscriber needs every event — route by topic hierarchy.

console.log("\n\n=== SECTION 2: Topic-Based Routing ===\n");

function topicRoutingDemo() {
  const pubsub = new SimplePubSub();
  const received = {};

  function tracker(name) {
    received[name] = [];
    return (msg) => received[name].push(msg);
  }

  // Different topics for different event types
  pubsub.subscribe("match.score.boundary", "highlights-service", tracker("highlights"));
  pubsub.subscribe("match.score.wicket", "wicket-alerts", tracker("wickets"));
  pubsub.subscribe("match.score.all", "scorecard-service", tracker("scorecard"));
  pubsub.subscribe("match.commentary", "commentary-service", tracker("commentary"));
  pubsub.subscribe("match.drs", "drs-tracker", tracker("drs"));

  console.log("Dream11 topic hierarchy:\n");
  console.log("  match.score.boundary  -> highlights-service");
  console.log("  match.score.wicket    -> wicket-alerts");
  console.log("  match.score.all       -> scorecard-service");
  console.log("  match.commentary      -> commentary-service");
  console.log("  match.drs             -> drs-tracker\n");

  // Publish different event types
  const events = [
    { topic: "match.score.boundary", data: { batsman: "Virat Kohli", runs: 4, type: "FOUR" } },
    { topic: "match.score.wicket", data: { batsman: "Rohit Sharma", bowler: "Bumrah", type: "CAUGHT" } },
    { topic: "match.score.boundary", data: { batsman: "Virat Kohli", runs: 6, type: "SIX" } },
    { topic: "match.commentary", data: { text: "What a shot! Over long-on for a maximum!" } },
    { topic: "match.drs", data: { decision: "OUT", review_by: "batting", overturned: true } },
    { topic: "match.score.all", data: { batsman: "Kohli", runs: 1, type: "SINGLE" } },
  ];

  events.forEach((e) => {
    pubsub.publish(e.topic, e.data);
  });

  console.log("After 6 events published:");
  Object.entries(received).forEach(([name, msgs]) => {
    console.log(`  ${name.padEnd(14)}: ${msgs.length} event(s)`);
  });
  console.log("\n  Topic routing: each service only gets relevant events.");
  console.log("  highlights-service got 2 boundaries, not the single or commentary.");
}

topicRoutingDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Wildcard Subscriptions
// ════════════════════════════════════════════════════════════════

// WHY: Subscribe to "match.score.*" to get ALL score events without listing each.

console.log("\n\n=== SECTION 3: Wildcard Subscriptions ===\n");

class WildcardPubSub {
  constructor() { this.subscribers = []; }
  subscribe(pattern, name, callback) {
    const regex = new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, "[^.]+").replace(/#/g, ".*") + "$");
    this.subscribers.push({ pattern, regex, name, callback });
  }
  publish(topic, message) {
    const matched = [];
    this.subscribers.forEach((sub) => { if (sub.regex.test(topic)) { sub.callback({ topic, ...message }); matched.push(sub.name); } });
    return matched;
  }
}

function wildcardDemo() {
  const pubsub = new WildcardPubSub();
  const logs = {};

  function logger(name) {
    logs[name] = [];
    return (msg) => logs[name].push(msg.topic);
  }

  // Wildcard patterns
  pubsub.subscribe("match.score.*", "all-scores", logger("all-scores"));
  pubsub.subscribe("match.#", "match-archiver", logger("match-archiver"));
  pubsub.subscribe("match.score.boundary", "boundary-only", logger("boundary-only"));
  pubsub.subscribe("analytics.#", "analytics-sink", logger("analytics-sink"));

  console.log("Wildcard subscription patterns:");
  console.log("  match.score.*       -> all-scores (single-level wildcard)");
  console.log("  match.#             -> match-archiver (multi-level wildcard)");
  console.log("  match.score.boundary -> boundary-only (exact match)");
  console.log("  analytics.#         -> analytics-sink\n");

  const topics = [
    "match.score.boundary",
    "match.score.wicket",
    "match.score.extras",
    "match.commentary.text",
    "match.drs.review",
    "analytics.realtime.scores",
    "analytics.batch.daily",
  ];

  topics.forEach((topic) => {
    const matched = pubsub.publish(topic, { ts: Date.now() });
    console.log(`  ${topic.padEnd(30)} -> [${matched.join(", ")}]`);
  });

  console.log("\nSubscriber event counts:");
  Object.entries(logs).forEach(([name, topics]) => {
    console.log(`  ${name.padEnd(16)}: ${topics.length} events`);
  });
}

wildcardDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Event Bus Pattern
// ════════════════════════════════════════════════════════════════

// WHY: A central event bus decouples all microservices in the Dream11 platform.

console.log("\n\n=== SECTION 4: Event Bus Pattern ===\n");

class EventBus {
  constructor() { this.handlers = {}; this.middleware = []; this.eventLog = []; }
  use(fn) { this.middleware.push(fn); }
  on(type, handler) { if (!this.handlers[type]) this.handlers[type] = []; this.handlers[type].push(handler); }

  emit(eventType, payload) {
    const event = { type: eventType, payload, timestamp: Date.now(), id: `EVT-${Math.random().toString(36).slice(2,8)}` };
    for (const mw of this.middleware) { if (!mw(event)) return { delivered: 0, filtered: true }; }
    this.eventLog.push(event);
    let delivered = 0;
    (this.handlers[eventType] || []).forEach((h) => { try { h(event); delivered++; } catch(e) {} });
    return { delivered, id: event.id };
  }

  replay(from = 0) { return this.eventLog.slice(from); }
}

function eventBusDemo() {
  const bus = new EventBus();
  const serviceOutputs = {};

  function output(service) {
    serviceOutputs[service] = [];
    return (event) => serviceOutputs[service].push(event.payload);
  }

  // Middleware: log all events
  bus.use((event) => {
    // Filter out test events
    if (event.payload && event.payload.test) return false;
    return true;
  });

  // Dream11 services register handlers
  bus.on("BALL_BOWLED", output("leaderboard"));
  bus.on("BALL_BOWLED", output("fantasy-points"));
  bus.on("BALL_BOWLED", output("live-commentary"));
  bus.on("WICKET_FALLEN", output("wicket-alerts"));
  bus.on("WICKET_FALLEN", output("fantasy-points"));
  bus.on("OVER_COMPLETE", output("over-summary"));
  bus.on("MATCH_END", output("final-standings"));
  bus.on("MATCH_END", output("prize-distribution"));

  console.log("Dream11 Event Bus — IPL CSK vs MI:\n");

  // Simulate IPL over
  const balls = [
    { event: "BALL_BOWLED", data: { ball: "18.1", batsman: "Dhoni", runs: 2, bowler: "Bumrah" } },
    { event: "BALL_BOWLED", data: { ball: "18.2", batsman: "Dhoni", runs: 0, bowler: "Bumrah" } },
    { event: "BALL_BOWLED", data: { ball: "18.3", batsman: "Dhoni", runs: 6, bowler: "Bumrah" } },
    { event: "BALL_BOWLED", data: { ball: "18.4", batsman: "Jadeja", runs: 4, bowler: "Bumrah" } },
    { event: "WICKET_FALLEN", data: { ball: "18.5", batsman: "Jadeja", bowler: "Bumrah", type: "BOWLED" } },
    { event: "BALL_BOWLED", data: { ball: "18.6", batsman: "Shardul", runs: 1, bowler: "Bumrah" } },
    { event: "OVER_COMPLETE", data: { over: 18, runs: 13, wickets: 1 } },
  ];

  balls.forEach((b) => {
    const result = bus.emit(b.event, b.data);
    const desc = b.data.runs !== undefined
      ? `${b.data.batsman} ${b.data.runs} run(s)`
      : b.data.batsman
        ? `${b.data.batsman} OUT`
        : `Over ${b.data.over}: ${b.data.runs} runs`;
    console.log(`  ${b.event.padEnd(16)} -> ${desc} (${result.delivered} handlers)`);
  });

  // Test middleware filter
  bus.emit("BALL_BOWLED", { test: true, ball: "0.0" });
  console.log("\n  Test event filtered by middleware (not delivered).");

  console.log("\n  Service event counts:");
  Object.entries(serviceOutputs).forEach(([name, events]) => {
    console.log(`    ${name.padEnd(20)}: ${events.length} events`);
  });

  // Event replay
  console.log(`\n  Event log: ${bus.eventLog.length} events stored for replay`);
  console.log("  New services can replay history to build their state.");
}

eventBusDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Consumer Groups with Partitions
// ════════════════════════════════════════════════════════════════

// WHY: Scale consumers horizontally — each instance handles a subset.

console.log("\n\n=== SECTION 5: Consumer Groups with Partitions ===\n");

class PartitionedTopic {
  constructor(name, numPartitions) {
    this.name = name; this.partitions = {}; this.numPartitions = numPartitions; this.consumerGroups = {};
    for (let i = 0; i < numPartitions; i++) this.partitions[i] = [];
  }
  publish(key, message) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) & 0x7fffffff;
    const p = hash % this.numPartitions; this.partitions[p].push({ key, message, partition: p }); return p;
  }
  registerConsumerGroup(groupName, count) {
    const assignments = {};
    for (let c = 0; c < count; c++) assignments[`${groupName}-${c}`] = [];
    const consumers = Object.keys(assignments);
    for (let p = 0; p < this.numPartitions; p++) assignments[consumers[p % consumers.length]].push(p);
    this.consumerGroups[groupName] = assignments; return assignments;
  }
  consume(groupName) {
    const a = this.consumerGroups[groupName]; if (!a) return {};
    const r = {};
    for (const [c, parts] of Object.entries(a)) { r[c] = []; parts.forEach((p) => r[c].push(...this.partitions[p])); }
    return r;
  }
}

function consumerGroupDemo() {
  const topic = new PartitionedTopic("match-events", 6);

  // Publish ball events keyed by match_id (same match -> same partition)
  console.log("Dream11 match events — 6 partitions, keyed by match_id:\n");

  const matches = ["CSK-MI", "RCB-KKR", "DC-SRH", "PBKS-RR", "GT-LSG", "CSK-MI"];
  matches.forEach((matchId, i) => {
    const partition = topic.publish(matchId, {
      ball: `${i}.1`,
      event: i === 2 ? "WICKET" : "RUNS",
      matchId,
    });
    console.log(`  ${matchId.padEnd(10)} -> partition ${partition}`);
  });

  // Consumer Group 1: Fantasy Points (3 consumers)
  console.log("\nConsumer Group: 'fantasy-points' (3 consumers, 6 partitions):");
  const fpAssign = topic.registerConsumerGroup("fantasy-points", 3);
  Object.entries(fpAssign).forEach(([consumer, partitions]) => {
    console.log(`  ${consumer}: partitions [${partitions.join(", ")}]`);
  });

  // Consumer Group 2: Leaderboard (2 consumers)
  console.log("\nConsumer Group: 'leaderboard' (2 consumers, 6 partitions):");
  const lbAssign = topic.registerConsumerGroup("leaderboard", 2);
  Object.entries(lbAssign).forEach(([consumer, partitions]) => {
    console.log(`  ${consumer}: partitions [${partitions.join(", ")}]`);
  });

  // Consume
  console.log("\nMessages per consumer (fantasy-points group):");
  const consumed = topic.consume("fantasy-points");
  Object.entries(consumed).forEach(([consumer, msgs]) => {
    console.log(`  ${consumer}: ${msgs.length} message(s)`);
  });

  console.log("\n  Key insight: Same match always goes to same partition");
  console.log("  -> Events for CSK-MI are always processed by the same consumer");
  console.log("  -> Ordering is guaranteed WITHIN a partition");
}

consumerGroupDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Message Ordering Guarantees
// ════════════════════════════════════════════════════════════════

// WHY: Ball 18.3 must be processed BEFORE ball 18.4 for correct scores.

console.log("\n\n=== SECTION 6: Message Ordering Guarantees ===\n");

function orderingDemo() {
  console.log("Dream11 ordering requirements:\n");

  // Demonstrate ordering within partition
  const partitionLog = [];

  // Same match -> same partition -> ordered
  const matchEvents = [
    { ball: "18.1", runs: 2, seq: 1 },
    { ball: "18.2", runs: 0, seq: 2 },
    { ball: "18.3", runs: 6, seq: 3 },
    { ball: "18.4", runs: 4, seq: 4 },
    { ball: "18.5", runs: 0, seq: 5, wicket: true },
    { ball: "18.6", runs: 1, seq: 6 },
  ];

  let runningTotal = 170; // score before this over
  let orderViolations = 0;
  let lastSeq = 0;

  console.log("  CSK vs MI — Over 18 (all events in same partition):\n");
  matchEvents.forEach((e) => {
    if (e.seq <= lastSeq) {
      orderViolations++;
      console.log(`  [ORDER VIOLATION] ball ${e.ball} arrived out of sequence!`);
    }
    lastSeq = e.seq;
    runningTotal += e.runs;
    const wicketNote = e.wicket ? " (W)" : "";
    console.log(`    ${e.ball}: +${e.runs}${wicketNote}  total: ${runningTotal}`);
    partitionLog.push(e);
  });

  console.log(`\n  Order violations: ${orderViolations}`);
  console.log("  All events in sequence because they share the same partition key.\n");

  // Cross-partition ordering problem
  console.log("  Cross-partition ordering (different matches):");
  console.log("    CSK-MI  ball 18.3 (P0) and RCB-KKR ball 10.1 (P2)");
  console.log("    No ordering guarantee between different partitions.");
  console.log("    This is FINE — different matches are independent.\n");

  console.log("  Ordering rules:");
  console.log("    1. WITHIN partition: Guaranteed FIFO");
  console.log("    2. ACROSS partitions: No ordering guarantee");
  console.log("    3. Choose partition key wisely: match_id ensures per-match ordering");
  console.log("    4. Single partition = global order (but no parallelism)");
}

orderingDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Event Filtering and Transformation
// ════════════════════════════════════════════════════════════════

// WHY: Not every consumer needs raw events — filter and transform at the bus.

console.log("\n\n=== SECTION 7: Event Filtering and Transformation ===\n");

function filteringDemo() {
  class FilteredSubscription {
    constructor() { this.subscriptions = []; }
    subscribe(name, filterFn, transformFn = null) {
      this.subscriptions.push({ name, filter: filterFn, transform: transformFn, received: [] });
    }
    publish(event) {
      const report = [];
      this.subscriptions.forEach((sub) => {
        if (sub.filter(event)) { sub.received.push(sub.transform ? sub.transform(event) : event); report.push({ name: sub.name, filtered: false }); }
        else report.push({ name: sub.name, filtered: true });
      });
      return report;
    }
  }

  const bus = new FilteredSubscription();

  // Dream11: Different services need different subsets
  bus.subscribe(
    "six-alerts",
    (e) => e.runs === 6,
    (e) => ({ alert: `${e.batsman} hit a SIX! ${e.totalScore}` })
  );

  bus.subscribe(
    "wicket-alerts",
    (e) => e.wicket === true,
    (e) => ({ alert: `WICKET! ${e.batsman} dismissed by ${e.bowler}` })
  );

  bus.subscribe(
    "milestone-alerts",
    (e) => e.batsmanScore && (e.batsmanScore === 50 || e.batsmanScore === 100),
    (e) => ({ alert: `${e.batsman} reaches ${e.batsmanScore}!` })
  );

  bus.subscribe(
    "raw-feed",
    () => true, // receives everything
    null
  );

  console.log("Dream11 event filtering:\n");

  const events = [
    { ball: "18.1", batsman: "Dhoni", runs: 2, totalScore: "172/4", wicket: false },
    { ball: "18.2", batsman: "Dhoni", runs: 0, totalScore: "172/4", wicket: false },
    { ball: "18.3", batsman: "Dhoni", runs: 6, totalScore: "178/4", wicket: false, batsmanScore: 50 },
    { ball: "18.4", batsman: "Jadeja", runs: 4, totalScore: "182/4", wicket: false },
    { ball: "18.5", batsman: "Jadeja", runs: 0, totalScore: "182/5", wicket: true, bowler: "Bumrah" },
    { ball: "18.6", batsman: "Shardul", runs: 1, totalScore: "183/5", wicket: false },
  ];

  events.forEach((e) => {
    const report = bus.publish(e);
    const delivered = report.filter((r) => !r.filtered).map((r) => r.name);
    console.log(`  ${e.ball} ${e.batsman.padEnd(8)} ${e.runs}r -> [${delivered.join(", ")}]`);
  });

  console.log("\nFiltered message counts:");
  bus.subscriptions.forEach((sub) => {
    console.log(`  ${sub.name.padEnd(18)}: ${sub.received.length} events`);
    sub.received.forEach((msg) => {
      if (msg.alert) console.log(`    -> ${msg.alert}`);
    });
  });
}

filteringDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Pub/Sub vs Message Queue Comparison
// ════════════════════════════════════════════════════════════════

// WHY: They solve different problems — know when to use which.

console.log("\n\n=== SECTION 8: Pub/Sub vs Message Queue Comparison ===\n");

function comparisonDemo() {
  console.log("Feature Comparison:\n");

  const comparisons = [
    ["Delivery model",   "Point-to-point (1 consumer)",  "Broadcast (all subscribers)"],
    ["Message lifetime", "Deleted after consumption",     "Retained per policy"],
    ["Consumer coupling","Tight (must exist)",            "Loose (fire & forget)"],
    ["Ordering",         "FIFO guaranteed",               "Per-partition only"],
    ["Replay",           "No (consumed = gone)",          "Yes (from offset/time)"],
    ["Backpressure",     "Natural (queue depth)",         "Consumer manages own pace"],
    ["Use case",         "Task processing, work items",   "Event notifications, streaming"],
  ];
  comparisons.forEach(([f, q, p]) => {
    console.log(`  ${f}:\n    Queue: ${q}\n    PubSub: ${p}\n`);
  });

  // Dream11 uses both
  console.log("Dream11 uses BOTH patterns:\n");

  console.log("  Message Queue (task processing):");
  console.log("    - Prize calculation jobs: each contest processed once");
  console.log("    - Withdrawal requests: each request handled by 1 worker");
  console.log("    - Team validation: each team checked once before deadline\n");

  console.log("  Pub/Sub (event broadcasting):");
  console.log("    - Ball-by-ball scores: all services need every event");
  console.log("    - Player injury updates: leaderboard + fantasy + alerts");
  console.log("    - Match start/end: triggers across 10+ downstream services\n");

  // Hybrid pattern
  console.log("  Hybrid: Pub/Sub + Consumer Groups = scalable broadcast");
  console.log("    Each GROUP gets every message (pub/sub), within a group only 1 consumer processes (queue).");
  console.log("    This is exactly what Apache Kafka does.");

  // Demonstrate the hybrid
  console.log("\n  Dream11 Kafka-style hybrid (topic: 'ball-events', 6 partitions):");
  console.log("    Group 'fantasy':  3 consumers, each handles 2 partitions");
  console.log("    Group 'leaderboard': 2 consumers, each handles 3 partitions");
  console.log("    Group 'notifications': 6 consumers, each handles 1 partition");
  console.log("    -> Every group sees ALL events (pub/sub)");
  console.log("    -> Within each group, work is divided (queue)");
}

comparisonDemo();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("\n\n=== KEY TAKEAWAYS ===\n");
console.log("1. Pub/sub decouples publishers from subscribers — add services without changing publishers.");
console.log("2. Topic-based routing delivers events only to relevant subscribers.");
console.log("3. Wildcard subscriptions (*, #) simplify subscribing to topic hierarchies.");
console.log("4. An event bus is the backbone of event-driven microservices.");
console.log("5. Consumer groups scale subscribers horizontally with partition assignment.");
console.log("6. Ordering is guaranteed within a partition, not across partitions.");
console.log("7. Event filtering at the bus reduces unnecessary processing at consumers.");
console.log("8. Use queues for task processing, pub/sub for event broadcasting — or combine both.\n");
console.log('"When Dhoni hits a six at Wankhede, Dream11 doesn\'t call each service');
console.log(" one by one. It publishes one event, and 150 million fantasy scores");
console.log(' update themselves."');
console.log("\n[End of File 15 — Pub/Sub and Event-Driven Architecture]");
