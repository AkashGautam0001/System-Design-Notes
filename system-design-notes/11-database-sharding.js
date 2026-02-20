/** ============================================================
 *  FILE 11: DATABASE SHARDING
 *  ============================================================
 *  Topic: Shard keys, range vs hash sharding, consistent hashing
 *         deep dive, hot spots, re-sharding
 *
 *  WHY THIS MATTERS:
 *  A single database server has finite CPU, memory, and disk.
 *  When your data grows beyond what one machine can handle,
 *  sharding splits it across multiple servers. Done wrong, you
 *  get hot spots and cascading failures at the worst moments.
 *  ============================================================ */

// STORY: Flipkart Product Catalog
// Flipkart hosts over 150 million products across hundreds of categories.
// During Diwali Big Billion Days, the Electronics category alone gets 10x
// normal traffic. If all electronics land on one shard, that shard melts.
// Flipkart uses consistent hashing so that adding a new shard moves only
// a fraction of products, not the entire catalog.

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║  FILE 11 — DATABASE SHARDING                               ║");
console.log("║  Flipkart Product Catalog: 150M products, Diwali hotspots  ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Why Shard: Single Database Limits
// ════════════════════════════════════════════════════════════════

// WHY: Understanding the breaking point tells you WHEN to shard.

console.log("=== SECTION 1: Why Shard — Single Database Limits ===\n");

function simulateSingleDbLimits() {
  const singleDb = {
    maxStorageGB: 2000,
    maxQPS: 50000,
    maxConnections: 10000,
  };

  const flipkartLoad = {
    storageTB: 8,
    normalQPS: 30000,
    diwaliQPS: 300000,
    connections: 25000,
  };

  console.log("Single DB capacity:", JSON.stringify(singleDb));
  console.log("Flipkart load:    ", JSON.stringify(flipkartLoad));

  const storageOk = flipkartLoad.storageTB * 1000 <= singleDb.maxStorageGB;
  const qpsOk = flipkartLoad.diwaliQPS <= singleDb.maxQPS;
  const connOk = flipkartLoad.connections <= singleDb.maxConnections;

  console.log(`\n  Storage fits single DB?     ${storageOk ? "YES" : "NO — need sharding"}`);
  console.log(`  Diwali QPS fits single DB?  ${qpsOk ? "YES" : "NO — need sharding"}`);
  console.log(`  Connections fit single DB?   ${connOk ? "YES" : "NO — need sharding"}`);

  const shardsNeeded = Math.ceil(flipkartLoad.diwaliQPS / singleDb.maxQPS);
  console.log(`\n  Minimum shards for Diwali QPS: ${shardsNeeded}`);
  // Output: Minimum shards for Diwali QPS: 6
}

simulateSingleDbLimits();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Shard Key Selection
// ════════════════════════════════════════════════════════════════

// WHY: The shard key determines data distribution. A bad key = hot spots.

console.log("\n\n=== SECTION 2: Shard Key Selection ===\n");

function evaluateShardKeys() {
  const products = [];
  const categories = ["Electronics", "Fashion", "Home", "Books", "Grocery",
                      "Toys", "Sports", "Beauty", "Auto", "Health"];

  for (let i = 0; i < 1000; i++) {
    const catIdx = i < 400 ? 0 : Math.floor(Math.random() * categories.length);
    products.push({
      id: `PROD-${String(i).padStart(6, "0")}`,
      category: categories[catIdx],
      seller_id: `SELLER-${Math.floor(Math.random() * 50)}`,
      price: Math.floor(Math.random() * 50000) + 100,
    });
  }

  // Strategy 1: Shard by category (BAD — skewed)
  const byCat = {};
  products.forEach((p) => {
    byCat[p.category] = (byCat[p.category] || 0) + 1;
  });
  console.log("Strategy 1 — Shard by category (SKEWED):");
  Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, cnt]) => {
      const bar = "#".repeat(Math.floor(cnt / 10));
      console.log(`  ${cat.padEnd(14)} ${String(cnt).padStart(4)} ${bar}`);
    });
  // Output: Electronics dominates — hot shard!

  // Strategy 2: Shard by product_id hash (GOOD — even)
  const numShards = 4;
  const byHash = { 0: 0, 1: 0, 2: 0, 3: 0 };
  products.forEach((p) => {
    let hash = 0;
    for (let c = 0; c < p.id.length; c++) hash = (hash * 31 + p.id.charCodeAt(c)) & 0x7fffffff;
    byHash[hash % numShards]++;
  });
  console.log("\nStrategy 2 — Shard by product_id hash (EVEN):");
  Object.entries(byHash).forEach(([shard, cnt]) => {
    const bar = "#".repeat(Math.floor(cnt / 10));
    console.log(`  Shard ${shard}: ${String(cnt).padStart(4)} ${bar}`);
  });
  // Output: roughly 250 per shard
}

