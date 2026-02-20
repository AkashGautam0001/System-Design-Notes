/** ============================================================
 *  FILE 14: MESSAGE QUEUES
 *  ============================================================
 *  Topic: Producer-consumer, delivery guarantees, dead letter
 *         queues, backpressure, FIFO, fan-out
 *
 *  WHY THIS MATTERS:
 *  Without message queues, a slow payment service blocks the
 *  entire order flow. Queues decouple producers from consumers,
 *  absorb traffic spikes, and guarantee that no order is lost
 *  even when downstream systems temporarily fail.
 *  ============================================================ */

// STORY: BigBasket Order Processing
// BigBasket processes 2 lakh orders daily across 30 Indian cities.
// When an order is placed, it enters a queue — like a warehouse slip
// rack. Workers (consumers) pick slips one by one. If a slip has a
// problem (wrong address, payment fail), it goes to the "problem
// shelf" (Dead Letter Queue). Backpressure prevents the rack from
// overflowing during festival rush.

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║  FILE 14 — MESSAGE QUEUES                                  ║");
console.log("║  BigBasket: order slip rack, problem shelf, festival rush   ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Simple Queue Implementation
// ════════════════════════════════════════════════════════════════

// WHY: A queue is just a FIFO buffer between producer and consumer.

console.log("=== SECTION 1: Simple Queue Implementation ===\n");

class SimpleQueue {
  constructor(name, capacity = Infinity) {
    this.name = name; this.buffer = []; this.capacity = capacity;
    this.totalEnqueued = 0; this.totalDequeued = 0;
  }
  enqueue(message) {
    if (this.buffer.length >= this.capacity) return { success: false, reason: "Queue full — backpressure!" };
    this.buffer.push({ ...message, enqueuedAt: Date.now(), id: `MSG-${++this.totalEnqueued}` });
    return { success: true, id: `MSG-${this.totalEnqueued}` };
  }
  dequeue() { if (this.buffer.length === 0) return null; this.totalDequeued++; return this.buffer.shift(); }
  peek() { return this.buffer[0] || null; }
  size() { return this.buffer.length; }
  isEmpty() { return this.buffer.length === 0; }
  stats() {
    const util = this.capacity === Infinity ? "N/A" : `${((this.buffer.length / this.capacity) * 100).toFixed(1)}%`;
    return { name: this.name, size: this.buffer.length, capacity: this.capacity, enqueued: this.totalEnqueued, dequeued: this.totalDequeued, utilization: util };
  }
}

function simpleQueueDemo() {
  const orderQueue = new SimpleQueue("bigbasket-orders", 5);

  // BigBasket orders come in
  const orders = [
    { customer: "Priya", items: ["Rice 5kg", "Dal 1kg"], city: "Bangalore" },
    { customer: "Arjun", items: ["Milk 1L", "Bread"], city: "Mumbai" },
    { customer: "Meera", items: ["Onions 2kg", "Tomatoes 1kg"], city: "Chennai" },
    { customer: "Vikram", items: ["Atta 10kg", "Oil 1L"], city: "Delhi" },
    { customer: "Sneha", items: ["Eggs 12", "Butter"], city: "Bangalore" },
    { customer: "Ravi", items: ["Paneer", "Curd"], city: "Hyderabad" },
  ];

  console.log("BigBasket order queue (capacity: 5):\n");
  orders.forEach((o) => {
    const result = orderQueue.enqueue(o);
    const status = result.success ? `Enqueued ${result.id}` : result.reason;
    console.log(`  ${o.customer.padEnd(8)} -> ${status}`);
  });
  // Output: Ravi's order rejected — queue full

  console.log(`\n  Queue stats: ${JSON.stringify(orderQueue.stats())}`);

  // Process orders
  console.log("\n  Processing orders:");
  while (!orderQueue.isEmpty()) {
    const msg = orderQueue.dequeue();
    console.log(`    Processed ${msg.id}: ${msg.customer}'s order (${msg.city})`);
  }
}

simpleQueueDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Producer-Consumer Pattern
// ════════════════════════════════════════════════════════════════

// WHY: Multiple producers and consumers process orders in parallel.

console.log("\n\n=== SECTION 2: Producer-Consumer Pattern ===\n");

function producerConsumerDemo() {
  const queue = new SimpleQueue("order-processing");
  function producer(name, count) {
    for (let i = 0; i < count; i++) queue.enqueue({ source: name, orderId: `${name}-${i+1}`, amount: Math.floor(Math.random()*2000)+200 });
    return count;
  }
  function consumer(name) {
    let n = 0;
    while (!queue.isEmpty()) { queue.dequeue(); n++; }
    return n;
  }

  console.log("Producers (order sources):");
  console.log(`  App: ${producer("APP", 8)}, Web: ${producer("WEB", 5)}, Phone: ${producer("PHONE", 3)}`);
  console.log(`  Queue size: ${queue.size()}\n`);

  console.log("Consumers (warehouse workers):");
  const w1 = consumer("Worker-A"), w2 = consumer("Worker-B"), w3 = consumer("Worker-C");
  console.log(`  Worker-A: ${w1}, Worker-B: ${w2}, Worker-C: ${w3}`);
  console.log(`  Total processed: ${w1+w2+w3}, Queue remaining: ${queue.size()}`);
  console.log("  (First consumer gets all because it's synchronous simulation)");
}

producerConsumerDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — At-Most-Once Delivery
// ════════════════════════════════════════════════════════════════

// WHY: Fire-and-forget — fastest but messages can be lost.

console.log("\n\n=== SECTION 3: At-Most-Once Delivery ===\n");

function atMostOnceDemo() {
  const sent = [], lost = [];
  console.log("BigBasket push notifications (at-most-once):\n");
  const notifications = [
    "Your order OUT FOR DELIVERY", "10% off on fruits today!",
    "Delivery partner Ramesh is 2km away", "Rate your last delivery",
    "Flash sale: Mangoes Rs.99/kg", "Order delivered successfully",
    "Weekly grocery reminder", "New: 10-minute delivery in your area",
    "Refer a friend, get Rs.200", "Your cart has items waiting",
  ];
  let seed = 42;
  function seededRandom() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

  notifications.forEach((n) => {
    if (seededRandom() < 0.2) { lost.push(n); console.log(`  [LOST] "${n}"`); }
    else { sent.push(n); console.log(`  [SENT] "${n}"`); }
  });
  console.log(`\n  Sent: ${sent.length}, Lost: ${lost.length}`);
  console.log("  At-most-once: OK for notifications, NOT for orders or payments.");
}

atMostOnceDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — At-Least-Once Delivery
// ════════════════════════════════════════════════════════════════

// WHY: Retry until acknowledged — message never lost, but may duplicate.

console.log("\n\n=== SECTION 4: At-Least-Once Delivery ===\n");

function atLeastOnceDemo() {
  class AtLeastOnceQueue {
    constructor() { this.buffer = []; this.unacked = new Map(); this.counter = 0; this.log = []; }
    send(msg) { const id = `MSG-${++this.counter}`; this.buffer.push({ id, payload: msg, attempts: 0 }); return id; }
    receive() {
      const msg = this.buffer.shift(); if (!msg) return null;
      msg.attempts++; this.unacked.set(msg.id, msg); this.log.push({ id: msg.id, attempt: msg.attempts }); return msg;
    }
    ack(id) { this.unacked.delete(id); }
    nack(id) { const m = this.unacked.get(id); if (m) { this.unacked.delete(id); this.buffer.push(m); } }
  }

  const queue = new AtLeastOnceQueue();
  console.log("BigBasket order processing (at-least-once):\n");
  queue.send({ order: "ORD-001", customer: "Priya", total: 850 });
  queue.send({ order: "ORD-002", customer: "Arjun", total: 1200 });
  queue.send({ order: "ORD-003", customer: "Meera", total: 430 });

  let count = 0;
  while (queue.buffer.length > 0 && count < 10) {
    const msg = queue.receive(); if (!msg) break; count++;
    if (msg.payload.order === "ORD-002" && msg.attempts === 1) {
      console.log(`  Attempt ${msg.attempts}: ${msg.payload.order} — FAILED (payment gateway timeout)`);
      queue.nack(msg.id); continue;
    }
    queue.ack(msg.id);
    console.log(`  Attempt ${msg.attempts}: ${msg.payload.order} — SUCCESS (${msg.payload.customer})`);
  }
  console.log(`\n  Delivery log: ${JSON.stringify(queue.log.map((d) => `${d.id}#${d.attempt}`))}`);
  console.log("  ORD-002 delivered TWICE — consumer must be IDEMPOTENT.");
}

atLeastOnceDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Exactly-Once Semantics
// ════════════════════════════════════════════════════════════════

// WHY: The holy grail — each message processed exactly once. Hard in practice.

console.log("\n\n=== SECTION 5: Exactly-Once Semantics ===\n");

function exactlyOnceDemo() {
  class ExactlyOnceProcessor {
    constructor() { this.processedIds = new Set(); this.results = []; }
    process(msg) {
      if (this.processedIds.has(msg.id)) return { status: "DUPLICATE_SKIPPED", id: msg.id };
      this.processedIds.add(msg.id); this.results.push(msg.payload);
      return { status: "PROCESSED", id: msg.id };
    }
  }
  const processor = new ExactlyOnceProcessor();

  // Simulate at-least-once delivery with duplicates
  const messages = [
    { id: "MSG-1", payload: { order: "ORD-001", amount: 850 } },
    { id: "MSG-2", payload: { order: "ORD-002", amount: 1200 } },
    { id: "MSG-1", payload: { order: "ORD-001", amount: 850 } }, // duplicate!
    { id: "MSG-3", payload: { order: "ORD-003", amount: 430 } },
    { id: "MSG-2", payload: { order: "ORD-002", amount: 1200 } }, // duplicate!
  ];

  console.log("Exactly-once via idempotent consumer:\n");
  messages.forEach((msg) => {
    const result = processor.process(msg);
    console.log(`  ${msg.id} (${msg.payload.order}): ${result.status}`);
  });

  console.log(`\n  Messages received: ${messages.length}`);
  console.log(`  Actually processed: ${processor.results.length}`);
  console.log(`  Duplicates skipped: ${messages.length - processor.results.length}`);

  console.log("\n  Exactly-once = at-least-once delivery + idempotent consumer");
  console.log("  Idempotency key: order_id, transaction_id, or message_id");
}

exactlyOnceDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Dead Letter Queue (DLQ)
// ════════════════════════════════════════════════════════════════

// WHY: Messages that fail repeatedly need a separate "problem shelf."

console.log("\n\n=== SECTION 6: Dead Letter Queue ===\n");

class MessageQueueWithDLQ {
  constructor(name, maxRetries = 3) {
    this.name = name; this.mainQueue = []; this.dlq = [];
    this.maxRetries = maxRetries; this.stats = { success: 0, dlqd: 0, retries: 0 };
  }
  enqueue(msg) {
    this.mainQueue.push({ ...msg, attempts: 0, id: `M-${Date.now()}-${Math.random().toString(36).slice(2,6)}` });
  }
  processAll(handler) {
    while (this.mainQueue.length > 0) {
      const msg = this.mainQueue.shift(); msg.attempts++;
      try { handler(msg); this.stats.success++; }
      catch (err) {
        if (msg.attempts >= this.maxRetries) { this.dlq.push({ ...msg, error: err.message }); this.stats.dlqd++; }
        else { this.mainQueue.push(msg); this.stats.retries++; }
      }
    }
  }
  reprocessDLQ(handler) {
    const rescued = [], remaining = [];
    for (const msg of this.dlq) { try { handler(msg); rescued.push(msg); } catch(e) { remaining.push(msg); } }
    this.dlq = remaining; return rescued;
  }
}

function dlqDemo() {
  const queue = new MessageQueueWithDLQ("bigbasket-orders", 3);

  // Enqueue orders
  const orders = [
    { order: "ORD-101", customer: "Priya", amount: 850, address: "valid" },
    { order: "ORD-102", customer: "Arjun", amount: 1200, address: "valid" },
    { order: "ORD-103", customer: "Ghost", amount: 0, address: "invalid" },    // problem order
    { order: "ORD-104", customer: "Meera", amount: 430, address: "valid" },
    { order: "ORD-105", customer: "Fake", amount: -100, address: "missing" },   // problem order
    { order: "ORD-106", customer: "Vikram", amount: 2100, address: "valid" },
  ];

  orders.forEach((o) => queue.enqueue(o));

  console.log("BigBasket order processing with DLQ (max 3 retries):\n");

  queue.processAll((msg) => {
    if (msg.amount <= 0) throw new Error(`Invalid amount: ${msg.amount}`);
    if (msg.address === "invalid" || msg.address === "missing") {
      throw new Error(`Bad address: ${msg.address}`);
    }
    // Success
  });

  console.log(`  Successfully processed: ${queue.stats.success}`);
  console.log(`  Retries attempted: ${queue.stats.retries}`);
  console.log(`  Moved to DLQ: ${queue.stats.dlqd}\n`);

  console.log("  Dead Letter Queue contents:");
  queue.dlq.forEach((msg) => {
    console.log(`    ${msg.order} (${msg.customer}): ${msg.error} [${msg.attempts} attempts]`);
  });

  // Manual DLQ re-processing (after fixing issues)
  console.log("\n  After address correction, re-process DLQ:");
  const rescued = queue.reprocessDLQ((msg) => {
    if (msg.amount <= 0) throw new Error("Still invalid");
    console.log(`    Rescued: ${msg.order} (${msg.customer})`);
  });
  console.log(`  Rescued: ${rescued.length}, Still in DLQ: ${queue.dlq.length}`);
}

dlqDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Backpressure Handling
// ════════════════════════════════════════════════════════════════

// WHY: During Diwali rush, producers must slow down or orders overflow.

console.log("\n\n=== SECTION 7: Backpressure Handling ===\n");

function backpressureDemo() {
  class BackpressureQueue {
    constructor(capacity, hw = 0.8, lw = 0.3) {
      this.buffer = []; this.capacity = capacity;
      this.highWater = Math.floor(capacity * hw); this.lowWater = Math.floor(capacity * lw);
      this.accepting = true; this.dropped = 0; this.accepted = 0; this.log = [];
    }
    enqueue(msg) {
      if (this.buffer.length >= this.capacity) { this.dropped++; return { status: "DROPPED" }; }
      if (this.buffer.length >= this.highWater && this.accepting) {
        this.accepting = false; this.log.push(`[BACKPRESSURE ON] Queue at ${this.buffer.length}/${this.capacity}`);
      }
      if (!this.accepting) { this.dropped++; return { status: "REJECTED" }; }
      this.buffer.push(msg); this.accepted++; return { status: "ACCEPTED" };
    }
    dequeue(count = 1) {
      for (let i = 0; i < count && this.buffer.length > 0; i++) this.buffer.shift();
      if (this.buffer.length <= this.lowWater && !this.accepting) {
        this.accepting = true; this.log.push(`[BACKPRESSURE OFF] Queue at ${this.buffer.length}/${this.capacity}`);
      }
    }
  }

  const queue = new BackpressureQueue(100, 0.8, 0.3);

  console.log("BigBasket Diwali rush — queue capacity: 100, high-water: 80%\n");

  // Simulate burst of orders
  console.log("Phase 1: Order burst (150 orders in rapid succession)");
  for (let i = 0; i < 150; i++) {
    queue.enqueue({ order: `ORD-${i}`, time: i });
  }
  console.log(`  Accepted: ${queue.accepted}, Dropped: ${queue.dropped}`);
  queue.log.forEach((l) => console.log(`  ${l}`));

  // Consumers drain the queue
  console.log("\nPhase 2: Workers process 60 orders");
  queue.dequeue(60);
  console.log(`  Queue size: ${queue.buffer.length}`);
  queue.log.forEach((l) => {
    if (!l.includes("ON")) console.log(`  ${l}`);
  });

  // More orders come in — backpressure off
  console.log("\nPhase 3: Backpressure released, new orders accepted");
  const prevDropped = queue.dropped;
  for (let i = 0; i < 10; i++) {
    queue.enqueue({ order: `ORD-NEW-${i}` });
  }
  console.log(`  New orders accepted: ${10 - (queue.dropped - prevDropped)}`);
  console.log(`  Queue size: ${queue.buffer.length}`);

  console.log("\n  Backpressure strategies:");
  console.log("  1. Reject: Return HTTP 429 to producer");
  console.log("  2. Buffer: Store in overflow queue on disk");
  console.log("  3. Sample: Accept every Nth message during overload");
  console.log("  4. Shed load: Drop lowest-priority messages first");
}

backpressureDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — FIFO Queue with Ordering
// ════════════════════════════════════════════════════════════════

// WHY: Some messages MUST be processed in order (payment before shipment).

console.log("\n\n=== SECTION 8: FIFO Queue with Ordering ===\n");

function fifoDemo() {
  class FIFOQueue {
    constructor() { this.groups = {}; this.processing = {}; }
    send(msg, groupId) { if (!this.groups[groupId]) this.groups[groupId] = []; this.groups[groupId].push(msg); }
    receive(groupId) {
      if (this.processing[groupId]) return null;
      const g = this.groups[groupId]; if (!g || g.length === 0) return null;
      this.processing[groupId] = true; return g[0];
    }
    ack(groupId) { this.processing[groupId] = false; if (this.groups[groupId]) this.groups[groupId].shift(); }
  }

  const fifo = new FIFOQueue();

  // BigBasket: Order lifecycle events must be in order per order
  console.log("BigBasket order lifecycle (FIFO per order group):\n");

  fifo.send({ event: "ORDER_PLACED", time: "10:00" }, "ORD-500");
  fifo.send({ event: "PAYMENT_SUCCESS", time: "10:01" }, "ORD-500");
  fifo.send({ event: "PICKING_STARTED", time: "10:15" }, "ORD-500");
  fifo.send({ event: "OUT_FOR_DELIVERY", time: "11:00" }, "ORD-500");
  fifo.send({ event: "DELIVERED", time: "11:30" }, "ORD-500");

  fifo.send({ event: "ORDER_PLACED", time: "10:05" }, "ORD-501");
  fifo.send({ event: "PAYMENT_FAILED", time: "10:06" }, "ORD-501");
  fifo.send({ event: "ORDER_CANCELLED", time: "10:07" }, "ORD-501");

  // Process ORD-500 in order
  console.log("  Processing ORD-500 (must be in order):");
  for (let i = 0; i < 5; i++) {
    const msg = fifo.receive("ORD-500");
    if (msg) {
      console.log(`    [${msg.time}] ${msg.event}`);
      fifo.ack("ORD-500");
    }
  }

  console.log("\n  Processing ORD-501 (independent group):");
  for (let i = 0; i < 3; i++) {
    const msg = fifo.receive("ORD-501");
    if (msg) {
      console.log(`    [${msg.time}] ${msg.event}`);
      fifo.ack("ORD-501");
    }
  }

  console.log("\n  FIFO within group, parallel across groups.");
  console.log("  ORD-500 and ORD-501 process independently.");
}

fifoDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 9 — Fan-Out Pattern
// ════════════════════════════════════════════════════════════════

// WHY: One order event triggers inventory, payment, notification, analytics.

console.log("\n\n=== SECTION 9: Fan-Out Pattern ===\n");

function fanOutDemo() {
  class FanOutQueue {
    constructor() { this.subscribers = {}; }
    addQueue(name) { this.subscribers[name] = []; }
    publish(msg) {
      let n = 0;
      for (const [name, q] of Object.entries(this.subscribers)) { q.push({ ...msg, fanTarget: name }); n++; }
      return n;
    }
    consume(name) { const q = this.subscribers[name]; if (!q) return []; const m = [...q]; q.length = 0; return m; }
  }

  const exchange = new FanOutQueue();

  // BigBasket: Order placed -> fan out to multiple services
  exchange.addQueue("inventory-service");
  exchange.addQueue("payment-service");
  exchange.addQueue("notification-service");
  exchange.addQueue("analytics-service");
  exchange.addQueue("delivery-service");

  console.log("BigBasket order fan-out — 1 order triggers 5 services:\n");

  const order = {
    orderId: "ORD-777",
    customer: "Priya",
    items: [
      { sku: "RICE-5KG", qty: 1, price: 350 },
      { sku: "DAL-1KG", qty: 2, price: 120 },
    ],
    total: 590,
    address: "HSR Layout, Bangalore",
  };

  const count = exchange.publish(order);
  console.log(`  Published order ${order.orderId} -> fanned to ${count} queues\n`);

  // Each service processes independently
  const services = [
    { name: "inventory-service", action: "Reserve items: RICE-5KG(1), DAL-1KG(2)" },
    { name: "payment-service", action: "Charge Rs.590 to wallet" },
    { name: "notification-service", action: "Send SMS: 'Order confirmed'" },
    { name: "analytics-service", action: "Record: Bangalore, groceries, Rs.590" },
    { name: "delivery-service", action: "Assign to HSR Layout dark store" },
  ];

  services.forEach((s) => {
    const msgs = exchange.consume(s.name);
    console.log(`  ${s.name}:`);
    console.log(`    Received: ${msgs.length} message(s)`);
    console.log(`    Action: ${s.action}`);
  });

  console.log("\n  Fan-out decouples the order service from downstream services.");
  console.log("  If analytics-service is down, inventory and payment still work.");
}

fanOutDemo();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("\n\n=== KEY TAKEAWAYS ===\n");
console.log("1. Queues decouple producers from consumers — neither blocks the other.");
console.log("2. At-most-once is fast but lossy — fine for notifications, not for orders.");
console.log("3. At-least-once guarantees delivery but consumers MUST be idempotent.");
console.log("4. Exactly-once = at-least-once + idempotent consumer with deduplication.");
console.log("5. Dead Letter Queues catch poison messages — review and reprocess them.");
console.log("6. Backpressure prevents queue overflow during traffic spikes.");
console.log("7. FIFO per message group ensures ordering where it matters.");
console.log("8. Fan-out broadcasts one event to many services — failure isolation.\n");
console.log('"BigBasket\'s warehouse slip rack never drops an order on the floor.');
console.log(" If a slip can\'t be fulfilled, it goes to the problem shelf —");
console.log(' but it never disappears."');
console.log("\n[End of File 14 — Message Queues]");
