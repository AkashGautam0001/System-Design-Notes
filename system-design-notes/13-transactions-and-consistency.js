/** ============================================================
 *  FILE 13: TRANSACTIONS AND CONSISTENCY
 *  ============================================================
 *  Topic: 2PC, saga pattern, eventual consistency, conflict
 *         resolution (LWW, vector clocks), CRDTs intro
 *
 *  WHY THIS MATTERS:
 *  When money moves between SBI and HDFC through UPI, the debit
 *  and credit must both succeed or both fail. Distributed systems
 *  make this hard — network partitions, node failures, and clock
 *  skew can leave data in an inconsistent state.
 *  ============================================================ */

// STORY: UPI Payment (NPCI)
// India's Unified Payments Interface processes 10 billion transactions
// per month. A UPI transfer from SBI to HDFC involves two banks, the
// NPCI switch, and potentially a payment service provider — all as a
// distributed transaction. If SBI debits but HDFC fails to credit,
// NPCI triggers a compensating refund via the saga pattern. Every
// day, thousands of such compensations happen silently.

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║  FILE 13 — TRANSACTIONS AND CONSISTENCY                    ║");
console.log("║  UPI (NPCI): SBI -> HDFC distributed payment saga          ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Local Transactions (ACID Review)
// ════════════════════════════════════════════════════════════════

// WHY: Understand what we lose when we go distributed.

console.log("=== SECTION 1: Local Transactions (ACID Review) ===\n");

function localTransactionDemo() {
  // Simulate a single-node bank ledger with ACID
  class BankLedger {
    constructor() { this.accounts = {}; this.txLog = []; this.lockSet = new Set(); }
    createAccount(id, balance) { this.accounts[id] = { balance, version: 0 }; }

    transfer(from, to, amount) {
      const txId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      if (this.lockSet.has(from) || this.lockSet.has(to)) {
        return { success: false, reason: "Lock conflict — Isolation prevents dirty reads" };
      }
      this.lockSet.add(from);
      this.lockSet.add(to);
      try {
        if (!this.accounts[from] || !this.accounts[to]) throw new Error("Account not found");
        if (this.accounts[from].balance < amount)
          throw new Error(`Insufficient funds: Rs.${this.accounts[from].balance} < Rs.${amount}`);
        this.txLog.push({ txId, from, to, amount, status: "committed" });
        this.accounts[from].balance -= amount;
        this.accounts[to].balance += amount;
        return { success: true, txId };
      } catch (err) {
        this.txLog.push({ txId, from, to, amount, status: "rolled_back" });
        return { success: false, reason: err.message };
      } finally { this.lockSet.delete(from); this.lockSet.delete(to); }
    }
  }

  const bank = new BankLedger();
  bank.createAccount("SBI-001", 50000);
  bank.createAccount("HDFC-002", 30000);

  console.log("Local ACID transfer: SBI -> HDFC Rs.5000");
  const r1 = bank.transfer("SBI-001", "HDFC-002", 5000);
  console.log(`  Result: ${JSON.stringify(r1)}`);
  console.log(`  SBI-001: Rs.${bank.accounts["SBI-001"].balance}`);
  console.log(`  HDFC-002: Rs.${bank.accounts["HDFC-002"].balance}`);

  console.log("\nAttempt overdraft: SBI -> HDFC Rs.100000");
  const r2 = bank.transfer("SBI-001", "HDFC-002", 100000);
  console.log(`  Result: ${r2.reason}`);
  console.log(`  Balances unchanged — Atomicity preserved.`);
  // Output: Insufficient funds, balances unchanged
}

localTransactionDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Two-Phase Commit Protocol (2PC)
// ════════════════════════════════════════════════════════════════

// WHY: 2PC coordinates multi-node commits but has blocking problems.

console.log("\n\n=== SECTION 2: Two-Phase Commit Protocol (2PC) ===\n");

function twoPCDemo() {
  class TwoPCCoordinator {
    constructor(participants) { this.participants = participants; }

    execute(transaction) {
      console.log(`  Coordinator: Starting 2PC for ${transaction.description}`);
      // Phase 1: PREPARE
      console.log("\n  --- Phase 1: PREPARE ---");
      let allPrepared = true;
      for (const [name, p] of Object.entries(this.participants)) {
        const vote = p.prepare(transaction);
        console.log(`  ${name}: ${vote ? "VOTE-COMMIT" : "VOTE-ABORT"}`);
        if (!vote) allPrepared = false;
      }
      // Phase 2: COMMIT or ABORT
      console.log(`\n  --- Phase 2: ${allPrepared ? "COMMIT" : "ABORT"} ---`);
      for (const [name, p] of Object.entries(this.participants)) {
        if (allPrepared) { p.commit(transaction); console.log(`  ${name}: COMMITTED`); }
        else { p.abort(); console.log(`  ${name}: ABORTED (rolled back)`); }
      }
      return allPrepared;
    }
  }

  class BankParticipant {
    constructor(name, balance, shouldFail = false) {
      this.name = name; this.balance = balance; this.shouldFail = shouldFail;
    }
    prepare(tx) {
      if (this.shouldFail) return false;
      if (tx.debitFrom === this.name && this.balance < tx.amount) return false;
      return true;
    }
    commit(tx) {
      if (tx.debitFrom === this.name) this.balance -= tx.amount;
      if (tx.creditTo === this.name) this.balance += tx.amount;
    }
    abort() {}
  }

  // Scenario 1: Both banks agree
  console.log("Scenario 1: UPI transfer Rs.2000 — both banks agree\n");
  let sbi = new BankParticipant("SBI", 50000);
  let hdfc = new BankParticipant("HDFC", 30000);
  let coordinator = new TwoPCCoordinator({ SBI: sbi, HDFC: hdfc });

  const tx1 = { description: "UPI Rs.2000 SBI->HDFC", debitFrom: "SBI", creditTo: "HDFC", amount: 2000 };
  const result1 = coordinator.execute(tx1);
  console.log(`\n  Final: SBI=Rs.${sbi.balance}, HDFC=Rs.${hdfc.balance}, Success=${result1}`);

  // Scenario 2: HDFC is down
  console.log("\n\nScenario 2: HDFC node is down\n");
  sbi = new BankParticipant("SBI", 50000);
  hdfc = new BankParticipant("HDFC", 30000, true); // simulate failure
  coordinator = new TwoPCCoordinator({ SBI: sbi, HDFC: hdfc });

  const result2 = coordinator.execute(tx1);
  console.log(`\n  Final: SBI=Rs.${sbi.balance}, HDFC=Rs.${hdfc.balance}, Success=${result2}`);
  console.log("  Both banks rolled back — atomicity preserved!");

  console.log("\n  2PC problem: If coordinator crashes after PREPARE, participants BLOCK forever.");
}

twoPCDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Saga Pattern (Choreography)
// ════════════════════════════════════════════════════════════════

// WHY: Sagas avoid blocking by using compensating actions on failure.

console.log("\n\n=== SECTION 3: Saga Pattern — Choreography ===\n");

function sagaChoreography() {
  const eventBus = [];
  const accounts = { SBI: 50000, HDFC: 30000, NPCI_ESCROW: 0 };
  const log = [];

  function emit(event) {
    eventBus.push(event);
    log.push(`  Event: ${event.type} — ${JSON.stringify(event.data || {})}`);
    console.log(log[log.length - 1]);
  }

  // UPI saga: Debit SBI -> NPCI escrow -> Credit HDFC
  console.log("UPI Choreography Saga: Rs.3000 SBI -> HDFC\n");

  // Step 1: SBI debits
  accounts.SBI -= 3000;
  emit({ type: "SBI_DEBITED", data: { amount: 3000 } });

  // Step 2: NPCI receives in escrow
  accounts.NPCI_ESCROW += 3000;
  emit({ type: "NPCI_ESCROW_RECEIVED", data: { amount: 3000 } });

  // Step 3: HDFC credits (success path)
  accounts.HDFC += 3000;
  accounts.NPCI_ESCROW -= 3000;
  emit({ type: "HDFC_CREDITED", data: { amount: 3000 } });

  console.log(`\n  Balances: SBI=Rs.${accounts.SBI}, HDFC=Rs.${accounts.HDFC}`);

  // Failure scenario
  console.log("\n--- Failure Scenario: HDFC credit fails ---\n");
  const accounts2 = { SBI: 50000, HDFC: 30000, NPCI_ESCROW: 0 };

  accounts2.SBI -= 3000;
  emit({ type: "SBI_DEBITED", data: { amount: 3000 } });

  accounts2.NPCI_ESCROW += 3000;
  emit({ type: "NPCI_ESCROW_RECEIVED", data: { amount: 3000 } });

  // HDFC fails!
  emit({ type: "HDFC_CREDIT_FAILED", data: { reason: "Account frozen" } });

  // Compensating actions
  console.log("\n  --- Compensating Actions ---");
  accounts2.NPCI_ESCROW -= 3000;
  emit({ type: "NPCI_ESCROW_REVERSED", data: { amount: 3000 } });

  accounts2.SBI += 3000;
  emit({ type: "SBI_REFUNDED", data: { amount: 3000 } });

  console.log(`\n  Balances after compensation: SBI=Rs.${accounts2.SBI}, HDFC=Rs.${accounts2.HDFC}`);
  console.log("  Money returned to sender — eventual consistency achieved!");
}

sagaChoreography();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Saga Pattern (Orchestration)
// ════════════════════════════════════════════════════════════════

// WHY: Orchestrator centralizes saga logic — easier to reason about.

console.log("\n\n=== SECTION 4: Saga Pattern — Orchestration ===\n");

function sagaOrchestration() {
  class SagaOrchestrator {
    constructor(steps) { this.steps = steps; this.completedSteps = []; }

    execute() {
      console.log("  Orchestrator: Starting saga...\n");
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        console.log(`  Step ${i + 1}: ${step.name}`);
        const result = step.action();
        if (!result.success) {
          console.log(`  FAILED at step ${i + 1}: ${result.error}\n  --- Rolling back ---`);
          for (let j = this.completedSteps.length - 1; j >= 0; j--) {
            const s = this.completedSteps[j];
            console.log(`  Compensate: ${s.name}\n    -> ${s.compensate().message}`);
          }
          return { success: false, failedAt: step.name };
        }
        this.completedSteps.push(step);
        console.log(`    -> ${result.message}`);
      }
      return { success: true };
    }
  }

  const accounts = { SBI: 50000, HDFC: 30000 };

  const steps = [
    {
      name: "Validate UPI PIN",
      action: () => ({ success: true, message: "PIN verified for SBI account" }),
      compensate: () => ({ message: "No compensation needed for validation" }),
    },
    {
      name: "Debit SBI Account",
      action: () => {
        accounts.SBI -= 5000;
        return { success: true, message: `SBI debited Rs.5000, balance: Rs.${accounts.SBI}` };
      },
      compensate: () => {
        accounts.SBI += 5000;
        return { message: `SBI refunded Rs.5000, balance: Rs.${accounts.SBI}` };
      },
    },
    {
      name: "Credit HDFC Account",
      action: () => {
        // Simulate failure
        return { success: false, error: "HDFC CBS timeout after 30s" };
      },
      compensate: () => ({ message: "HDFC credit never happened, no compensation" }),
    },
    {
      name: "Send Confirmation SMS",
      action: () => ({ success: true, message: "SMS sent to both parties" }),
      compensate: () => ({ message: "Send failure SMS instead" }),
    },
  ];

  const orchestrator = new SagaOrchestrator(steps);
  const result = orchestrator.execute();

  console.log(`\n  Final balances: SBI=Rs.${accounts.SBI}, HDFC=Rs.${accounts.HDFC}`);
  console.log(`  Saga result: ${result.success ? "SUCCESS" : `FAILED at ${result.failedAt}`}`);
}

