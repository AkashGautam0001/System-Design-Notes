/** ============================================================
 *  FILE 21: DISTRIBUTED CONSENSUS
 *  ============================================================
 *  Topic: Raft (election, log replication, safety), quorum,
 *         split-brain, consistency levels
 *
 *  WHY THIS MATTERS:
 *  In any distributed system, nodes must agree on a single source
 *  of truth even when some of them crash or become unreachable.
 *  Consensus algorithms like Raft make databases, config stores,
 *  and coordination services reliable.
 *  ============================================================ */

// STORY: Election Commission of India — Vote Counting
// During a general election, counting centers across the country tally
// votes. Each center is like a Raft node. The Returning Officer acts
// as the elected leader who announces results only after a quorum of
// counting tables confirms the tally. If a Returning Officer falls
// ill, a new one is appointed — exactly like Raft leader election.

console.log("=".repeat(70));
console.log("  FILE 21: DISTRIBUTED CONSENSUS");
console.log("  Raft, Quorum, Split-Brain, Consistency Levels");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Why Consensus Matters
// ════════════════════════════════════════════════════════════════

// WHY: Without consensus, distributed nodes can disagree on state,
// leading to data loss and conflicting operations.

console.log("--- SECTION 1: Why Consensus Matters ---\n");

function demonstrateNoConsensus() {
  const nodes = [
    { id: "Node-A", value: null },
    { id: "Node-B", value: null },
    { id: "Node-C", value: null },
  ];
  nodes[0].value = "Result-X";
  nodes[2].value = "Result-Y";
  console.log("Without Consensus — two clients write different values:");
  nodes.forEach((n) => console.log(`  ${n.id}: value = ${n.value || "EMPTY"}`));
  // Output: Node-A=Result-X, Node-B=EMPTY, Node-C=Result-Y
  console.log("  PROBLEM: No agreement on which value is correct!\n");
}
demonstrateNoConsensus();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Raft Leader Election Simulation
// ════════════════════════════════════════════════════════════════

// WHY: Raft ensures one leader coordinates all writes via
// randomized timeouts and majority voting.

console.log("--- SECTION 2: Raft Leader Election Simulation ---\n");

class RaftNode {
  constructor(id, clusterSize) {
    this.id = id;
    this.state = "follower";
    this.currentTerm = 0;
    this.votedFor = null;
    this.electionTimeout = 150 + Math.floor(Math.random() * 150);
    this.clusterSize = clusterSize;
    this.votesReceived = 0;
  }
  startElection() {
    this.currentTerm++;
    this.state = "candidate";
    this.votedFor = this.id;
    this.votesReceived = 1;
    console.log(`  [Term ${this.currentTerm}] ${this.id} becomes CANDIDATE (timeout: ${this.electionTimeout}ms)`);
    return this.currentTerm;
  }
  requestVote(candidateId, candidateTerm) {
    if (candidateTerm > this.currentTerm) { this.currentTerm = candidateTerm; this.votedFor = null; }
    if (candidateTerm >= this.currentTerm && this.votedFor === null) {
      this.votedFor = candidateId;
      console.log(`  [Term ${this.currentTerm}] ${this.id} votes for ${candidateId}`);
      return true;
    }
    return false;
  }
  becomeLeader() {
    this.state = "leader";
    console.log(`  [Term ${this.currentTerm}] ${this.id} becomes LEADER with ${this.votesReceived}/${this.clusterSize} votes`);
  }
}

