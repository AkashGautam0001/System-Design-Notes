/** ============================================================
 *  FILE 26: DESIGN A URL SHORTENER
 *  ============================================================
 *  Topic: Base62 encoding, hash collisions, redirects, analytics,
 *         caching, TTL, counter-based ID generation
 *
 *  WHY THIS MATTERS:
 *  URL shorteners like bit.ly handle billions of redirects daily.
 *  They appear simple but involve distributed ID generation, hash
 *  collision resolution, analytics at scale, and caching strategies.
 *  Government and enterprise use cases demand high reliability.
 *  ============================================================ */

// STORY: Government Scheme Short URLs — PM Office
// The PM office shares short links for Ayushman Bharat, PM-KISAN, and
// Digital India schemes. Citizens across 28 states click these links
// from SMS messages on basic phones. A single scheme announcement can
// generate 50 million clicks in hours. The system must never collide,
// never expire prematurely, and track analytics by state for policy
// planning. Every redirect must be fast — rural 2G users cannot wait.

console.log("=".repeat(70));
console.log("  FILE 26: DESIGN A URL SHORTENER");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Requirements Analysis
// ════════════════════════════════════════════════════════════════

// WHY: Before coding, we must define functional and non-functional requirements.

console.log("SECTION 1 — Requirements Analysis");
console.log("-".repeat(50));

const requirements = {
  functional: [
    "Given a long URL, generate a short unique URL",
    "When user visits short URL, redirect to original",
    "Custom short links (optional)",
    "URLs expire after configurable TTL",
    "Analytics: click count, referrer, geo"
  ],
  nonFunctional: [
    "Read-heavy: 100:1 read-to-write ratio",
    "Low latency redirects (< 10ms with cache)",
    "High availability (99.99%)",
    "Short URLs should be unpredictable"
  ],
  capacity: {
    newUrlsPerDay: 1_000_000,
    readsPerDay: 100_000_000,
    urlLength: 7,
    possibleCombinations: Math.pow(62, 7) // ~3.5 trillion
  }
};

console.log("Functional Requirements:");
requirements.functional.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
console.log("\nNon-Functional Requirements:");
requirements.nonFunctional.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
console.log("\nCapacity Estimates:");
console.log(`  New URLs/day: ${requirements.capacity.newUrlsPerDay.toLocaleString()}`);
console.log(`  Reads/day: ${requirements.capacity.readsPerDay.toLocaleString()}`);
console.log(`  URL length: ${requirements.capacity.urlLength} chars`);
console.log(`  Possible combinations: ~${(requirements.capacity.possibleCombinations / 1e12).toFixed(1)} trillion`);
// Output: ~3.5 trillion unique URLs possible

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Base62 Encoding and Decoding
// ════════════════════════════════════════════════════════════════

// WHY: Base62 (a-z, A-Z, 0-9) creates URL-safe short strings from numeric IDs.

console.log("SECTION 2 — Base62 Encoding and Decoding");
console.log("-".repeat(50));

class Base62 {
  constructor() {
    this.chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    this.base = 62;
  }

  encode(num) {
    if (num === 0) return this.chars[0];
    let result = "";
    let n = num;
    while (n > 0) {
      result = this.chars[n % this.base] + result;
      n = Math.floor(n / this.base);
    }
    return result;
  }

  decode(str) {
    let result = 0;
    for (const char of str) {
      result = result * this.base + this.chars.indexOf(char);
    }
    return result;
  }

  // Pad to fixed length for consistent URL length
  encodePadded(num, length = 7) {
    let encoded = this.encode(num);
    while (encoded.length < length) {
      encoded = this.chars[0] + encoded;
    }
    return encoded;
  }
}

const base62 = new Base62();

