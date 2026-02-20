/**
 * ============================================================
 *  FILE 39 : AadhaarDataLayer — Capstone Data Access Layer
 *  Topic   : Repository, Factory, Strategy, Adapter, Proxy,
 *            Memoization, Builder
 *  WHY THIS MATTERS:
 *  Every application needs a data layer that can switch storage
 *  backends, cache reads, serialize flexibly, and expose a clean
 *  query API. AadhaarDataLayer weaves seven patterns into one
 *  cohesive system — the kind of architecture that scales from
 *  prototype to production.
 * ============================================================
 */
// STORY: The UIDAI maintains the Aadhaar data layer — it stores citizen
// records in any vault (Adapter), builds search queries with a fluent
// builder (Builder), caches frequently looked-up citizens (Proxy), and
// encrypts biometric data in any scheme (Strategy). The system never
// breaks, no matter which storage backend.

// ────────────────────────────────────────────────────────────
//  SECTION 1 — Storage Adapters (Adapter Pattern)
// ────────────────────────────────────────────────────────────
// WHY: Adapters wrap different storage engines behind one interface.
class MemoryStore {
  constructor() { this._store = new Map(); }
  async get(key)        { return this._store.get(key) || null; }
  async set(key, value) { this._store.set(key, value); }
  async delete(key)     { return this._store.delete(key); }
  async has(key)        { return this._store.has(key); }
  async keys()          { return [...this._store.keys()]; }
  async clear()         { this._store.clear(); }
  get name() { return "MemoryStore"; }
}

class PrefixedStore {
  // WHY: Wraps another store and adds a key prefix — namespacing on a shared store.
  constructor(inner, prefix) { this._inner = inner; this._prefix = prefix; }
  async get(key)        { return this._inner.get(this._prefix + key); }
  async set(key, value) { return this._inner.set(this._prefix + key, value); }
  async delete(key)     { return this._inner.delete(this._prefix + key); }
  async has(key)        { return this._inner.has(this._prefix + key); }
  async keys() {
    const all = await this._inner.keys();
    return all.filter((k) => k.startsWith(this._prefix)).map((k) => k.slice(this._prefix.length));
  }
  async clear() { for (const k of await this.keys()) await this.delete(k); }
  get name() { return `PrefixedStore(${this._prefix})`; }
}

// ────────────────────────────────────────────────────────────
//  SECTION 2 — Encryption Strategy
// ────────────────────────────────────────────────────────────
// WHY: Strategy pattern lets the UIDAI choose how data is encoded.
const AES256Strategy = {
  name: "AES256",
  serialize:   (obj) => JSON.stringify(obj),
  deserialize: (str) => JSON.parse(str),
};
const RSAStrategy = {
  name: "RSA",
  serialize:   (obj) => Buffer.from(JSON.stringify(obj)).toString("base64"),
  deserialize: (str) => JSON.parse(Buffer.from(str, "base64").toString("utf-8")),
};

// ────────────────────────────────────────────────────────────
//  SECTION 3 — Caching Proxy with Memoization (AadhaarCache)
// ────────────────────────────────────────────────────────────
// WHY: The proxy intercepts reads and serves cached copies,
//      reducing trips to the vault. Writes update the cache.
class AadhaarCache {
  constructor(adapter, { maxSize = 100 } = {}) {
    this._adapter = adapter; this._cache = new Map();
    this._maxSize = maxSize; this._hits = 0; this._misses = 0;
  }
  async get(key) {
    if (this._cache.has(key)) { this._hits++; return this._cache.get(key); }
    this._misses++;
    const val = await this._adapter.get(key);
    if (val !== null) this._cacheSet(key, val);
    return val;
  }
  async set(key, value) { await this._adapter.set(key, value); this._cacheSet(key, value); }
  async delete(key) { this._cache.delete(key); return this._adapter.delete(key); }
  async has(key) { return this._adapter.has(key); }
  async keys()   { return this._adapter.keys(); }
  async clear()  { this._cache.clear(); return this._adapter.clear(); }
  _cacheSet(key, value) {
    if (this._cache.size >= this._maxSize) {
      const oldest = this._cache.keys().next().value;
      this._cache.delete(oldest);
    }
    this._cache.set(key, value);
  }
  stats() { return { hits: this._hits, misses: this._misses, size: this._cache.size }; }
  get name() { return `AadhaarCache -> ${this._adapter.name}`; }
}

