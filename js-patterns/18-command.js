/**
 * ============================================================
 *  FILE 18 : Cricket Umpire — Command Pattern
 *  Topic   : Command, Undo/Redo
 *  WHY THIS MATTERS:
 *    The Command pattern turns requests into objects, letting
 *    you queue, log, schedule, and undo operations. Every text
 *    editor's Ctrl+Z, every game's replay system, and every
 *    task queue uses this pattern under the hood.
 * ============================================================
 */

// STORY: Umpire Dharmasena oversees the cricket match. Every decision
// on the field is encapsulated as a Command object — so he can
// execute, queue, batch, and undo (DRS review) any match decision.

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Classic Command (execute / undo via DRS)
// ────────────────────────────────────────────────────────────

// WHY: By wrapping decisions in objects, we decouple "what to decide"
// from "when to decide it". Each command carries its own DRS undo logic.

console.log("=== BLOCK 1: Classic Command ===");

class MatchScoreboard {
  constructor(name) { this.name = name; this.runs = 0; this.wickets = 0; this.extras = 0; }
  addRuns(n) { this.runs += n; }
  removeRuns(n) { this.runs = Math.max(0, this.runs - n); }
  addWicket() { this.wickets += 1; }
  removeWicket() { this.wickets = Math.max(0, this.wickets - 1); }
  addExtra(n) { this.extras += n; this.runs += n; }
  removeExtra(n) { this.extras = Math.max(0, this.extras - n); this.runs = Math.max(0, this.runs - n); }
  status() { return `${this.name}: ${this.runs}/${this.wickets} (extras: ${this.extras})`; }
}

class OutCmd {
  constructor(board) { this.board = board; }
  execute() { this.board.addWicket(); }
  undo() { this.board.removeWicket(); }
  describe() { return `Out decision on ${this.board.name}`; }
}

class WideCmd {
  constructor(board, runs) { this.board = board; this.runs = runs; }
  execute() { this.board.addExtra(this.runs); }
  undo() { this.board.removeExtra(this.runs); }
  describe() { return `Wide (${this.runs} extra) on ${this.board.name}`; }
}

// WHY: Invoker (Dharmasena) just calls execute — no knowledge of internals
class UmpireControl {
  constructor() { this.history = []; }
  signal(cmd) {
    console.log(`  Dharmasena signals: ${cmd.describe()}`);
    cmd.execute();
    this.history.push(cmd);
  }
  drsReview() {
    const cmd = this.history.pop();
    if (cmd) { console.log(`  DRS overturns: ${cmd.describe()}`); cmd.undo(); }
  }
}

const india = new MatchScoreboard("India");
const umpire = new UmpireControl();

umpire.signal(new WideCmd(india, 1));       // Output:   Dharmasena signals: Wide (1 extra) on India
console.log(`  ${india.status()}`);          // Output:   India: 1/0 (extras: 1)
umpire.signal(new OutCmd(india));            // Output:   Dharmasena signals: Out decision on India
console.log(`  ${india.status()}`);          // Output:   India: 1/1 (extras: 1)
umpire.signal(new WideCmd(india, 1));       // Output:   Dharmasena signals: Wide (1 extra) on India
console.log(`  ${india.status()}`);          // Output:   India: 2/1 (extras: 2)
umpire.drsReview();                          // Output:   DRS overturns: Wide (1 extra) on India
console.log(`  ${india.status()}`);          // Output:   India: 1/1 (extras: 1)
umpire.drsReview();                          // Output:   DRS overturns: Out decision on India
console.log(`  ${india.status()}`);          // Output:   India: 1/0 (extras: 1)

// ────────────────────────────────────────────────────────────
// BLOCK 2 — Command Queue & Macro Commands (Powerplay Rules)
// ────────────────────────────────────────────────────────────

// WHY: Commands are data — store them, queue them, or group
// them into macros for atomic batch execution (like powerplay rules).

console.log("\n=== BLOCK 2: Command Queue & Macros ===");

class MacroCommand {
  constructor(name, cmds) { this.name = name; this.cmds = cmds; }
  execute() { this.cmds.forEach(c => c.execute()); }
  // WHY: Undo in reverse order to properly unwind state
  undo() { [...this.cmds].reverse().forEach(c => c.undo()); }
  describe() { return `MACRO[${this.name}]`; }
}

class DecisionQueue {
  constructor() { this.queue = []; }
  enqueue(cmd) { this.queue.push(cmd); console.log(`  Queued: ${cmd.describe()}`); }
  executeAll() {
    console.log(`  Executing ${this.queue.length} queued decisions...`);
    while (this.queue.length) this.queue.shift().execute();
  }
}

const australia = new MatchScoreboard("Australia");
const powerplayBurst = new MacroCommand("Powerplay Burst", [
  new WideCmd(australia, 1), new OutCmd(australia), new WideCmd(australia, 1),
]);

