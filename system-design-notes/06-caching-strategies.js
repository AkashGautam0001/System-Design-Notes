/** ============================================================
 *  FILE 06: CACHING STRATEGIES
 *  ============================================================
 *  Topic: Cache-aside, write-through, write-behind, TTL,
 *         LRU eviction, cache stampede, multi-tier caching
 *
 *  WHY THIS MATTERS:
 *  Caching is the single most impactful technique for reducing
 *  latency and database load. A well-designed cache turns a
 *  200ms database query into a 1ms memory lookup. Choosing the
 *  wrong strategy leads to stale data or thundering herds.
 *  ============================================================ */

// STORY: Zomato Menu Caching
// Imagine a Zomato hub in Koramangala, Bengaluru. Waiter Raju
// memorizes top dishes so he can instantly quote prices without
// checking the kitchen. When memory is full and a new popular dish
// arrives, he forgets the least-recently-ordered item.

console.log("=".repeat(70));
console.log("  FILE 06: CACHING STRATEGIES");
console.log("  Zomato Menu Caching — Raju the Waiter's Memory");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — LRU Cache Implementation
// ════════════════════════════════════════════════════════════════

// WHY: LRU (Least Recently Used) is the most common eviction policy.
// We build it first because every other section depends on it.

class LRUCache {
  constructor(capacity, name = "Cache") {
    this.capacity = capacity;
    this.name = name;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }
  get(key) {
    if (!this.cache.has(key)) { this.misses++; return null; }
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    this.hits++;
    return value;
  }
  put(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      const lruKey = this.cache.keys().next().value;
      console.log(`    [${this.name}] Evicting LRU: "${lruKey}"`);
      this.cache.delete(lruKey);
    }
    this.cache.set(key, value);
  }
  has(key) { return this.cache.has(key); }
  delete(key) { return this.cache.delete(key); }
  size() { return this.cache.size; }
  stats() {
    const total = this.hits + this.misses;
    const ratio = total === 0 ? 0 : ((this.hits / total) * 100).toFixed(1);
    return { hits: this.hits, misses: this.misses, hitRatio: ratio + "%" };
  }
  entries() { return [...this.cache.entries()]; }
}

console.log("SECTION 1: LRU Cache Implementation");
console.log("-".repeat(50));
const rajuMemory = new LRUCache(5, "Raju");
console.log("Raju can memorize 5 dishes at a time.\n");

const zomatoMenu = [
  { dish: "Butter Chicken", price: 350 }, { dish: "Paneer Tikka", price: 280 },
  { dish: "Biryani", price: 300 }, { dish: "Dal Makhani", price: 220 },
  { dish: "Naan", price: 50 }, { dish: "Gulab Jamun", price: 120 },
  { dish: "Masala Dosa", price: 180 },
];
for (const item of zomatoMenu) {
  rajuMemory.put(item.dish, item.price);
  console.log(`  Order: ${item.dish} (Rs.${item.price}) — Memory: ${rajuMemory.size()}/${rajuMemory.capacity}`);
}
// Output: After 5 items, LRU eviction kicks in for items 6 and 7
console.log("\nRaju's memory:", rajuMemory.entries().map(([k, v]) => `${k}=Rs.${v}`).join(", "));
console.log("Stats:", rajuMemory.stats());
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Cache-Aside (Lazy Loading)
// ════════════════════════════════════════════════════════════════

// WHY: Cache-aside is the most common pattern. App checks cache
// first and only queries DB on a miss — avoids loading unused data.

console.log("SECTION 2: Cache-Aside (Lazy Loading)");
console.log("-".repeat(50));

class ZomatoDatabase {
  constructor() {
    this.menu = new Map([
      ["Butter Chicken", { price: 350, prep: 25 }], ["Paneer Tikka", { price: 280, prep: 20 }],
      ["Biryani", { price: 300, prep: 30 }], ["Dal Makhani", { price: 220, prep: 15 }],
      ["Naan", { price: 50, prep: 5 }], ["Gulab Jamun", { price: 120, prep: 10 }],
      ["Masala Dosa", { price: 180, prep: 12 }], ["Chole Bhature", { price: 200, prep: 18 }],
    ]);
    this.queryCount = 0;
  }
  query(dish) {
    this.queryCount++;
    console.log(`    [DB] Query "${dish}" (#${this.queryCount}) — slow ~50ms`);
    return this.menu.get(dish) || null;
  }
  update(dish, data) { this.menu.set(dish, data); console.log(`    [DB] Updated "${dish}"`); }
}