evaluateShardKeys();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Range-Based Sharding
// ════════════════════════════════════════════════════════════════

// WHY: Range sharding keeps ordered data together — great for range queries.

console.log("\n\n=== SECTION 3: Range-Based Sharding ===\n");

function rangeSharding() {
  const ranges = [
    { shard: "Shard-A", min: 0, max: 999999 },
    { shard: "Shard-B", min: 1000000, max: 1999999 },
    { shard: "Shard-C", min: 2000000, max: 2999999 },
    { shard: "Shard-D", min: 3000000, max: 3999999 },
  ];

  function routeByRange(productId) {
    const num = parseInt(productId.replace("PROD-", ""));
    for (const r of ranges) {
      if (num >= r.min && num <= r.max) return r.shard;
    }
    return "Overflow-Shard";
  }

  const testProducts = ["PROD-000100", "PROD-500000", "PROD-1500000",
                        "PROD-2800000", "PROD-3999999", "PROD-4500000"];
  console.log("Range sharding routing:");
  testProducts.forEach((pid) => {
    console.log(`  ${pid} -> ${routeByRange(pid)}`);
  });
  // Output: PROD-4500000 -> Overflow-Shard (out of range!)

  // Range query advantage
  console.log("\nRange query: Products 1000000–1100000");
  console.log("  Only Shard-B is queried — no scatter-gather!");

  // Range sharding problem — new products cluster at the end
  console.log("\nProblem: New products get sequential IDs");
  console.log("  All new writes hit the LAST shard -> write hot spot");
}

rangeSharding();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Hash-Based Sharding
// ════════════════════════════════════════════════════════════════

// WHY: Hash sharding distributes writes evenly but sacrifices range queries.

console.log("\n\n=== SECTION 4: Hash-Based Sharding ===\n");

function hashSharding() {
  function simpleHash(key) {
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = (h * 31 + key.charCodeAt(i)) & 0x7fffffff;
    }
    return h;
  }

  const NUM_SHARDS = 4;
  const shardCounts = new Array(NUM_SHARDS).fill(0);
  const shardNames = ["Shard-A", "Shard-B", "Shard-C", "Shard-D"];

  for (let i = 0; i < 10000; i++) {
    const key = `PROD-${String(i).padStart(6, "0")}`;
    const shard = simpleHash(key) % NUM_SHARDS;
    shardCounts[shard]++;
  }

  console.log("Hash-based distribution of 10,000 products across 4 shards:");
  shardCounts.forEach((cnt, i) => {
    const pct = ((cnt / 10000) * 100).toFixed(1);
    console.log(`  ${shardNames[i]}: ${cnt} products (${pct}%)`);
  });
  // Output: ~25% each

  // Problem: adding a 5th shard
  console.log("\nAdding Shard-E (5 total) — how many products move?");
  let moved = 0;
  for (let i = 0; i < 10000; i++) {
    const key = `PROD-${String(i).padStart(6, "0")}`;
    const h = simpleHash(key);
    if (h % 4 !== h % 5) moved++;
  }
  console.log(`  ${moved} out of 10,000 products must move (${((moved / 10000) * 100).toFixed(1)}%)`);
  console.log("  This is WAY too much data movement! -> Use consistent hashing instead.");
}

