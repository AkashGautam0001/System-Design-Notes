/** ============================================================
 *  FILE 31: DESIGN SEARCH AUTOCOMPLETE SYSTEM
 *  ============================================================
 *  Topic: Trie, prefix matching, frequency ranking, top-K,
 *         caching prefixes, debounce, personalized suggestions
 *
 *  WHY THIS MATTERS:
 *  Autocomplete is the silent hero of user experience. Every
 *  keystroke triggers a race to predict intent. A 100ms delay
 *  reduces engagement by 20%. Trie-based systems power billions
 *  of queries daily across Google, Amazon, and Flipkart.
 *  ============================================================ */

// STORY: Flipkart Search Bar
// During Big Billion Days, a user types "sam" into Flipkart search.
// Within 50ms, the system surfaces "Samsung Galaxy S24", "Samsonite
// luggage", and "samosa maker" — ranked by frequency, personalized
// to user history. Behind this lies a distributed Trie with caching
// and debounce handling 50,000 queries per second.

console.log("=".repeat(70));
console.log("  FILE 31: DESIGN SEARCH AUTOCOMPLETE SYSTEM");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Requirements and Scale Estimation
// ════════════════════════════════════════════════════════════════

// WHY: Before building, we must understand the constraints.
console.log("SECTION 1: Requirements and Scale Estimation");
console.log("-".repeat(50));

const requirements = {
  functional: ["Return top-K suggestions for prefix", "Rank by frequency", "Personalized per user", "Low latency: <100ms"],
  scaleEstimation: { DAU: "10M", peakQPS: "50K", uniqueTerms: "50M", trieMemory: "~2GB" }
};
console.log("\nFunctional:", requirements.functional.join("; "));
console.log("Scale:", JSON.stringify(requirements.scaleEstimation));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Trie Data Structure Implementation
// ════════════════════════════════════════════════════════════════

// WHY: A Trie gives O(L) prefix lookup where L is prefix length.
console.log("SECTION 2: Trie Data Structure Implementation");
console.log("-".repeat(50));

class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
    this.frequency = 0;
    this.term = null;
  }
}

class Trie {
  constructor(k = 5) {
    this.root = new TrieNode();
    this.k = k;
    this.totalTerms = 0;
    this.totalNodes = 0;
  }

  insert(term, frequency = 1) {
    if (!term) return;
    let node = this.root;
    const lower = term.toLowerCase().trim();
    for (const ch of lower) {
      if (!node.children[ch]) { node.children[ch] = new TrieNode(); this.totalNodes++; }
      node = node.children[ch];
    }
    if (!node.isEnd) this.totalTerms++;
    node.isEnd = true;
    node.frequency += frequency;
    node.term = lower;
  }

  search(term) {
    const n = this._find(term.toLowerCase().trim());
    return n !== null && n.isEnd;
  }

  startsWith(prefix) { return this._find(prefix.toLowerCase().trim()) !== null; }

  _find(prefix) {
    let node = this.root;
    for (const ch of prefix) { if (!node.children[ch]) return null; node = node.children[ch]; }
    return node;
  }

  findAllWithPrefix(prefix) {
    const results = [];
    const node = this._find(prefix.toLowerCase().trim());
    if (!node) return results;
    const dfs = (n) => {
      if (n.isEnd) results.push({ term: n.term, frequency: n.frequency });
      for (const ch of Object.keys(n.children).sort()) dfs(n.children[ch]);
    };
    dfs(node);
    return results;
  }

  getTopK(prefix, k = this.k) {
    const all = this.findAllWithPrefix(prefix);
    const heap = new MinHeap();
    for (const m of all) {
      if (heap.size() < k) heap.push(m);
      else if (m.frequency > heap.peek().frequency) { heap.pop(); heap.push(m); }
    }
    const res = [];
    while (heap.size() > 0) res.push(heap.pop());
    return res.reverse();
  }

  getStats() { return { totalTerms: this.totalTerms, totalNodes: this.totalNodes }; }
}

const trie = new Trie();
["samsung galaxy s24", "samsonite luggage", "samosa maker", "sandisk pendrive"].forEach(t => trie.insert(t));
console.log(`\n  search("samsung galaxy s24"): ${trie.search("samsung galaxy s24")}`);
console.log(`  search("samsung tv"): ${trie.search("samsung tv")}`);
console.log(`  startsWith("sam"): ${trie.startsWith("sam")}`);
// Output: true, false, true
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Inserting Search Terms with Frequency
// ════════════════════════════════════════════════════════════════

// WHY: "samsung galaxy" gets 100K searches/day; "samosa maker" 500.
console.log("SECTION 3: Inserting Search Terms with Frequency");
console.log("-".repeat(50));

