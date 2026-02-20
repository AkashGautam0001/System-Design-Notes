/** ============================================================
 *  FILE 07: CDN AND EDGE COMPUTING
 *  ============================================================
 *  Topic: CDN architecture, PoP, origin pull/push, cache-control,
 *         edge computing, geo-routing, anycast
 *
 *  WHY THIS MATTERS:
 *  CDNs serve over 50% of all internet traffic. Without them,
 *  every request travels to a distant origin, causing high latency.
 *  Understanding CDN architecture is essential for building globally
 *  performant apps serving millions of concurrent users.
 *  ============================================================ */

// STORY: Hotstar IPL Streaming
// During the 2024 IPL final, Hotstar served 59 million concurrent
// viewers. The origin in Mumbai fed PoPs in Delhi, Chennai, Kolkata,
// and Bengaluru — so a viewer in Kolkata got data from 5km away,
// not 2000km away in Mumbai.

console.log("=".repeat(70));
console.log("  FILE 07: CDN AND EDGE COMPUTING");
console.log("  Hotstar IPL Streaming — Mumbai Origin, Nationwide PoPs");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — CDN Architecture Overview
// ════════════════════════════════════════════════════════════════

// WHY: A CDN is a geographically distributed network of proxy
// servers that cache content close to end users.

console.log("SECTION 1: CDN Architecture Overview");
console.log("-".repeat(50));

const CITIES = {
  mumbai:    { lat: 19.07, lng: 72.87, name: "Mumbai (Origin)" },
  delhi:     { lat: 28.61, lng: 77.20, name: "Delhi PoP" },
  chennai:   { lat: 13.08, lng: 80.27, name: "Chennai PoP" },
  kolkata:   { lat: 22.57, lng: 88.36, name: "Kolkata PoP" },
  bengaluru: { lat: 12.97, lng: 77.59, name: "Bengaluru PoP" },
  hyderabad: { lat: 17.38, lng: 78.49, name: "Hyderabad PoP" },
};

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, toR = d => d * Math.PI / 180;
  const dLat = toR(lat2 - lat1), dLng = toR(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

console.log("\nHotstar CDN Topology:\n");
const origin = CITIES.mumbai;
for (const [k, city] of Object.entries(CITIES)) {
  if (k === "mumbai") continue;
  const dist = haversine(origin.lat, origin.lng, city.lat, city.lng);
  console.log(`  ${origin.name} -> ${city.name}: ${dist.toFixed(0)}km, ~${(dist / 200).toFixed(0)}ms latency`);
}
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — PoP (Point of Presence) Simulation
// ════════════════════════════════════════════════════════════════

// WHY: Each PoP caches content locally. On hit it serves instantly;
// on miss it fetches from origin.

console.log("SECTION 2: PoP Simulation");
console.log("-".repeat(50));

class PoP {
  constructor(name, sz = 10) {
    this.name = name; this.cache = new Map(); this.sz = sz; this.hits = 0; this.misses = 0;
  }
  get(key) {
    if (this.cache.has(key)) { this.hits++; return "HIT"; }
    this.misses++; return "MISS";
  }
  set(key, data) {
    if (this.cache.size >= this.sz) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key, data);
  }
  ratio() { const t = this.hits + this.misses; return t ? ((this.hits / t) * 100).toFixed(1) + "%" : "N/A"; }
}

class OriginServer {
  constructor() { this.content = new Map(); this.reqs = 0; }
  add(k, d) { this.content.set(k, d); }
  fetch(k) { this.reqs++; return this.content.get(k) || null; }
}

const originSrv = new OriginServer();
const pops = { delhi: new PoP("Delhi"), chennai: new PoP("Chennai"), kolkata: new PoP("Kolkata"), bengaluru: new PoP("Bengaluru") };
for (let i = 1; i <= 20; i++) originSrv.add(`segment-${i}`, { segment: i, sizeKB: 500, quality: "1080p" });

console.log(`\nOrigin has ${originSrv.content.size} video segments.\n`);