// Demonstrate encoding/decoding
const testNumbers = [1, 100, 10000, 1000000, 3500000000];
console.log("Base62 Encoding Examples:");
testNumbers.forEach(n => {
  const encoded = base62.encode(n);
  const decoded = base62.decode(encoded);
  const padded = base62.encodePadded(n);
  console.log(`  ${n.toLocaleString().padStart(15)} -> ${encoded.padEnd(8)} (padded: ${padded}) -> decoded: ${decoded}`);
});
// Output: Each number encodes to short string and decodes back correctly

console.log(`\n  7-char Base62 range: ${base62.encode(0)} to ${base62.encode(Math.pow(62, 7) - 1)}`);
// Output: 0 to ZZZZZZZ

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — URL Shortening with Counter (Auto-Increment)
// ════════════════════════════════════════════════════════════════

// WHY: Counter-based approach guarantees zero collisions — each URL gets unique ID.

console.log("SECTION 3 — Counter-Based URL Shortening");
console.log("-".repeat(50));

class CounterBasedShortener {
  constructor() {
    this.counter = 100000; // Start from a large number for longer codes
    this.urlMap = new Map();   // shortCode -> longUrl
    this.reverseMap = new Map(); // longUrl -> shortCode
    this.base62 = new Base62();
  }

  shorten(longUrl) {
    // Check if URL already shortened
    if (this.reverseMap.has(longUrl)) {
      return this.reverseMap.get(longUrl);
    }

    this.counter++;
    const shortCode = this.base62.encodePadded(this.counter);

    this.urlMap.set(shortCode, longUrl);
    this.reverseMap.set(longUrl, shortCode);

    return shortCode;
  }

  resolve(shortCode) {
    return this.urlMap.get(shortCode) || null;
  }
}

const counterShortener = new CounterBasedShortener();

const govUrls = [
  "https://www.pmjay.gov.in/ayushman-bharat-scheme-registration-2024",
  "https://www.pmkisan.gov.in/beneficiary-status-check",
  "https://digitalindia.gov.in/programme/bharat-net-rural-broadband",
  "https://www.pmjay.gov.in/ayushman-bharat-scheme-registration-2024" // duplicate
];

console.log("Counter-based shortening (Government URLs):");
govUrls.forEach(url => {
  const code = counterShortener.shorten(url);
  const domain = new URL(url).hostname;
  console.log(`  pmgo.in/${code} -> ${domain}...`);
});
// Output: Duplicate URL returns same short code

console.log(`\n  Advantage: Zero collisions guaranteed`);
console.log(`  Disadvantage: Sequential = predictable (security concern)`);
console.log(`  Solution: Use range-based counters across servers`);

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Hash-Based Shortening with Collision Handling
// ════════════════════════════════════════════════════════════════

// WHY: Hashing produces unpredictable codes but may collide — we must handle that.

console.log("SECTION 4 — Hash-Based Shortening with Collision Handling");
console.log("-".repeat(50));

const crypto = require("crypto");

class HashBasedShortener {
  constructor() {
    this.urlMap = new Map();
    this.reverseMap = new Map();
    this.collisionCount = 0;
  }

  _hash(input) {
    return crypto.createHash("md5").update(input).digest("hex");
  }

  _hashToBase62(hash, length = 7) {
    // Take first 12 hex chars (48 bits), convert to number, then Base62
    const num = parseInt(hash.substring(0, 12), 16);
    const base62 = new Base62();
    return base62.encodePadded(num, length);
  }

  shorten(longUrl) {
    if (this.reverseMap.has(longUrl)) {
      return this.reverseMap.get(longUrl);
    }

    let shortCode;
    let attempt = 0;
    let input = longUrl;

    while (true) {
      const hash = this._hash(input);
      shortCode = this._hashToBase62(hash);

      if (!this.urlMap.has(shortCode)) {
        break; // No collision
      }

      if (this.urlMap.get(shortCode) === longUrl) {
        return shortCode; // Same URL, same code
      }

      // Collision! Append attempt number and rehash
      this.collisionCount++;
      attempt++;
      input = longUrl + attempt;
      console.log(`    [COLLISION] Attempt ${attempt} for ${shortCode}, rehashing...`);
    }

    this.urlMap.set(shortCode, longUrl);
    this.reverseMap.set(longUrl, shortCode);
    return shortCode;
  }