const flipkartData = [
  { term: "samsung galaxy s24", frequency: 95000 }, { term: "samsung galaxy a15", frequency: 72000 },
  { term: "samsung earbuds", frequency: 45000 },    { term: "samsonite luggage", frequency: 38000 },
  { term: "samsonite backpack", frequency: 22000 },  { term: "samosa maker", frequency: 15000 },
  { term: "sample perfume set", frequency: 12000 },  { term: "samsung tv 55 inch", frequency: 88000 },
  { term: "samsung refrigerator", frequency: 31000 },{ term: "sandisk 64gb pendrive", frequency: 56000 },
  { term: "sanitizer dettol", frequency: 28000 },    { term: "saree silk", frequency: 67000 },
  { term: "samsung watch", frequency: 41000 },       { term: "sandwich maker", frequency: 35000 },
  { term: "sapphire ring", frequency: 8000 },        { term: "sari blouse", frequency: 19000 },
  { term: "samsung charger", frequency: 52000 },     { term: "safari bags", frequency: 29000 },
  { term: "samsung m34", frequency: 63000 },         { term: "salt lamp", frequency: 6000 }
];

const searchTrie = new Trie(5);
flipkartData.forEach(({ term, frequency }) => searchTrie.insert(term, frequency));
console.log(`\n  Loaded ${searchTrie.getStats().totalTerms} terms, ${searchTrie.getStats().totalNodes} nodes`);
flipkartData.slice(0, 3).forEach(d => console.log(`    "${d.term}" -> ${d.frequency.toLocaleString()}/day`));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Prefix Search and Top-K with MinHeap
// ════════════════════════════════════════════════════════════════

// WHY: Users want 5 best suggestions, not all 100 matches. MinHeap
// gives O(N log K) extraction instead of O(N log N) full sort.
console.log("SECTION 4: Prefix Search and Top-K with MinHeap");
console.log("-".repeat(50));

class MinHeap {
  constructor() { this.heap = []; }
  size() { return this.heap.length; }
  peek() { return this.heap[0] || null; }
  push(v) { this.heap.push(v); this._up(this.heap.length - 1); }
  pop() {
    if (!this.heap.length) return null;
    const top = this.heap[0]; const last = this.heap.pop();
    if (this.heap.length) { this.heap[0] = last; this._down(0); }
    return top;
  }
  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[i].frequency < this.heap[p].frequency) { [this.heap[i], this.heap[p]] = [this.heap[p], this.heap[i]]; i = p; } else break;
    }
  }
  _down(i) {
    const n = this.heap.length;
    while (true) {
      let s = i, l = 2*i+1, r = 2*i+2;
      if (l < n && this.heap[l].frequency < this.heap[s].frequency) s = l;
      if (r < n && this.heap[r].frequency < this.heap[s].frequency) s = r;
      if (s !== i) { [this.heap[i], this.heap[s]] = [this.heap[s], this.heap[i]]; i = s; } else break;
    }
  }
}

console.log('\n  User types "sam" -> Top 5:');
searchTrie.getTopK("sam", 5).forEach((r, i) => console.log(`    ${i+1}. "${r.term}" (${r.frequency.toLocaleString()})`));
console.log('\n  User types "samsung g" -> Top 3:');
searchTrie.getTopK("samsung g", 3).forEach((r, i) => console.log(`    ${i+1}. "${r.term}" (${r.frequency.toLocaleString()})`));
// Output: Ranked suggestions for each prefix
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Caching Popular Prefixes
// ════════════════════════════════════════════════════════════════

// WHY: Caching common prefixes reduces latency from ~10ms to <1ms.
console.log("SECTION 5: Caching Popular Prefixes");
console.log("-".repeat(50));

class PrefixCache {
  constructor(maxSize = 1000, ttlMs = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.hits = 0;
    this.misses = 0;
  }
  get(prefix) {
    const e = this.cache.get(prefix);
    if (!e || Date.now() - e.ts > this.ttlMs) { this.misses++; if (e) this.cache.delete(prefix); return null; }
    e.hits++; this.hits++; return e.results;
  }
  set(prefix, results) {
    if (this.cache.size >= this.maxSize) {
      let minK = null, minH = Infinity;
      for (const [k, v] of this.cache) { if (v.hits < minH) { minH = v.hits; minK = k; } }
      if (minK) this.cache.delete(minK);
    }
    this.cache.set(prefix, { results, ts: Date.now(), hits: 0 });
  }
  warmUp(trie, prefixes) { prefixes.forEach(p => this.set(p, trie.getTopK(p))); return prefixes.length; }
  getStats() {
    const total = this.hits + this.misses;
    return { size: this.cache.size, hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(1) + "%" : "0%" };
  }
}

