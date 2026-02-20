/**
 * ============================================================
 *  FILE 34 : CQRS & Event Sourcing
 *  Topic  : Command Query Responsibility Segregation,
 *           Event Sourcing, Append-Only Logs
 *  WHY THIS MATTERS:
 *    Traditional CRUD overwrites state — you lose the "why".
 *    Event Sourcing records every change as an immutable event.
 *    CQRS splits reads and writes so each side can optimize
 *    independently. Together they enable audit trails, replays,
 *    and time-travel debugging.
 * ============================================================
 */

// STORY: Patwari Ramesh maintains the village land registry.
// Every mutation (sale, inheritance, division) is an append-only
// entry in the record-of-rights (jamabandi). Nothing is ever erased —
// ownership can always be traced back 50 years.

// ────────────────────────────────────────────────────────────
// BLOCK 1 — CQRS (Separate Read and Write Models)
// ────────────────────────────────────────────────────────────

// WHY: Commands change state, queries read state. Separating them
// lets you optimize writes for consistency and reads for speed.

class MutationRegister {
  constructor() { this.plots = new Map(); }

  execute(command) {
    switch (command.type) {
      case "REGISTER_PLOT": {
        if (this.plots.has(command.id)) throw new Error("Plot already exists");
        this.plots.set(command.id, { id: command.id, owner: command.owner, area: command.area });
        return { event: "PLOT_REGISTERED", id: command.id, owner: command.owner, area: command.area };
      }
      case "SALE": {
        const plot = this.plots.get(command.id);
        if (!plot) throw new Error("Plot not found");
        plot.owner = command.newOwner;
        return { event: "PLOT_SOLD", id: command.id, newOwner: command.newOwner, area: plot.area };
      }
      case "DIVISION": {
        const plot = this.plots.get(command.id);
        if (!plot) throw new Error("Plot not found");
        // WHY: Business rule enforced on the write side only
        if (plot.area < command.splitArea) throw new Error("Insufficient area for division");
        plot.area -= command.splitArea;
        return { event: "PLOT_DIVIDED", id: command.id, remainingArea: plot.area, splitArea: command.splitArea };
      }
      default: throw new Error("Unknown command: " + command.type);
    }
  }

  getState() { return [...this.plots.values()]; }
}

// WHY: Read model is a denormalized projection — fast lookups, no business logic
class FardReadModel {
  constructor() { this.views = new Map(); }

  project(event) {
    if (event.event === "PLOT_REGISTERED") {
      this.views.set(event.id, { id: event.id, owner: event.owner, area: event.area });
    } else if (event.event === "PLOT_SOLD") {
      const v = this.views.get(event.id);
      if (v) v.owner = event.newOwner;
    } else if (event.event === "PLOT_DIVIDED") {
      const v = this.views.get(event.id);
      if (v) v.area = event.remainingArea;
    }
  }

  query(id) { return this.views.get(id) || null; }
  queryAll() { return [...this.views.values()]; }
}

console.log("=== CQRS Pattern ==="); // Output: === CQRS Pattern ===

const mutations = new MutationRegister();
const fard = new FardReadModel();

// Patwari Ramesh executes mutations and projects results to the fard (read side)
const e1 = mutations.execute({ type: "REGISTER_PLOT", id: "K101", owner: "Ramesh Singh", area: 5 });
fard.project(e1);
const e2 = mutations.execute({ type: "SALE", id: "K101", newOwner: "Suresh Yadav" });
fard.project(e2);
const e3 = mutations.execute({ type: "DIVISION", id: "K101", splitArea: 2 });
fard.project(e3);

console.log("Fard query:", JSON.stringify(fard.query("K101"))); // Output: Fard query: {"id":"K101","owner":"Suresh Yadav","area":3}

try {
  mutations.execute({ type: "DIVISION", id: "K101", splitArea: 9999 });
} catch (err) {
  console.log("Mutation rejected:", err.message); // Output: Mutation rejected: Insufficient area for division
}

// ────────────────────────────────────────────────────────────
// BLOCK 2 — Event Sourcing (Append-Only Log, Replay)
// ────────────────────────────────────────────────────────────

// WHY: Instead of storing current state, store every event that
// ever happened. Current state = replaying all events from t=0.

class Jamabandi {
  constructor() { this.events = []; }

  append(event) {
    const stored = { ...event, timestamp: Date.now(), version: this.events.length + 1 };
    this.events.push(stored);
    return stored;
  }

  getStream(plotId) {
    return this.events.filter(e => e.plotId === plotId);
  }

  getAllEvents() { return [...this.events]; }
}

// WHY: Rebuild state by folding events — no mutable DB row needed
function rebuildOwnership(events) {
  return events.reduce((state, evt) => {
    switch (evt.type) {
      case "REGISTERED":
        return { id: evt.plotId, owner: evt.owner, area: evt.area };
      case "INHERITED":
        return { ...state, owner: evt.newOwner };
      case "SOLD":
        return { ...state, owner: evt.newOwner };
      case "MORTGAGED":
        return { ...state, mortgagedTo: evt.bank };
      default:
        return state;
    }
  }, null);
}

console.log("\n=== Event Sourcing (Jamabandi) ==="); // Output: === Event Sourcing (Jamabandi) ===

const registry = new Jamabandi();
registry.append({ plotId: "P200", type: "REGISTERED", owner: "Hari Prasad", area: 10 });
registry.append({ plotId: "P200", type: "INHERITED", newOwner: "Mohan Prasad" });
registry.append({ plotId: "P200", type: "SOLD", newOwner: "Vikram Sharma" });
registry.append({ plotId: "P200", type: "MORTGAGED", bank: "SBI Raipur Branch" });