  resolve(shortCode) {
    return this.urlMap.get(shortCode) || null;
  }

  getStats() {
    return {
      totalUrls: this.urlMap.size,
      totalCollisions: this.collisionCount
    };
  }
}

const hashShortener = new HashBasedShortener();

console.log("Hash-based shortening:");
const testUrls = [
  "https://www.pmjay.gov.in/registration",
  "https://www.pmkisan.gov.in/status",
  "https://aadhaar.uidai.gov.in/verify",
  "https://cowin.gov.in/certificate",
  "https://digilocker.gov.in/dashboard"
];

testUrls.forEach(url => {
  const code = hashShortener.shorten(url);
  const domain = new URL(url).hostname;
  console.log(`  pmgo.in/${code} -> ${domain}`);
});

const stats = hashShortener.getStats();
console.log(`\n  Total URLs: ${stats.totalUrls}, Collisions: ${stats.totalCollisions}`);
// Output: Most likely zero collisions with 5 URLs

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Redirect Service (301 vs 302)
// ════════════════════════════════════════════════════════════════

// WHY: 301 (permanent) caches in browser vs 302 (temporary) hits server every time.

console.log("SECTION 5 — Redirect Service (301 vs 302)");
console.log("-".repeat(50));

class RedirectService {
  constructor(urlStore) {
    this.urlStore = urlStore;
    this.redirectLog = [];
  }

  handleRedirect(shortCode, options = {}) {
    const longUrl = this.urlStore.resolve(shortCode);

    if (!longUrl) {
      return { status: 404, body: "Short URL not found" };
    }

    const redirectType = options.permanent ? 301 : 302;

    this.redirectLog.push({
      shortCode,
      longUrl,
      redirectType,
      timestamp: Date.now(),
      userAgent: options.userAgent || "Unknown",
      ip: options.ip || "0.0.0.0"
    });

    return {
      status: redirectType,
      headers: { Location: longUrl },
      body: `Redirecting to ${longUrl}`
    };
  }
}

const redirectService = new RedirectService(hashShortener);

console.log("301 (Permanent) Redirect:");
console.log("  Browser caches the redirect");
console.log("  Subsequent visits skip the shortener server");
console.log("  Better for SEO, worse for analytics");
console.log("  Use for: Static content, permanent pages");

console.log("\n302 (Temporary) Redirect:");
console.log("  Browser always hits shortener server first");
console.log("  Every click is tracked");
console.log("  Better for analytics, slightly higher latency");
console.log("  Use for: Campaign links, tracking links");

// Simulate redirect
const sampleCode = hashShortener.shorten("https://www.pmjay.gov.in/registration");
const result302 = redirectService.handleRedirect(sampleCode, {
  permanent: false,
  userAgent: "Jio Phone/2.0",
  ip: "103.45.67.89"
});
console.log(`\n  Simulated 302 redirect for /${sampleCode}:`);
console.log(`  Status: ${result302.status}`);
console.log(`  Location: ${result302.headers.Location}`);

const result404 = redirectService.handleRedirect("INVALID");
console.log(`\n  Invalid URL redirect: Status ${result404.status} - ${result404.body}`);

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Analytics Tracking (Clicks, Geo, Referrer)
// ════════════════════════════════════════════════════════════════

// WHY: Government needs to know which states accessed schemes for policy decisions.

console.log("SECTION 6 — Analytics Tracking");
console.log("-".repeat(50));

class AnalyticsEngine {
  constructor() {
    this.clicks = new Map(); // shortCode -> array of click events
  }