function simulateElection() {
  const nodes = Array.from({ length: 5 }, (_, i) => new RaftNode(`CountingCenter-${i + 1}`, 5));
  const candidate = [...nodes].sort((a, b) => a.electionTimeout - b.electionTimeout)[0];
  const term = candidate.startElection();
  const quorum = 3;
  console.log(`  Quorum needed: ${quorum} votes`);
  for (const node of nodes) {
    if (node.id !== candidate.id && node.requestVote(candidate.id, term)) candidate.votesReceived++;
    if (candidate.votesReceived >= quorum) { candidate.becomeLeader(); return candidate; }
  }
  return candidate;
}
const leader = simulateElection();
console.log(`  Elected Returning Officer: ${leader.id}\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Log Replication
// ════════════════════════════════════════════════════════════════

// WHY: The leader must replicate writes to a majority before
// committing — like the Returning Officer ensuring multiple
// counting tables agree before announcing results.

console.log("--- SECTION 3: Log Replication ---\n");

class RaftCluster {
  constructor(size) {
    this.size = size;
    this.nodes = Array.from({ length: size }, (_, i) => ({ id: `Node-${i}`, log: [], isAlive: true }));
    this.leader = this.nodes[0];
    console.log(`  Cluster of ${size} nodes. Leader: ${this.leader.id}`);
  }
  appendEntry(command) {
    const entry = { term: 1, index: this.leader.log.length, command };
    this.leader.log.push(entry);
    console.log(`  Leader appends: "${command}" at index ${entry.index}`);
    let acks = 1;
    const quorum = Math.floor(this.size / 2) + 1;
    for (let i = 1; i < this.nodes.length; i++) {
      if (this.nodes[i].isAlive) {
        this.nodes[i].log.push({ ...entry });
        acks++;
        console.log(`    Replicated to ${this.nodes[i].id} (ack ${acks}/${this.size})`);
      } else { console.log(`    ${this.nodes[i].id} is DOWN — skipped`); }
      if (acks >= quorum) { console.log(`    Quorum reached — COMMITTED`); break; }
    }
    if (acks < quorum) console.log(`    NOT committed — only ${acks} acks, need ${quorum}`);
    return acks >= quorum;
  }
}

const cluster = new RaftCluster(5);
cluster.appendEntry("SET constituency=Varanasi winner=CandidateA");
cluster.appendEntry("SET constituency=Amethi winner=CandidateB");
cluster.nodes[3].isAlive = false;
cluster.nodes[4].isAlive = false;
console.log("  Two nodes go DOWN...");
cluster.appendEntry("SET constituency=Lucknow winner=CandidateC");
cluster.nodes[2].isAlive = false;
console.log("  Third node goes DOWN...");
cluster.appendEntry("SET constituency=Patna winner=CandidateD");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Safety Guarantees
// ════════════════════════════════════════════════════════════════

// WHY: Once a log entry is committed, it will never be lost.

console.log("--- SECTION 4: Safety Guarantees ---\n");

function demonstrateSafety() {
  const leaderLog = [
    { term: 1, index: 0, cmd: "SET x=1", committed: true },
    { term: 1, index: 1, cmd: "SET y=2", committed: true },
    { term: 2, index: 2, cmd: "SET z=3", committed: false },
  ];
  console.log("  Leader's Log:");
  leaderLog.forEach((e) => console.log(`    [${e.committed ? "COMMITTED" : "UNCOMMITTED"}] Term ${e.term}, Index ${e.index}: ${e.cmd}`));

  console.log("\n  Safety Property 1 — Election Restriction:");
  console.log("    A node can only become leader if its log is at least");
  console.log("    as up-to-date as any majority of nodes.");

  function canBecomeLeader(candidateLog, otherLogs) {
    const cTerm = candidateLog.length > 0 ? candidateLog[candidateLog.length - 1].term : 0;
    const cIdx = candidateLog.length - 1;
    let votes = 1;
    for (const log of otherLogs) {
      const t = log.length > 0 ? log[log.length - 1].term : 0;
      if (cTerm > t || (cTerm === t && cIdx >= log.length - 1)) votes++;
    }
    return votes >= Math.floor(otherLogs.length / 2) + 1;
  }
  const others = [[{ term: 1 }, { term: 1 }], [{ term: 1 }, { term: 1 }, { term: 2 }], [{ term: 1 }, { term: 1 }]];
  console.log(`    Up-to-date candidate can win: ${canBecomeLeader([{ term: 1 }, { term: 1 }, { term: 2 }], others)}`);
  console.log(`    Stale candidate can win:      ${canBecomeLeader([{ term: 1 }], others)}`);
  console.log("\n  Safety Property 2 — Leader Completeness:");
  console.log("    If committed in term T, present in all leaders for terms > T.");
}
demonstrateSafety();
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Quorum-Based Decisions
// ════════════════════════════════════════════════════════════════

// WHY: Quorum ensures any two successful operations overlap,
// guaranteeing they see each other's results.

console.log("--- SECTION 5: Quorum-Based Decisions ---\n");

console.log("  Cluster Size | Quorum | Tolerated Failures");
console.log("  -------------|--------|-------------------");
[3, 5, 7, 9].forEach((s) => {
  const q = Math.floor(s / 2) + 1;
  console.log(`  ${String(s).padStart(13)} | ${String(q).padStart(6)} | ${String(s - q).padStart(18)}`);
});

console.log("\n  Read/Write Quorum (R + W > N):");
[[5,3],[5,2],[5,1]].forEach(([n,w]) => {
  const r = n - w + 1;
  console.log(`    N=${n}, W=${w}, R=${r} => Overlap: ${r + w > n}`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Split-Brain Problem and Prevention
// ════════════════════════════════════════════════════════════════

// WHY: A network partition can isolate nodes. If both sides accept
// writes, data diverges permanently.

console.log("--- SECTION 6: Split-Brain Problem and Prevention ---\n");

function simulateSplitBrain() {
  const nodes = [
    { id: "N1", partition: "A", role: "leader" }, { id: "N2", partition: "A" },
    { id: "N3", partition: "B" }, { id: "N4", partition: "B" }, { id: "N5", partition: "B" },
  ];
  const partA = nodes.filter((n) => n.partition === "A");
  const partB = nodes.filter((n) => n.partition === "B");
  console.log(`  Partition A: [${partA.map((n) => n.id).join(", ")}] (has old leader N1)`);
  console.log(`  Partition B: [${partB.map((n) => n.id).join(", ")}]`);
  console.log(`  Quorum needed: 3`);
  console.log(`  Partition A (${partA.length} nodes): REJECTED — lacks quorum`);
  console.log(`  Partition B (${partB.length} nodes): N3 elected leader — has quorum`);
  console.log("  PREVENTION: Quorum ensures at most one partition can make progress.");
}
simulateSplitBrain();
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Consistency Levels
// ════════════════════════════════════════════════════════════════

// WHY: Different apps need different consistency: banking needs
// strong, social feeds tolerate eventual.

console.log("--- SECTION 7: Consistency Levels ---\n");

class ConsistencyDemo {
  constructor() { this.nodes = [{ id: "Primary", data: {} }, { id: "Replica-1", data: {} }, { id: "Replica-2", data: {} }]; }
  strongWrite(key, value) {
    console.log(`  [STRONG] Writing ${key}=${value}`);
    this.nodes.forEach((n) => { n.data[key] = value; });
    console.log(`    Acknowledged after ALL ${this.nodes.length} nodes confirmed`);
    console.log(`    Any subsequent read returns: ${value}`);
  }
  eventualWrite(key, value) {
    console.log(`  [EVENTUAL] Writing ${key}=${value}`);
    this.nodes[0].data[key] = value;
    console.log("    Acknowledged after PRIMARY confirms");
    console.log(`    Replica-1 reads: ${this.nodes[1].data[key] || "STALE/EMPTY"}`);
    this.nodes[1].data[key] = value; this.nodes[2].data[key] = value;
    console.log(`    (After replication) Replica-1 reads: ${this.nodes[1].data[key]}`);
  }
  causalDemo() {
    console.log("  [CAUSAL] Demonstrating causal ordering:");
    console.log("    Event 1: User A posts message (no dependency)");
    console.log("    Event 2: User B replies (depends on event 1)");
    console.log("    Event 3: User C likes (depends on event 1)");
    console.log("    Guarantee: Event 2 never seen without Event 1");
  }
}
const cDemo = new ConsistencyDemo();
cDemo.strongWrite("constituency", "Varanasi");
console.log();
cDemo.eventualWrite("constituency", "Amethi");
console.log();
cDemo.causalDemo();
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Comparing Consensus Protocols
// ════════════════════════════════════════════════════════════════

// WHY: Raft is not the only protocol. Paxos and Zab are
// alternatives with different trade-offs.

console.log("--- SECTION 8: Comparing Consensus Protocols ---\n");

const protocols = [
  { name: "Paxos", usedBy: "Google Chubby, Spanner", difficulty: "Hard", strength: "Theoretical foundation" },
  { name: "Raft", usedBy: "etcd, CockroachDB, Consul", difficulty: "Easy", strength: "Understandability, strong leader" },
  { name: "Zab", usedBy: "Apache ZooKeeper", difficulty: "Medium", strength: "Ordered broadcasts" },
];
protocols.forEach((p) => {
  console.log(`  ${p.name}: Used by ${p.usedBy}`);
  console.log(`    Difficulty: ${p.difficulty} | Strength: ${p.strength}`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 9 — Full Raft Simulation (Election + Replication)
// ════════════════════════════════════════════════════════════════

// WHY: Complete simulation showing election, replication, node
// failure, and re-election in one flow.

console.log("--- SECTION 9: Full Raft Simulation ---\n");

class FullRaftCluster {
  constructor(n) {
    this.nodes = Array.from({ length: n }, (_, i) => ({
      id: `EC-Booth-${i + 1}`, state: "follower", log: [], isAlive: true,
    }));
    this.leaderIndex = -1; this.currentTerm = 0;
    console.log(`  Created cluster with ${n} Election Commission booths`);
  }
  electLeader() {
    this.currentTerm++;
    const ci = this.nodes.findIndex((n) => n.isAlive);
    if (ci === -1) { console.log("  No alive nodes!"); return false; }
    let votes = 1;
    console.log(`  [Term ${this.currentTerm}] ${this.nodes[ci].id} starts election`);
    for (let i = 0; i < this.nodes.length; i++) {
      if (i !== ci && this.nodes[i].isAlive) { votes++; console.log(`    ${this.nodes[i].id} grants vote (${votes})`); }
    }
    if (votes >= Math.floor(this.nodes.length / 2) + 1) {
      this.leaderIndex = ci; this.nodes[ci].state = "leader";
      console.log(`  ${this.nodes[ci].id} elected LEADER with ${votes} votes`);
      return true;
    }
    return false;
  }
  replicate(cmd) {
    if (this.leaderIndex === -1 || !this.nodes[this.leaderIndex].isAlive) {
      console.log(`  Cannot replicate — no active leader`); return false;
    }
    const entry = { term: this.currentTerm, cmd };
    this.nodes[this.leaderIndex].log.push(entry);
    let acks = 1;
    for (let i = 0; i < this.nodes.length; i++) {
      if (i !== this.leaderIndex && this.nodes[i].isAlive) { this.nodes[i].log.push({ ...entry }); acks++; }
    }
    const ok = acks >= Math.floor(this.nodes.length / 2) + 1;
    console.log(`  Replicate "${cmd}": ${acks}/${this.nodes.length} acks — ${ok ? "COMMITTED" : "FAILED"}`);
    return ok;
  }
  killNode(i) {
    this.nodes[i].isAlive = false;
    console.log(`  ${this.nodes[i].id} goes DOWN`);
    if (i === this.leaderIndex) { console.log("  Leader is down! Must re-elect..."); this.leaderIndex = -1; }
  }
}

const raft = new FullRaftCluster(5);
raft.electLeader();
raft.replicate("COUNT votes=50000 constituency=Mumbai-North");
raft.replicate("COUNT votes=62000 constituency=Mumbai-South");
console.log();
raft.killNode(0);
raft.electLeader();
raft.replicate("COUNT votes=45000 constituency=Pune");
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 10 — Practical Consensus in Real Systems
// ════════════════════════════════════════════════════════════════

// WHY: Consensus shows up in systems you use daily.

console.log("--- SECTION 10: Practical Consensus in Real Systems ---\n");

[
  ["MongoDB Replica Set", "Raft-like", "Electing primary, replicating oplog"],
  ["etcd (Kubernetes)", "Raft", "Storing cluster state, config"],
  ["Apache Kafka", "ISR", "Replicating partitions, electing leaders"],
  ["CockroachDB", "Raft", "Range-level replication"],
  ["Apache ZooKeeper", "Zab", "Config management, leader election"],
].forEach(([sys, proto, use]) => {
  console.log(`  ${sys}: ${proto} — ${use}`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log();
console.log("  1. Consensus ensures all nodes agree on a single state.");
console.log("  2. Raft uses leader election, log replication, and safety rules.");
console.log("  3. Quorum (majority) ensures overlapping operations for consistency.");
console.log("  4. Split-brain is prevented by quorum — one partition progresses.");
console.log("  5. Strong consistency waits for all; eventual allows stale reads.");
console.log("  6. Raft is preferred over Paxos for understandability.");
console.log("  7. MongoDB, etcd, and Kafka all use consensus internally.");
console.log("  8. Choose consistency level based on app needs.");
console.log();
console.log('  "Just as India\'s Election Commission ensures every vote is counted');
console.log('   fairly through a rigorous process, distributed consensus ensures');
console.log('   every node agrees on the truth — even when some nodes fail."');
console.log();
