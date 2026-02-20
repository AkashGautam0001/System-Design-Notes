/**
 * ============================================================
 *  FILE 20 : Delhi Traffic Signal — State Pattern
 *  Topic   : State, Finite State Machine
 *  WHY THIS MATTERS:
 *    The State pattern lets an object change its behavior when
 *    its internal state changes — it appears to change class.
 *    FSMs formalize this with explicit states and transitions,
 *    eliminating tangled conditionals in UI, games, workflows.
 * ============================================================
 */

// STORY: Traffic Controller Anand manages the ITO junction signal in
// Delhi. Each light changes behavior depending on its current state
// (green → yellow → red → green). Anand uses the State pattern so the
// signal "just knows" what to do at any given moment.

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Classic State Pattern (chai vending machine)
// ────────────────────────────────────────────────────────────

// WHY: Without State pattern, behavior needs if/else on status
// everywhere. With it, each state is an object with its own logic.

console.log("=== BLOCK 1: Classic State — Chai Vending Machine ===");

class IdleState {
  constructor(m) { this.m = m; }
  insertCoin(amt) {
    this.m.balance += amt;
    console.log(`  Coin inserted: ₹${amt.toFixed(2)} (balance: ₹${this.m.balance.toFixed(2)})`);
    this.m.setState(this.m.hasMoneyState);
  }
  selectItem() { console.log("  Please insert a coin first"); }
  dispense() { console.log("  Please insert a coin first"); }
}

class HasMoneyState {
  constructor(m) { this.m = m; }
  insertCoin(amt) {
    this.m.balance += amt;
    console.log(`  Added coin: ₹${amt.toFixed(2)} (balance: ₹${this.m.balance.toFixed(2)})`);
  }
  selectItem(item) {
    if (this.m.balance >= item.price) {
      console.log(`  Selected: ${item.name} (₹${item.price.toFixed(2)})`);
      this.m.selectedItem = item;
      this.m.setState(this.m.dispensingState);
      this.m.dispense();
    } else {
      console.log(`  Not enough money for ${item.name}. Need ₹${item.price.toFixed(2)}, have ₹${this.m.balance.toFixed(2)}`);
    }
  }
  dispense() { console.log("  Please select an item first"); }
}

class DispensingState {
  constructor(m) { this.m = m; }
  insertCoin() { console.log("  Please wait, dispensing..."); }
  selectItem() { console.log("  Please wait, dispensing..."); }
  dispense() {
    const item = this.m.selectedItem;
    this.m.balance -= item.price;
    console.log(`  Dispensed: ${item.name}! Remaining balance: ₹${this.m.balance.toFixed(2)}`);
    // WHY: State decides the NEXT state — transitions are local
    this.m.setState(this.m.balance > 0 ? this.m.hasMoneyState : this.m.idleState);
  }
}

class ChaiVendingMachine {
  constructor() {
    this.balance = 0; this.selectedItem = null;
    // WHY: Each state object gets a reference back to the machine
    this.idleState = new IdleState(this);
    this.hasMoneyState = new HasMoneyState(this);
    this.dispensingState = new DispensingState(this);
    this.state = this.idleState;
  }
  setState(s) { this.state = s; }
  insertCoin(amt) { this.state.insertCoin(amt); }
  selectItem(item) { this.state.selectItem(item); }
  dispense() { this.state.dispense(); }
}

const vm = new ChaiVendingMachine();
const masalaChai = { name: "Masala Chai", price: 15.00 };
const samosa = { name: "Samosa", price: 10.00 };

vm.selectItem(masalaChai);  // Output:   Please insert a coin first
vm.insertCoin(10.00);       // Output:   Coin inserted: ₹10.00 (balance: ₹10.00)
vm.selectItem(masalaChai);  // Output:   Not enough money for Masala Chai. Need ₹15.00, have ₹10.00
vm.insertCoin(10.00);       // Output:   Added coin: ₹10.00 (balance: ₹20.00)
vm.selectItem(masalaChai);  // Output:   Selected: Masala Chai (₹15.00)
                             // Output:   Dispensed: Masala Chai! Remaining balance: ₹5.00
vm.selectItem(samosa);      // Output:   Not enough money for Samosa. Need ₹10.00, have ₹5.00
vm.insertCoin(5.00);        // Output:   Added coin: ₹5.00 (balance: ₹10.00)
vm.selectItem(samosa);      // Output:   Selected: Samosa (₹10.00)
                             // Output:   Dispensed: Samosa! Remaining balance: ₹0.00
