/**
 * ============================================================
 *  FILE 15 : The Observer Pattern
 *  Topic   : Observer, Event Emitter
 *  WHY THIS MATTERS:
 *    The Observer pattern defines a one-to-many dependency:
 *    when one object (the subject) changes, all its dependents
 *    (observers) are notified automatically. This is the
 *    backbone of event-driven programming — from DOM events to
 *    Node.js streams to reactive frameworks.
 * ============================================================
 */

// STORY: Govind is the Nukkad Chaiwala. He stands at his tapri
// on the street corner and shouts "Chai ready!" All subscribed
// regulars come running. Anyone can unsubscribe at any time, and
// Govind never needs to know who his listeners are in advance.

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Classic Observer (Subject with subscribe/unsubscribe/notify)
// ────────────────────────────────────────────────────────────

// WHY: The Subject maintains a list of observers and notifies
// them when state changes. Observers register themselves — the
// Subject is decoupled from concrete observer classes.

class NukkadChaiwala {
  constructor(name) {
    this.name = name;
    this.subscribers = [];
  }

  subscribe(fn) {
    this.subscribers.push(fn);
  }

  unsubscribe(fn) {
    this.subscribers = this.subscribers.filter((s) => s !== fn);
  }

  notify(announcement) {
    this.subscribers.forEach((fn) => fn(announcement));
  }
}

console.log("=== BLOCK 1: Classic Observer ===");
const govind = new NukkadChaiwala("Govind");

// WHY: Each regular is just a callback — no interface to implement.
const regularLog = [];

const shopkeeper = (announcement) => regularLog.push(`Shopkeeper heard: ${announcement}`);
const autoDriver = (announcement) => regularLog.push(`Auto Driver heard: ${announcement}`);
const watchman = (announcement) => regularLog.push(`Watchman heard: ${announcement}`);

govind.subscribe(shopkeeper);
govind.subscribe(autoDriver);
govind.subscribe(watchman);

govind.notify("Masala chai ready!");
console.log(regularLog[0]); // Output: Shopkeeper heard: Masala chai ready!
console.log(regularLog[1]); // Output: Auto Driver heard: Masala chai ready!
console.log(regularLog[2]); // Output: Watchman heard: Masala chai ready!

// WHY: Unsubscribe removes the observer — no more notifications.
govind.unsubscribe(autoDriver);
regularLog.length = 0;

govind.notify("Cutting chai ready!");
console.log(regularLog[0]); // Output: Shopkeeper heard: Cutting chai ready!
console.log(regularLog[1]); // Output: Watchman heard: Cutting chai ready!
console.log(`Active subscribers: ${govind.subscribers.length}`); // Output: Active subscribers: 2

// ────────────────────────────────────────────────────────────
// BLOCK 2 — Node.js EventEmitter Pattern
// ────────────────────────────────────────────────────────────

// WHY: Node.js EventEmitter is the Observer pattern with named
// events. We build a minimal version: on, off, emit, once.

class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
    return this;
  }

  off(event, listener) {
    if (!this.events[event]) return this;
    this.events[event] = this.events[event].filter((l) => l !== listener);
    return this;
  }

  // WHY: once wraps the listener so it auto-removes after first call.
  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
    return this;
  }

  emit(event, ...args) {
    if (!this.events[event]) return false;
    this.events[event].forEach((listener) => listener(...args));
    return true;
  }

  listenerCount(event) {
    return (this.events[event] || []).length;
  }
}

console.log("\n=== BLOCK 2: EventEmitter Pattern ===");
const tapri = new EventEmitter();

// WHY: Govind's chai tapri bell emits named events — regulars
// listen to specific categories of announcements.
tapri.on("chai:ready", (type) => {
  console.log(`Shopkeeper received chai: ${type}`);
});

tapri.on("samosa:ready", (update) => {
  console.log(`Auto Driver received samosa: ${update}`);
});

// once listener — fires only one time
tapri.once("special:offer", (msg) => {
  console.log(`Watchman received special: ${msg}`);
});

tapri.emit("chai:ready", "Adrak wali chai brewing");
// Output: Shopkeeper received chai: Adrak wali chai brewing

tapri.emit("samosa:ready", "Hot samosas out of the kadhai");
// Output: Auto Driver received samosa: Hot samosas out of the kadhai