const cache = new PrefixCache(500, 300000);
console.log(`\n  Warmed ${cache.warmUp(searchTrie, ["sam","san","sa","samsung"])} prefixes`);
const lookups = ["sam", "sam", "san", "sam", "xyz", "samsung"];
lookups.forEach(p => {
  const hit = cache.get(p);
  if (!hit) { cache.set(p, searchTrie.getTopK(p)); console.log(`    "${p}" -> MISS (computed & cached)`); }
  else console.log(`    "${p}" -> HIT (${hit.length} results)`);
});
console.log(`  Cache stats: ${JSON.stringify(cache.getStats())}`);
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Debounce Simulation
// ════════════════════════════════════════════════════════════════

// WHY: Debouncing waits for typing pause before firing, saving 60-80% API calls.
console.log("SECTION 6: Debounce Simulation");
console.log("-".repeat(50));

class DebounceSimulator {
  constructor(delayMs = 200) { this.delayMs = delayMs; this.total = 0; this.fired = 0; this.saved = 0; }

  simulate(query, charTimings) {
    console.log(`\n  Typing "${query}" (debounce=${this.delayMs}ms)`);
    const queries = [];
    for (let i = 0; i < query.length; i++) {
      this.total++;
      const gap = (charTimings[i + 1] !== undefined) ? charTimings[i + 1] - charTimings[i] : this.delayMs + 100;
      if (gap >= this.delayMs) {
        queries.push(query.substring(0, i + 1));
        this.fired++;
      } else { this.saved++; }
    }
    queries.forEach(q => console.log(`    FIRE: "${q}"`));
    console.log(`    Fired: ${queries.length}, Saved: ${query.length - queries.length}`);
    return queries;
  }
  getStats() { return { total: this.total, fired: this.fired, saved: this.saved, savings: ((this.saved/this.total)*100).toFixed(0)+"%" }; }
}

const debouncer = new DebounceSimulator(200);
debouncer.simulate("samsung galaxy", [0,90,160,250,320,400,480, 900, 980,1060,1140,1200,1280,1370]);
debouncer.simulate("samosa", [0, 80, 160, 240, 320, 400]);
console.log(`  Stats: ${JSON.stringify(debouncer.getStats())}`);
// Output: Fires only after pauses
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Personalized Suggestions
// ════════════════════════════════════════════════════════════════

// WHY: Personalization boosts conversion 15-30% on Flipkart.
console.log("SECTION 7: Personalized Suggestions");
console.log("-".repeat(50));

class PersonalizedAutocomplete {
  constructor(trie, k = 5) { this.trie = trie; this.k = k; this.profiles = new Map(); }

  addHistory(userId, history) {
    if (!this.profiles.has(userId)) this.profiles.set(userId, { weights: {}, recent: [] });
    const p = this.profiles.get(userId);
    p.recent = history.slice(-20);
    history.forEach(h => { p.weights[h.category || "general"] = (p.weights[h.category || "general"] || 0) + 1; });
  }

  suggest(userId, prefix) {
    const global = this.trie.getTopK(prefix, this.k * 2);
    const p = this.profiles.get(userId);
    if (!p) return global.slice(0, this.k);
    const scored = global.map(r => {
      let score = r.frequency;
      if (p.recent.find(s => s.term && r.term.includes(s.term.split(" ")[0]))) score *= 1.5;
      const cat = this._cat(r.term);
      if (p.weights[cat]) score *= (1 + p.weights[cat] * 0.1);
      return { ...r, score: Math.round(score), original: r.frequency };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, this.k);
  }

  _cat(term) {
    const m = { electronics: ["samsung","earbuds","tv","charger","watch"], fashion: ["saree","sari","blouse","ring"], home: ["samosa","sandwich","sanitizer"], travel: ["samsonite","safari","luggage"] };
    for (const [c, kws] of Object.entries(m)) if (kws.some(k => term.includes(k))) return c;
    return "general";
  }
}

const personal = new PersonalizedAutocomplete(searchTrie, 5);
personal.addHistory("mumbai_42", [
  { term: "samsung galaxy s24", category: "electronics" }, { term: "samsung earbuds", category: "electronics" }
]);
personal.addHistory("delhi_88", [
  { term: "saree silk", category: "fashion" }, { term: "sari blouse", category: "fashion" }
]);

console.log('\n  Electronics buyer types "sam":');
personal.suggest("mumbai_42", "sam").forEach((r, i) => {
  console.log(`    ${i+1}. "${r.term}" (score: ${r.score.toLocaleString()})${r.score > r.original ? " [BOOSTED]" : ""}`);
});
console.log('\n  Fashion buyer types "sa":');
personal.suggest("delhi_88", "sa").forEach((r, i) => {
  console.log(`    ${i+1}. "${r.term}" (score: ${r.score.toLocaleString()})${r.score > r.original ? " [BOOSTED]" : ""}`);
});
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Full Autocomplete System Simulation
// ════════════════════════════════════════════════════════════════

// WHY: Trie + top-K + cache + debounce + personalization together.
console.log("SECTION 8: Full Autocomplete System Simulation");
console.log("-".repeat(50));

class AutocompleteSystem {
  constructor() {
    this.trie = new Trie(5);
    this.cache = new PrefixCache(500, 300000);
    this.personal = new PersonalizedAutocomplete(this.trie, 5);
    this.metrics = { queries: 0, cacheHits: 0, cacheMisses: 0 };
  }
  load(data) { data.forEach(d => this.trie.insert(d.term, d.frequency)); }
  warmCache(prefixes) { this.cache.warmUp(this.trie, prefixes); }