  recordClick(shortCode, metadata) {
    if (!this.clicks.has(shortCode)) {
      this.clicks.set(shortCode, []);
    }
    this.clicks.get(shortCode).push({
      timestamp: metadata.timestamp || Date.now(),
      state: metadata.state || "Unknown",
      city: metadata.city || "Unknown",
      referrer: metadata.referrer || "direct",
      device: metadata.device || "Unknown",
      browser: metadata.browser || "Unknown"
    });
  }

  getAnalytics(shortCode) {
    const events = this.clicks.get(shortCode) || [];

    // Aggregate by state
    const stateMap = {};
    const referrerMap = {};
    const deviceMap = {};
    const hourlyMap = {};

    events.forEach(e => {
      stateMap[e.state] = (stateMap[e.state] || 0) + 1;
      referrerMap[e.referrer] = (referrerMap[e.referrer] || 0) + 1;
      deviceMap[e.device] = (deviceMap[e.device] || 0) + 1;
      const hour = new Date(e.timestamp).getHours();
      hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
    });

    return {
      totalClicks: events.length,
      byState: stateMap,
      byReferrer: referrerMap,
      byDevice: deviceMap,
      byHour: hourlyMap,
      firstClick: events.length > 0 ? new Date(events[0].timestamp).toISOString() : null,
      lastClick: events.length > 0 ? new Date(events[events.length - 1].timestamp).toISOString() : null
    };
  }
}

const analytics = new AnalyticsEngine();

// Simulate clicks from across India on Ayushman Bharat link
const ayushmanCode = "aBhrt01";
const indianStates = ["Maharashtra", "UP", "Bihar", "Tamil Nadu", "Karnataka", "Gujarat", "Rajasthan"];
const devices = ["Android", "Android", "Android", "JioPhone", "iPhone", "Desktop"];
const referrers = ["sms", "sms", "whatsapp", "whatsapp", "twitter", "direct"];

// Generate 200 simulated clicks
for (let i = 0; i < 200; i++) {
  analytics.recordClick(ayushmanCode, {
    timestamp: Date.now() - Math.random() * 86400000,
    state: indianStates[Math.floor(Math.random() * indianStates.length)],
    device: devices[Math.floor(Math.random() * devices.length)],
    referrer: referrers[Math.floor(Math.random() * referrers.length)],
    city: "City_" + Math.floor(Math.random() * 50)
  });
}

const report = analytics.getAnalytics(ayushmanCode);
console.log(`Analytics for pmgo.in/${ayushmanCode} (Ayushman Bharat):`);
console.log(`  Total clicks: ${report.totalClicks}`);
console.log("\n  Clicks by State:");
Object.entries(report.byState)
  .sort((a, b) => b[1] - a[1])
  .forEach(([state, count]) => {
    const bar = "#".repeat(Math.round(count / 3));
    console.log(`    ${state.padEnd(15)} ${String(count).padStart(4)} ${bar}`);
  });

console.log("\n  Clicks by Referrer:");
Object.entries(report.byReferrer)
  .sort((a, b) => b[1] - a[1])
  .forEach(([ref, count]) => {
    console.log(`    ${ref.padEnd(15)} ${count}`);
  });

console.log("\n  Clicks by Device:");
Object.entries(report.byDevice)
  .sort((a, b) => b[1] - a[1])
  .forEach(([dev, count]) => {
    console.log(`    ${dev.padEnd(15)} ${count}`);
  });

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Caching Hot URLs
// ════════════════════════════════════════════════════════════════

// WHY: When PM tweets a link, millions hit it simultaneously — cache saves DB.

console.log("SECTION 7 — Caching Hot URLs");
console.log("-".repeat(50));

class URLCache {
  constructor(maxSize = 1000, ttlMs = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.hits = 0;
    this.misses = 0;
  }