function requestPoP(popName, key) {
  const pop = pops[popName];
  const status = pop.get(key);
  if (status === "HIT") { console.log(`  [${pop.name}] ${key}: HIT — ~5ms`); return; }
  console.log(`  [${pop.name}] ${key}: MISS — fetch origin ~80ms`);
  pop.set(key, originSrv.fetch(key));
}

requestPoP("delhi", "segment-1"); requestPoP("delhi", "segment-1"); // Output: HIT
requestPoP("chennai", "segment-1"); // Output: MISS (different PoP)
requestPoP("kolkata", "segment-2"); requestPoP("kolkata", "segment-2"); // Output: HIT
requestPoP("delhi", "segment-2"); requestPoP("delhi", "segment-2"); // Output: HIT

console.log("\nPoP Stats:");
for (const [, pop] of Object.entries(pops)) {
  if (pop.hits + pop.misses > 0) console.log(`  ${pop.name}: ${pop.ratio()} hit ratio (${pop.hits}H/${pop.misses}M)`);
}
console.log(`  Origin fetches: ${originSrv.reqs}\n`);

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Origin Pull vs Push
// ════════════════════════════════════════════════════════════════

// WHY: Pull CDNs fetch lazily (on demand); Push CDNs pre-distribute.
// Choice depends on content popularity and update frequency.

console.log("SECTION 3: Origin Pull vs Push");
console.log("-".repeat(50));

const segments = Array.from({ length: 10 }, (_, i) => `seg-${i + 1}`);
const viewerReqs = Array.from({ length: 100 }, () =>
  Math.random() < 0.8 ? `seg-${Math.floor(Math.random() * 5) + 1}` : `seg-${Math.floor(Math.random() * 10) + 1}`
);

// Pull CDN
let pullOriginFetches = 0, pullPop = new Map();
for (const r of viewerReqs) {
  if (!pullPop.has(r)) { pullOriginFetches++; pullPop.set(r, true); }
}

// Push CDN — pre-populate all
let pushWasted = segments.length; // All segments pushed
let pushAllHit = true; // Every request is a hit

console.log(`\n  PULL: ${pullOriginFetches} origin fetches, first viewer per segment waits`);
console.log(`  PUSH: 0 origin fetches at runtime (${pushWasted} pre-pushed), all viewers fast`);
console.log("\n  Hotstar: PUSH for live IPL (guaranteed demand),");
console.log("  PULL for old replays (uncertain demand).\n");

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Cache-Control Headers
// ════════════════════════════════════════════════════════════════

// WHY: Cache-control headers tell CDNs and browsers what to cache,
// for how long, and under what conditions.

console.log("SECTION 4: Cache-Control Headers");
console.log("-".repeat(50));

function analyzeHeader(resource, header) {
  const d = {};
  header.split(",").map(s => s.trim()).forEach(s => { const [k, v] = s.split("="); d[k.trim()] = v ? v.trim() : true; });
  let cdn = true, browser = true, reason = "";
  if (d["no-store"]) { cdn = false; browser = false; reason = "no-store: never cache"; }
  else if (d["private"]) { cdn = false; reason = `private: browser only, ${d["max-age"] || 0}s`; }
  else if (d["public"]) { reason = `public: CDN+browser, max-age=${d["max-age"] || 0}s`; }
  else if (d["no-cache"]) { reason = "revalidate every request"; }
  return { resource, cdn: cdn ? "YES" : "NO", browser: browser ? "YES" : "NO", reason };
}

const resources = [
  ["Live score (API)", "no-cache, no-store"],
  ["Video segment (.ts)", "public, max-age=86400"],
  ["User profile (JSON)", "private, max-age=300"],
  ["Team logo (PNG)", "public, max-age=604800"],
  ["Login token", "no-store"],
];
console.log();
for (const [res, hdr] of resources) {
  const a = analyzeHeader(res, hdr);
  console.log(`  ${res}: CDN=${a.cdn} Browser=${a.browser} — ${a.reason}`);
}
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — CDN Cache Invalidation
// ════════════════════════════════════════════════════════════════

