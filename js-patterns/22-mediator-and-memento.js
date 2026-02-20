/**
 * ============================================================
 *  FILE 22 : Mediator & Memento Patterns
 *  Topic   : Behavioral Design Patterns
 *  WHY THIS MATTERS:
 *    The Mediator centralizes complex communications between
 *    objects so they don't reference each other directly.
 *    The Memento captures and restores an object's state
 *    without violating encapsulation. Together they enable
 *    coordinated, undoable workflows (forms, editors, games).
 * ============================================================
 */

// STORY: Mumbai ATC + Flight Recorder — ATC Officer Kapoor coordinates
// flights at CSIA Mumbai (Mediator); the CVR/FDR captures cockpit
// snapshots for replay (Memento).

// ────────────────────────────────────────────────────────────
//  BLOCK 1 : Mediator (ATC tower where flights communicate)
// ────────────────────────────────────────────────────────────

// WHY: Without a mediator, every flight would need a reference to
//      every other flight. The mediator (tower) keeps coupling low.

class MumbaiControlTower {
  constructor() {
    this.flights = {};
    this.log = [];
  }

  register(flight) {
    this.flights[flight.name] = flight;
    flight.tower = this;
  }

  send(message, from, to) {
    const entry = `${from.name} -> ${to}: ${message}`;
    this.log.push(entry);
    if (this.flights[to]) {
      this.flights[to].receive(message, from.name);
    } else {
      console.log(`  [CSIA Tower] ${to} not found`);
    }
  }

  broadcast(message, from) {
    const entry = `${from.name} -> ALL: ${message}`;
    this.log.push(entry);
    for (const name of Object.keys(this.flights)) {
      if (name !== from.name) {
        this.flights[name].receive(message, from.name);
      }
    }
  }
}

class Flight {
  constructor(name) {
    this.name = name;
    this.tower = null;
    this.inbox = [];
  }

  send(message, to) {
    this.tower.send(message, this, to);
  }

  broadcast(message) {
    this.tower.broadcast(message, this);
  }

  receive(message, from) {
    this.inbox.push({ from, message });
    console.log(`  [${this.name}] received from ${from}: "${message}"`);
  }
}

console.log("=== ATC Kapoor's Mumbai CSIA Tower (Mediator) ===");   // Output: === ATC Kapoor's Mumbai CSIA Tower (Mediator) ===

const tower = new MumbaiControlTower();
const ai101 = new Flight("AI-101");
const indigo6e = new Flight("6E-302");
const spicejet = new Flight("SG-205");

tower.register(ai101);
tower.register(indigo6e);
tower.register(spicejet);

ai101.send("Runway 27 is clear for landing", "6E-302");             // Output:   [6E-302] received from AI-101: "Runway 27 is clear for landing"
indigo6e.send("Roger, initiating approach to Mumbai", "AI-101");     // Output:   [AI-101] received from 6E-302: "Roger, initiating approach to Mumbai"
spicejet.broadcast("Turbulence reported near Pune at FL350");        // Output:   [AI-101] received from SG-205: "Turbulence reported near Pune at FL350"
                                                                     // Output:   [6E-302] received from SG-205: "Turbulence reported near Pune at FL350"

console.log(`  Tower log entries: ${tower.log.length}`);             // Output:   Tower log entries: 3

// ────────────────────────────────────────────────────────────
//  BLOCK 2 : Memento (save/restore state — flight data recorder)
// ────────────────────────────────────────────────────────────

// WHY: Memento lets us snapshot internal state and restore it
//      later. The originator creates mementos; the caretaker stores them.

class FlightSnapshot {
  constructor(altitude, heading) {
    this.altitude = altitude;
    this.heading = heading;
  }
}

class FlightDataRecorder {
  constructor() { this.altitude = "0ft"; this.heading = "N"; }
  update(text) {
    const parts = text.split("|");
    this.altitude = parts[0] || this.altitude;
    this.heading = parts[1] || this.heading;
  }
  // WHY: The recorder (originator) creates the memento from its own state.
  save() { return new FlightSnapshot(this.altitude, this.heading); }
  restore(m) { this.altitude = m.altitude; this.heading = m.heading; }
  toString() { return `"${this.altitude}, ${this.heading}" (snapshot)`; }
}

class BlackBox {
  constructor() { this.snapshots = []; }
  push(m) { this.snapshots.push(m); }
  pop()   { return this.snapshots.pop(); }
}

console.log("\n=== CVR/FDR Flight Recorder (Memento) ===");          // Output: === CVR/FDR Flight Recorder (Memento) ===

const fdr = new FlightDataRecorder();
const blackBox = new BlackBox();

blackBox.push(fdr.save());
fdr.update("FL350|Mumbai-Delhi");
console.log(`  After update "FL350|Mumbai-Delhi": ${fdr}`);          // Output:   After update "FL350|Mumbai-Delhi": "FL350, Mumbai-Delhi" (snapshot)