  query(prefix, userId = null) {
    this.metrics.queries++;
    let results = this.cache.get(prefix);
    let src = "cache";
    if (!results) {
      if (userId && this.personal.profiles.has(userId)) { results = this.personal.suggest(userId, prefix); src = "personalized"; }
      else { results = this.trie.getTopK(prefix, 5); src = "trie"; this.cache.set(prefix, results); }
      this.metrics.cacheMisses++;
    } else { this.metrics.cacheHits++; }
    return { results, src };
  }

  session(userId, keystrokes) {
    console.log(`\n  --- Session: ${userId || "anon"} ---`);
    keystrokes.forEach(ks => {
      if (ks.fire) {
        const r = this.query(ks.prefix, userId);
        console.log(`  [${ks.time}ms] "${ks.prefix}" -> ${r.results.length} results (${r.src})${r.results[0] ? ' top:"'+r.results[0].term+'"' : ''}`);
      } else {
        console.log(`  [${ks.time}ms] "${ks.prefix}" -> debounced`);
      }
    });
  }
}

const sys = new AutocompleteSystem();
sys.load(flipkartData);
sys.warmCache(["sam", "san", "sa", "samsung"]);
sys.personal.addHistory("user_101", [{ term: "samsung galaxy", category: "electronics" }]);

sys.session("user_101", [
  { prefix: "s", time: 0, fire: false }, { prefix: "sa", time: 90, fire: false },
  { prefix: "sam", time: 180, fire: false }, { prefix: "samsung", time: 500, fire: true },
  { prefix: "samsung g", time: 880, fire: false }, { prefix: "samsung galaxy", time: 1200, fire: true }
]);
sys.session(null, [
  { prefix: "sam", time: 0, fire: true }, { prefix: "san", time: 500, fire: true }, { prefix: "sam", time: 1000, fire: true }
]);

console.log(`\n  Metrics: queries=${sys.metrics.queries}, cacheHits=${sys.metrics.cacheHits}, misses=${sys.metrics.cacheMisses}`);
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 9 — Architecture and Scaling Considerations
// ════════════════════════════════════════════════════════════════

// WHY: Single-node Trie won't handle 50K QPS. Need sharding and caching layers.
console.log("SECTION 9: Architecture and Scaling");
console.log("-".repeat(50));

console.log("\n  Pipeline: Kafka -> Spark -> Aggregator -> Trie Builder (15min cycle)");
console.log("  Sharding: sa* -> Shard 1, sb*-sf* -> Shard 2 (3 replicas each)");
console.log("  Cache L1: CDN edge (1-2 char prefixes), L2: Redis (top 100K), L3: In-process LRU");

const approaches = [
  { name: "Trie in Memory", latency: "<1ms", memory: "High", update: "Rebuild" },
  { name: "ElasticSearch", latency: "5-20ms", memory: "Medium", update: "Real-time" },
  { name: "Precomputed Table", latency: "<1ms", memory: "Very High", update: "Batch" }
];
console.log("\n  " + "Approach".padEnd(22) + "Latency".padEnd(12) + "Memory".padEnd(12) + "Update");
approaches.forEach(a => console.log(`  ${a.name.padEnd(22)}${a.latency.padEnd(12)}${a.memory.padEnd(12)}${a.update}`));
console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log(`
  1. Trie provides O(L) prefix lookup — independent of total terms.
  2. Top-K with MinHeap is O(N log K) — efficient for 5 from millions.
  3. Prefix caching covers 80%+ queries; reduces latency to <1ms.
  4. Debounce saves 60-80% of API calls on fast typers.
  5. Personalization boosts conversion 15-30% per Flipkart data.
  6. Shard by prefix chars for horizontal scaling across DCs.
  7. Multi-layer cache (CDN + Redis + in-process) for sub-10ms p99.
  8. Content filtering (profanity, legal, freshness) before serving.
`);
console.log('  "Every millisecond saved is a customer earned. The Trie');
console.log('   predicts intent before the user finishes typing."');
console.log("   - Flipkart Search Platform Team");
console.log();
console.log("=".repeat(70));
console.log("  END OF FILE 31");
console.log("=".repeat(70));