// WHY: When origin content changes, all PoPs must be invalidated.
// Harder than single-server invalidation with dozens of global caches.

console.log("SECTION 5: CDN Cache Invalidation");
console.log("-".repeat(50));

class CDN {
  constructor() { this.pops = new Map(); }
  addPoP(name) { this.pops.set(name, new PoP(name, 50)); }
  invalidatePath(path) {
    let n = 0;
    for (const [, pop] of this.pops) { if (pop.cache.has(path)) { pop.cache.delete(path); n++; } }
    console.log(`  [INVALIDATE] "${path}" cleared from ${n}/${this.pops.size} PoPs`);
  }
  invalidatePrefix(prefix) {
    let n = 0;
    for (const [, pop] of this.pops) for (const k of pop.cache.keys()) if (k.startsWith(prefix)) { pop.cache.delete(k); n++; }
    console.log(`  [INVALIDATE] "${prefix}*" — ${n} entries cleared`);
  }
  purgeAll() { for (const [, pop] of this.pops) pop.cache.clear(); console.log("  [PURGE ALL] All caches cleared"); }
}

const cdn = new CDN();
["Delhi", "Chennai", "Kolkata", "Bengaluru"].forEach(n => cdn.addPoP(n));
for (const [, pop] of cdn.pops) { pop.set("ipl/live-score", {}); pop.set("ipl/highlights/1", {}); pop.set("ipl/highlights/2", {}); }

console.log("\nScore updated — invalidate stale cached score:");
cdn.invalidatePath("ipl/live-score");
console.log("Highlights re-encoded:");
cdn.invalidatePrefix("ipl/highlights/");
console.log("CDN version upgrade:");
cdn.purgeAll();
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Edge Computing
// ════════════════════════════════════════════════════════════════

// WHY: Edge computing runs logic at the PoP — personalization,
// A/B testing, bot detection — without origin round trips.

console.log("SECTION 6: Edge Computing");
console.log("-".repeat(50));

// Edge function 1: Language routing
console.log("\nLanguage-based routing:");
const langMap = { hi: "/hi/", ta: "/ta/", te: "/te/", en: "/en/" };
for (const lang of ["hi", "ta", "en"]) {
  console.log(`  User (${lang}) -> ${langMap[lang]}ipl/live`);
}

// Edge function 2: A/B testing
console.log("\nA/B testing at edge:");
for (const uid of [1001, 1002, 1050, 1099]) {
  console.log(`  User ${uid} -> Variant ${uid % 100 < 50 ? "A" : "B"}`);
}

// Edge function 3: Bot detection
console.log("\nBot detection:");
const agents = [
  ["Mozilla/5.0 Chrome/120", false], ["Googlebot/2.1", true],
  ["Python-Scraper/1.0", true], ["Safari/17", false]
];
for (const [ua, isBot] of agents) {
  console.log(`  "${ua}" -> ${isBot ? "BLOCK" : "ALLOW"}`);
}
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Geo-Routing and Anycast
// ════════════════════════════════════════════════════════════════

// WHY: Geo-routing sends users to nearest PoP. Anycast uses BGP
// to route to the closest server without client-side logic.

console.log("SECTION 7: Geo-Routing and Anycast");
console.log("-".repeat(50));

const popLocations = {
  Delhi: { lat: 28.61, lng: 77.20, load: 750, cap: 1000 },
  Chennai: { lat: 13.08, lng: 80.27, load: 600, cap: 800 },
  Kolkata: { lat: 22.57, lng: 88.36, load: 590, cap: 600 },
  Bengaluru: { lat: 12.97, lng: 77.59, load: 400, cap: 900 },
};

const viewers = [
  { city: "Lucknow", lat: 26.85, lng: 80.95 }, { city: "Coimbatore", lat: 11.02, lng: 76.96 },
  { city: "Patna", lat: 25.61, lng: 85.14 }, { city: "Pune", lat: 18.52, lng: 73.86 },
];

