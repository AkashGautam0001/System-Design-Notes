/** ============================================================
 *  FILE 16: EVENT SOURCING AND CQRS
 *  ============================================================
 *  Topic: Event sourcing, event replay, snapshots, CQRS,
 *         read models, projections, event versioning,
 *         temporal queries
 *
 *  WHY THIS MATTERS:
 *  Traditional CRUD overwrites data in place, destroying history.
 *  Event sourcing captures every change as an immutable event,
 *  enabling full audit trails and time-travel debugging. CQRS
 *  separates read and write concerns for independent scaling.
 *  ============================================================ */

// STORY: IRCTC Booking Ledger
// When you book a train ticket on IRCTC, every action — search,
// reserve, pay, confirm, cancel — is recorded as an immutable event.
// Your PNR status is a projected view computed by replaying all events.
// If a dispute arises, IRCTC replays the event chain to reconstruct
// exactly what happened. Event sourcing at national scale.

console.log("=".repeat(65));
console.log("  FILE 16: EVENT SOURCING AND CQRS");
console.log("  IRCTC Booking Ledger — every action is an event");
console.log("=".repeat(65));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Traditional CRUD vs Event Sourcing
// ════════════════════════════════════════════════════════════════

// WHY: CRUD mutates state in place, losing all history.
console.log("--- Section 1: Traditional CRUD vs Event Sourcing ---\n");

class TraditionalBookingCRUD {
  constructor() { this.bookings = {}; }
  createBooking(pnr, passenger, train) {
    this.bookings[pnr] = { pnr, passenger, train, status: "CONFIRMED", seat: "B1-32" };
  }
  cancelBooking(pnr) {
    if (this.bookings[pnr]) this.bookings[pnr].status = "CANCELLED";
  }
  get(pnr) { return this.bookings[pnr]; }
}

