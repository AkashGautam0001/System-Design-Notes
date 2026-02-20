/** ============================================================
 *  FILE 25: EVENT-DRIVEN ARCHITECTURE
 *  ============================================================
 *  Topic: EDA, domain events, choreography vs orchestration,
 *         outbox pattern, idempotent consumers
 *
 *  WHY THIS MATTERS:
 *  In microservices, services must react to changes in other
 *  services without tight coupling. Event-driven architecture
 *  enables loose coupling, real-time reactivity, and scalability.
 *  Without proper patterns like outbox and idempotent consumers,
 *  you risk lost events and duplicate processing.
 *  ============================================================ */

// STORY: Zepto 10-Minute Delivery
// When a customer places an order on Zepto, a cascade of actions
// must happen in under 10 minutes: inventory reserved at the dark
// store, delivery partner assigned, packer notified, payment
// processed, and customer gets real-time tracking. Each is a
// separate service reacting to domain events.

console.log("=".repeat(70));
console.log("  FILE 25: EVENT-DRIVEN ARCHITECTURE");
console.log("  Domain Events, Choreography, Orchestration, Outbox, Idempotency");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Event-Driven Architecture Overview
// ════════════════════════════════════════════════════════════════

// WHY: With events, service A publishes what happened and
// interested services react — no direct coupling.

console.log("--- SECTION 1: Event-Driven Architecture Overview ---\n");

console.log("  Traditional (Request-Response):");
console.log("    OrderService -> calls Inventory, Payment, Notification, Delivery");
console.log("    Problem: OrderService knows about ALL downstream services\n");
console.log("  Event-Driven:");
console.log("    OrderService -> publishes 'OrderPlaced' event");
console.log("    Inventory, Payment, Notification, Delivery listen independently");
console.log("    Benefit: OrderService knows about NONE of them\n");
console.log("  Benefits:");
["Loose coupling — producer does not know about consumers",
 "Scalability — add consumers without modifying producer",
 "Resilience — if one consumer is down, events queue up",
 "Audit trail — events form a natural log of everything",
].forEach((b, i) => console.log(`    ${i + 1}. ${b}`));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Domain Events Design
// ════════════════════════════════════════════════════════════════

// WHY: Well-designed events carry enough context for consumers
// to act independently without calling back to the producer.

console.log("--- SECTION 2: Domain Events Design ---\n");