  get(shortCode) {
    const entry = this.cache.get(shortCode);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(shortCode);
      this.misses++;
      return null;
    }
    // Move to end (LRU behavior)
    this.cache.delete(shortCode);
    this.cache.set(shortCode, { ...entry, lastAccess: Date.now() });
    this.hits++;
    return entry.longUrl;
  }

  set(shortCode, longUrl) {
    // Evict oldest if full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(shortCode, {
      longUrl,
      expiresAt: Date.now() + this.ttlMs,
      lastAccess: Date.now()
    });
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(1) + "%" : "N/A"
    };
  }
}

const urlCache = new URLCache(100, 30000); // 100 entries, 30s TTL

// Simulate cache behavior for PM-KISAN link
const pmkisanCode = "pmKsn01";
const pmkisanUrl = "https://www.pmkisan.gov.in/beneficiary-status-check";
urlCache.set(pmkisanCode, pmkisanUrl);

console.log("Cache simulation (PM-KISAN link after PM tweet):");

// 50 requests — first is a set, rest should be hits
for (let i = 0; i < 50; i++) {
  const result = urlCache.get(pmkisanCode);
  if (i < 3 || i === 49) {
    console.log(`  Request ${(i + 1).toString().padStart(2)}: ${result ? "CACHE HIT" : "CACHE MISS"}`);
  } else if (i === 3) {
    console.log(`  ... (${46} more requests) ...`);
  }
}

// Try a miss
urlCache.get("nonExistentCode");

const cacheStats = urlCache.getStats();
console.log(`\n  Cache Stats:`);
console.log(`    Size: ${cacheStats.size}, Hits: ${cacheStats.hits}, Misses: ${cacheStats.misses}`);
console.log(`    Hit Rate: ${cacheStats.hitRate}`);
// Output: Very high hit rate for hot URLs

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — TTL and URL Expiration
// ════════════════════════════════════════════════════════════════

// WHY: Campaign URLs should expire, permanent government URLs should not.

console.log("SECTION 8 — TTL and URL Expiration");
console.log("-".repeat(50));

class URLStore {
  constructor() {
    this.urls = new Map();
    this.base62 = new Base62();
    this.counter = 1000000;
  }

  create(longUrl, options = {}) {
    this.counter++;
    const shortCode = options.customCode || this.base62.encodePadded(this.counter);
    const now = Date.now();

    this.urls.set(shortCode, {
      longUrl,
      shortCode,
      createdAt: now,
      expiresAt: options.ttlMs ? now + options.ttlMs : null, // null = never expires
      isActive: true,
      createdBy: options.createdBy || "system",
      clickCount: 0
    });

    return shortCode;
  }

  resolve(shortCode) {
    const entry = this.urls.get(shortCode);
    if (!entry) return { found: false, reason: "not_found" };
    if (!entry.isActive) return { found: false, reason: "deactivated" };
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      entry.isActive = false;
      return { found: false, reason: "expired" };
    }
    entry.clickCount++;
    return { found: true, longUrl: entry.longUrl, clickCount: entry.clickCount };
  }

  deactivate(shortCode) {
    const entry = this.urls.get(shortCode);
    if (entry) {
      entry.isActive = false;
      return true;
    }
    return false;
  }

  cleanup() {
    let removed = 0;
    const now = Date.now();
    for (const [code, entry] of this.urls) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.urls.delete(code);
        removed++;
      }
    }
    return removed;
  }

  getInfo(shortCode) {
    return this.urls.get(shortCode) || null;
  }
}

const store = new URLStore();

// Permanent government URL (no TTL)
const permanentCode = store.create(
  "https://www.pmjay.gov.in/ayushman-bharat",
  { createdBy: "PMO", customCode: "AyshBrt" }
);

// Campaign URL with 24-hour TTL
const campaignCode = store.create(
  "https://www.pmjay.gov.in/special-camp-2024",
  { createdBy: "Health Ministry", ttlMs: 100 } // 100ms for demo (would be 86400000 for 24h)
);

console.log("Permanent URL (Ayushman Bharat):");
let resolveResult = store.resolve(permanentCode);
console.log(`  Code: ${permanentCode}, Active: ${resolveResult.found}, URL: ${resolveResult.longUrl}`);