function cacheAsideRead(cache, db, dish) {
  let data = cache.get(dish);
  if (data !== null) { console.log(`    [HIT] "${dish}" — fast ~1ms`); return data; }
  console.log(`    [MISS] "${dish}"`);
  data = db.query(dish);
  if (data) { cache.put(dish, data); console.log(`    [FILL] Stored "${dish}"`); }
  return data;
}

const caCache = new LRUCache(4, "CacheAside");
const db = new ZomatoDatabase();
console.log("\nCustomer requests (cache-aside):");
const orders = ["Biryani", "Naan", "Biryani", "Dal Makhani", "Biryani", "Paneer Tikka"];
for (const dish of orders) {
  console.log(`\n  Customer asks: ${dish}`);
  const r = cacheAsideRead(caCache, db, dish);
  if (r) console.log(`    -> Rs.${r.price}, ${r.prep}min prep`);
}
console.log("\n  Stats:", caCache.stats());
console.log(`  DB queries saved: ${orders.length - db.queryCount}/${orders.length}`);
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Write-Through Cache
// ════════════════════════════════════════════════════════════════

// WHY: Write-through writes to cache AND database simultaneously,
// guaranteeing consistency but adding latency to every write.

console.log("SECTION 3: Write-Through Cache");
console.log("-".repeat(50));