class DomainEvent {
  constructor(type, aggregateId, data, source = "unknown") {
    this.eventId = `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    this.type = type;
    this.aggregateId = aggregateId;
    this.data = data;
    this.metadata = { timestamp: new Date().toISOString(), version: 1, source, correlationId: `corr-${Date.now()}` };
  }
}

const orderPlaced = new DomainEvent("OrderPlaced", "order-5001", {
  customerId: "cust-101",
  items: [{ sku: "MILK-001", name: "Amul Milk 1L", qty: 2, price: 65 }, { sku: "BREAD-042", name: "Britannia Bread", qty: 1, price: 45 }],
  totalAmount: 175,
  deliveryAddress: { area: "Andheri West, Mumbai" },
  darkStoreId: "store-mumbai-07",
}, "OrderService");

console.log("  Well-Designed Domain Event:");
console.log(`  ${JSON.stringify(orderPlaced, null, 2)}\n`);
console.log("  Event Design Rules:");
console.log("    1. Past tense — OrderPlaced, not PlaceOrder");
console.log("    2. Include enough context — consumers need not callback");
console.log("    3. Immutable — events are facts, never modify them");
console.log("    4. Versioned — include version for schema evolution");
console.log("    5. Correlation ID — trace related events\n");

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Choreography (Decentralized)
// ════════════════════════════════════════════════════════════════

// WHY: Each service listens for events and publishes its own.
// No central coordinator — like dancers in a flash mob.

console.log("--- SECTION 3: Choreography (Decentralized) ---\n");

class EventBus {
  constructor() { this.subs = {}; this.log = []; }
  subscribe(type, name, fn) { if (!this.subs[type]) this.subs[type] = []; this.subs[type].push({ name, fn }); }
  publish(event) {
    this.log.push(event);
    console.log(`  [EventBus] Published: ${event.type} (${event.eventId})`);
    (this.subs[event.type] || []).forEach(({ name, fn }) => { console.log(`    -> ${name} handling`); fn(event); });
    console.log();
  }
}

const bus = new EventBus();

bus.subscribe("OrderPlaced", "InventoryService", (e) => {
  e.data.items.forEach((i) => console.log(`      Reserving ${i.name} x${i.qty}`));
  bus.publish(new DomainEvent("InventoryReserved", e.aggregateId, { orderId: e.aggregateId, darkStoreId: e.data.darkStoreId }, "InventoryService"));
});

bus.subscribe("OrderPlaced", "PaymentService", (e) => {
  console.log(`      Charging Rs.${e.data.totalAmount} to ${e.data.customerId}`);
  bus.publish(new DomainEvent("PaymentProcessed", e.aggregateId, { orderId: e.aggregateId, amount: e.data.totalAmount }, "PaymentService"));
});

bus.subscribe("InventoryReserved", "DeliveryService", (e) => {
  console.log(`      Assigning rider near ${e.data.darkStoreId}`);
  bus.publish(new DomainEvent("DeliveryAssigned", e.aggregateId, { orderId: e.aggregateId, riderName: "Suresh", eta: 8 }, "DeliveryService"));
});

bus.subscribe("DeliveryAssigned", "NotificationService", (e) => {
  console.log(`      Push: "${e.data.riderName} will deliver in ${e.data.eta} mins"`);
});

console.log("  Zepto Order Flow — Choreography:\n");
bus.publish(orderPlaced);
console.log("  No central coordinator — each service reacts independently\n");

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Orchestration (Centralized)
// ════════════════════════════════════════════════════════════════

// WHY: A central coordinator tells each service what to do. Like
// a conductor directing an orchestra — easier to debug.

console.log("--- SECTION 4: Orchestration (Centralized) ---\n");

class OrderOrchestrator {
  constructor() { this.log = []; }
  step(name, result) { this.log.push({ name, result }); console.log(`    Step: ${name} -> ${result}`); }
  execute(order) {
    console.log(`  [Orchestrator] Starting order flow for ${order.orderId}\n`);
    this.step("Validate", "Items available, address valid");
    this.step("ReserveInventory", `Reserved ${order.items.length} items at ${order.darkStoreId}`);
    this.step("ProcessPayment", `Charged Rs.${order.totalAmount} via UPI`);
    this.step("AssignDelivery", `Rider Suresh assigned, ETA 8 min`);
    this.step("Notify", `Push notification sent`);
    console.log(`\n  [Orchestrator] COMPLETED (${this.log.length} steps)\n`);
  }
}
new OrderOrchestrator().execute({
  orderId: "order-5001", items: [{ name: "Milk" }, { name: "Bread" }],
  totalAmount: 175, darkStoreId: "store-mumbai-07",
});

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Choreography vs Orchestration Comparison
// ════════════════════════════════════════════════════════════════

// WHY: Choosing between them is one of the most important EDA
// design decisions.

console.log("--- SECTION 5: Choreography vs Orchestration ---\n");

[["Aspect", "Choreography", "Orchestration"],
 ["Coupling", "Loose (event-based)", "Tighter (central coordinator)"],
 ["Visibility", "Hard to trace flow", "Easy (central definition)"],
 ["Adding Steps", "Just subscribe", "Modify orchestrator"],
 ["Error Handling", "Complex (distributed)", "Centralized (clear rollback)"],
 ["SPOF", "None", "Orchestrator is SPOF"],
 ["Best For", "Simple, few services", "Complex, many steps"],
].forEach(([a, c, o]) => console.log(`  ${a.padEnd(16)} | ${c.padEnd(28)} | ${o}`));
console.log("\n  Zepto uses HYBRID: choreography for cross-domain, orchestration for critical flow\n");

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Transactional Outbox Pattern
// ════════════════════════════════════════════════════════════════

// WHY: The dual-write problem: updating DB AND publishing event
// can partially fail. Outbox writes event to DB in same transaction.

console.log("--- SECTION 6: Transactional Outbox Pattern ---\n");

class OutboxService {
  constructor(name) { this.name = name; this.db = { orders: [], outbox: [] }; this.nextId = 1; }
  createOrder(data) {
    console.log(`  [${this.name}] Creating order in transaction:\n`);
    console.log("    BEGIN TRANSACTION");
    const order = { id: `order-${this.nextId++}`, ...data, status: "created" };
    this.db.orders.push(order);
    console.log(`    1. INSERT into orders: ${order.id}`);
    const outboxEntry = { id: `ob-${Date.now()}`, eventType: "OrderPlaced", aggregateId: order.id,
      payload: JSON.stringify({ orderId: order.id, customerId: data.customerId, items: data.items, totalAmount: data.totalAmount }),
      status: "PENDING" };
    this.db.outbox.push(outboxEntry);
    console.log(`    2. INSERT into outbox: ${outboxEntry.eventType} for ${order.id}`);
    console.log("    COMMIT TRANSACTION\n");
    console.log("    Both order AND event are written atomically.");
    console.log("    If DB crashes, both roll back — no orphan events.\n");
    return order;
  }
  getPending() { return this.db.outbox.filter((e) => e.status === "PENDING"); }
  markPublished(id) { const e = this.db.outbox.find((x) => x.id === id); if (e) e.status = "PUBLISHED"; }
}

class PollingPublisher {
  constructor(service) { this.service = service; this.count = 0; }
  poll() {
    const pending = this.service.getPending();
    if (!pending.length) { console.log("  [Publisher] No pending events\n"); return; }
    console.log(`  [Publisher] Found ${pending.length} pending event(s):`);
    pending.forEach((e) => { console.log(`    Publishing: ${e.eventType} for ${e.aggregateId}`); this.service.markPublished(e.id); this.count++; });
    console.log(`    Total published: ${this.count}\n`);
  }
}

const outboxSvc = new OutboxService("Zepto-OrderService");
outboxSvc.createOrder({ customerId: "cust-201", items: [{ name: "Curd" }, { name: "Paneer" }], totalAmount: 130 });
outboxSvc.createOrder({ customerId: "cust-202", items: [{ name: "Rice 5kg" }], totalAmount: 350 });

console.log("  --- Polling Publisher runs ---\n");
const pub = new PollingPublisher(outboxSvc);
pub.poll();
pub.poll(); // Second poll — nothing pending

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Idempotent Consumer Pattern
// ════════════════════════════════════════════════════════════════

// WHY: Same event may be delivered multiple times. Without
// idempotency, duplicate PaymentProcessed charges customer twice.

console.log("--- SECTION 7: Idempotent Consumer Pattern ---\n");

class IdempotentConsumer {
  constructor(name) { this.name = name; this.processed = new Set(); }
  handle(event) {
    if (this.processed.has(event.eventId)) {
      console.log(`  [${this.name}] DUPLICATE: ${event.eventId} — SKIPPING`);
      return { status: "skipped" };
    }
    console.log(`  [${this.name}] Processing: ${event.type} (${event.eventId})`);
    this.processed.add(event.eventId);
    const result = event.type === "OrderPlaced"
      ? `Charged Rs.${event.data.totalAmount} to ${event.data.customerId}`
      : `Handled ${event.type}`;
    console.log(`    Result: ${result}`);
    return { status: "processed" };
  }
}

const payConsumer = new IdempotentConsumer("PaymentService");
const delConsumer = new IdempotentConsumer("DeliveryService");
const testEvt1 = new DomainEvent("OrderPlaced", "order-7001", { customerId: "cust-301", totalAmount: 450 }, "OrderService");
const testEvt2 = new DomainEvent("InventoryReserved", "order-7001", { orderId: "order-7001" }, "InventoryService");

console.log("  --- Normal Processing ---");
payConsumer.handle(testEvt1);
delConsumer.handle(testEvt2);
console.log("\n  --- Duplicate Delivery (network retry) ---");
payConsumer.handle(testEvt1);
delConsumer.handle(testEvt2);

console.log("\n  Strategies: Event ID tracking | Idempotency key | Natural idempotency | Conditional update\n");

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Complete Zepto Order Flow
// ════════════════════════════════════════════════════════════════

// WHY: Everything together — choreography, outbox, idempotent
// consumers in a complete order flow.

console.log("--- SECTION 8: Complete Zepto Order Flow ---\n");

class ZeptoSystem {
  constructor() {
    this.bus = new EventBus();
    this.processed = new Set();
    this.inventory = { "store-mumbai-07": { "MILK-001": { name: "Amul Milk", stock: 50 }, "BREAD-042": { name: "Bread", stock: 30 } } };
    this.deliveries = []; this.notifications = [];
    this.setupServices();
  }
  guard(key, eventId) {
    const k = `${key}-${eventId}`;
    if (this.processed.has(k)) return true;
    this.processed.add(k);
    return false;
  }
  setupServices() {
    this.bus.subscribe("OrderPlaced", "InventoryService", (e) => {
      if (this.guard("inv", e.eventId)) return;
      const store = this.inventory[e.data.darkStoreId];
      if (!store) return;
      e.data.items.forEach((i) => {
        const p = store[i.sku];
        if (p && p.stock >= i.qty) { p.stock -= i.qty; console.log(`      Reserved: ${p.name} x${i.qty} (left: ${p.stock})`); }
      });
      this.bus.publish(new DomainEvent("InventoryReserved", e.aggregateId, { orderId: e.aggregateId, darkStoreId: e.data.darkStoreId }, "InventoryService"));
    });
    this.bus.subscribe("OrderPlaced", "PaymentService", (e) => {
      if (this.guard("pay", e.eventId)) return;
      console.log(`      Charging Rs.${e.data.totalAmount} to ${e.data.customerId}`);
      this.bus.publish(new DomainEvent("PaymentProcessed", e.aggregateId, { orderId: e.aggregateId, amount: e.data.totalAmount }, "PaymentService"));
    });
    this.bus.subscribe("InventoryReserved", "DeliveryService", (e) => {
      if (this.guard("del", e.eventId)) return;
      const rider = { orderId: e.data.orderId, riderName: "Amit", eta: 8 };
      this.deliveries.push(rider);
      console.log(`      Assigned rider ${rider.riderName}, ETA: ${rider.eta} min`);
      this.bus.publish(new DomainEvent("DeliveryAssigned", e.aggregateId, rider, "DeliveryService"));
    });
    this.bus.subscribe("DeliveryAssigned", "NotificationService", (e) => {
      if (this.guard("notif", e.eventId)) return;
      const msg = `Your order is on the way! ${e.data.riderName} delivers in ${e.data.eta} min.`;
      this.notifications.push(msg);
      console.log(`      Push: "${msg}"`);
    });
    this.bus.subscribe("PaymentProcessed", "AnalyticsService", (e) => {
      console.log(`      Recorded: Order ${e.data.orderId}, Revenue Rs.${e.data.amount}`);
    });
  }
  placeOrder(customerId, items, darkStoreId) {
    const totalAmount = items.reduce((s, i) => s + i.price * i.qty, 0);
    console.log(`  === New Zepto Order ===`);
    console.log(`  Customer: ${customerId} | Items: ${items.map((i) => `${i.name} x${i.qty}`).join(", ")} | Total: Rs.${totalAmount}\n`);
    this.bus.publish(new DomainEvent("OrderPlaced", `order-${Date.now()}`, { customerId, items, totalAmount, darkStoreId }, "OrderService"));
  }
}

const zepto = new ZeptoSystem();
zepto.placeOrder("cust-401", [
  { sku: "MILK-001", name: "Amul Milk", qty: 2, price: 65 },
  { sku: "BREAD-042", name: "Bread", qty: 1, price: 45 },
], "store-mumbai-07");
console.log("  Complete chain: OrderPlaced -> Inventory + Payment -> Delivery -> Notification\n");

// ════════════════════════════════════════════════════════════════
// SECTION 9 — Event Sourcing Brief
// ════════════════════════════════════════════════════════════════

// WHY: Event sourcing stores state as a sequence of events —
// complete audit trail and time travel.

console.log("--- SECTION 9: Event Sourcing Brief ---\n");

class EventSourcedOrder {
  constructor(id) { this.id = id; this.events = []; this.state = {}; }
  apply(event) {
    this.events.push(event);
    if (event.type === "OrderCreated") this.state = { id: this.id, status: "created", items: event.data.items, total: event.data.total };
    else if (event.type === "PaymentReceived") { this.state.status = "paid"; this.state.paymentId = event.data.paymentId; }
    else if (event.type === "ItemsPacked") { this.state.status = "packed"; }
    else if (event.type === "OutForDelivery") { this.state.status = "out_for_delivery"; this.state.riderId = event.data.riderId; }
    else if (event.type === "Delivered") { this.state.status = "delivered"; this.state.deliveredAt = event.data.time; }
  }
  stateAt(index) {
    const temp = new EventSourcedOrder(this.id);
    for (let i = 0; i <= index; i++) temp.apply(this.events[i]);
    return temp.state;
  }
}

const eso = new EventSourcedOrder("order-8001");
[{ type: "OrderCreated", data: { items: ["Milk", "Bread"], total: 175 } },
 { type: "PaymentReceived", data: { paymentId: "PAY-001" } },
 { type: "ItemsPacked", data: { packerId: "packer-12" } },
 { type: "OutForDelivery", data: { riderId: "rider-287" } },
 { type: "Delivered", data: { time: "10:08 AM" } },
].forEach((e) => eso.apply(e));

console.log("  Event Store:");
eso.events.forEach((e, i) => console.log(`    ${i + 1}. ${e.type}: ${JSON.stringify(e.data)}`));
console.log(`\n  Current State: ${JSON.stringify(eso.state)}`);
console.log(`  State at event 2: ${JSON.stringify(eso.stateAt(1))}`);
console.log("\n  CRUD stores current state only. Event Sourcing stores all events.");
console.log("  Benefits: audit trail, time travel, event replay.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 10 — Production Considerations
// ════════════════════════════════════════════════════════════════

// WHY: Real-world EDA needs ordering, dead letters, schema
// evolution, and monitoring.

console.log("--- SECTION 10: Production Considerations ---\n");

[["Event Ordering", "Events out of order across partitions", "Partition key per entity"],
 ["Dead Letter Queue", "Consumer fails after retries", "Move to DLQ, alert ops team"],
 ["Schema Evolution", "Event schema changes break consumers", "Schema registry (Avro/Protobuf)"],
 ["Event Replay", "New consumer needs history", "Kafka retention, replay from offset 0"],
 ["Monitoring", "Hard to trace flow", "Correlation IDs, distributed tracing"],
 ["Back Pressure", "Producer faster than consumer", "Consumer groups, auto-scaling"],
].forEach(([name, problem, solution]) => console.log(`  ${name}: ${problem}\n    Solution: ${solution}\n`));

console.log("  Event Brokers:");
[["Apache Kafka", "High throughput, durable log"], ["RabbitMQ", "Flexible routing, AMQP"],
 ["AWS SNS/SQS", "Managed, fan-out + queue"], ["Redis Streams", "Low latency, in-memory"],
].forEach(([n, d]) => console.log(`    ${n.padEnd(16)} — ${d}`));
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log();
console.log("  1. EDA decouples producers from consumers via events.");
console.log("  2. Domain events are past-tense facts with enough context.");
console.log("  3. Choreography: decentralized, each service listens and reacts.");
console.log("  4. Orchestration: central coordinator for complex workflows.");
console.log("  5. Outbox pattern solves the dual-write problem atomically.");
console.log("  6. Idempotent consumers handle duplicates by tracking event IDs.");
console.log("  7. Event sourcing stores state as events — audit trail + time travel.");
console.log("  8. Use correlation IDs, DLQs, and schema registries in production.");
console.log();
console.log('  "When you order on Zepto, your single tap triggers a symphony of');
console.log('   events across inventory, payment, delivery, and notification. No');
console.log('   service calls another directly — they all dance to the rhythm of');
console.log('   domain events. That is the power of event-driven architecture."');
console.log();
