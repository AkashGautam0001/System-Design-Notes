/** ============================================================
 *  FILE 09: DATABASE FUNDAMENTALS
 *  ============================================================
 *  Topic: SQL vs NoSQL, ACID, BASE, normalization, indexing
 *         (B-tree, hash), query optimization
 *
 *  WHY THIS MATTERS:
 *  Databases are the backbone of every application. Choosing the
 *  right model, understanding ACID guarantees, and properly
 *  indexing queries can mean the difference between a 50ms
 *  response and a 5-second timeout.
 *  ============================================================ */

// STORY: Aadhaar Database (UIDAI)
// India's Aadhaar stores biometric and demographic data for 1.4
// billion residents. ACID ensures no two people get the same number.
// Indexing by pincode is like a directory — jump to 10,000 records
// in a pincode instead of scanning all 1.4 billion.

console.log("=".repeat(70));
console.log("  FILE 09: DATABASE FUNDAMENTALS");
console.log("  Aadhaar Database — 1.4 Billion Records, Zero Duplicates");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — SQL Table Simulation
// ════════════════════════════════════════════════════════════════

// WHY: SQL databases store data in structured tables with defined
// schemas. Understanding table operations is foundational.

console.log("SECTION 1: SQL Table Simulation");
console.log("-".repeat(50));

class SQLTable {
  constructor(name, columns) {
    this.name = name; this.columns = columns; this.rows = []; this.autoId = 1;
    this.indexes = new Map();
  }
  insert(row) {
    for (const col of this.columns) {
      if (col.notNull && row[col.name] == null) throw new Error(`NOT NULL: ${col.name}`);
      if (col.unique && this.rows.find(r => r[col.name] === row[col.name]))
        throw new Error(`UNIQUE violation: ${col.name}='${row[col.name]}'`);
    }
    const pk = this.columns.find(c => c.pk);
    if (pk && !row[pk.name]) row[pk.name] = this.autoId++;
    this.rows.push({ ...row });
    for (const [col, idx] of this.indexes) {
      const v = row[col]; if (!idx.has(v)) idx.set(v, []);
      idx.get(v).push(this.rows.length - 1);
    }
    return row;
  }
  select(where = null) {
    if (!where) return this.rows;
    return this.rows.filter(r => Object.entries(where).every(([k, v]) => r[k] === v));
  }
  createIndex(col) {
    const idx = new Map();
    this.rows.forEach((r, i) => { const v = r[col]; if (!idx.has(v)) idx.set(v, []); idx.get(v).push(i); });
    this.indexes.set(col, idx); console.log(`    [INDEX] Created on ${this.name}.${col}`);
  }
  selectByIndex(col, val) {
    const idx = this.indexes.get(col);
    if (!idx) return this.select({ [col]: val });
    return (idx.get(val) || []).map(i => this.rows[i]);
  }
  count() { return this.rows.length; }
}

const aadhaar = new SQLTable("aadhaar", [
  { name: "id", type: "INT", pk: true },
  { name: "aadhaar_no", type: "VARCHAR", unique: true, notNull: true },
  { name: "name", type: "VARCHAR", notNull: true },
  { name: "pincode", type: "VARCHAR", notNull: true },
  { name: "state", type: "VARCHAR", notNull: true },
]);

console.log("\nCreating Aadhaar records:\n");
const citizens = [
  { aadhaar_no: "1234-5678-9012", name: "Rajesh Kumar", pincode: "110001", state: "Delhi" },
  { aadhaar_no: "2345-6789-0123", name: "Priya Sharma", pincode: "400001", state: "Maharashtra" },
  { aadhaar_no: "3456-7890-1234", name: "Arun Nair", pincode: "682001", state: "Kerala" },
  { aadhaar_no: "4567-8901-2345", name: "Lakshmi Devi", pincode: "110001", state: "Delhi" },
  { aadhaar_no: "5678-9012-3456", name: "Mohammed Rafi", pincode: "500001", state: "Telangana" },
  { aadhaar_no: "6789-0123-4567", name: "Deepa Iyer", pincode: "600001", state: "Tamil Nadu" },
  { aadhaar_no: "7890-1234-5678", name: "Vikram Singh", pincode: "302001", state: "Rajasthan" },
  { aadhaar_no: "8901-2345-6789", name: "Anita Gupta", pincode: "400001", state: "Maharashtra" },
];
for (const c of citizens) {
  const r = aadhaar.insert(c);
  console.log(`  INSERT: ${r.name} (${r.aadhaar_no}) ID=${r.id}`);
}