const history = registry.getStream("P200");
console.log("Events recorded:", history.length); // Output: Events recorded: 4

const current = rebuildOwnership(history);
console.log("Rebuilt state:", current.owner, "area:", current.area); // Output: Rebuilt state: Vikram Sharma area: 10

// WHY: Time-travel — rebuild state at any point in time
const atEvent2 = rebuildOwnership(history.slice(0, 2));
console.log("State at event 2:", atEvent2.owner); // Output: State at event 2: Mohan Prasad

const atEvent3 = rebuildOwnership(history.slice(0, 3));
console.log("State at event 3:", atEvent3.owner); // Output: State at event 3: Vikram Sharma

// ────────────────────────────────────────────────────────────
// BLOCK 3 — CQRS + Event Sourcing (Land Transaction Ledger)
// ────────────────────────────────────────────────────────────

// WHY: Combining both patterns gives you an immutable audit trail
// (Event Sourcing) with optimized read projections (CQRS).

class LandCommandHandler {
  constructor(jamabandi) { this.store = jamabandi; }
  handle(command) {
    switch (command.type) {
      case "ADD_PLOT":
        return this.store.append({
          plotId: command.plotId, type: "PLOT_ADDED",
          owner: command.owner, area: command.area, value: command.value
        });
      case "TRANSFER_PLOT":
        return this.store.append({
          plotId: command.plotId, type: "PLOT_TRANSFERRED", newOwner: command.newOwner
        });
      case "FINALIZE_REGISTRY":
        return this.store.append({ plotId: command.plotId, type: "REGISTRY_FINALIZED" });
      default: throw new Error("Unknown: " + command.type);
    }
  }
}

class LandReadProjection {
  constructor() { this.ledgers = new Map(); }
  apply(event) {
    const id = event.plotId;
    if (!this.ledgers.has(id)) this.ledgers.set(id, { plots: [], totalValue: 0, status: "active" });
    const ledger = this.ledgers.get(id);
    if (event.type === "PLOT_ADDED") {
      ledger.plots.push({ owner: event.owner, area: event.area, value: event.value });
      ledger.totalValue += event.value;
    } else if (event.type === "PLOT_TRANSFERRED") {
      const last = ledger.plots[ledger.plots.length - 1];
      if (last) last.owner = event.newOwner;
    } else if (event.type === "REGISTRY_FINALIZED") { ledger.status = "finalized"; }
  }
  getLedger(id) { return this.ledgers.get(id); }
}

console.log("\n=== CQRS + Event Sourcing: Land Transaction Ledger ==="); // Output: === CQRS + Event Sourcing: Land Transaction Ledger ===

const landStore = new Jamabandi();
const cmdHandler = new LandCommandHandler(landStore);
const projection = new LandReadProjection();

// Patwari Ramesh records land transactions — every action is a command that produces an event
const events = [
  cmdHandler.handle({ type: "ADD_PLOT", plotId: "V1", owner: "Sukhdev", area: 5, value: 500000 }),
  cmdHandler.handle({ type: "ADD_PLOT", plotId: "V1", owner: "Baldev", area: 3, value: 300000 }),
  cmdHandler.handle({ type: "TRANSFER_PLOT", plotId: "V1", newOwner: "Gurpreet" }),
  cmdHandler.handle({ type: "ADD_PLOT", plotId: "V1", owner: "Harjit", area: 2, value: 200000 }),
  cmdHandler.handle({ type: "FINALIZE_REGISTRY", plotId: "V1" })
];

// WHY: Project all events to build the read model
events.forEach(e => projection.apply(e));

const ledger = projection.getLedger("V1");
console.log("Ledger plots:", ledger.plots.length); // Output: Ledger plots: 3
console.log("Ledger total value: \u20B9" + ledger.totalValue); // Output: Ledger total value: ₹1000000
console.log("Ledger status:", ledger.status); // Output: Ledger status: finalized

// WHY: Full audit trail — Patwari Ramesh can review every mutation
const fullLog = landStore.getStream("V1");
console.log("Event log entries:", fullLog.length); // Output: Event log entries: 5
console.log("Event types:", fullLog.map(e => e.type).join(" -> ")); // Output: Event types: PLOT_ADDED -> PLOT_ADDED -> PLOT_TRANSFERRED -> PLOT_ADDED -> REGISTRY_FINALIZED

// WHY: Replay to any point — rebuild ledger at event 2
function rebuildLedger(events) {
  const proj = new LandReadProjection();
  events.forEach(e => proj.apply(e));
  return proj.getLedger(events[0].plotId);
}

const ledgerAtStep2 = rebuildLedger(fullLog.slice(0, 2));
console.log("Ledger at step 2: \u20B9" + ledgerAtStep2.totalValue, "plots:", ledgerAtStep2.plots.length); // Output: Ledger at step 2: ₹800000 plots: 2

// Patwari Ramesh's verdict
console.log("\nPatwari Ramesh's jamabandi never forgets."); // Output: Patwari Ramesh's jamabandi never forgets.

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. CQRS separates mutation register (writes) from fard (reads) for independent scaling.
// 2. Event Sourcing (jamabandi) stores immutable events — state is rebuilt by replay.
// 3. Time-travel: rebuild land ownership at any point by replaying a prefix of events.
// 4. Read projections (fard) are denormalized views optimized for fast queries.
// 5. Combined, they give audit trails, replay, and scalable read/write separation.
