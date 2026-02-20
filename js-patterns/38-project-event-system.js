/**
 * ============================================================
 *  FILE 38 : MatchDaySystem — Capstone Event System
 *  Topic   : Observer, Pub/Sub, Mediator, Middleware, Command
 *  WHY THIS MATTERS:
 *  Real applications need events that go beyond simple callbacks.
 *  MatchDaySystem combines namespaced pub/sub, wildcard matching,
 *  a middleware pipeline, undoable commands, and a mediator that
 *  coordinates multiple modules — all in one cohesive system.
 * ============================================================
 */
// STORY: On IPL match day, the MatchDaySystem is built — a
// communication network where every ball bowled (event) passes
// through Hotstar inspection (middleware), can be reviewed via DRS (undo),
// and coordinates the work of batsman, bowler, and scorer modules.

// ────────────────────────────────────────────────────────────
//  SECTION 1 — Typed Event Bus with Namespaces & Wildcards
// ────────────────────────────────────────────────────────────
// WHY: Namespaces prevent collision between modules. Wildcards
//      let you observe broad categories ("match:*") in one call.
class EventBus {
  constructor() { this._listeners = new Map(); this._middlewares = []; this._history = []; }
  on(event, fn, { once = false } = {}) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add({ fn, once });
    return () => this.off(event, fn);
  }
  once(event, fn) { return this.on(event, fn, { once: true }); }
  off(event, fn) {
    const set = this._listeners.get(event);
    if (!set) return;
    for (const entry of set) { if (entry.fn === fn) { set.delete(entry); break; } }
  }
  // WHY: Middleware can inspect, transform, or block events before they reach listeners.
  use(middlewareFn) { this._middlewares.push(middlewareFn); }
  emit(event, payload = {}) {
    let ctx = { event, payload, cancelled: false };
    for (const mw of this._middlewares) { mw(ctx); if (ctx.cancelled) return ctx; }
    this._history.push({ event, payload: ctx.payload, time: Date.now() });
    this._dispatch(event, ctx.payload);
    // WHY: Wildcard matching — "match:*" matches "match:ball", "match:wicket"
    for (const [pattern] of this._listeners) {
      if (pattern.endsWith(":*")) {
        const prefix = pattern.slice(0, -1);
        if (event.startsWith(prefix) && event !== pattern) this._dispatch(pattern, ctx.payload);
      }
    }
    return ctx;
  }
  _dispatch(key, payload) {
    const set = this._listeners.get(key);
    if (!set) return;
    const toRemove = [];
    for (const entry of set) { entry.fn(payload); if (entry.once) toRemove.push(entry); }
    for (const entry of toRemove) set.delete(entry);
  }
  getHistory() { return this._history.slice(); }
}

// ────────────────────────────────────────────────────────────
//  SECTION 2 — Command Pattern with Undo (DRS Review)
// ────────────────────────────────────────────────────────────
// WHY: Commands encapsulate actions as objects — they can be executed,
//      queued, logged, and undone. The umpire can review a decision via DRS.
class Command {
  constructor(name, executeFn, undoFn) { this.name = name; this._execute = executeFn; this._undo = undoFn; }
  execute() { return this._execute(); }
  undo()    { return this._undo(); }
}
class CommandScheduler {
  constructor(eventBus) { this._bus = eventBus; this._executed = []; this._undone = []; }
  run(command) {
    const result = command.execute();
    this._executed.push(command); this._undone = [];
    this._bus.emit("command:executed", { name: command.name, result });
    return result;
  }
  undo() {
    const cmd = this._executed.pop();
    if (!cmd) return null;
    const result = cmd.undo(); this._undone.push(cmd);
    this._bus.emit("command:undone", { name: cmd.name, result });
    return result;
  }
  redo() {
    const cmd = this._undone.pop();
    if (!cmd) return null;
    const result = cmd.execute(); this._executed.push(cmd);
    this._bus.emit("command:redone", { name: cmd.name, result });
    return result;
  }
}

// ────────────────────────────────────────────────────────────
//  SECTION 3 — Mediator for Multi-Module Coordination (Dugout)
// ────────────────────────────────────────────────────────────
// WHY: The mediator sits between modules so they never reference each
//      other directly. The IPL dugout has batsman, bowler, and scorer
//      stations that coordinate through the mediator.
class DugoutMediator {
  constructor(eventBus) { this._bus = eventBus; this._modules = new Map(); }
  registerModule(name, mod) {
    this._modules.set(name, mod); mod.mediator = this; mod.init(this._bus);
  }
  notify(sender, event, data) { this._bus.emit(`mediated:${event}`, { sender, ...data }); }
  getModule(name) { return this._modules.get(name); }
}