console.log("\n  Duplicate Aadhaar attempt:");
try { aadhaar.insert({ aadhaar_no: "1234-5678-9012", name: "Fake", pincode: "0", state: "X" }); }
catch (e) { console.log(`  ERROR: ${e.message}`); }
// Output: UNIQUE violation — integrity preserved!

console.log(`\n  SELECT WHERE state='Delhi':`);
aadhaar.select({ state: "Delhi" }).forEach(r => console.log(`    ${r.name}, PIN:${r.pincode}`));
console.log(`  Total: ${aadhaar.count()} records\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 2 — NoSQL Document Store
// ════════════════════════════════════════════════════════════════

// WHY: NoSQL stores flexible JSON documents without rigid schemas.
// Ideal for nested data and horizontal scaling.

console.log("SECTION 2: NoSQL Document Store");
console.log("-".repeat(50));

class DocStore {
  constructor() { this.docs = new Map(); this.autoId = 1; }
  insert(doc) {
    const id = doc._id || `doc_${this.autoId++}`;
    this.docs.set(id, { _id: id, ...doc });
    return this.docs.get(id);
  }
  find(query = {}) {
    return [...this.docs.values()].filter(doc => {
      for (const [key, val] of Object.entries(query)) {
        const parts = key.split("."); let cur = doc;
        for (const p of parts) { if (cur == null) return false; cur = cur[p]; }
        if (cur !== val) return false;
      }
      return true;
    });
  }
}

const docDb = new DocStore();
console.log("\nFlexible documents with nested data:\n");
const docs = [
  { _id: "A001", name: "Rajesh", address: { city: "Delhi", pin: "110001" }, services: ["PAN", "Bank"] },
  { _id: "A002", name: "Priya", address: { city: "Mumbai", pin: "400001" }, services: ["PAN"] },
  { _id: "A003", name: "Arun", address: { city: "Kochi", pin: "682001" }, services: ["PAN", "Mobile"] },
];
for (const d of docs) { docDb.insert(d); console.log(`  INSERT: ${d.name} — nested address, services array`); }

console.log(`\n  find({ "address.city": "Delhi" }):`);
docDb.find({ "address.city": "Delhi" }).forEach(d => console.log(`    ${d.name} — ${d.address.city}`));
console.log("\n  SQL: Fixed schema, JOINs, ACID, vertical scaling");
console.log("  NoSQL: Flexible schema, embedded data, BASE, horizontal scaling\n");

// ════════════════════════════════════════════════════════════════
// SECTION 3 — ACID Properties Demo
// ════════════════════════════════════════════════════════════════

// WHY: ACID (Atomicity, Consistency, Isolation, Durability) makes
// databases reliable for critical operations like unique ID generation.

console.log("SECTION 3: ACID Properties Demo");
console.log("-".repeat(50));

class TransactionalDB {
  constructor() { this.data = new Map(); this.wal = []; this.tx = null; this.buf = new Map(); }
  begin(id) { this.tx = id; this.buf = new Map(); console.log(`    [TX ${id}] BEGIN`); }
  set(k, v) { if (this.tx) this.buf.set(k, v); else this.data.set(k, v); }
  get(k) { return (this.tx && this.buf.has(k)) ? this.buf.get(k) : this.data.get(k); }
  commit() {
    this.wal.push({ tx: this.tx, changes: [...this.buf.entries()] });
    for (const [k, v] of this.buf) this.data.set(k, v);
    console.log(`    [TX ${this.tx}] COMMIT — ${this.buf.size} changes applied atomically`);
    this.tx = null; this.buf = new Map();
  }
  rollback() {
    console.log(`    [TX ${this.tx}] ROLLBACK — ${this.buf.size} changes discarded`);
    this.tx = null; this.buf = new Map();
  }
}

const txDb = new TransactionalDB();
txDb.data.set("count", 1400000000);

console.log("\n  A — Atomicity (all-or-nothing):");
txDb.begin("TX-001");
txDb.set("count", txDb.get("count") + 1);
txDb.set("new-citizen", "Baby Sharma");
txDb.commit();
console.log(`    count = ${txDb.get("count")}\n`);

console.log("  A — Atomicity (failure -> rollback):");
txDb.begin("TX-002");
txDb.set("count", txDb.get("count") + 1);
console.log("    Biometric verification failed...");
txDb.rollback();
console.log(`    count still = ${txDb.get("count")} (unchanged)\n`);

console.log("  C — Consistency: Aadhaar must match /^\\d{4}-\\d{4}-\\d{4}$/");
console.log(`    "1234-5678-9012" valid: ${/^\d{4}-\d{4}-\d{4}$/.test("1234-5678-9012")}`);
console.log(`    "123" valid: ${/^\d{4}-\d{4}-\d{4}$/.test("123")} — REJECTED\n`);

console.log("  I — Isolation: Concurrent TXs don't see each other's uncommitted data");
console.log("  D — Durability: WAL has", txDb.wal.length, "entries — replay on crash\n");

// ════════════════════════════════════════════════════════════════
// SECTION 4 — BASE Properties
// ════════════════════════════════════════════════════════════════

// WHY: BASE (Basically Available, Soft state, Eventually consistent)
// prioritizes availability over strict consistency in distributed systems.

console.log("SECTION 4: BASE Properties");
console.log("-".repeat(50));

class EventualStore {
  constructor(n) {
    this.replicas = Array.from({ length: n }, (_, i) => ({ id: i + 1, data: new Map(), ver: 0 }));
    this.pending = [];
  }
  write(k, v) {
    const p = this.replicas[0]; p.data.set(k, v); p.ver++;
    console.log(`    [PRIMARY] "${k}" = ${JSON.stringify(v)} (v${p.ver})`);
    for (let i = 1; i < this.replicas.length; i++) this.pending.push({ rid: i, k, v, ver: p.ver });
    console.log(`    [QUEUE] ${this.pending.length} sync ops pending`);
  }
  read(rid, k) {
    const r = this.replicas[rid]; return { val: r.data.get(k) || "NOT_FOUND", ver: r.ver };
  }
  sync() {
    while (this.pending.length) {
      const op = this.pending.shift(); const r = this.replicas[op.rid];
      r.data.set(op.k, op.v); r.ver = op.ver;
      console.log(`    [SYNC] Replica ${r.id}: v${r.ver}`);
    }
  }
}

console.log("\nAadhaar address update (distributed):\n");
const base = new EventualStore(3);
base.write("citizen-1001", { city: "Bengaluru", pin: "560001" });
console.log("\n  Before sync (soft state):");
for (let i = 0; i < 3; i++) { const r = base.read(i, "citizen-1001"); console.log(`    Replica ${i + 1}: ${JSON.stringify(r.val)}`); }
console.log("\n  After sync (eventually consistent):");
base.sync();
for (let i = 0; i < 3; i++) { const r = base.read(i, "citizen-1001"); console.log(`    Replica ${i + 1}: ${JSON.stringify(r.val)}`); }
console.log("\n  ACID: Strong consistency (banking). BASE: Eventually consistent (social).\n");

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Normalization (1NF to 3NF)
// ════════════════════════════════════════════════════════════════

// WHY: Normalization reduces redundancy and prevents update anomalies.

console.log("SECTION 5: Normalization (1NF to 3NF)");
console.log("-".repeat(50));
console.log(`
  Unnormalized (violates 1NF):
  | ID   | Name   | Phones                 |
  | 1001 | Rajesh | 9876543210, 9123456789 |  <- multi-valued!

  1NF — Atomic values:
  citizens:          phones:
  | ID   | Name   |  | CID  | Phone      |
  | 1001 | Rajesh |  | 1001 | 9876543210 |
                      | 1001 | 9123456789 |

  2NF — No partial dependencies:
  (aadhaar, service) -> provider depends only on service.
  Fix: Separate services table.

  3NF — No transitive dependencies:
  pincode -> state (state depends on pincode, not aadhaar).
  Fix: pincodes table with pin->state mapping.
  Stores "Delhi" once, not per citizen.
`);

// ════════════════════════════════════════════════════════════════
// SECTION 6 — B-Tree Index Simulation
// ════════════════════════════════════════════════════════════════

// WHY: B-trees provide O(log n) search/insert and support range
// queries. The default index type in most SQL databases.

console.log("SECTION 6: B-Tree Index Simulation");
console.log("-".repeat(50));

class SimpleBTree {
  constructor(order = 4) { this.root = { keys: [], vals: [], children: [], leaf: true }; this.order = order; this.comp = 0; }
  insert(key, val) {
    if (this.root.keys.length >= this.order - 1) {
      const newRoot = { keys: [], vals: [], children: [this.root], leaf: false };
      this._split(newRoot, 0); this.root = newRoot;
    }
    this._insertNonFull(this.root, key, val);
  }
  _insertNonFull(node, key, val) {
    let i = node.keys.length - 1;
    if (node.leaf) {
      while (i >= 0 && key < node.keys[i]) i--;
      node.keys.splice(i + 1, 0, key); node.vals.splice(i + 1, 0, val);
    } else {
      while (i >= 0 && key < node.keys[i]) i--;
      i++;
      if (node.children[i].keys.length >= this.order - 1) { this._split(node, i); if (key > node.keys[i]) i++; }
      this._insertNonFull(node.children[i], key, val);
    }
  }
  _split(parent, idx) {
    const child = parent.children[idx]; const mid = Math.floor((this.order - 1) / 2);
    const newChild = { keys: child.keys.splice(mid + 1), vals: child.leaf ? child.vals.splice(mid + 1) : [], children: child.leaf ? [] : child.children.splice(mid + 1), leaf: child.leaf };
    const promoted = child.keys.pop(); if (child.leaf) child.vals.pop();
    parent.keys.splice(idx, 0, promoted); parent.children.splice(idx + 1, 0, newChild);
  }
  search(key) {
    this.comp = 0; return this._search(this.root, key);
  }
  _search(node, key) {
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) { this.comp++; i++; }
    this.comp++;
    if (i < node.keys.length && key === node.keys[i]) return { found: true, val: node.leaf ? node.vals[i] : key, comp: this.comp };
    if (node.leaf) return { found: false, comp: this.comp };
    return this._search(node.children[i], key);
  }
}

console.log("\nB-Tree index on pincode:\n");
const bt = new SimpleBTree(4);
const pins = [
  [110001, "Delhi"], [400001, "Mumbai"], [560001, "Bengaluru"], [600001, "Chennai"],
  [500001, "Hyderabad"], [700001, "Kolkata"], [682001, "Kochi"], [302001, "Jaipur"],
  [380001, "Ahmedabad"], [226001, "Lucknow"], [411001, "Pune"], [800001, "Patna"],
];
for (const [pin, city] of pins) bt.insert(pin, city);
console.log(`  Inserted ${pins.length} pincodes\n`);

for (const pin of [560001, 110001, 800001, 999999]) {
  const r = bt.search(pin);
  console.log(`  Search ${pin}: ${r.found ? r.val : "NOT FOUND"} (${r.comp} comparisons)`);
}
// Output: O(log n) comparisons
console.log("\n  Without index: scan 1.4B = O(n)");
console.log("  With B-Tree: ~30 comparisons for 1.4B records!\n");

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Hash Index
// ════════════════════════════════════════════════════════════════

// WHY: Hash indexes provide O(1) exact-match lookups — faster
// than B-trees for equality but cannot do range queries.

console.log("SECTION 7: Hash Index");
console.log("-".repeat(50));

class HashIndex {
  constructor(buckets = 8) {
    this.buckets = Array.from({ length: buckets }, () => []);
    this.size = 0; this.collisions = 0; this.bucketCount = buckets;
  }
  hash(key) { let h = 0; for (const c of String(key)) h = ((h << 5) - h + c.charCodeAt(0)) & 0x7fffffff; return h % this.bucketCount; }
  put(k, v) {
    const b = this.hash(k); const e = this.buckets[b].find(x => x.k === k);
    if (e) { e.v = v; } else { if (this.buckets[b].length > 0) this.collisions++; this.buckets[b].push({ k, v }); this.size++; }
  }
  get(k) {
    const b = this.hash(k); const e = this.buckets[b].find(x => x.k === k);
    return e ? { found: true, val: e.v, bucket: b } : { found: false, bucket: b };
  }
  dist() {
    for (let i = 0; i < this.bucketCount; i++) if (this.buckets[i].length) console.log(`    Bucket ${i}: ${"#".repeat(this.buckets[i].length)} (${this.buckets[i].length})`);
  }
}

console.log("\nHash index on Aadhaar numbers:\n");
const hi = new HashIndex(8);
for (const c of citizens) hi.put(c.aadhaar_no, c.name);

for (const a of ["1234-5678-9012", "5678-9012-3456", "0000-0000-0000"]) {
  const r = hi.get(a);
  console.log(`  "${a}": ${r.found ? r.val : "NOT FOUND"} (bucket ${r.bucket})`);
}
console.log(); hi.dist();
console.log(`  Collisions: ${hi.collisions}`);
console.log("\n  B-Tree: O(log n), range queries, ORDER BY");
console.log("  Hash:   O(1) exact match only\n");

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Query Optimization Basics
// ════════════════════════════════════════════════════════════════

// WHY: Poorly written queries cause full table scans. Understanding
// query plans helps write efficient queries.

console.log("SECTION 8: Query Optimization Basics");
console.log("-".repeat(50));

aadhaar.createIndex("pincode");
const indexed = ["pincode", "aadhaar_no"];

function planQuery(sql, table, indexes) {
  const n = table.count();
  const where = sql.match(/WHERE\s+(\w+)\s*=/);
  let plan, cost;
  if (where && indexes.includes(where[1])) {
    plan = `INDEX SCAN on ${where[1]}`; cost = Math.ceil(Math.log2(n));
  } else if (where) {
    plan = `FULL SCAN (no index on ${where[1]})`; cost = n;
  } else {
    plan = "FULL SCAN"; cost = n;
  }
  if (sql.includes("ORDER BY")) {
    const ob = sql.match(/ORDER BY\s+(\w+)/);
    plan += ob && indexes.includes(ob[1]) ? " + INDEX SORT" : " + FILE SORT";
  }
  return { plan, cost };
}

const queries = [
  "SELECT * FROM aadhaar",
  "SELECT * FROM aadhaar WHERE pincode = '110001'",
  "SELECT * FROM aadhaar WHERE state = 'Delhi'",
  "SELECT * FROM aadhaar WHERE pincode = '110001' ORDER BY name",
];

console.log(`\nQuery plans (${aadhaar.count()} rows, indexes: [${indexed.join(", ")}]):\n`);
for (const q of queries) {
  const p = planQuery(q, aadhaar, indexed);
  console.log(`  ${q}`);
  console.log(`    Plan: ${p.plan} | Cost: ${p.cost}${p.cost > 5 ? " *** ADD INDEX ***" : ""}\n`);
}
console.log("  Tips: Index WHERE/JOIN cols, avoid SELECT *, use LIMIT, check EXPLAIN.\n");

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log(`
  1. SQL: rigid schema, ACID — banking, government IDs.
  2. NoSQL: flexible schema, BASE — rapid dev, horizontal scale.
  3. ACID: Atomicity, Consistency, Isolation, Durability.
  4. BASE: Eventually consistent, trades consistency for availability.
  5. Normalization (1NF-3NF) eliminates redundancy, increases JOINs.
  6. B-tree: O(log n) lookups + range queries — default index type.
  7. Hash: O(1) exact lookups, no range — use for equality patterns.
  8. Query optimization: index WHERE cols, avoid SELECT *, use LIMIT.
`);
console.log('  UIDAI architect\'s wisdom: "1.4 billion records mean nothing');
console.log('  with the right index. Without it, finding one person takes');
console.log('  longer than their train journey."');
console.log();
console.log("=".repeat(70));