tapri.emit("special:offer", "Bun maska at half price!");
// Output: Watchman received special: Bun maska at half price!

// WHY: The once listener already removed itself.
tapri.emit("special:offer", "Another offer!");
// (no output — watchman listener was removed after first call)

console.log(`Chai listeners: ${tapri.listenerCount("chai:ready")}`);       // Output: Chai listeners: 1
console.log(`Special listeners: ${tapri.listenerCount("special:offer")}`); // Output: Special listeners: 0

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Custom Event Bus & DOM-style Observer
// ────────────────────────────────────────────────────────────

// WHY: A global event bus decouples modules that never import
// each other. Module A emits; Module B listens. This is how
// DOM addEventListener works — we simulate it here.

class EventBus {
  constructor() {
    this.channels = new Map();
  }

  addEventListener(event, handler) {
    if (!this.channels.has(event)) this.channels.set(event, []);
    this.channels.get(event).push(handler);
  }

  removeEventListener(event, handler) {
    if (!this.channels.has(event)) return;
    const handlers = this.channels.get(event).filter((h) => h !== handler);
    this.channels.set(event, handlers);
  }

  dispatchEvent(event, detail) {
    if (!this.channels.has(event)) return;
    const eventObj = { type: event, detail, timestamp: Date.now() };
    this.channels.get(event).forEach((handler) => handler(eventObj));
  }
}

console.log("\n=== BLOCK 3: Event Bus & DOM-style Observer ===");
const bus = new EventBus();

// WHY: Modules communicate through the bus without direct imports.
// Govind's nukkad is the bus — regulars gather and listen for topics.

const tapriLog = [];

bus.addEventListener("chai:ready", (e) => {
  tapriLog.push(`Shopkeeper module: ${e.detail.name} ordered chai`);
});

bus.addEventListener("chai:ready", (e) => {
  tapriLog.push(`Ledger: tracking chai order for ${e.detail.name}`);
});

bus.addEventListener("samosa:ready", (e) => {
  tapriLog.push(`Kitchen: frying batch #${e.detail.batchId}`);
});

bus.addEventListener("samosa:ready", (e) => {
  tapriLog.push(`Announcement: samosa batch #${e.detail.batchId} is ready`);
});

bus.dispatchEvent("chai:ready", { name: "Govind" });
console.log(tapriLog[0]); // Output: Shopkeeper module: Govind ordered chai
console.log(tapriLog[1]); // Output: Ledger: tracking chai order for Govind

bus.dispatchEvent("samosa:ready", { batchId: 42 });
console.log(tapriLog[2]); // Output: Kitchen: frying batch #42
console.log(tapriLog[3]); // Output: Announcement: samosa batch #42 is ready

// WHY: removeEventListener mirrors DOM behavior.
const tracker = (e) => tapriLog.push(`Tracker: ${e.detail}`);
bus.addEventListener("tapri:visit", tracker);
bus.dispatchEvent("tapri:visit", "/nukkad");
console.log(tapriLog[4]); // Output: Tracker: /nukkad

bus.removeEventListener("tapri:visit", tracker);
bus.dispatchEvent("tapri:visit", "/chauraha");
// (no output — tracker was removed)

console.log(`Total events dispatched and logged: ${tapriLog.length}`); // Output: Total events dispatched and logged: 5

// WHY: The event object carries metadata just like DOM events.
let capturedEvent = null;
bus.addEventListener("test", (e) => { capturedEvent = e; });
bus.dispatchEvent("test", "hello");
console.log(`Event type: ${capturedEvent.type}`);          // Output: Event type: test
console.log(`Event detail: ${capturedEvent.detail}`);      // Output: Event detail: hello
console.log(`Has timestamp: ${typeof capturedEvent.timestamp === "number"}`); // Output: Has timestamp: true

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Observer defines a one-to-many dependency: subject changes,
//    all observers get notified automatically.
// 2. EventEmitter (on/off/emit/once) is Node's flavor of Observer.
// 3. An Event Bus decouples modules — producers and consumers
//    never import each other.
// 4. DOM addEventListener/removeEventListener IS the Observer
//    pattern in the browser.
// 5. Govind the Nukkad Chaiwala broadcasts without knowing his
//    regulars — that is the power of Observer.