// ────────────────────────────────────────────────────────────
//  SECTION 4 — Citizen Factory
// ────────────────────────────────────────────────────────────
// WHY: The factory centralizes entity creation — Aadhaar number, type, timestamps.
class CitizenFactory {
  constructor() { this._counter = 0; }
  create(type, data) {
    this._counter++;
    return { id: `${type}_${this._counter}`, type, ...data,
             createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
}

// ────────────────────────────────────────────────────────────
//  SECTION 5 — Fluent Citizen Query Builder
// ────────────────────────────────────────────────────────────
// WHY: A builder constructs complex queries step-by-step with a
//      readable, chainable API — UIDAI searches one clause at a time.
class CitizenQueryBuilder {
  constructor() { this._filters = []; this._sortField = null; this._sortDir = 1; this._limitVal = Infinity; this._offsetVal = 0; }
  where(field, op, value) { this._filters.push({ field, op, value }); return this; }
  sortBy(field, dir = "asc") { this._sortField = field; this._sortDir = dir === "asc" ? 1 : -1; return this; }
  limit(n) { this._limitVal = n; return this; }
  offset(n) { this._offsetVal = n; return this; }
  execute(records) {
    let result = records.filter((rec) => {
      return this._filters.every(({ field, op, value }) => {
        const v = rec[field];
        if (op === "eq") return v === value;   if (op === "neq") return v !== value;
        if (op === "gt") return v > value;     if (op === "lt")  return v < value;
        if (op === "gte") return v >= value;
        if (op === "contains") return typeof v === "string" && v.includes(value);
        return true;
      });
    });
    if (this._sortField) {
      result.sort((a, b) => {
        if (a[this._sortField] < b[this._sortField]) return -1 * this._sortDir;
        if (a[this._sortField] > b[this._sortField]) return  1 * this._sortDir;
        return 0;
      });
    }
    return result.slice(this._offsetVal, this._offsetVal + this._limitVal);
  }
}

// ────────────────────────────────────────────────────────────
//  SECTION 6 — Repository (ties everything together)
// ────────────────────────────────────────────────────────────
// WHY: The repository is the single API that business logic uses.
class AadhaarRepository {
  constructor(adapter, { strategy = AES256Strategy } = {}) {
    this._adapter = adapter; this._strategy = strategy; this._factory = new CitizenFactory();
  }
  async create(type, data) {
    const entity = this._factory.create(type, data);
    await this._adapter.set(entity.id, this._strategy.serialize(entity));
    return entity;
  }
  async findById(id) {
    const raw = await this._adapter.get(id);
    return raw ? this._strategy.deserialize(raw) : null;
  }
  async update(id, changes) {
    const entity = await this.findById(id);
    if (!entity) throw new Error(`Citizen ${id} not found`);
    Object.assign(entity, changes, { updatedAt: new Date().toISOString() });
    await this._adapter.set(id, this._strategy.serialize(entity));
    return entity;
  }
  async remove(id) { return this._adapter.delete(id); }
  async findAll() {
    const keys = await this._adapter.keys();
    const results = [];
    for (const key of keys) {
      const raw = await this._adapter.get(key);
      if (raw) results.push(this._strategy.deserialize(raw));
    }
    return results;
  }
}

// ════════════════════════════════════════════════════════════
//  DEMO — All patterns working together
// ════════════════════════════════════════════════════════════
async function main() {
  console.log("=== AadhaarDataLayer: Capstone Data Access Layer ===\n");

  // --- 1. Adapter + Caching Proxy ---
  console.log("--- Storage Adapter with AadhaarCache ---");
  const rawStore = new MemoryStore();
  const cachedStore = new AadhaarCache(rawStore, { maxSize: 50 });
  console.log("Storage:", cachedStore.name); // Output: Storage: AadhaarCache -> MemoryStore

  // --- 2. Repository with AES256 Strategy ---
  console.log("\n--- Repository + Factory + AES256 Strategy ---");
  const repo = new AadhaarRepository(cachedStore, { strategy: AES256Strategy });
  const citizen1 = await repo.create("citizen", { name: "Amit Sharma", aadhaarNumber: "2345-6789-0123", state: "Maharashtra", age: 34 });
  const citizen2 = await repo.create("citizen", { name: "Priya Patel", aadhaarNumber: "3456-7890-1234", state: "Gujarat", age: 28 });
  const citizen3 = await repo.create("citizen", { name: "Rahul Verma", aadhaarNumber: "4567-8901-2345", state: "Delhi", age: 45 });
  const citizen4 = await repo.create("citizen", { name: "Deepa Nair", aadhaarNumber: "5678-9012-3456", state: "Maharashtra", age: 52 });
  console.log("Created:", citizen1.id, "-", citizen1.name); // Output: Created: citizen_1 - Amit Sharma
  console.log("Created:", citizen2.id, "-", citizen2.name); // Output: Created: citizen_2 - Priya Patel
  console.log("Created:", citizen3.id, "-", citizen3.name); // Output: Created: citizen_3 - Rahul Verma
  console.log("Created:", citizen4.id, "-", citizen4.name); // Output: Created: citizen_4 - Deepa Nair

  // --- 3. Cache demonstration ---
  console.log("\n--- AadhaarCache in Action ---");
  await repo.findById("citizen_1"); // cache hit — was cached on create
  await repo.findById("citizen_1"); // cache hit
  await repo.findById("citizen_2"); // cache hit
  const stats1 = cachedStore.stats();
  console.log("Cache hits:", stats1.hits);     // Output: Cache hits: 3
  console.log("Cache misses:", stats1.misses); // Output: Cache misses: 0
  console.log("Cache size:", stats1.size);     // Output: Cache size: 4

  // --- 4. Fluent Citizen Query Builder ---
  console.log("\n--- Fluent Citizen Query Builder ---");
  const allCitizens = await repo.findAll();
  // WHY: The builder lets UIDAI construct queries readably.
  const maharashtraCitizens = new CitizenQueryBuilder()
    .where("state", "eq", "Maharashtra").sortBy("age", "desc").execute(allCitizens);
  console.log("Maharashtra citizens:", maharashtraCitizens.map((c) => c.name).join(", "));
  // Output: Maharashtra citizens: Deepa Nair, Amit Sharma

  const seniorCitizens = new CitizenQueryBuilder()
    .where("age", "gt", 30).sortBy("age", "asc").limit(2).execute(allCitizens);
  console.log("Senior citizens (>30, first 2):", seniorCitizens.map((c) => `${c.name}(${c.age})`).join(", "));
  // Output: Senior citizens (>30, first 2): Amit Sharma(34), Rahul Verma(45)

  const nameSearch = new CitizenQueryBuilder()
    .where("name", "contains", "Patel").execute(allCitizens);
  console.log("Name contains 'Patel':", nameSearch.map((c) => c.name).join(", "));
  // Output: Name contains 'Patel': Priya Patel

  // --- 5. Update and Delete ---
  console.log("\n--- Update & Delete ---");
  const updated = await repo.update("citizen_1", { age: 35, address: "Pune, Maharashtra" });
  console.log("Updated:", updated.name, "age:", updated.age, "address:", updated.address);
  // Output: Updated: Amit Sharma age: 35 address: Pune, Maharashtra
  await repo.remove("citizen_3");
  const remaining = await repo.findAll();
  console.log("Remaining citizens:", remaining.map((c) => c.name).join(", "));
  // Output: Remaining citizens: Amit Sharma, Priya Patel, Deepa Nair

  // --- 6. Prefixed Store (namespace isolation) ---
  console.log("\n--- Prefixed Store (Namespace Isolation) ---");
  const sharedStore = new MemoryStore();
  const biometricsStore = new PrefixedStore(sharedStore, "biometrics:");
  const demographicsStore = new PrefixedStore(sharedStore, "demographics:");
  await biometricsStore.set("b1", "fingerprint-data-amit");
  await biometricsStore.set("b2", "fingerprint-data-priya");
  await demographicsStore.set("d1", "demographics-rahul");
  console.log("Biometric keys:", (await biometricsStore.keys()).join(", "));       // Output: Biometric keys: b1, b2
  console.log("Demographic keys:", (await demographicsStore.keys()).join(", ")); // Output: Demographic keys: d1
  // WHY: Both stores share one backend but never see each other's data.
  console.log("Shared store keys:", (await sharedStore.keys()).join(", "));
  // Output: Shared store keys: biometrics:b1, biometrics:b2, demographics:d1

  // --- 7. Strategy swap to RSA ---
  console.log("\n--- Strategy Swap: RSA Encryption ---");
  const rsaStore = new MemoryStore();
  const rsaRepo = new AadhaarRepository(rsaStore, { strategy: RSAStrategy });
  const biometric = await rsaRepo.create("biometric", { data: "iris-scan-encrypted", citizenId: "citizen_1" });
  console.log("Created biometric:", biometric.id); // Output: Created biometric: biometric_1
  // WHY: The raw stored value is Base64-encoded — opaque to casual inspection.
  const rawValue = await rsaStore.get(biometric.id);
  console.log("Raw stored (truncated):", rawValue.slice(0, 30) + "...");
  // Output: Raw stored (truncated): eyJpZCI6ImJpb21ldHJpY18xIiwid...
  const decoded = await rsaRepo.findById(biometric.id);
  console.log("Decoded data:", decoded.data); // Output: Decoded data: iris-scan-encrypted

  // ────────────────────────────────────────────────────────────
  //  KEY TAKEAWAYS
  // ────────────────────────────────────────────────────────────
  // 1. Adapter pattern wraps storage behind a uniform API — swap
  //    MemoryStore for Redis or CloudStore without touching business code.
  // 2. Strategy makes encryption pluggable — AES256, RSA, etc.
  // 3. AadhaarCache intercepts reads, serves from cache, and
  //    invalidates on writes — transparent to the consumer.
  // 4. Factory stamps every citizen record with ID, type, and timestamps.
  // 5. Builder constructs complex queries: where().sortBy().limit().
  // 6. Repository ties it all together — the single doorway that
  //    business logic uses for all data operations.
  // 7. UIDAI's Aadhaar Data Layer: any storage, any encryption, any
  //    query — AadhaarDataLayer handles them all.
  console.log("\nAadhaarDataLayer complete. The citizen registry is open for service.");
  // Output: AadhaarDataLayer complete. The citizen registry is open for service.
}
main();
