/**
 * ============================================================
 *  FILE 16 : India Post — Publish-Subscribe Pattern
 *  Topic   : Publish-Subscribe, Event Bus, Message Broker
 *  WHY THIS MATTERS:
 *    Pub/Sub decouples senders from receivers through a broker.
 *    Unlike Observer, neither side knows the other exists —
 *    they only know about topics. This is the backbone of
 *    event-driven architectures and message queues.
 * ============================================================
 */

// STORY: Postmaster Lakshmi runs the local India Post office. Residents subscribe
// to dak categories they care about (speed post, registered, money order), and anyone
// can publish a chithi to a topic. Lakshmi routes every dak — senders and receivers
// never meet directly, the post office sorts by pincode and parcel type.

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Pub/Sub vs Observer (decoupled via broker)
// ────────────────────────────────────────────────────────────

// WHY: In Observer, the subject knows its observers directly.
// In Pub/Sub, a broker sits in the middle — full decoupling.

console.log("=== BLOCK 1: Pub/Sub vs Observer ===");

// Observer (for contrast): subject holds direct references
class WeatherStation {
  constructor() { this.observers = []; }
  addObserver(obs) { this.observers.push(obs); }
  notify(temp) { this.observers.forEach(obs => obs.update(temp)); }
}
const station = new WeatherStation();
station.addObserver({ update: (t) => console.log(`  Observer got temp: ${t}C`) });
station.notify(42); // Output:   Observer got temp: 42C

// WHY: Above, station KNOWS each observer. Tight coupling.
// Pub/Sub removes that via a broker (Lakshmi's India Post office).

class IndiaPostOffice {
  constructor(name) { this.name = name; this.topics = {}; }
  subscribe(topic, cb) {
    if (!this.topics[topic]) this.topics[topic] = [];
    this.topics[topic].push(cb);
    // WHY: Subscribers register by TOPIC (pincode/parcel type), not by sender identity
  }
  publish(topic, message) {
    if (!this.topics[topic]) return;
    this.topics[topic].forEach(cb => cb(message));
  }
  unsubscribe(topic, cb) {
    if (!this.topics[topic]) return;
    this.topics[topic] = this.topics[topic].filter(fn => fn !== cb);
  }
}

const lakshmiOffice = new IndiaPostOffice("Lakshmi's India Post Office");
const sureshHandler = (msg) => console.log(`  Suresh received: ${msg}`);
lakshmiOffice.subscribe("speed-post", sureshHandler);
lakshmiOffice.subscribe("speed-post", (msg) => console.log(`  Meena received: ${msg}`));
lakshmiOffice.subscribe("money-order", (msg) => console.log(`  Kavitha received: ${msg}`));

console.log("Lakshmi delivers speed post dak:");
lakshmiOffice.publish("speed-post", "Parcel from Chennai, pincode 600001");
// Output:   Suresh received: Parcel from Chennai, pincode 600001
// Output:   Meena received: Parcel from Chennai, pincode 600001
console.log("Lakshmi delivers money order dak:");
lakshmiOffice.publish("money-order", "₹5000 money order from Varanasi"); // Output:   Kavitha received: ₹5000 money order from Varanasi
lakshmiOffice.unsubscribe("speed-post", sureshHandler);
console.log("After Suresh unsubscribes from speed post:");
lakshmiOffice.publish("speed-post", "Registered letter from Mumbai, pincode 400001"); // Output:   Meena received: Registered letter from Mumbai, pincode 400001

// ────────────────────────────────────────────────────────────
// BLOCK 2 — Event Bus (global message bus for decoupled modules)
// ────────────────────────────────────────────────────────────

// WHY: An Event Bus is a singleton Pub/Sub shared across an app.
// Modules communicate without importing each other — like a central sorting office.

console.log("\n=== BLOCK 2: Event Bus ===");

const CentralSortingOffice = (() => {
  const topics = {};
  let idCounter = 0;
  return {
    subscribe(topic, cb) {
      if (!topics[topic]) topics[topic] = {};
      const id = ++idCounter;
      topics[topic][id] = cb;
      // WHY: Return an ID so callers can unsubscribe without keeping a reference
      return id;
    },
    publish(topic, data) {
      if (!topics[topic]) return;
      Object.values(topics[topic]).forEach(cb => cb(data));
    },
    unsubscribe(topic, id) {
      if (topics[topic] && topics[topic][id]) { delete topics[topic][id]; return true; }
      return false;
    }
  };
})();