// ────────────────────────────────────────────────────────────
//  SECTION 4 — Match Modules
// ────────────────────────────────────────────────────────────
class BatsmanModule {
  constructor() { this.runs = 0; this.log = []; }
  init(bus) { bus.on("mediated:bowler-ready", () => { this.log.push("Batsman heard bowler ready"); }); }
  playShot(shotType) {
    this.runs++;
    const msg = `Batsman plays ${shotType} (#${this.runs})`;
    this.log.push(msg);
    this.mediator.notify("batsman", "shot-played", { shotType, shots: this.runs });
    return msg;
  }
}
class BowlerModule {
  constructor() { this.deliveries = 0; this.log = []; }
  init(bus) { bus.on("mediated:shot-played", (data) => { this.log.push(`Bowler saw ${data.shotType} shot`); }); }
  bowl() {
    this.deliveries++;
    const msg = `Bowler delivers ball (#${this.deliveries})`;
    this.log.push(msg);
    this.mediator.notify("bowler", "bowler-ready", { deliveries: this.deliveries });
    return msg;
  }
}
class ScorerModule {
  constructor() { this.updates = 0; this.log = []; }
  init(bus) {
    bus.on("mediated:shot-played", (data) => {
      if (data.shots >= 2) { this.updates++; this.log.push(`Scorer updates card after ${data.shots} shots`); }
    });
  }
}

// ────────────────────────────────────────────────────────────
//  SECTION 5 — Highlights Replay (bonus pattern)
// ────────────────────────────────────────────────────────────
// WHY: Because the bus records history, we can replay past events
//      to rebuild state — useful for highlights and time-travel debugging.
class HighlightsReplayer {
  constructor(bus) { this._bus = bus; }
  replay(filter, targetBus) {
    const events = this._bus.getHistory().filter(filter);
    for (const { event, payload } of events) targetBus.emit(event, payload);
    return events.length;
  }
}

// ════════════════════════════════════════════════════════════
//  DEMO — All patterns working together
// ════════════════════════════════════════════════════════════
console.log("=== MatchDaySystem: Capstone Event System ===\n");

// --- 1. Create bus with middleware ---
const bus = new EventBus();
const eventLog = [];
bus.use((ctx) => { eventLog.push(ctx.event); });
// Middleware: block "match:tampering" events
bus.use((ctx) => { if (ctx.event.startsWith("match:tampering")) ctx.cancelled = true; });

// --- 2. Namespace & wildcard subscriptions ---
console.log("--- Namespaced Events & Wildcards ---");
const matchLog = [];
bus.on("match:*", (data) => { matchLog.push(`wildcard caught: ${JSON.stringify(data)}`); });
bus.on("match:ball", (data) => { matchLog.push(`ball: ${data.runs} runs`); });
bus.emit("match:ball", { runs: 4 });
bus.emit("match:wicket", { batsman: "Kohli" });
console.log(matchLog[0]); // Output: ball: 4 runs
console.log(matchLog[1]); // Output: wildcard caught: {"runs":4}
console.log(matchLog[2]); // Output: wildcard caught: {"batsman":"Kohli"}

// --- 3. Middleware blocking ---
console.log("\n--- Middleware Pipeline ---");
const result = bus.emit("match:tampering", { action: "ball-scuffing" });
console.log("Tampering event cancelled:", result.cancelled); // Output: Tampering event cancelled: true
bus.emit("match:over", { overNumber: 10 });
console.log("Events logged:", eventLog.length); // Output: Events logged: 4

// --- 4. Once listener ---
console.log("\n--- Once Listener ---");
let onceCount = 0;
bus.once("match:boundary", () => { onceCount++; });
bus.emit("match:boundary", {});
bus.emit("match:boundary", {});
console.log("Once listener fired:", onceCount, "time(s)"); // Output: Once listener fired: 1 time(s)