vm.selectItem(masalaChai);  // Output:   Please insert a coin first

// ────────────────────────────────────────────────────────────
// BLOCK 2 — FSM with Transition Table (ITO Junction)
// ────────────────────────────────────────────────────────────

// WHY: A single table defines every valid transition — making
// the system predictable and easy to visualize.

console.log("\n=== BLOCK 2: FSM with Transition Table ===");

class StateMachine {
  constructor(cfg) { this.states = cfg.states; this.current = cfg.initial; }
  getState() { return this.current; }
  transition(event) {
    const sc = this.states[this.current];
    if (!sc || !sc.on || !sc.on[event]) {
      console.log(`  [FSM] No transition for "${event}" in state "${this.current}"`);
      return false;
    }
    const prev = this.current;
    this.current = sc.on[event];
    const nc = this.states[this.current];
    if (nc && nc.onEnter) nc.onEnter();
    console.log(`  [FSM] ${prev} --${event}--> ${this.current}`);
    return true;
  }
}

// Anand's ITO Junction Traffic Light
console.log("ITO Junction Traffic Light FSM:");
const light = new StateMachine({
  initial: "green",
  states: {
    green:  { on: { TIMER: "yellow" }, onEnter: () => console.log("  Signal is GREEN - Chalo!") },
    yellow: { on: { TIMER: "red" },    onEnter: () => console.log("  Signal is YELLOW - Dhire!") },
    red:    { on: { TIMER: "green" },  onEnter: () => console.log("  Signal is RED - Ruko!") },
  }
});

console.log(`  Starting state: ${light.getState()}`); // Output:   Starting state: green
light.transition("TIMER"); // Output:   Signal is YELLOW - Dhire!
                            // Output:   [FSM] green --TIMER--> yellow
light.transition("TIMER"); // Output:   Signal is RED - Ruko!
                            // Output:   [FSM] yellow --TIMER--> red
light.transition("TIMER"); // Output:   Signal is GREEN - Chalo!
                            // Output:   [FSM] red --TIMER--> green
light.transition("WALK");  // Output:   [FSM] No transition for "WALK" in state "green"

// IRCTC Booking Workflow
console.log("\nIRCTC Booking Workflow FSM:");
const booking = new StateMachine({
  initial: "searching",
  states: {
    searching:      { on: { SELECT_SEAT: "seatSelected" },  onEnter: () => console.log("  IRCTC: SEARCHING for trains") },
    seatSelected:   { on: { PAY: "paymentPending", CANCEL: "searching" }, onEnter: () => console.log("  IRCTC: SEAT SELECTED") },
    paymentPending: { on: { CONFIRM: "confirmed", FAIL: "failed" }, onEnter: () => console.log("  IRCTC: PAYMENT PENDING") },
    confirmed:      { on: { ARCHIVE: "archived" }, onEnter: () => console.log("  IRCTC: BOOKING CONFIRMED") },
    failed:         { on: { RETRY: "paymentPending" }, onEnter: () => console.log("  IRCTC: BOOKING FAILED") },
    archived:       { on: {}, onEnter: () => console.log("  IRCTC: TICKET ARCHIVED (final)") },
  }
});

console.log(`  State: ${booking.getState()}`);    // Output:   State: searching
booking.transition("SELECT_SEAT");                 // Output:   IRCTC: SEAT SELECTED
                                                    // Output:   [FSM] searching --SELECT_SEAT--> seatSelected
booking.transition("CANCEL");                      // Output:   IRCTC: SEARCHING for trains
                                                    // Output:   [FSM] seatSelected --CANCEL--> searching
booking.transition("SELECT_SEAT");                 // Output:   IRCTC: SEAT SELECTED
                                                    // Output:   [FSM] searching --SELECT_SEAT--> seatSelected
booking.transition("PAY");                         // Output:   IRCTC: PAYMENT PENDING
                                                    // Output:   [FSM] seatSelected --PAY--> paymentPending
booking.transition("CONFIRM");                     // Output:   IRCTC: BOOKING CONFIRMED
                                                    // Output:   [FSM] paymentPending --CONFIRM--> confirmed
booking.transition("ARCHIVE");                     // Output:   IRCTC: TICKET ARCHIVED (final)
                                                    // Output:   [FSM] confirmed --ARCHIVE--> archived