blackBox.push(fdr.save());
fdr.update("FL380|Over-Nagpur");
console.log(`  After update "FL380|Over-Nagpur": ${fdr}`);           // Output:   After update "FL380|Over-Nagpur": "FL380, Over-Nagpur" (snapshot)

blackBox.push(fdr.save());
fdr.update("FL400|Approaching-Delhi");
console.log(`  After update "FL400|Approaching-Delhi": ${fdr}`);     // Output:   After update "FL400|Approaching-Delhi": "FL400, Approaching-Delhi" (snapshot)

// Replay
fdr.restore(blackBox.pop());
console.log(`  Replay 1: ${fdr}`);                                   // Output:   Replay 1: "FL380, Over-Nagpur" (snapshot)

fdr.restore(blackBox.pop());
console.log(`  Replay 2: ${fdr}`);                                   // Output:   Replay 2: "FL350, Mumbai-Delhi" (snapshot)

fdr.restore(blackBox.pop());
console.log(`  Replay 3: ${fdr}`);                                   // Output:   Replay 3: "0ft, N" (snapshot)

// ────────────────────────────────────────────────────────────
//  BLOCK 3 : Combined — Flight Operations with Mediator + Memento
// ────────────────────────────────────────────────────────────

// WHY: The mediator coordinates flight interactions (e.g. changing
//      runway reassigns taxiway). Memento provides undo for the schedule.

class ATCMediator {
  constructor() { this.fields = {}; this.snapshots = []; }
  register(field) { this.fields[field.name] = field; field.mediator = this; }
  notify(fieldName) {
    if (fieldName === "runway") {
      const taxiwayField = this.fields["taxiway"];
      if (taxiwayField) {
        taxiwayField.setValue("", false);
        console.log(`  [Mediator] runway changed -> taxiway reset`);
      }
    }
  }
  saveSnapshot() {
    const state = {};
    for (const [n, f] of Object.entries(this.fields)) state[n] = f.value;
    this.snapshots.push(JSON.parse(JSON.stringify(state)));
  }
  undo() {
    const snap = this.snapshots.pop();
    if (!snap) return false;
    for (const [n, v] of Object.entries(snap))
      if (this.fields[n]) this.fields[n].setValue(v, false);
    return true;
  }
  dump() {
    return `{ ${Object.entries(this.fields).map(([k, f]) => `${k}="${f.value}"`).join(", ")} }`;
  }
}

class ScheduleField {
  constructor(name, value = "") { this.name = name; this.value = value; this.mediator = null; }
  setValue(val, notify = true) {
    this.value = val;
    if (notify && this.mediator) this.mediator.notify(this.name, val);
  }
}

console.log("\n=== Combined: Mumbai ATC Schedule (Mediator + Memento) ===");
                                                                     // Output: === Combined: Mumbai ATC Schedule (Mediator + Memento) ===

const schedule = new ATCMediator();
const flightField = new ScheduleField("flight");
const runwayField = new ScheduleField("runway");
const taxiwayField = new ScheduleField("taxiway");

schedule.register(flightField);
schedule.register(runwayField);
schedule.register(taxiwayField);

// Fill schedule (set initial values without triggering cross-field rules)
schedule.saveSnapshot();
flightField.setValue("AI-101");
runwayField.setValue("Runway-27", false);
taxiwayField.setValue("Taxiway-Alpha");
console.log(`  Step 1: ${schedule.dump()}`);                         // Output:   Step 1: { flight="AI-101", runway="Runway-27", taxiway="Taxiway-Alpha" }

// Change runway — mediator resets taxiway
schedule.saveSnapshot();
runwayField.setValue("Runway-14");                                   // Output:   [Mediator] runway changed -> taxiway reset
taxiwayField.setValue("Taxiway-Bravo");
console.log(`  Step 2: ${schedule.dump()}`);                         // Output:   Step 2: { flight="AI-101", runway="Runway-14", taxiway="Taxiway-Bravo" }

// Undo back to step 1
schedule.undo();
console.log(`  Undo  : ${schedule.dump()}`);                         // Output:   Undo  : { flight="AI-101", runway="Runway-27", taxiway="Taxiway-Alpha" }

// Undo back to initial
schedule.undo();
console.log(`  Undo  : ${schedule.dump()}`);                         // Output:   Undo  : { flight="", runway="", taxiway="" }

// ────────────────────────────────────────────────────────────
//  KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Mediator reduces many-to-many dependencies to many-to-one.
//    Flights talk to the CSIA tower, not to each other directly.
// 2. Memento captures state snapshots for replay/undo without
//    exposing internal implementation details (like a black box).
// 3. Combining both patterns is powerful for complex ATC: the
//    mediator coordinates flights and the memento enables undo.
// 4. In JS, JSON.parse(JSON.stringify(...)) is a quick (but
//    limited) deep-clone strategy for plain-object mementos.