console.log("\nCampaign URL (Special Camp — 100ms TTL):");
resolveResult = store.resolve(campaignCode);
console.log(`  Immediately: Active = ${resolveResult.found}`);

// Wait for expiry simulation
const waitStart = Date.now();
while (Date.now() - waitStart < 150) { /* busy wait for demo */ }

resolveResult = store.resolve(campaignCode);
console.log(`  After 150ms: Active = ${resolveResult.found}, Reason = ${resolveResult.reason}`);
// Output: expired

// Cleanup
const removedCount = store.cleanup();
console.log(`\n  Cleanup removed ${removedCount} expired URL(s)`);

// Manual deactivation
console.log("\n  Deactivating a URL manually:");
store.deactivate(permanentCode);
resolveResult = store.resolve(permanentCode);
console.log(`  After deactivation: Active = ${resolveResult.found}, Reason = ${resolveResult.reason}`);

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 9 — Full System Simulation
// ════════════════════════════════════════════════════════════════

// WHY: Putting it all together shows how components interact in production.

console.log("SECTION 9 — Full System Simulation");
console.log("-".repeat(50));

class URLShortenerSystem {
  constructor() {
    this.store = new URLStore();
    this.cache = new URLCache(1000, 60000);
    this.analytics = new AnalyticsEngine();
    this.redirectCount = 0;
  }

  createShortUrl(longUrl, options = {}) {
    const shortCode = this.store.create(longUrl, options);
    console.log(`  [CREATE] pmgo.in/${shortCode} -> ${longUrl.substring(0, 50)}...`);
    return shortCode;
  }

  handleRequest(shortCode, requestMeta = {}) {
    this.redirectCount++;

    // Step 1: Check cache
    const cached = this.cache.get(shortCode);
    if (cached) {
      this.analytics.recordClick(shortCode, requestMeta);
      return { status: 302, longUrl: cached, source: "cache" };
    }

    // Step 2: Check store
    const result = this.store.resolve(shortCode);
    if (!result.found) {
      return { status: 404, reason: result.reason, source: "store" };
    }

    // Step 3: Populate cache
    this.cache.set(shortCode, result.longUrl);

    // Step 4: Record analytics
    this.analytics.recordClick(shortCode, requestMeta);

    return { status: 302, longUrl: result.longUrl, source: "store" };
  }

  getSystemStats() {
    const cacheStats = this.cache.getStats();
    return {
      totalRedirects: this.redirectCount,
      urlsInStore: this.store.urls.size,
      cacheSize: cacheStats.size,
      cacheHitRate: cacheStats.hitRate
    };
  }
}

const system = new URLShortenerSystem();

// Create government scheme URLs
console.log("Creating government scheme URLs:\n");
const schemes = [
  { url: "https://www.pmjay.gov.in/registration-2024", name: "Ayushman Bharat" },
  { url: "https://www.pmkisan.gov.in/new-registration", name: "PM-KISAN" },
  { url: "https://digitalindia.gov.in/bharat-net", name: "Digital India" },
  { url: "https://pmfby.gov.in/apply-crop-insurance", name: "PM Fasal Bima" },
  { url: "https://ujjwala.gov.in/apply", name: "PM Ujjwala" }
];

const shortCodes = schemes.map(s =>
  system.createShortUrl(s.url, { createdBy: "PMO" })
);

// Simulate 500 requests across all URLs
console.log("\nSimulating 500 citizen requests across India...\n");
const states = ["UP", "Maharashtra", "Bihar", "MP", "Rajasthan", "Gujarat", "TN", "Karnataka"];
const devicesArr = ["Android", "JioPhone", "iPhone", "Desktop"];
const refArr = ["sms", "whatsapp", "twitter", "direct", "google"];