// ────────────────────────────────────────────────────────────
// BLOCK 3 — State Pattern in UI (IRCTC booking page states)
// ────────────────────────────────────────────────────────────

// WHY: FSMs prevent impossible states (no searching+confirmed at once).

console.log("\n=== BLOCK 3: UI State Machine ===");

class UIStateMachine {
  constructor(cfg) { this.cfg = cfg; this.current = cfg.initial; this.data = null; this.error = null; this.listeners = []; }
  getState() { return this.current; }
  subscribe(fn) { this.listeners.push(fn); }
  notify() { this.listeners.forEach(fn => fn(this)); }
  send(event, payload) {
    const sc = this.cfg.states[this.current];
    if (!sc || !sc.on || !sc.on[event]) return;
    const t = sc.on[event];
    this.current = typeof t === "string" ? t : t.target;
    if (typeof t === "object" && t.action) t.action(this, payload);
    this.notify();
  }
  render() {
    const sc = this.cfg.states[this.current];
    return sc && sc.render ? sc.render(this) : `[${this.current}]`;
  }
}

const irctcUI = new UIStateMachine({
  initial: "idle",
  states: {
    idle: { on: { SEARCH: { target: "loading", action: (c) => { c.data = null; c.error = null; } } }, render: () => "[ Ready to search trains ]" },
    loading: {
      on: { SUCCESS: { target: "success", action: (c, p) => { c.data = p; } }, FAILURE: { target: "error", action: (c, p) => { c.error = p; } } },
      render: () => "[ Searching... please wait ]"
    },
    success: { on: { SEARCH: { target: "loading", action: (c) => { c.data = null; } } }, render: (c) => `[ Found: ${JSON.stringify(c.data)} ]` },
    error: { on: { RETRY: { target: "loading", action: (c) => { c.error = null; } } }, render: (c) => `[ Error: ${c.error} ]` }
  }
});

irctcUI.subscribe(() => console.log(`  [render] ${irctcUI.render()}`));

console.log("Anand's IRCTC booking flow:");
console.log(`  Initial: ${irctcUI.render()}`);                                  // Output:   Initial: [ Ready to search trains ]
irctcUI.send("SEARCH");                                                          // Output:   [render] [ Searching... please wait ]
irctcUI.send("SUCCESS", { trains: ["Rajdhani", "Shatabdi", "Duronto"] });       // Output:   [render] [ Found: {"trains":["Rajdhani","Shatabdi","Duronto"]} ]
irctcUI.send("SEARCH");                                                          // Output:   [render] [ Searching... please wait ]
irctcUI.send("FAILURE", "IRCTC server timeout");                                // Output:   [render] [ Error: IRCTC server timeout ]
irctcUI.send("RETRY");                                                           // Output:   [render] [ Searching... please wait ]
irctcUI.send("SUCCESS", { trains: ["Rajdhani"] });                              // Output:   [render] [ Found: {"trains":["Rajdhani"]} ]

// WHY: Invalid transitions silently ignored — FSM enforces valid flows
console.log("\nAttempt invalid transition (idle -> SUCCESS):");
const test = new UIStateMachine({
  initial: "idle",
  states: { idle: { on: { SEARCH: "loading" } }, loading: { on: { SUCCESS: "done" } }, done: { on: {} } }
});
test.send("SUCCESS");
console.log(`  State stayed: ${test.getState()}`); // Output:   State stayed: idle

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
console.log("\n=== KEY TAKEAWAYS ===");
console.log("1. State pattern delegates behavior to state objects — no if/else on signal status"); // Output: 1. State pattern delegates behavior to state objects — no if/else on signal status
console.log("2. Each state (green/yellow/red) knows its own behavior AND which state comes next"); // Output: 2. Each state (green/yellow/red) knows its own behavior AND which state comes next
console.log("3. FSMs use a transition table to formalize all valid state changes (ITO junction)"); // Output: 3. FSMs use a transition table to formalize all valid state changes (ITO junction)
console.log("4. IRCTC UI FSMs prevent impossible states (no searching+confirmed simultaneously)"); // Output: 4. IRCTC UI FSMs prevent impossible states (no searching+confirmed simultaneously)
console.log("5. Invalid transitions are safely ignored — the system stays consistent"); // Output: 5. Invalid transitions are safely ignored — the system stays consistent