sagaOrchestration();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Eventual Consistency Demo
// ════════════════════════════════════════════════════════════════

// WHY: Not all systems need immediate consistency — eventual is often enough.

console.log("\n\n=== SECTION 5: Eventual Consistency Demo ===\n");

function eventualConsistencyDemo() {
  class ReplicaNode {
    constructor(name) { this.name = name; this.data = {}; }
    localWrite(key, value, timestamp) { this.data[key] = { value, timestamp }; }
    receiveReplication(key, value, timestamp) {
      const existing = this.data[key];
      if (!existing || existing.timestamp < timestamp) { this.data[key] = { value, timestamp }; return true; }
      return false;
    }
  }

  const nodes = {
    mumbai: new ReplicaNode("Mumbai"),
    delhi: new ReplicaNode("Delhi"),
    bangalore: new ReplicaNode("Bangalore"),
  };

  // Write to Mumbai, replicate asynchronously
  const t1 = Date.now();
  nodes.mumbai.localWrite("balance:U001", 50000, t1);
  console.log("T=0ms   Mumbai writes balance:U001 = 50000");

  // At this point, Delhi and Bangalore have stale data
  console.log("T=0ms   Delhi reads balance:U001 =", nodes.delhi.data["balance:U001"] || "MISS (stale)");
  console.log("T=0ms   Bangalore reads =", nodes.bangalore.data["balance:U001"] || "MISS (stale)");

  // Replication propagates (simulated delay)
  console.log("\n...50ms replication delay...\n");
  nodes.delhi.receiveReplication("balance:U001", 50000, t1);
  console.log("T=50ms  Delhi receives replication: balance:U001 = 50000");
  nodes.bangalore.receiveReplication("balance:U001", 50000, t1);
  console.log("T=80ms  Bangalore receives replication: balance:U001 = 50000");

  // Conflicting writes
  console.log("\n--- Conflicting writes ---");
  const t2 = t1 + 100;
  const t3 = t1 + 110;
  nodes.mumbai.localWrite("balance:U001", 45000, t2);
  nodes.delhi.localWrite("balance:U001", 48000, t3);
  console.log(`T=100ms Mumbai writes 45000 (debit)`);
  console.log(`T=110ms Delhi writes 48000 (different debit)`);

  // Last-Write-Wins resolution
  nodes.mumbai.receiveReplication("balance:U001", 48000, t3);
  nodes.bangalore.receiveReplication("balance:U001", 48000, t3);
  console.log("\nAfter replication (Last-Write-Wins):");
  Object.entries(nodes).forEach(([name, node]) => {
    console.log(`  ${name}: balance = ${node.data["balance:U001"].value}`);
  });
  console.log("  All nodes converge to 48000 (Delhi's write was later)");
  console.log("  WARNING: Mumbai's debit of Rs.5000 was LOST — LWW is lossy!");
}

eventualConsistencyDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Last-Write-Wins Conflict Resolution
// ════════════════════════════════════════════════════════════════

// WHY: LWW is simple but can silently drop writes. Understand the tradeoff.

console.log("\n\n=== SECTION 6: Last-Write-Wins Conflict Resolution ===\n");

function lwwDemo() {
  class LWWRegister {
    constructor(value = null) {
      this.value = value;
      this.timestamp = 0;
    }

    write(value, timestamp) {
      if (timestamp > this.timestamp) {
        const old = this.value;
        this.value = value;
        this.timestamp = timestamp;
        return { accepted: true, old, new: value };
      }
      return { accepted: false, reason: "Stale write ignored" };
    }

    merge(other) {
      if (other.timestamp > this.timestamp) {
        this.value = other.value;
        this.timestamp = other.timestamp;
      }
    }
  }

  // UPI: Two ATMs update balance concurrently
  console.log("Scenario: Two ATMs update same account balance\n");
  const atm1 = new LWWRegister();
  const atm2 = new LWWRegister();

  // Both start with same balance
  atm1.write(50000, 1000);
  atm2.write(50000, 1000);

  // ATM1: withdraw Rs.5000 at T=1001
  const w1 = atm1.write(45000, 1001);
  console.log(`  ATM1 (T=1001): Rs.50000 -> Rs.45000 (withdraw Rs.5000)  accepted=${w1.accepted}`);

  // ATM2: withdraw Rs.3000 at T=1002
  const w2 = atm2.write(47000, 1002);
  console.log(`  ATM2 (T=1002): Rs.50000 -> Rs.47000 (withdraw Rs.3000)  accepted=${w2.accepted}`);

  // Merge
  atm1.merge(atm2);
  atm2.merge(atm1);
  console.log(`\n  After merge: ATM1=${atm1.value}, ATM2=${atm2.value}`);
  console.log("  Expected: Rs.42000 (both withdrawals), Got: Rs.47000");
  console.log("  LWW lost ATM1's withdrawal! Rs.5000 evaporated.");
  console.log("\n  LWW is fine for: profile updates, last-seen timestamps, status flags");
  console.log("  LWW is DANGEROUS for: balances, counters, inventory counts");
}

lwwDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Vector Clocks
// ════════════════════════════════════════════════════════════════

// WHY: Vector clocks detect concurrent writes that LWW silently drops.

console.log("\n\n=== SECTION 7: Vector Clocks ===\n");

function vectorClockDemo() {
  class VectorClock {
    constructor(nodeId, clocks = {}) { this.nodeId = nodeId; this.clocks = { ...clocks }; }
    increment() { this.clocks[this.nodeId] = (this.clocks[this.nodeId] || 0) + 1; return this; }
    merge(other) {
      const m = new VectorClock(this.nodeId, { ...this.clocks });
      for (const [node, time] of Object.entries(other.clocks)) m.clocks[node] = Math.max(m.clocks[node] || 0, time);
      return m;
    }
    happensBefore(other) {
      let less = false;
      const all = new Set([...Object.keys(this.clocks), ...Object.keys(other.clocks)]);
      for (const n of all) { if ((this.clocks[n]||0) > (other.clocks[n]||0)) return false; if ((this.clocks[n]||0) < (other.clocks[n]||0)) less = true; }
      return less;
    }
    isConcurrent(other) { return !this.happensBefore(other) && !other.happensBefore(this); }
    toString() { return `{${Object.entries(this.clocks).map(([k,v])=>`${k}:${v}`).join(", ")}}`; }
  }

  // UPI nodes: SBI (Mumbai), HDFC (Delhi), NPCI (Bangalore)
  const sbi = new VectorClock("SBI");
  const hdfc = new VectorClock("HDFC");
  const npci = new VectorClock("NPCI");

  // SBI processes a deposit
  sbi.increment();
  console.log(`1. SBI deposit:        SBI=${sbi}`);

  // HDFC processes a deposit (concurrent with SBI)
  hdfc.increment();
  console.log(`2. HDFC deposit:       HDFC=${hdfc}`);

  // Are they concurrent?
  console.log(`\n   SBI concurrent with HDFC? ${sbi.isConcurrent(hdfc)}`);
  // Output: true — neither knows about the other

  // NPCI receives both and merges
  npci.increment();
  const merged = npci.merge(sbi).merge(hdfc);
  merged.increment();
  console.log(`\n3. NPCI merges both:   NPCI=${merged}`);

  // SBI sends another update after receiving NPCI's state
  const sbi2 = new VectorClock("SBI", { ...merged.clocks });
  sbi2.increment();
  console.log(`4. SBI after sync:     SBI=${sbi2}`);

  // Now SBI2 happens after the original HDFC
  console.log(`\n   Original HDFC happens-before SBI2? ${hdfc.happensBefore(sbi2)}`);
  console.log("   YES — causal ordering is now established.\n");

  console.log("   Vector clocks detect conflicts without data loss,");
  console.log("   but require the APPLICATION to resolve conflicts (not the DB).");
}

vectorClockDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — CRDTs Introduction
// ════════════════════════════════════════════════════════════════

// WHY: CRDTs resolve conflicts automatically — no human intervention.

console.log("\n\n=== SECTION 8: CRDTs (Conflict-Free Replicated Data Types) ===\n");

function crdtDemo() {
  // G-Counter: grow-only counter (each node has its own counter)
  class GCounter {
    constructor(nodeId) { this.nodeId = nodeId; this.counts = {}; }
    increment(amount = 1) { this.counts[this.nodeId] = (this.counts[this.nodeId] || 0) + amount; }
    value() { return Object.values(this.counts).reduce((s, v) => s + v, 0); }
    merge(other) { for (const [n, c] of Object.entries(other.counts)) this.counts[n] = Math.max(this.counts[n] || 0, c); }
    toString() { return `{${Object.entries(this.counts).map(([k,v])=>`${k}:${v}`).join(", ")}} = ${this.value()}`; }
  }

  // UPI transaction counter across 3 NPCI nodes
  console.log("G-Counter: UPI daily transaction count across NPCI nodes\n");
  const node1 = new GCounter("NPCI-Mumbai");
  const node2 = new GCounter("NPCI-Delhi");
  const node3 = new GCounter("NPCI-Bangalore");

  // Each node processes transactions independently
  node1.increment(1500000);
  node2.increment(2000000);
  node3.increment(1200000);

  console.log(`  Node1 (Mumbai):    ${node1}`);
  console.log(`  Node2 (Delhi):     ${node2}`);
  console.log(`  Node3 (Bangalore): ${node3}`);

  // Merge all nodes
  node1.merge(node2);
  node1.merge(node3);
  console.log(`\n  After merge at Node1: ${node1}`);
  console.log(`  Total UPI transactions: ${node1.value().toLocaleString()}`);

  // LWW-Element-Set: last-write-wins set for active UPI IDs
  class LWWSet {
    constructor() { this.addSet = {}; this.removeSet = {}; }
    add(elem, ts) { if (!this.addSet[elem] || this.addSet[elem] < ts) this.addSet[elem] = ts; }
    remove(elem, ts) { if (!this.removeSet[elem] || this.removeSet[elem] < ts) this.removeSet[elem] = ts; }
    lookup(elem) { return (this.addSet[elem] || 0) > (this.removeSet[elem] || 0); }
    elements() { return Object.keys(this.addSet).filter((e) => this.lookup(e)); }
    merge(other) {
      for (const [e, t] of Object.entries(other.addSet)) this.add(e, t);
      for (const [e, t] of Object.entries(other.removeSet)) this.remove(e, t);
    }
  }

  console.log("\n\nLWW-Set: Active UPI VPAs (Virtual Payment Addresses)\n");
  const set1 = new LWWSet();
  const set2 = new LWWSet();

  set1.add("priya@sbi", 100);
  set1.add("arjun@hdfc", 101);
  set2.add("meera@icici", 102);
  set2.remove("arjun@hdfc", 105); // Arjun deactivated his VPA

  set1.merge(set2);
  console.log(`  Active VPAs after merge: [${set1.elements().join(", ")}]`);
  console.log("  arjun@hdfc removed because remove(T=105) > add(T=101)");
  console.log("\n  CRDTs guarantee convergence WITHOUT coordination!");
}

crdtDemo();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("\n\n=== KEY TAKEAWAYS ===\n");
console.log("1. Local ACID is easy — distributed ACID across nodes is the hard problem.");
console.log("2. 2PC ensures atomicity but BLOCKS if the coordinator crashes.");
console.log("3. Saga (choreography) uses events — decoupled but hard to debug.");
console.log("4. Saga (orchestration) uses a central coordinator — easier to trace.");
console.log("5. Eventual consistency is a spectrum — tune per use case.");
console.log("6. LWW is simple but silently loses concurrent writes — dangerous for money.");
console.log("7. Vector clocks detect concurrency; the app resolves conflicts.");
console.log("8. CRDTs auto-resolve conflicts with mathematical guarantees — the future.\n");
console.log('"When SBI debits Rs.2000 but HDFC never credits it, the saga pattern');
console.log(" doesn't panic — it simply reverses the debit. The money always has a home.\"");
console.log("\n[End of File 13 — Transactions and Consistency]");