for (let i = 0; i < 500; i++) {
  const codeIdx = Math.floor(Math.random() * shortCodes.length);
  const code = shortCodes[codeIdx];
  system.handleRequest(code, {
    state: states[Math.floor(Math.random() * states.length)],
    device: devicesArr[Math.floor(Math.random() * devicesArr.length)],
    referrer: refArr[Math.floor(Math.random() * refArr.length)],
    timestamp: Date.now()
  });
}

const sysStats = system.getSystemStats();
console.log("System Statistics After Simulation:");
console.log(`  Total Redirects:  ${sysStats.totalRedirects}`);
console.log(`  URLs in Store:    ${sysStats.urlsInStore}`);
console.log(`  Cache Size:       ${sysStats.cacheSize}`);
console.log(`  Cache Hit Rate:   ${sysStats.cacheHitRate}`);

// Show analytics for first scheme
console.log(`\nAnalytics for "${schemes[0].name}" (${shortCodes[0]}):`);
const schemeAnalytics = system.analytics.getAnalytics(shortCodes[0]);
console.log(`  Total Clicks: ${schemeAnalytics.totalClicks}`);
console.log("  By State:");
Object.entries(schemeAnalytics.byState)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .forEach(([state, count]) => {
    console.log(`    ${state.padEnd(15)} ${count}`);
  });

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 10 — Scalability Considerations
// ════════════════════════════════════════════════════════════════

// WHY: A production URL shortener must handle billions of redirects.

console.log("SECTION 10 — Scalability Considerations");
console.log("-".repeat(50));

class RangeAllocator {
  constructor(rangeSize = 1000000) {
    this.rangeSize = rangeSize;
    this.nextStart = 0;
    this.allocations = [];
  }

  allocateRange(serverId) {
    const start = this.nextStart;
    const end = start + this.rangeSize - 1;
    this.nextStart = end + 1;
    this.allocations.push({ serverId, start, end });
    return { start, end };
  }

  showAllocations() {
    console.log("  Range Allocations (for distributed counter):");
    this.allocations.forEach(a => {
      const base62 = new Base62();
      console.log(`    Server ${a.serverId}: ${a.start.toLocaleString()} - ${a.end.toLocaleString()} (${base62.encode(a.start)} - ${base62.encode(a.end)})`);
    });
  }
}

const allocator = new RangeAllocator(1000000);

// 5 server instances each get their own counter range
for (let i = 1; i <= 5; i++) {
  allocator.allocateRange(`app-server-${i}`);
}
allocator.showAllocations();

console.log("\n  Database Sharding Strategy:");
console.log("    Shard by first character of short code");
console.log("    62 possible shards (a-z, A-Z, 0-9)");
console.log("    Each shard handles ~1/62 of total traffic");

console.log("\n  Caching Layer:");
console.log("    L1: Application-level LRU cache (per-server)");
console.log("    L2: Redis cluster (shared cache)");
console.log("    L3: Database (PostgreSQL or DynamoDB)");

console.log("\n  Read Path (optimized for speed):");
console.log("    Client -> CDN -> Load Balancer -> Cache -> DB");
console.log("    99% of requests served from cache");

console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log();
console.log("  1. Base62 encoding converts numeric IDs to URL-safe short strings");
console.log("  2. Counter-based: zero collisions but predictable; hash-based: unpredictable but may collide");
console.log("  3. Use 302 redirects for analytics tracking, 301 for permanent static URLs");
console.log("  4. Cache hot URLs aggressively — PM tweets can cause thundering herd");
console.log("  5. TTL enables campaign URLs that auto-expire after events end");
console.log("  6. Analytics by state/device/referrer helps policy teams measure scheme reach");
console.log("  7. Range-based counter allocation eliminates coordination between servers");
console.log("  8. 7-char Base62 gives 3.5 trillion possible URLs — enough for decades");
console.log();
console.log('  "A short URL is a promise — it must always redirect correctly,');
console.log('   track honestly, and expire gracefully." — PMO Digital Team');
console.log();