console.log("Execute macro:");
powerplayBurst.execute();
console.log(`  ${australia.status()}`); // Output:   Australia: 2/1 (extras: 2)
console.log("Undo macro:");
powerplayBurst.undo();
console.log(`  ${australia.status()}`); // Output:   Australia: 0/0 (extras: 0)

const queue = new DecisionQueue();
queue.enqueue(new WideCmd(australia, 1));  // Output:   Queued: Wide (1 extra) on Australia
queue.enqueue(new OutCmd(australia));       // Output:   Queued: Out decision on Australia
queue.enqueue(new WideCmd(australia, 1));  // Output:   Queued: Wide (1 extra) on Australia
console.log(`  Before: ${australia.status()}`); // Output:   Before: Australia: 0/0 (extras: 0)
queue.executeAll();                         // Output:   Executing 3 queued decisions...
console.log(`  After: ${australia.status()}`);  // Output:   After: Australia: 2/1 (extras: 2)

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Undo/Redo Stack (DRS Review System)
// ────────────────────────────────────────────────────────────

// WHY: Two stacks — undo records executed commands, redo captures
// reviewed ones. New decisions clear the redo stack (new timeline).

console.log("\n=== BLOCK 3: Undo/Redo Stack (DRS Review System) ===");

class InsertCmd {
  constructor(ed, text, pos) { this.ed = ed; this.text = text; this.pos = pos; }
  execute() {
    this.ed.content = this.ed.content.slice(0, this.pos) + this.text + this.ed.content.slice(this.pos);
  }
  undo() {
    this.ed.content = this.ed.content.slice(0, this.pos) + this.ed.content.slice(this.pos + this.text.length);
  }
  describe() { return `Insert "${this.text}" at ${this.pos}`; }
}

class DeleteCmd {
  constructor(ed, pos, len) { this.ed = ed; this.pos = pos; this.len = len; this.deleted = ""; }
  execute() {
    this.deleted = this.ed.content.slice(this.pos, this.pos + this.len);
    this.ed.content = this.ed.content.slice(0, this.pos) + this.ed.content.slice(this.pos + this.len);
  }
  undo() {
    this.ed.content = this.ed.content.slice(0, this.pos) + this.deleted + this.ed.content.slice(this.pos);
  }
  describe() { return `Delete ${this.len} chars at ${this.pos}`; }
}

class ScorecardEditor {
  constructor() { this.content = ""; this.undoStack = []; this.redoStack = []; }
  execute(cmd) {
    cmd.execute(); this.undoStack.push(cmd);
    // WHY: New decision = new timeline, redo (DRS review) history is invalid
    this.redoStack = [];
    console.log(`  [exec] ${cmd.describe()} -> "${this.content}"`);
  }
  undo() {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    cmd.undo(); this.redoStack.push(cmd);
    console.log(`  [DRS undo] ${cmd.describe()} -> "${this.content}"`);
  }
  redo() {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    cmd.execute(); this.undoStack.push(cmd);
    console.log(`  [DRS redo] ${cmd.describe()} -> "${this.content}"`);
  }
}

const editor = new ScorecardEditor();
editor.execute(new InsertCmd(editor, "Kohli", 0));          // Output:   [exec] Insert "Kohli" at 0 -> "Kohli"
editor.execute(new InsertCmd(editor, " OUT", 5));            // Output:   [exec] Insert " OUT" at 5 -> "Kohli OUT"
editor.execute(new InsertCmd(editor, " lbw", 9));            // Output:   [exec] Insert " lbw" at 9 -> "Kohli OUT lbw"
editor.undo();                                                // Output:   [DRS undo] Insert " lbw" at 9 -> "Kohli OUT"
editor.undo();                                                // Output:   [DRS undo] Insert " OUT" at 5 -> "Kohli"
editor.redo();                                                // Output:   [DRS redo] Insert " OUT" at 5 -> "Kohli OUT"
editor.execute(new InsertCmd(editor, " NOT", 5));            // Output:   [exec] Insert " NOT" at 5 -> "Kohli NOT OUT"
editor.execute(new DeleteCmd(editor, 10, 4));                 // Output:   [exec] Delete 4 chars at 10 -> "Kohli NOT "
editor.undo();                                                // Output:   [DRS undo] Delete 4 chars at 10 -> "Kohli NOT OUT"

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
console.log("\n=== KEY TAKEAWAYS ===");
console.log("1. Command encapsulates a decision as an object with execute() and undo() (DRS review)"); // Output: 1. Command encapsulates a decision as an object with execute() and undo() (DRS review)
console.log("2. Decouples umpire (who signals) from scoreboard (who records the result)"); // Output: 2. Decouples umpire (who signals) from scoreboard (who records the result)
console.log("3. Macro commands group multiple decisions into one atomic powerplay operation"); // Output: 3. Macro commands group multiple decisions into one atomic powerplay operation
console.log("4. Decision queues enable deferred and scheduled execution"); // Output: 4. Decision queues enable deferred and scheduled execution
console.log("5. DRS Undo/Redo uses two stacks — new decisions clear the redo stack"); // Output: 5. DRS Undo/Redo uses two stacks — new decisions clear the redo stack