hashSharding();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Consistent Hashing with Virtual Nodes
// ════════════════════════════════════════════════════════════════

// WHY: Consistent hashing minimizes data movement when nodes join/leave.

console.log("\n\n=== SECTION 5: Consistent Hashing with Virtual Nodes ===\n");

class ConsistentHashRing {
  constructor(virtualNodesPerServer = 150) {
    this.ring = new Map();       // position -> serverName
    this.sortedKeys = [];        // sorted ring positions
    this.vnPerServer = virtualNodesPerServer;
    this.servers = new Set();
  }

  _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) & 0x7fffffff;
    }
    return h % 360;
  }

  addServer(name) {
    this.servers.add(name);
    for (let i = 0; i < this.vnPerServer; i++) {
      const vKey = `${name}#VN${i}`;
      const pos = this._hash(vKey);
      this.ring.set(pos, name);
    }
    this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  removeServer(name) {
    this.servers.delete(name);
    for (const [pos, srv] of this.ring) {
      if (srv === name) this.ring.delete(pos);
    }
    this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  getServer(key) {
    if (this.sortedKeys.length === 0) return null;
    const h = this._hash(key);
    for (const pos of this.sortedKeys) {
      if (pos >= h) return this.ring.get(pos);
    }
    return this.ring.get(this.sortedKeys[0]); // wrap around
  }

  getDistribution(keys) {
    const dist = {};
    for (const s of this.servers) dist[s] = 0;
    keys.forEach((k) => {
      const srv = this.getServer(k);
      if (srv) dist[srv]++;
    });
    return dist;
  }
}

function demonstrateConsistentHashing() {
  const ring = new ConsistentHashRing(50);
  ring.addServer("Shard-A");
  ring.addServer("Shard-B");
  ring.addServer("Shard-C");
  ring.addServer("Shard-D");

  // Generate Flipkart product keys
  const products = [];
  for (let i = 0; i < 10000; i++) products.push(`PROD-${i}`);

  const before = ring.getDistribution(products);
  console.log("Distribution with 4 shards:");
  Object.entries(before).forEach(([srv, cnt]) => {
    const pct = ((cnt / 10000) * 100).toFixed(1);
    console.log(`  ${srv}: ${cnt} (${pct}%)`);
  });

  // Record assignments before adding shard
  const assignmentBefore = {};
  products.forEach((p) => { assignmentBefore[p] = ring.getServer(p); });

  // Add Shard-E
  ring.addServer("Shard-E");
  const after = ring.getDistribution(products);
  console.log("\nDistribution after adding Shard-E:");
  Object.entries(after).forEach(([srv, cnt]) => {
    const pct = ((cnt / 10000) * 100).toFixed(1);
    console.log(`  ${srv}: ${cnt} (${pct}%)`);
  });

  let moved = 0;
  products.forEach((p) => {
    if (assignmentBefore[p] !== ring.getServer(p)) moved++;
  });
  console.log(`\nProducts that moved: ${moved} / 10000 (${((moved / 10000) * 100).toFixed(1)}%)`);
  console.log("With consistent hashing, only ~20% moves vs ~80% with naive hash!");
}

demonstrateConsistentHashing();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Hot Spot Detection and Mitigation
// ════════════════════════════════════════════════════════════════

// WHY: Diwali sends 10x traffic to Electronics — you need to detect and fix.

console.log("\n\n=== SECTION 6: Hot Spot Detection and Mitigation ===\n");

function hotSpotDemo() {
  const shards = {
    "Shard-A": { qps: 0, products: ["Electronics", "Mobiles"] },
    "Shard-B": { qps: 0, products: ["Fashion", "Footwear"] },
    "Shard-C": { qps: 0, products: ["Books", "Stationery"] },
    "Shard-D": { qps: 0, products: ["Home", "Kitchen"] },
  };

  // Normal day traffic
  function simulateTraffic(multipliers) {
    for (const [shard, info] of Object.entries(shards)) {
      const baseCat = info.products[0];
      info.qps = (multipliers[baseCat] || 1) * 5000;
    }
  }

  simulateTraffic({ Electronics: 1, Fashion: 1, Books: 1, Home: 1 });
  console.log("Normal day QPS per shard:");
  Object.entries(shards).forEach(([s, info]) => {
    console.log(`  ${s} (${info.products.join(", ")}): ${info.qps} QPS`);
  });

  // Diwali traffic
  simulateTraffic({ Electronics: 10, Fashion: 3, Books: 1, Home: 2 });
  console.log("\nDiwali Big Billion Days QPS:");
  const HOT_THRESHOLD = 20000;
  Object.entries(shards).forEach(([s, info]) => {
    const hot = info.qps > HOT_THRESHOLD ? " <-- HOT SPOT!" : "";
    console.log(`  ${s} (${info.products.join(", ")}): ${info.qps} QPS${hot}`);
  });

  // Mitigation strategies
  console.log("\nMitigation strategies for Shard-A (Electronics hot spot):");
  console.log("  1. Split shard: Electronics -> Shard-A1 (Phones), Shard-A2 (Laptops)");
  console.log("  2. Read replicas: 3 read replicas absorb read-heavy Diwali browsing");
  console.log("  3. Caching layer: Redis cache for top 1000 trending products");
  console.log("  4. Salted keys: product_id + random_prefix distributes within shard");
}

hotSpotDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Re-Sharding Strategies
// ════════════════════════════════════════════════════════════════

// WHY: As data grows, your initial shard count becomes insufficient.

console.log("\n\n=== SECTION 7: Re-Sharding Strategies ===\n");

function reshardingDemo() {
  console.log("Flipkart started with 4 shards in 2014 — by 2023 needed 16.\n");

  // Strategy 1: Doubling (split each shard in half)
  console.log("Strategy 1 — Shard Splitting (Doubling):");
  let shardCount = 4;
  const years = [2014, 2016, 2019, 2023];
  years.forEach((year, i) => {
    const count = 4 * Math.pow(2, i);
    console.log(`  ${year}: ${count} shards`);
  });
  console.log("  Advantage: Each shard only splits its own data");
  console.log("  Disadvantage: Can only double, not add one at a time\n");

  // Strategy 2: Virtual shards (logical to physical mapping)
  console.log("Strategy 2 — Virtual Shards:");
  const virtualToPhysical = {};
  for (let v = 0; v < 256; v++) {
    virtualToPhysical[`VS-${v}`] = `Physical-${v % 4}`;
  }
  console.log(`  256 virtual shards mapped to 4 physical servers`);

  // Migrate: move some virtual shards to new physical server
  let migratedCount = 0;
  for (let v = 0; v < 256; v++) {
    if (v % 5 === 0) {
      virtualToPhysical[`VS-${v}`] = "Physical-4";
      migratedCount++;
    }
  }
  console.log(`  Added Physical-4: migrated ${migratedCount} virtual shards`);

  const physicalCounts = {};
  Object.values(virtualToPhysical).forEach((p) => {
    physicalCounts[p] = (physicalCounts[p] || 0) + 1;
  });
  console.log("  Distribution after migration:");
  Object.entries(physicalCounts)
    .sort()
    .forEach(([p, cnt]) => {
      console.log(`    ${p}: ${cnt} virtual shards`);
    });

  // Strategy 3: Shadow writes for zero-downtime
  console.log("\nStrategy 3 — Shadow Writes (Zero-Downtime Re-Shard):");
  console.log("  Phase 1: Write to OLD shards + shadow-write to NEW shards");
  console.log("  Phase 2: Backfill historical data to NEW shards");
  console.log("  Phase 3: Verify NEW shards match OLD shards");
  console.log("  Phase 4: Switch reads to NEW shards");
  console.log("  Phase 5: Stop writes to OLD shards");
  console.log("  Flipkart ran this over 2 weeks with zero customer impact.");
}

reshardingDemo();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Cross-Shard Queries
// ════════════════════════════════════════════════════════════════

// WHY: Some queries span multiple shards — how do you handle them?

console.log("\n\n=== SECTION 8: Cross-Shard Queries ===\n");

function crossShardQueries() {
  // Simulate sharded data
  const shards = {
    "Shard-0": [],
    "Shard-1": [],
    "Shard-2": [],
    "Shard-3": [],
  };

  for (let i = 0; i < 200; i++) {
    const product = {
      id: i,
      name: `Product-${i}`,
      price: Math.floor(Math.random() * 5000) + 100,
      category: ["Electronics", "Fashion", "Books", "Home"][i % 4],
      rating: (Math.random() * 4 + 1).toFixed(1),
    };
    let h = 0;
    const key = `PROD-${i}`;
    for (let c = 0; c < key.length; c++) h = (h * 31 + key.charCodeAt(c)) & 0x7fffffff;
    const shardKey = `Shard-${h % 4}`;
    shards[shardKey].push(product);
  }

  // Scatter-gather query: "Top 5 products by price"
  console.log("Scatter-Gather: Top 5 products by price across all shards\n");

  const localTops = {};
  let totalScanned = 0;
  for (const [shardName, data] of Object.entries(shards)) {
    const sorted = [...data].sort((a, b) => b.price - a.price).slice(0, 5);
    localTops[shardName] = sorted;
    totalScanned += data.length;
    console.log(`  ${shardName} local top: ${sorted.map((p) => p.price).join(", ")}`);
  }

  // Merge phase
  const allTops = Object.values(localTops).flat();
  const globalTop5 = allTops.sort((a, b) => b.price - a.price).slice(0, 5);
  console.log("\n  Global top 5 after merge:");
  globalTop5.forEach((p, i) => {
    console.log(`    ${i + 1}. ${p.name} — Rs.${p.price}`);
  });
  console.log(`\n  Scanned: ${totalScanned} products across ${Object.keys(shards).length} shards`);

  // Problem: cross-shard joins
  console.log("\nCross-Shard JOIN Problem:");
  console.log("  Query: Find all orders for products with rating > 4.5");
  console.log("  Products are sharded by product_id");
  console.log("  Orders are sharded by order_id");
  console.log("  -> Full table scan of BOTH shard sets needed!");
  console.log("\n  Solutions:");
  console.log("  1. Denormalize: store product rating inside order document");
  console.log("  2. Broadcast join: send query to all product shards,");
  console.log("     collect matching IDs, then query order shards");
  console.log("  3. Co-locate: shard orders by product_id (same key)");
}

crossShardQueries();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("\n\n=== KEY TAKEAWAYS ===\n");
console.log("1. Shard when a single DB can't handle storage, QPS, or connections.");
console.log("2. Shard key selection is the MOST critical decision — hard to change later.");
console.log("3. Range sharding supports range queries but creates write hot spots.");
console.log("4. Hash sharding distributes evenly but loses range query efficiency.");
console.log("5. Consistent hashing with virtual nodes minimizes data movement.");
console.log("6. Hot spots are inevitable during traffic spikes — detect and split.");
console.log("7. Re-sharding strategies: splitting, virtual shards, shadow writes.");
console.log("8. Cross-shard queries use scatter-gather; avoid cross-shard joins.\n");
console.log('"Flipkart\'s catalog survived Big Billion Days because they chose');
console.log(' the right shard key before the storm, not during it."');
console.log("\n[End of File 11 — Database Sharding]");