class WriteThroughCache {
  constructor(cap, db) { this.cache = new LRUCache(cap, "WT"); this.db = db; }
  read(key) {
    const c = this.cache.get(key);
    if (c !== null) { console.log(`    [WT-READ] Hit "${key}"`); return c; }
    console.log(`    [WT-READ] Miss "${key}"`);
    const d = this.db.query(key); if (d) this.cache.put(key, d); return d;
  }
  write(key, val) {
    console.log(`    [WT-WRITE] "${key}" to cache + DB simultaneously`);
    this.cache.put(key, val); this.db.update(key, val);
  }
}
const wtCache = new WriteThroughCache(5, new ZomatoDatabase());
console.log("\nUpdate Butter Chicken price:");
wtCache.write("Butter Chicken", { price: 399, prep: 25 });
const wtR = wtCache.read("Butter Chicken");
console.log(`  New price: Rs.${wtR.price} — no stale data`);
console.log("  Trade-off: 2x write latency, but reads always fresh.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Write-Behind (Write-Back) Cache
// ════════════════════════════════════════════════════════════════

// WHY: Write-behind writes to cache immediately and batches DB
// writes asynchronously. Fast writes but risks data loss on crash.

console.log("SECTION 4: Write-Behind (Write-Back) Cache");
console.log("-".repeat(50));

class WriteBehindCache {
  constructor(cap, db, batchSz = 3) {
    this.cache = new LRUCache(cap, "WB"); this.db = db;
    this.queue = []; this.batchSz = batchSz;
  }
  write(key, val) {
    this.cache.put(key, val);
    this.queue.push({ key, val });
    console.log(`    [WB] "${key}" cached — DB queued (${this.queue.length} pending)`);
    if (this.queue.length >= this.batchSz) this.flush();
  }
  flush() {
    console.log(`    [WB-FLUSH] Flushing ${this.queue.length} writes...`);
    for (const e of this.queue) this.db.update(e.key, e.val);
    this.queue = [];
  }
}
const wbCache = new WriteBehindCache(5, new ZomatoDatabase(), 3);
console.log("\nDiwali sale — rapid price updates:");
wbCache.write("Biryani", { price: 250, prep: 30 });
wbCache.write("Dal Makhani", { price: 180, prep: 15 });
console.log("  (2 queued, not in DB yet)");
wbCache.write("Paneer Tikka", { price: 230, prep: 20 });
// Output: Batch of 3 flushed
console.log("  Risk: Cache crash before flush = data LOST.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 5 — TTL (Time To Live)
// ════════════════════════════════════════════════════════════════

// WHY: TTL auto-expires entries so cached data doesn't become stale
// indefinitely. Critical for data that changes periodically.

console.log("SECTION 5: TTL (Time To Live)");
console.log("-".repeat(50));

class TTLCache {
  constructor(ttl = 5000) { this.cache = new Map(); this.ttl = ttl; }
  set(key, val, ttl = this.ttl) {
    this.cache.set(key, { val, exp: Date.now() + ttl });
    console.log(`    [TTL] SET "${key}" — expires in ${ttl}ms`);
  }
  get(key) {
    const e = this.cache.get(key);
    if (!e) return null;
    if (Date.now() > e.exp) { this.cache.delete(key); console.log(`    [TTL] EXPIRED "${key}"`); return null; }
    return e.val;
  }
}

const ttl = new TTLCache(100);
console.log("\nZomato caches restaurant availability:");
ttl.set("Meghana Foods", { open: true, wait: "15min" }, 200);
ttl.set("Truffles", { open: true, wait: "30min" }, 50);
console.log("\nImmediate read (within TTL):");
console.log(`  Meghana: ${ttl.get("Meghana Foods") ? "CACHED" : "EXPIRED"}`);
console.log(`  Truffles: ${ttl.get("Truffles") ? "CACHED" : "EXPIRED"}`);
const origNow = Date.now; let offset = 0;
Date.now = () => origNow.call(Date) + offset;
offset = 100;
console.log("\nAfter 100ms (Truffles TTL=50ms):");
console.log(`  Truffles: ${ttl.get("Truffles") ? "CACHED" : "EXPIRED — re-fetch"}`);
console.log(`  Meghana: ${ttl.get("Meghana Foods") ? "Still cached" : "EXPIRED"}`);
offset = 300;
console.log("\nAfter 300ms:");
console.log(`  Meghana: ${ttl.get("Meghana Foods") ? "Cached" : "EXPIRED — re-fetch"}`);
Date.now = origNow;
console.log("  Guideline: Short TTL for volatile data, long for stable.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Cache Stampede Prevention
// ════════════════════════════════════════════════════════════════

// WHY: When a hot key expires, hundreds of requests hit the DB
// simultaneously — a "stampede." Use locks or request coalescing.

console.log("SECTION 6: Cache Stampede Prevention");
console.log("-".repeat(50));

class StampedeCache {
  constructor() { this.cache = new Map(); this.locks = new Map(); this.dbCalls = 0; }
  readUnprotected(key, fn) {
    if (this.cache.has(key)) return { src: "cache" };
    this.dbCalls++; this.cache.set(key, fn(key)); return { src: "db" };
  }
  readWithLock(key, fn) {
    if (this.cache.has(key)) return { src: "cache" };
    if (this.locks.has(key)) return { src: "coalesced" };
    this.locks.set(key, true);
    this.dbCalls++; this.cache.set(key, fn(key));
    this.locks.delete(key); return { src: "db" };
  }
}

function runStampede(protected_) {
  const c = new StampedeCache();
  const fetch = () => ({ price: 300 });
  console.log(`\n  10 requests for "Biryani" (${protected_ ? "WITH" : "WITHOUT"} lock):`);
  for (let i = 0; i < 10; i++) {
    const r = protected_ ? c.readWithLock("Biryani", fetch) : c.readUnprotected("Biryani", fetch);
    if (i < 3) console.log(`    Req ${i + 1}: ${r.src}`);
  }
  console.log(`  DB calls: ${c.dbCalls}`); return c.dbCalls;
}
const without = runStampede(false);
const withLock = runStampede(true);
console.log(`\n  Reduction: ${without} -> ${withLock} DB call(s)\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Multi-Tier Caching (L1/L2)
// ════════════════════════════════════════════════════════════════

// WHY: L1 (in-process, fast, small) + L2 (shared, slower, larger)
// mirrors CPU cache hierarchy for optimal hit rates.

console.log("SECTION 7: Multi-Tier Caching (L1/L2)");
console.log("-".repeat(50));

class MultiTierCache {
  constructor(l1Sz, l2Sz) {
    this.l1 = new LRUCache(l1Sz, "L1"); this.l2 = new LRUCache(l2Sz, "L2");
    this.db = new ZomatoDatabase(); this.log = [];
  }
  read(key) {
    let d = this.l1.get(key);
    if (d !== null) { this.log.push("L1"); console.log(`    [L1 HIT] "${key}" — 0.1ms`); return d; }
    d = this.l2.get(key);
    if (d !== null) { this.l1.put(key, d); this.log.push("L2"); console.log(`    [L2 HIT] "${key}" — 2ms`); return d; }
    d = this.db.query(key);
    if (d) { this.l2.put(key, d); this.l1.put(key, d); this.log.push("DB"); }
    return d;
  }
  stats() {
    const c = { L1: 0, L2: 0, DB: 0 };
    this.log.forEach(t => c[t]++);
    console.log(`  L1: ${c.L1}, L2: ${c.L2}, DB: ${c.DB}`);
  }
}

const mt = new MultiTierCache(3, 6);
console.log("\nRaju (L1) + Kitchen Board (L2) + Recipe Book (DB):\n");
for (const d of ["Biryani", "Naan", "Biryani", "Dal Makhani", "Biryani", "Naan", "Gulab Jamun", "Biryani"]) mt.read(d);
mt.stats();
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Cache Invalidation Strategies
// ════════════════════════════════════════════════════════════════

// WHY: "Two hard things in CS: cache invalidation and naming things."
// Wrong invalidation = stale data; over-invalidation kills perf.

console.log("SECTION 8: Cache Invalidation Strategies");
console.log("-".repeat(50));

const inv = new LRUCache(10, "Inv");
// Strategy 1: Purge single key
inv.put("menu:biryani", 300); inv.put("menu:naan", 50);
inv.delete("menu:biryani");
console.log(`\n  Purge: "menu:biryani" removed: ${!inv.has("menu:biryani")}, "menu:naan" kept: ${inv.has("menu:naan")}`);

// Strategy 2: Ban by prefix
inv.put("menu:dosa", 180); inv.put("menu:idli", 80); inv.put("review:dosa", 4);
let banned = 0;
for (const [k] of inv.entries()) { if (k.startsWith("menu:")) { inv.delete(k); banned++; } }
console.log(`  Ban prefix "menu:*": ${banned} removed, "review:dosa" survived: ${inv.has("review:dosa")}`);

// Strategy 3: Version-based
const versions = new Map();
versions.set("biryani", 2);
inv.put("biryani:v2", 350);
console.log(`  Version: biryani v${versions.get("biryani")} = Rs.${inv.get("biryani:v2")}`);

// Strategy 4: Event-based (pub/sub)
const subs = [];
subs.push((key, val) => { inv.put(key, val); console.log(`  Event: ${key} updated to Rs.${val}`); });
subs.forEach(fn => fn("menu:butter-chicken", 399));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 9 — Full Simulation: Zomato Dinner Rush
// ════════════════════════════════════════════════════════════════

// WHY: Combining all strategies in a realistic workload scenario.

console.log("SECTION 9: Full Simulation — Zomato Dinner Rush");
console.log("-".repeat(50));

const rushCache = new LRUCache(8, "Rush");
const menuDb = new Map([
  ["Biryani", 300], ["Butter Chicken", 350], ["Paneer Tikka", 280],
  ["Dal Makhani", 220], ["Naan", 50], ["Gulab Jamun", 120],
  ["Masala Dosa", 180], ["Chole Bhature", 200], ["Rasmalai", 150],
]);
const popular = ["Biryani", "Butter Chicken", "Naan", "Paneer Tikka"];
const all = [...menuDb.keys()];
let latency = 0;
for (let i = 0; i < 50; i++) {
  const dish = Math.random() < 0.7 ? popular[Math.floor(Math.random() * popular.length)] : all[Math.floor(Math.random() * all.length)];
  if (rushCache.get(dish) !== null) { latency += 1; }
  else { latency += 50; rushCache.put(dish, menuDb.get(dish)); }
}
const s = rushCache.stats();
console.log(`\n  50 orders: ${s.hits} hits, ${s.misses} misses, ratio: ${s.hitRatio}`);
console.log(`  Total latency: ${latency}ms, Without cache: 2500ms`);
console.log(`  Speedup: ${(2500 / latency).toFixed(1)}x faster`);
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log(`
  1. Cache-Aside only caches on request — best for read-heavy loads.
  2. Write-Through keeps cache+DB in sync — consistent but slower.
  3. Write-Behind batches writes — fast but risks data loss on crash.
  4. TTL auto-expires entries — short for volatile, long for stable.
  5. LRU evicts least recently accessed — fits temporal locality.
  6. Cache stampede: hot key expires, DB flooded — use locks.
  7. Multi-tier (L1+L2) combines speed and capacity.
  8. Invalidation: purge, ban, version, or event-driven.
`);
console.log('  Raju\'s wisdom: "A good waiter remembers what matters,');
console.log('  forgets what nobody orders, and checks the kitchen when');
console.log('  in doubt. That is caching."');
console.log();
console.log("=".repeat(70));
