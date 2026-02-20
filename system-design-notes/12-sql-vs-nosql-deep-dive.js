/** ============================================================
 *  FILE 12: SQL vs NoSQL DEEP DIVE
 *  ============================================================
 *  Topic: Document (MongoDB), key-value (Redis), column-family
 *         (Cassandra), graph, time-series, polyglot persistence
 *
 *  WHY THIS MATTERS:
 *  No single database fits every use case. Modern systems combine
 *  multiple database types — document stores for flexible schemas,
 *  key-value for blazing-fast lookups, column-family for analytics.
 *  Choosing wrong costs months of painful migration later.
 *  ============================================================ */

// STORY: Ola Ride Platform
// Ola serves 2 million rides daily across 250 Indian cities. Each ride
// generates structured trip data, real-time GPS pings, and analytics.
// Ride history lives in a document store (flexible schema per ride type),
// driver location in a key-value store (sub-millisecond reads), and
// trip analytics in a column-family store (efficient time-range scans).

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║  FILE 12 — SQL vs NoSQL DEEP DIVE                          ║");
console.log("║  Ola Ride Platform: polyglot persistence across DB types    ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Document Store Simulation (MongoDB-style)
// ════════════════════════════════════════════════════════════════

// WHY: Document stores shine when each record can have a different shape.

console.log("=== SECTION 1: Document Store (MongoDB-style) ===\n");

class DocumentStore {
  constructor(name) {
    this.name = name;
    this.collections = {};
  }

  createCollection(collName) {
    this.collections[collName] = [];
    return this;
  }

  insertOne(collName, doc) {
    const stored = { _id: `ObjectId_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, ...doc };
    this.collections[collName].push(stored);
    return stored._id;
  }

  insertMany(collName, docs) {
    return docs.map((d) => this.insertOne(collName, d));
  }

  find(collName, query = {}) {
    return this.collections[collName].filter((doc) => {
      return Object.entries(query).every(([key, val]) => {
        if (typeof val === "object" && val !== null) {
          if ("$gt" in val) return doc[key] > val.$gt;
          if ("$lt" in val) return doc[key] < val.$lt;
          if ("$in" in val) return val.$in.includes(doc[key]);
        }
        return doc[key] === val;
      });
    });
  }

  aggregate(collName, matchField, matchVal, groupField) {
    let data = this.collections[collName].filter((d) => d[matchField] === matchVal);
    const groups = {};
    data.forEach((d) => {
      const key = d[groupField];
      groups[key] = (groups[key] || 0) + 1;
    });
    return Object.entries(groups).map(([k, v]) => ({ _id: k, count: v }));
  }
}

function demoDocumentStore() {
  const db = new DocumentStore("ola_rides");
  db.createCollection("rides");

  // Ola rides — different ride types have different fields
  db.insertMany("rides", [
    { type: "auto", rider: "Priya", driver: "Raju", fare: 85,
      city: "Bangalore", pickup: "Koramangala", drop: "Indiranagar" },
    { type: "mini", rider: "Arjun", driver: "Suresh", fare: 250,
      city: "Bangalore", pickup: "HSR", drop: "Airport", ac: true },
    { type: "share", rider: "Meera", driver: "Kamal", fare: 45,
      city: "Chennai", pickup: "T.Nagar", drop: "Adyar",
      co_riders: ["Deepa", "Kiran"], seats_shared: 3 },
    { type: "outstation", rider: "Vikram", driver: "Mohan", fare: 3500,
      city: "Mumbai", pickup: "Andheri", drop: "Pune",
      distance_km: 148, tolls: 2, toll_amount: 340 },
    { type: "rental", rider: "Sneha", driver: "Balu", fare: 1200,
      city: "Delhi", pickup: "Connaught Place", hours_booked: 4,
      package: "4hr-40km" },
  ]);

  console.log("Ola Ride documents — each type has different fields:");
  const rides = db.find("rides");
  rides.forEach((r) => {
    const fields = Object.keys(r).filter((k) => k !== "_id").join(", ");
    console.log(`  ${r.type.padEnd(10)} -> fields: [${fields}]`);
  });
  // Output: share has co_riders, outstation has tolls, rental has package

  console.log("\nQuery: rides in Bangalore with fare > 100:");
  const expensive = db.find("rides", { city: "Bangalore" }).filter((r) => r.fare > 100);
  expensive.forEach((r) => console.log(`  ${r.rider}: Rs.${r.fare} (${r.type})`));

  console.log("\nDocument stores: flexible schema, nested data, no JOINs needed.");
}

demoDocumentStore();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Key-Value Store with TTL (Redis-style)
// ════════════════════════════════════════════════════════════════

// WHY: Sub-millisecond reads for driver location, session tokens, caches.

console.log("\n\n=== SECTION 2: Key-Value Store with TTL (Redis-style) ===\n");

class KeyValueStore {
  constructor() {
    this.data = new Map();
    this.expiry = new Map();
  }

  set(key, value, ttlMs = 0) {
    this.data.set(key, JSON.stringify(value));
    if (ttlMs > 0) this.expiry.set(key, Date.now() + ttlMs);
  }

  get(key) {
    if (this.expiry.has(key) && Date.now() > this.expiry.get(key)) {
      this.data.delete(key);
      this.expiry.delete(key);
      return null;
    }
    const val = this.data.get(key);
    return val ? JSON.parse(val) : null;
  }

  del(key) { this.data.delete(key); this.expiry.delete(key); }

  incr(key) { const val = this.get(key) || 0; this.set(key, val + 1); return val + 1; }

  geoAdd(key, lng, lat, member) {
    const geo = this.get(key) || {};
    geo[member] = { lng, lat };
    this.set(key, geo);
  }

  geoNearby(key, lng, lat, radiusKm) {
    const geo = this.get(key) || {};
    return Object.entries(geo).map(([member, pos]) => {
      const dist = Math.sqrt(Math.pow(pos.lng - lng, 2) + Math.pow(pos.lat - lat, 2)) * 111;
      return { member, distance: dist };
    }).filter((e) => e.distance <= radiusKm).sort((a, b) => a.distance - b.distance);
  }
}

function demoKeyValue() {
  const redis = new KeyValueStore();

  // Ola: Driver locations (updated every 3 seconds)
  console.log("Ola driver locations (key-value with geo):");
  redis.geoAdd("drivers:bangalore", 77.6101, 12.9352, "driver:raju");
  redis.geoAdd("drivers:bangalore", 77.6200, 12.9400, "driver:suresh");
  redis.geoAdd("drivers:bangalore", 77.6310, 12.9280, "driver:kamal");
  redis.geoAdd("drivers:bangalore", 77.5950, 12.9500, "driver:mohan");

  const riderLoc = { lng: 77.6150, lat: 12.9370 };
  const nearby = redis.geoNearby("drivers:bangalore", riderLoc.lng, riderLoc.lat, 2);
  console.log(`  Rider at (${riderLoc.lng}, ${riderLoc.lat}) — nearby drivers (2km):`);
  nearby.forEach((d) => console.log(`    ${d.member}: ${d.distance.toFixed(2)} km away`));

  // Session cache with TTL
  console.log("\nSession cache with TTL:");
  redis.set("session:priya", { userId: "U-001", role: "rider" }, 1800000);
  redis.set("surge:koramangala", { multiplier: 1.8 }, 300000);
  console.log(`  session:priya -> ${JSON.stringify(redis.get("session:priya"))}`);
  console.log(`  surge:koramangala -> ${JSON.stringify(redis.get("surge:koramangala"))}`);

  // Rate limiter
  console.log("\nRate limiter pattern:");
  const userId = "U-001";
  for (let i = 0; i < 5; i++) redis.incr(`ratelimit:${userId}`);
  const count = redis.get(`ratelimit:${userId}`);
  console.log(`  ${userId} request count: ${count} (limit: 10/min)`);
  console.log(`  ${count > 10 ? "BLOCKED" : "ALLOWED"}`);
}

demoKeyValue();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Column-Family Store (Cassandra-style)
// ════════════════════════════════════════════════════════════════

// WHY: Optimized for write-heavy workloads and time-range queries.

console.log("\n\n=== SECTION 3: Column-Family Store (Cassandra-style) ===\n");

class ColumnFamilyStore {
  constructor() {
    this.tables = {};
  }

  createTable(name, partitionKey, clusteringKey) {
    this.tables[name] = { partitionKey, clusteringKey, partitions: {} };
  }

  insert(tableName, row) {
    const table = this.tables[tableName];
    const pk = row[table.partitionKey];
    const ck = row[table.clusteringKey];
    if (!table.partitions[pk]) table.partitions[pk] = {};
    table.partitions[pk][ck] = { ...row };
  }

  queryPartition(tableName, partitionValue, options = {}) {
    const table = this.tables[tableName];
    const partition = table.partitions[partitionValue] || {};
    let rows = Object.values(partition);
    if (options.clusteringFrom) rows = rows.filter((r) => r[table.clusteringKey] >= options.clusteringFrom);
    if (options.clusteringTo) rows = rows.filter((r) => r[table.clusteringKey] <= options.clusteringTo);
    return rows.sort((a, b) => (a[table.clusteringKey] < b[table.clusteringKey] ? -1 : 1));
  }

  stats(tableName) {
    const t = this.tables[tableName];
    const partitions = Object.keys(t.partitions).length;
    const totalRows = Object.values(t.partitions).reduce((s, p) => s + Object.keys(p).length, 0);
    return { partitions, totalRows };
  }
}

function demoColumnFamily() {
  const cassandra = new ColumnFamilyStore();

  // Ola trip analytics: partition by city, cluster by timestamp
  cassandra.createTable("trip_analytics", "city", "timestamp");

  const cities = ["Bangalore", "Mumbai", "Delhi", "Chennai"];
  const months = ["2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06"];

  cities.forEach((city) => {
    months.forEach((month) => {
      cassandra.insert("trip_analytics", {
        city,
        timestamp: `${month}-01T00:00:00`,
        total_rides: Math.floor(Math.random() * 100000) + 50000,
        avg_fare: Math.floor(Math.random() * 200) + 100,
        surge_pct: (Math.random() * 30).toFixed(1),
        cancellation_rate: (Math.random() * 15).toFixed(1),
      });
    });
  });

  console.log("Ola trip analytics in column-family store:");
  const st = cassandra.stats("trip_analytics");
  console.log(`  Partitions (cities): ${st.partitions}, Total rows: ${st.totalRows}\n`);

  // Efficient query: all Bangalore data for Q1
  console.log("Query: Bangalore trips Jan-Mar 2024 (single partition scan):");
  const q1 = cassandra.queryPartition("trip_analytics", "Bangalore", {
    clusteringFrom: "2024-01",
    clusteringTo: "2024-03-31",
  });
  q1.forEach((r) => {
    console.log(`  ${r.timestamp.slice(0, 7)}: ${r.total_rides} rides, avg Rs.${r.avg_fare}`);
  });

  console.log("\nWhy column-family for analytics?");
  console.log("  - Partition by city = data locality on disk");
  console.log("  - Clustering by timestamp = ordered range scans");
  console.log("  - Wide rows = millions of columns per partition");
  console.log("  - Write-optimized: LSM tree, no read-before-write");
}

demoColumnFamily();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Graph Database Basics
// ════════════════════════════════════════════════════════════════

// WHY: Relationships between entities (fraud rings, recommendations).

console.log("\n\n=== SECTION 4: Graph Database Basics ===\n");

class GraphDB {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
  }

  addNode(id, properties) {
    this.nodes.set(id, properties);
  }

  addEdge(from, to, type, properties = {}) {
    this.edges.push({ from, to, type, ...properties });
  }

  shortestPath(startId, endId) {
    const visited = new Set();
    const queue = [[startId]];
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      if (current === endId) return path;
      if (visited.has(current)) continue;
      visited.add(current);
      this.edges.filter((e) => e.from === current).forEach((e) => queue.push([...path, e.to]));
    }
    return null;
  }
}

function demoGraph() {
  const graph = new GraphDB();

  // Ola: Fraud detection — riders using same device/payment
  graph.addNode("rider:priya", { name: "Priya", type: "rider" });
  graph.addNode("rider:fake1", { name: "FakeUser1", type: "rider" });
  graph.addNode("rider:fake2", { name: "FakeUser2", type: "rider" });
  graph.addNode("device:D001", { type: "device", model: "Samsung A52" });
  graph.addNode("payment:P001", { type: "payment", last4: "4321" });
  graph.addNode("promo:FIRST50", { type: "promo", discount: 50 });

  graph.addEdge("rider:priya", "device:D001", "USES_DEVICE");
  graph.addEdge("rider:fake1", "device:D001", "USES_DEVICE");
  graph.addEdge("rider:fake2", "device:D001", "USES_DEVICE");
  graph.addEdge("rider:fake1", "payment:P001", "PAYS_WITH");
  graph.addEdge("rider:fake2", "payment:P001", "PAYS_WITH");
  graph.addEdge("rider:fake1", "promo:FIRST50", "REDEEMED");
  graph.addEdge("rider:fake2", "promo:FIRST50", "REDEEMED");

  console.log("Ola fraud detection via graph traversal:\n");
  console.log("Accounts sharing device D001:");
  const sharedDevice = graph.edges
    .filter((e) => e.to === "device:D001")
    .map((e) => e.from);
  sharedDevice.forEach((r) => console.log(`  ${r} -> ${graph.nodes.get(r).name}`));

  console.log(`\n  ${sharedDevice.length} accounts on 1 device = SUSPICIOUS`);
  console.log("  Both fake accounts redeemed same promo = FRAUD RING detected!");

  const path = graph.shortestPath("rider:priya", "promo:FIRST50");
  console.log(`\n  Path priya -> FIRST50: ${path ? path.join(" -> ") : "none"}`);
}

demoGraph();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Time-Series Data
// ════════════════════════════════════════════════════════════════

// WHY: GPS pings, ride metrics, and system telemetry are all time-series.

console.log("\n\n=== SECTION 5: Time-Series Data ===\n");

class TimeSeriesDB {
  constructor() {
    this.series = {};
  }

  write(measurement, tags, fields, timestamp) {
    const key = `${measurement}|${Object.entries(tags).map(([k, v]) => `${k}=${v}`).join(",")}`;
    if (!this.series[key]) this.series[key] = [];
    this.series[key].push({ timestamp, ...fields });
  }

  query(measurement, tagFilter, timeFrom, timeTo) {
    return Object.entries(this.series).filter(([key]) => {
      const [meas, tagStr] = key.split("|");
      return meas === measurement && Object.entries(tagFilter).every(([k, v]) => tagStr.includes(`${k}=${v}`));
    }).flatMap(([, pts]) => pts.filter((p) => p.timestamp >= timeFrom && p.timestamp <= timeTo))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  downsample(measurement, tagFilter, timeFrom, timeTo, intervalMs) {
    const points = this.query(measurement, tagFilter, timeFrom, timeTo);
    const buckets = {};
    points.forEach((p) => {
      const b = Math.floor(p.timestamp / intervalMs) * intervalMs;
      if (!buckets[b]) buckets[b] = { count: 0, sumSpeed: 0 };
      buckets[b].count++;
      if (p.speed !== undefined) buckets[b].sumSpeed += p.speed;
    });
    return Object.entries(buckets).map(([ts, b]) => ({
      timestamp: Number(ts), avgSpeed: (b.sumSpeed / b.count).toFixed(1), pointCount: b.count,
    }));
  }
}

function demoTimeSeries() {
  const tsdb = new TimeSeriesDB();

  // Ola driver GPS pings — every 3 seconds during a ride
  const baseTime = 1700000000000;
  for (let i = 0; i < 60; i++) {
    tsdb.write("gps_ping",
      { driver: "raju", ride_id: "RIDE-5001" },
      { lat: 12.935 + i * 0.001, lng: 77.610 + i * 0.0008, speed: 20 + Math.random() * 30 },
      baseTime + i * 3000
    );
  }

  const points = tsdb.query("gps_ping", { driver: "raju" }, baseTime, baseTime + 30000);
  console.log(`Ola GPS pings for driver Raju (first 10 of ${points.length}):`);
  points.slice(0, 5).forEach((p) => {
    console.log(`  t=${p.timestamp - baseTime}ms lat=${p.lat.toFixed(3)} speed=${p.speed.toFixed(0)}km/h`);
  });

  // Downsampling: 3s pings -> 15s averages
  const downsampled = tsdb.downsample("gps_ping", { driver: "raju" },
    baseTime, baseTime + 180000, 15000);
  console.log(`\nDownsampled (15s buckets): ${downsampled.length} points`);
  downsampled.slice(0, 4).forEach((d) => {
    console.log(`  bucket: +${(d.timestamp - baseTime) / 1000}s avgSpeed: ${d.avgSpeed} km/h (${d.pointCount} pts)`);
  });

  console.log("\nTime-series optimizations: compression, downsampling, retention policies");
}

demoTimeSeries();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Polyglot Persistence Pattern
// ════════════════════════════════════════════════════════════════

// WHY: Ola uses 4+ database types — each for its strength.

console.log("\n\n=== SECTION 6: Polyglot Persistence (Ola Architecture) ===\n");

function polyglotDemo() {
  const olaArchitecture = {
    "Ride History":       { db: "MongoDB (Document)",      reason: "Flexible schema per ride type" },
    "Driver Location":    { db: "Redis (Key-Value)",       reason: "Sub-ms reads, 3s TTL updates" },
    "Trip Analytics":     { db: "Cassandra (Column-Family)", reason: "Write-heavy, time-range scans" },
    "Fraud Detection":    { db: "Neo4j (Graph)",           reason: "Traverse rider-device-payment links" },
    "GPS Tracking":       { db: "InfluxDB (Time-Series)",  reason: "Millions of pings/sec, compression" },
    "User Profiles":      { db: "PostgreSQL (Relational)", reason: "ACID for payment details, KYC" },
    "Search":             { db: "Elasticsearch",           reason: "Full-text search on locations" },
  };

  console.log("Ola's polyglot persistence architecture:\n");
  Object.entries(olaArchitecture).forEach(([useCase, info]) => {
    console.log(`  ${useCase.padEnd(20)} -> ${info.db}`);
    console.log(`  ${"".padEnd(20)}    Why: ${info.reason}`);
  });

  console.log("\nData flow for a single ride:");
  console.log("  1. Rider opens app -> Redis: fetch nearby drivers (< 1ms)");
  console.log("  2. Ride matched    -> PostgreSQL: create ride record (ACID)");
  console.log("  3. During ride     -> InfluxDB: GPS pings every 3s");
  console.log("  4. Ride complete   -> MongoDB: store full ride document");
  console.log("  5. Post-ride       -> Cassandra: write analytics row");
  console.log("  6. Background      -> Neo4j: update fraud graph");
}

polyglotDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Choosing the Right Database
// ════════════════════════════════════════════════════════════════

// WHY: A decision matrix prevents costly mistakes.

console.log("\n\n=== SECTION 7: Choosing the Right Database ===\n");

function dbDecisionMatrix() {
  const criteria = [
    { need: "Flexible schema",        winner: "Document (MongoDB)",    score: "Schema-free, nested JSON" },
    { need: "Ultra-fast lookups",      winner: "Key-Value (Redis)",     score: "O(1) by key, in-memory" },
    { need: "Heavy writes + ranges",   winner: "Column-Family (Cassandra)", score: "LSM tree, wide rows" },
    { need: "Relationship traversal",  winner: "Graph (Neo4j)",         score: "O(1) per hop, no JOINs" },
    { need: "Time-ordered data",       winner: "Time-Series (InfluxDB)", score: "Compression, downsampling" },
    { need: "ACID transactions",       winner: "Relational (PostgreSQL)", score: "Strong consistency" },
    { need: "Full-text search",        winner: "Search (Elasticsearch)", score: "Inverted index, scoring" },
  ];

  console.log("Database decision matrix:\n");
  criteria.forEach((c) => {
    console.log(`  Need: ${c.need}`);
    console.log(`  Best: ${c.winner} — ${c.score}\n`);
  });

  // Anti-patterns
  console.log("Common anti-patterns:");
  console.log("  X Using MongoDB for financial transactions (no multi-doc ACID pre-4.0)");
  console.log("  X Using PostgreSQL for real-time driver locations (too slow)");
  console.log("  X Using Redis for analytics (volatile, no range scans)");
  console.log("  X Using Cassandra for graph traversals (no JOIN support)");
}

dbDecisionMatrix();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Migration Strategies
// ════════════════════════════════════════════════════════════════

// WHY: Teams often start with one DB and need to migrate later.

console.log("\n\n=== SECTION 8: Migration Strategies ===\n");

function migrationDemo() {
  console.log("Ola's migration: MySQL -> MongoDB for ride history\n");

  // Simulate dual-write migration
  const mysqlRides = [];
  const mongoRides = [];

  function writeToMySQL(ride) { mysqlRides.push({ ...ride, _source: "mysql" }); }
  function writeToMongo(ride) { mongoRides.push({ ...ride, _source: "mongo" }); }

  // Phase 1: Dual-write
  console.log("Phase 1 — Dual Write:");
  const rides = [
    { id: 1, rider: "Priya", fare: 250 },
    { id: 2, rider: "Arjun", fare: 180 },
    { id: 3, rider: "Meera", fare: 320 },
  ];
  rides.forEach((r) => { writeToMySQL(r); writeToMongo(r); });
  console.log(`  MySQL: ${mysqlRides.length} rides, MongoDB: ${mongoRides.length} rides`);
  console.log("  Both DBs receive every write\n");

  // Phase 2: Verify consistency
  console.log("Phase 2 — Verify Consistency:");
  let mismatches = 0;
  mysqlRides.forEach((mr, i) => {
    if (mr.fare !== mongoRides[i].fare) mismatches++;
  });
  console.log(`  Checked ${mysqlRides.length} records, ${mismatches} mismatches`);
  console.log("  Consistency check: PASSED\n");

  // Phase 3: Switch reads
  console.log("Phase 3 — Switch Reads to MongoDB:");
  console.log("  Feature flag: read_from = 'mongo' (gradual rollout 1% -> 100%)\n");

  // Phase 4: Stop MySQL writes
  console.log("Phase 4 — Stop MySQL Writes:");
  console.log("  Disable dual-write, MySQL becomes read-only backup\n");

  // Phase 5: Decommission
  console.log("Phase 5 — Decommission MySQL:");
  console.log("  After 30-day observation, drop MySQL ride tables");

  console.log("\nStrangler Fig pattern: gradually replace old system from the edges inward.");
}

migrationDemo();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("\n\n=== KEY TAKEAWAYS ===\n");
console.log("1. Document stores excel at flexible schemas — different fields per record.");
console.log("2. Key-value stores deliver sub-millisecond reads for hot data like locations.");
console.log("3. Column-family stores handle write-heavy analytics with time-range queries.");
console.log("4. Graph databases detect fraud and power recommendations via traversals.");
console.log("5. Time-series databases compress and downsample high-frequency sensor data.");
console.log("6. Polyglot persistence uses the right DB for each use case — not one for all.");
console.log("7. Migration uses dual-write, verify, switch reads, stop writes, decommission.");
console.log("8. The most expensive mistake is choosing a database BEFORE understanding access patterns.\n");
console.log('"Ola doesn\'t store driver GPS pings in PostgreSQL any more than');
console.log(' you\'d store a river in a filing cabinet. Match the DB to the data flow."');
console.log("\n[End of File 12 — SQL vs NoSQL Deep Dive]");