function authModule() {
  console.log("  Auth: postmaster logged in as Lakshmi"); // Output:   Auth: postmaster logged in as Lakshmi
  CentralSortingOffice.publish("postmaster:login", { username: "Lakshmi", role: "postmaster" });
}
const dashSub = CentralSortingOffice.subscribe("postmaster:login", (user) => {
  console.log(`  Dashboard: Welcome back, ${user.username}!`);
});
CentralSortingOffice.subscribe("postmaster:login", (user) => {
  console.log(`  Analytics: Tracked login for ${user.username}`);
});
authModule();
// Output:   Dashboard: Welcome back, Lakshmi!
// Output:   Analytics: Tracked login for Lakshmi
CentralSortingOffice.unsubscribe("postmaster:login", dashSub);
console.log("After dashboard unsubscribes:");
CentralSortingOffice.publish("postmaster:login", { username: "Lakshmi", role: "postmaster" });
// Output:   Analytics: Tracked login for Lakshmi

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Namespaced events, wildcards, async handling
// ────────────────────────────────────────────────────────────

// WHY: Real systems need hierarchical events, wildcard matching,
// and async subscribers for I/O-bound side effects.

console.log("\n=== BLOCK 3: Advanced Pub/Sub ===");

class AdvancedIndiaPost {
  constructor() { this.subscriptions = []; }
  subscribe(pattern, cb) { this.subscriptions.push({ pattern, cb }); }
  _matches(pattern, topic) {
    if (pattern === topic) return true;
    const pp = pattern.split(":"), tp = topic.split(":");
    // WHY: "**" matches any depth, "*" matches one segment
    if (pp.includes("**")) {
      const idx = pp.indexOf("**");
      for (let i = 0; i < idx; i++) { if (pp[i] !== "*" && pp[i] !== tp[i]) return false; }
      return true;
    }
    if (pp.length !== tp.length) return false;
    return pp.every((p, i) => p === "*" || p === tp[i]);
  }
  publish(topic, data) {
    const matched = this.subscriptions.filter(s => this._matches(s.pattern, topic));
    return Promise.all(matched.map(s => Promise.resolve(s.cb(data, topic))));
  }
}

const adv = new AdvancedIndiaPost();
adv.subscribe("dak:delivered", (d, t) => console.log(`  [${t}] Chithi to ${d.to} arrived`));
adv.subscribe("dak:returned", (d, t) => console.log(`  [${t}] Chithi to ${d.to} bounced back`));
adv.subscribe("dak:*", (d, t) => console.log(`  [dak:*] Lakshmi logged event "${t}"`));
adv.subscribe("**", (d, t) => console.log(`  [**] Audit: event "${t}" fired`));
adv.subscribe("dak:delivered", async (d) => {
  await new Promise(r => setTimeout(r, 10));
  console.log(`  [async] Delivery confirmation sent for ${d.to}`);
});

async function runAdvancedDemo() {
  console.log("Publishing dak:delivered...");
  await adv.publish("dak:delivered", { to: "Suresh", from: "Meena" });
  // Output: Publishing dak:delivered...
  // Output:   [dak:delivered] Chithi to Suresh arrived
  // Output:   [dak:*] Lakshmi logged event "dak:delivered"
  // Output:   [**] Audit: event "dak:delivered" fired
  // Output:   [async] Delivery confirmation sent for Suresh
  console.log("Publishing dak:returned...");
  await adv.publish("dak:returned", { to: "Priya", from: "Ramesh" });
  // Output: Publishing dak:returned...
  // Output:   [dak:returned] Chithi to Priya bounced back
  // Output:   [dak:*] Lakshmi logged event "dak:returned"
  // Output:   [**] Audit: event "dak:returned" fired
  console.log("Publishing system:shutdown...");
  await adv.publish("system:shutdown", {});
  // Output: Publishing system:shutdown...
  // Output:   [**] Audit: event "system:shutdown" fired

  // ────────────────────────────────────────────────────────────
  // KEY TAKEAWAYS
  // ────────────────────────────────────────────────────────────
  console.log("\n=== KEY TAKEAWAYS ===");
  console.log("1. Pub/Sub decouples via a broker (India Post) — senders and receivers never reference each other"); // Output: 1. Pub/Sub decouples via a broker (India Post) — senders and receivers never reference each other
  console.log("2. A Central Sorting Office (Event Bus) is a singleton Pub/Sub shared across modules"); // Output: 2. A Central Sorting Office (Event Bus) is a singleton Pub/Sub shared across modules
  console.log("3. Namespaced topics (e.g., dak:delivered) organize events hierarchically like pincodes"); // Output: 3. Namespaced topics (e.g., dak:delivered) organize events hierarchically like pincodes
  console.log("4. Wildcard subscriptions let you observe broad dak categories (speed post, registered, all)"); // Output: 4. Wildcard subscriptions let you observe broad dak categories (speed post, registered, all)
  console.log("5. Async subscribers handle I/O-bound side effects like delivery confirmations"); // Output: 5. Async subscribers handle I/O-bound side effects like delivery confirmations
}
runAdvancedDemo();