const crud = new TraditionalBookingCRUD();
crud.createBooking("PNR001", "Rajesh Kumar", "Rajdhani Express");
console.log("CRUD after create:", JSON.stringify(crud.get("PNR001")));
// Output: {"pnr":"PNR001","passenger":"Rajesh Kumar","train":"Rajdhani Express","status":"CONFIRMED","seat":"B1-32"}
crud.cancelBooking("PNR001");
console.log("CRUD after cancel:", JSON.stringify(crud.get("PNR001")));
// Output: status is CANCELLED — previous state LOST forever
console.log("Problem: Cannot tell WHEN it was confirmed or WHO cancelled.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Event Store Implementation
// ════════════════════════════════════════════════════════════════

// WHY: The event store is the single source of truth — an append-only log.
console.log("--- Section 2: Event Store Implementation ---\n");

class EventStore {
  constructor() { this.events = []; this.subscribers = []; this.seq = 0; }
  append(streamId, eventType, data) {
    const event = { seq: ++this.seq, streamId, eventType, data,
      metadata: { timestamp: Date.now() + this.seq, version: 1 } };
    this.events.push(event);
    this.subscribers.forEach(fn => fn(event));
    return event;
  }
  getStream(id) { return this.events.filter(e => e.streamId === id); }
  getAllEvents() { return [...this.events]; }
  subscribe(fn) { this.subscribers.push(fn); }
  get length() { return this.events.length; }
}

const store = new EventStore();
store.append("PNR-4512", "BookingInitiated", { passenger: "Priya Sharma", train: "12301 Rajdhani", class: "3A" });
store.append("PNR-4512", "SeatAllocated", { coach: "B1", seat: 32 });
store.append("PNR-4512", "PaymentProcessed", { amount: 2450, method: "UPI" });
store.append("PNR-4512", "BookingConfirmed", { status: "CNF" });
store.append("PNR-4512", "ChartPrepared", { finalSeat: "B1-32" });

console.log("Events in stream PNR-4512:");
store.getStream("PNR-4512").forEach(e => {
  console.log(`  [${e.seq}] ${e.eventType}: ${JSON.stringify(e.data)}`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Replaying Events to Rebuild State
// ════════════════════════════════════════════════════════════════

// WHY: State is computed by replaying events — never stored directly.
console.log("--- Section 3: Replaying Events to Rebuild State ---\n");

class BookingProjection {
  constructor() { this.state = {}; }
  apply(event) {
    const pnr = event.streamId;
    if (!this.state[pnr]) this.state[pnr] = { pnr, status: "UNKNOWN", history: [] };
    const b = this.state[pnr];
    switch (event.eventType) {
      case "BookingInitiated": Object.assign(b, event.data); b.status = "INITIATED"; break;
      case "SeatAllocated": b.coach = event.data.coach; b.seat = event.data.seat; b.status = "SEAT_ALLOCATED"; break;
      case "PaymentProcessed": b.amountPaid = event.data.amount; b.status = "PAYMENT_DONE"; break;
      case "BookingConfirmed": b.status = "CONFIRMED"; break;
      case "BookingCancelled": b.status = "CANCELLED"; b.refundAmount = event.data.refundAmount; break;
      case "ChartPrepared": b.finalSeat = event.data.finalSeat; b.status = "CHART_PREPARED"; break;
    }
    b.history.push({ event: event.eventType, at: event.metadata.timestamp });
    return b;
  }
  replayAll(events) { this.state = {}; events.forEach(e => this.apply(e)); return this.state; }
  getState(pnr) { return this.state[pnr]; }
}

const projection = new BookingProjection();
projection.replayAll(store.getAllEvents());
const pnrState = projection.getState("PNR-4512");
console.log("Rebuilt state from events:");
console.log(`  Passenger: ${pnrState.passenger}, Status: ${pnrState.status}, Seat: ${pnrState.finalSeat}`);

store.append("PNR-4512", "BookingCancelled", { refundAmount: 2200, reason: "passenger request" });
projection.replayAll(store.getAllEvents());
const afterCancel = projection.getState("PNR-4512");
console.log(`  After cancel: Status=${afterCancel.status}, Refund=Rs ${afterCancel.refundAmount}`);
console.log(`  Total history steps: ${afterCancel.history.length}\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Snapshots for Performance
// ════════════════════════════════════════════════════════════════

// WHY: Replaying thousands of events is slow. Snapshots checkpoint state.
console.log("--- Section 4: Snapshots for Performance ---\n");

class SnapshotStore {
  constructor(eventStore) { this.eventStore = eventStore; this.snapshots = {}; }
  takeSnapshot(streamId) {
    const events = this.eventStore.getStream(streamId);
    const proj = new BookingProjection();
    events.forEach(e => proj.apply(e));
    this.snapshots[streamId] = {
      state: JSON.parse(JSON.stringify(proj.getState(streamId))),
      lastSeq: events[events.length - 1].seq
    };
  }
  rebuildFromSnapshot(streamId) {
    const snapshot = this.snapshots[streamId];
    const proj = new BookingProjection();
    if (snapshot) {
      proj.state[streamId] = JSON.parse(JSON.stringify(snapshot.state));
      const newEvents = this.eventStore.getStream(streamId).filter(e => e.seq > snapshot.lastSeq);
      console.log(`  Snapshot at seq ${snapshot.lastSeq}, replaying ${newEvents.length} new events`);
      newEvents.forEach(e => proj.apply(e));
    } else {
      const all = this.eventStore.getStream(streamId);
      console.log(`  No snapshot, replaying all ${all.length} events`);
      all.forEach(e => proj.apply(e));
    }
    return proj.getState(streamId);
  }
}

const snapStore = new SnapshotStore(store);
snapStore.takeSnapshot("PNR-4512");
store.append("PNR-4512", "BookingInitiated", { passenger: "Priya Sharma", train: "12302 Return", class: "3A" });
store.append("PNR-4512", "PaymentProcessed", { amount: 2500, method: "Card" });
const rebuilt = snapStore.rebuildFromSnapshot("PNR-4512");
console.log(`  Rebuilt status: ${rebuilt.status}`);
const total = store.getStream("PNR-4512").length;
console.log(`  Savings: ${((1 - 2/total) * 100).toFixed(0)}% fewer events replayed\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 5 — CQRS Pattern (Separate Read/Write)
// ════════════════════════════════════════════════════════════════

// WHY: Reads and writes have different scaling needs. CQRS separates them.
console.log("--- Section 5: CQRS Pattern (Separate Read/Write) ---\n");

class BookingCommandHandler {
  constructor(es) { this.es = es; }
  initiateBooking(pnr, p, t, c) { return this.es.append(pnr, "BookingInitiated", { passenger: p, train: t, class: c }); }
  processPayment(pnr, amt, m) { return this.es.append(pnr, "PaymentProcessed", { amount: amt, method: m }); }
  confirmBooking(pnr) { return this.es.append(pnr, "BookingConfirmed", { status: "CNF" }); }
  cancelBooking(pnr, refund, reason) { return this.es.append(pnr, "BookingCancelled", { refundAmount: refund, reason }); }
}

class BookingQueryHandler {
  constructor() { this.details = {}; this.occupancy = {}; this.revenue = {}; }
  handleEvent(event) {
    const pnr = event.streamId;
    if (event.eventType === "BookingInitiated") {
      this.details[pnr] = { ...event.data, status: "INITIATED", pnr };
    } else if (event.eventType === "BookingConfirmed") {
      if (this.details[pnr]) { this.details[pnr].status = "CONFIRMED"; }
      const train = this.details[pnr] ? this.details[pnr].train : "?";
      this.occupancy[train] = (this.occupancy[train] || 0) + 1;
    } else if (event.eventType === "PaymentProcessed") {
      const train = this.details[pnr] ? this.details[pnr].train : "unknown";
      this.revenue[train] = (this.revenue[train] || 0) + event.data.amount;
    }
  }
}

const cqrsStore = new EventStore();
const cmd = new BookingCommandHandler(cqrsStore);
const query = new BookingQueryHandler();
cqrsStore.subscribe(e => query.handleEvent(e));

cmd.initiateBooking("PNR-100", "Amit Patel", "12951 Mumbai Rajdhani", "2A");
cmd.processPayment("PNR-100", 3200, "UPI");
cmd.confirmBooking("PNR-100");
cmd.initiateBooking("PNR-101", "Sneha Reddy", "12951 Mumbai Rajdhani", "3A");
cmd.processPayment("PNR-101", 2100, "Card");
cmd.confirmBooking("PNR-101");

console.log("Query — Booking:", JSON.stringify(query.details["PNR-100"]));
console.log("Query — Occupancy:", JSON.stringify(query.occupancy));
console.log("Query — Revenue:", JSON.stringify(query.revenue));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Read Model Projections
// ════════════════════════════════════════════════════════════════

// WHY: Projections transform raw events into denormalized read models.
console.log("--- Section 6: Read Model Projections ---\n");

class PNRStatusProjection {
  constructor() { this.statuses = {}; }
  project(events) {
    events.forEach(e => {
      const pnr = e.streamId;
      if (e.eventType === "BookingInitiated") this.statuses[pnr] = { pnr, passenger: e.data.passenger, status: "WL" };
      else if (e.eventType === "BookingConfirmed" && this.statuses[pnr]) this.statuses[pnr].status = "CNF";
      else if (e.eventType === "BookingCancelled" && this.statuses[pnr]) this.statuses[pnr].status = "CAN";
    });
  }
}

class DailySummaryProjection {
  constructor() { this.summary = { total: 0, confirmed: 0, revenue: 0 }; }
  project(events) {
    events.forEach(e => {
      if (e.eventType === "BookingInitiated") this.summary.total++;
      if (e.eventType === "BookingConfirmed") this.summary.confirmed++;
      if (e.eventType === "PaymentProcessed") this.summary.revenue += e.data.amount;
    });
  }
}

const pnrProj = new PNRStatusProjection();
pnrProj.project(cqrsStore.getAllEvents());
console.log("PNR Status Board:");
Object.values(pnrProj.statuses).forEach(s => {
  console.log(`  ${s.pnr}: ${s.passenger} — ${s.status}`);
});
const summaryProj = new DailySummaryProjection();
summaryProj.project(cqrsStore.getAllEvents());
console.log(`Daily Summary: ${JSON.stringify(summaryProj.summary)}\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Event Versioning
// ════════════════════════════════════════════════════════════════

// WHY: Event schemas evolve. Handle old formats without breaking replay.
console.log("--- Section 7: Event Versioning ---\n");

class EventUpgrader {
  constructor() { this.upgraders = {}; }
  register(type, from, to, fn) { this.upgraders[`${type}:${from}:${to}`] = fn; }
  upgrade(event) {
    let upgraded = { ...event, data: { ...event.data }, metadata: { ...event.metadata } };
    let v = event.metadata.version || 1;
    while (this.upgraders[`${event.eventType}:${v}:${v+1}`]) {
      upgraded = this.upgraders[`${event.eventType}:${v}:${v+1}`](upgraded);
      upgraded.metadata.version = ++v;
    }
    return upgraded;
  }
}

const upgrader = new EventUpgrader();
upgrader.register("PaymentProcessed", 1, 2, e => ({ ...e, data: { ...e.data, currency: e.data.currency || "INR" } }));
upgrader.register("PaymentProcessed", 2, 3, e => ({ ...e, data: { ...e.data, gateway: e.data.gateway || "IRCTC-PG" } }));

const oldEvt = { eventType: "PaymentProcessed", data: { amount: 2500, method: "UPI" }, metadata: { version: 1 } };
const upgradedEvt = upgrader.upgrade(oldEvt);
console.log("Original v1:", JSON.stringify(oldEvt.data));
console.log("Upgraded v3:", JSON.stringify(upgradedEvt.data));
console.log("Version:", upgradedEvt.metadata.version, "\n");

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Temporal Queries
// ════════════════════════════════════════════════════════════════

// WHY: Event sourcing enables time-travel — see state at any point in time.
console.log("--- Section 8: Temporal Queries ---\n");

class TemporalQueryEngine {
  constructor(es) { this.es = es; }
  getStateAt(streamId, upToSeq) {
    const events = this.es.getStream(streamId).filter(e => e.seq <= upToSeq);
    const proj = new BookingProjection();
    events.forEach(e => proj.apply(e));
    return proj.getState(streamId);
  }
  getStateHistory(streamId) {
    const events = this.es.getStream(streamId);
    const proj = new BookingProjection();
    return events.map(e => { proj.apply(e); return { seq: e.seq, event: e.eventType, status: proj.getState(streamId).status }; });
  }
  diffBetween(streamId, s1, s2) {
    const st1 = this.getStateAt(streamId, s1), st2 = this.getStateAt(streamId, s2);
    const changes = {};
    if (st1 && st2) { for (const k of Object.keys(st2)) { if (k !== "history" && JSON.stringify(st1[k]) !== JSON.stringify(st2[k])) changes[k] = { from: st1[k], to: st2[k] }; } }
    return changes;
  }
}

const temporal = new TemporalQueryEngine(store);
console.log("Time-travel: PNR-4512 state after each event:");
temporal.getStateHistory("PNR-4512").forEach(h => {
  console.log(`  [seq ${h.seq}] ${h.event} => ${h.status}`);
});

console.log("\nDiff between seq 1 and seq 5:");
const diff = temporal.diffBetween("PNR-4512", 1, 5);
Object.entries(diff).forEach(([k, v]) => console.log(`  ${k}: "${v.from}" -> "${v.to}"`));

// Full IRCTC lifecycle simulation
console.log("\n--- Full IRCTC Lifecycle Simulation ---\n");
const irctcStore = new EventStore();
const irctcCmd = new BookingCommandHandler(irctcStore);
const irctcQ = new BookingQueryHandler();
irctcStore.subscribe(e => irctcQ.handleEvent(e));

["Arjun Nair", "Meera Iyer", "Vikram Singh", "Deepa Rao"].forEach((p, i) => {
  const pnr = `PNR-${200 + i}`, train = ["12301 Rajdhani", "12627 Karnataka Exp", "22691 Bengaluru Rajdhani"][i % 3];
  irctcCmd.initiateBooking(pnr, p, train, "3A");
  irctcCmd.processPayment(pnr, 1800 + i * 200, i % 2 === 0 ? "UPI" : "Card");
  i !== 2 ? irctcCmd.confirmBooking(pnr) : irctcCmd.cancelBooking(pnr, 1500, "change of plans");
});
console.log("IRCTC Dashboard — Occupancy:", JSON.stringify(irctcQ.occupancy));
console.log("IRCTC Dashboard — Revenue:", JSON.stringify(irctcQ.revenue));
console.log(`Total events: ${irctcStore.length}\n`);

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════
console.log("=".repeat(65));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(65));
console.log(`
  1. Event sourcing stores every change as an immutable event.
  2. Current state is derived by replaying events from the start.
  3. Snapshots checkpoint state so replay skips old events.
  4. CQRS separates commands (writes) from queries (reads).
  5. Read model projections are denormalized views from events.
  6. Event versioning handles schema evolution without breakage.
  7. Temporal queries let you time-travel to any past state.
  8. The event store is the single source of truth.

  IRCTC Wisdom: "In the ledger of events, nothing is ever lost —
  every ticket tells its complete story from search to journey's end."
`);