console.log("\nGeo-routing viewers to nearest healthy PoP:\n");
for (const v of viewers) {
  const sorted = Object.entries(popLocations)
    .map(([name, p]) => ({ name, dist: haversine(v.lat, v.lng, p.lat, p.lng), healthy: p.load < p.cap }))
    .sort((a, b) => a.dist - b.dist);
  const primary = sorted.find(s => s.healthy);
  const fallback = sorted.find(s => s.healthy && s !== primary);
  console.log(`  ${v.city}: Primary=${primary.name} (${primary.dist.toFixed(0)}km), Fallback=${fallback ? fallback.name : "none"}`);
}
console.log("\n  Anycast: All PoPs share IP 103.76.40.1 — BGP routes");
console.log("  packets to topologically nearest PoP automatically.\n");

// ════════════════════════════════════════════════════════════════
// SECTION 8 — CDN Performance Metrics
// ════════════════════════════════════════════════════════════════

// WHY: Track cache hit ratio, origin offload, TTFB, bandwidth
// savings to guide optimization.

console.log("SECTION 8: CDN Performance Metrics");
console.log("-".repeat(50));

const hitRate = 0.92;
let totalReqs = 1000, hits = 0, originBytes = 0, ttfbSum = 0;
const latencies = [];
for (let i = 0; i < totalReqs; i++) {
  if (Math.random() < hitRate) {
    hits++; const t = 2 + Math.random() * 8; ttfbSum += t; latencies.push(t);
  } else {
    originBytes += 500; const t = 50 + Math.random() * 100; ttfbSum += t; latencies.push(t);
  }
}
latencies.sort((a, b) => a - b);
const p50 = latencies[Math.floor(totalReqs * 0.5)];
const p95 = latencies[Math.floor(totalReqs * 0.95)];
const p99 = latencies[Math.floor(totalReqs * 0.99)];

console.log(`\n  IPL Final Traffic Simulation (${totalReqs} requests):`);
console.log(`  +----------------------------+-----------------+`);
console.log(`  | Cache Hit Ratio            | ${((hits / totalReqs) * 100).toFixed(1).padEnd(15)} |`);
console.log(`  | Origin Offload             | ${((1 - originBytes / (totalReqs * 500)) * 100).toFixed(1).padEnd(15)}%|`);
console.log(`  | Avg TTFB                   | ${(ttfbSum / totalReqs).toFixed(1).padEnd(14)}ms|`);
console.log(`  | P50 Latency                | ${p50.toFixed(1).padEnd(14)}ms|`);
console.log(`  | P95 Latency                | ${p95.toFixed(1).padEnd(14)}ms|`);
console.log(`  | P99 Latency                | ${p99.toFixed(1).padEnd(14)}ms|`);
console.log(`  +----------------------------+-----------------+`);
console.log("\n  Targets: Hit ratio >90%, P99 <100ms, Offload >85%");
console.log("  Without CDN, 59M concurrent viewers would overwhelm");
console.log("  Mumbai origin — CDN made IPL streaming possible.");
console.log("  Every 1% improvement in hit ratio saves terabytes");
console.log("  of origin bandwidth and thousands of rupees per hour.\n");

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log(`
  1. CDN distributes content to edge PoPs, reducing latency from
     100+ms to under 10ms for cached content.
  2. PoPs cache independently — each is a mini data center.
  3. Pull CDN: fetch on demand. Push CDN: pre-distribute.
  4. Cache-Control headers: public/private, max-age, no-store.
  5. CDN invalidation at scale: use versioned URLs to avoid purges.
  6. Edge computing runs A/B tests, routing, bot detection at PoPs.
  7. Geo-routing + Anycast send users to nearest healthy PoP.
  8. Key metrics: hit ratio >90%, P99 TTFB, bandwidth savings.
`);
console.log('  Hotstar engineer\'s wisdom: "During IPL, every millisecond');
console.log('  matters. A CDN brings Mumbai\'s servers to every viewer\'s');
console.log('  neighborhood."');
console.log();
console.log("=".repeat(70));