// --- 5. Command pattern with undo/redo (DRS review) ---
console.log("\n--- Command Scheduler with Undo/Redo (DRS) ---");
const scheduler = new CommandScheduler(bus);
let runs = 0;
const boundaryCmd = new Command("boundary", () => { runs += 4; return runs; }, () => { runs -= 4; return runs; });
const wideCmd = new Command("wide", () => { runs += 1; return runs; }, () => { runs -= 1; return runs; });
scheduler.run(boundaryCmd);
console.log("After boundary:", runs);  // Output: After boundary: 4
scheduler.run(wideCmd);
console.log("After wide:", runs);      // Output: After wide: 5
scheduler.undo();
console.log("DRS undo wide:", runs);   // Output: DRS undo wide: 4
scheduler.redo();
console.log("Redo wide:", runs);       // Output: Redo wide: 5
scheduler.undo();
scheduler.undo();
console.log("Undo all:", runs);        // Output: Undo all: 0

// --- 6. Mediator coordination (Dugout) ---
console.log("\n--- Mediator: Dugout Multi-Module Coordination ---");
const mediator = new DugoutMediator(bus);
const batsman = new BatsmanModule();
const bowler = new BowlerModule();
const scorer = new ScorerModule();
mediator.registerModule("batsman", batsman);
mediator.registerModule("bowler", bowler);
mediator.registerModule("scorer", scorer);
// WHY: Bowler delivers, batsman hears it's ready, then plays a shot.
console.log(bowler.bowl());              // Output: Bowler delivers ball (#1)
console.log(batsman.playShot("cover-drive")); // Output: Batsman plays cover-drive (#1)
console.log(batsman.playShot("pull"));        // Output: Batsman plays pull (#2)
// WHY: After 2 shots, scorer auto-updates the scorecard.
console.log("Bowler log:", bowler.log.join(" | "));
// Output: Bowler log: Bowler delivers ball (#1) | Bowler saw cover-drive shot | Bowler saw pull shot
console.log("Scorer log:", scorer.log.join(" | "));
// Output: Scorer log: Scorer updates card after 2 shots
console.log("Batsman log:", batsman.log.join(" | "));
// Output: Batsman log: Batsman heard bowler ready | Batsman plays cover-drive (#1) | Batsman plays pull (#2)

// --- 7. Event history ---
console.log("\n--- Event History ---");
const history = bus.getHistory();
console.log("Total events recorded:", history.length); // Output: Total events recorded: 14
const matchEvents = history.filter((h) => h.event.startsWith("match:"));
console.log("Match-namespaced events:", matchEvents.length); // Output: Match-namespaced events: 5
const cmdEvents = history.filter((h) => h.event.startsWith("command:"));
console.log("Command events:", cmdEvents.length); // Output: Command events: 6

// --- 8. Highlights Replay ---
console.log("\n--- Highlights Replay ---");
const replayBus = new EventBus();
const replayLog = [];
replayBus.on("match:*", (data) => { replayLog.push("replayed"); });
replayBus.on("match:ball", () => { replayLog.push("replayed:ball"); });
replayBus.on("match:over", () => { replayLog.push("replayed:over"); });
replayBus.on("match:wicket", () => { replayLog.push("replayed:wicket"); });
replayBus.on("match:boundary", () => { replayLog.push("replayed:boundary"); });

const replayer = new HighlightsReplayer(bus);
// WHY: Replay only match-namespaced events into the new bus.
const replayedCount = replayer.replay(
  (h) => h.event.startsWith("match:"),
  replayBus
);
console.log("Events replayed:", replayedCount); // Output: Events replayed: 5
console.log("Replay log length:", replayLog.length); // Output: Replay log length: 10

// ────────────────────────────────────────────────────────────
//  KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Namespaced events ("match:ball") prevent naming collisions.
// 2. Wildcard subscriptions ("match:*") observe entire categories.
// 3. Middleware pipelines intercept events before delivery,
//    enabling validation, transformation, and access control.
// 4. The Command pattern wraps umpire decisions as objects with execute()
//    and undo() — enabling full DRS review stacks.
// 5. The Mediator decouples modules: batsman, bowler, and scorer
//    coordinate through the bus, never importing each other.
// 6. The MatchDaySystem binds all five patterns into one system
//    where events flow, get inspected on Hotstar, trigger commands,
//    and coordinate dugout modules — just like a live IPL match.
console.log("\nMatchDaySystem complete. The IPL match hums with coordinated action.");
// Output: MatchDaySystem complete. The IPL match hums with coordinated action.
