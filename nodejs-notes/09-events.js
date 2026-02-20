/** ============================================================
 FILE 9: The Event System — Node's Backbone
 ============================================================
 Topic: EventEmitter — on, emit, once, off, error, custom classes
 WHY THIS MATTERS:
   Almost everything in Node.js is built on events — streams,
   HTTP servers, child processes. Understanding EventEmitter
   is understanding the heartbeat of Node itself.
 ============================================================ */

// ============================================================
// STORY: RADIO MIRCHI 98.3 FM
//   Radio Mirchi is India's favourite FM station. DJs broadcast
//   Bollywood songs, listeners tune in on different shows, and
//   there is a special breaking news channel that must never
//   be ignored.
// ============================================================

const EventEmitter = require("events");

// ============================================================
// EXAMPLE BLOCK 1 — EventEmitter Basics
// ============================================================

console.log("=== BLOCK 1: EventEmitter Basics ===\n");

// ──────────────────────────────────────────────────────────────
// 1a — Creating an emitter and registering listeners
// ──────────────────────────────────────────────────────────────

const mirchi = new EventEmitter();

// .on() registers a persistent listener
mirchi.on("song", (title, artist) => {
  console.log(`  Now playing: "${title}" by ${artist}`);
});

// WHY: .on() keeps listening for every emission of that event.

mirchi.on("song", (title) => {
  console.log(`  [Logger] Logged song: ${title}`);
});

// .emit() fires the event and passes arguments to all listeners
mirchi.emit("song", "Chaiyya Chaiyya", "A.R. Rahman");
// Output: Now playing: "Chaiyya Chaiyya" by A.R. Rahman
// Output: [Logger] Logged song: Chaiyya Chaiyya

mirchi.emit("song", "Tum Hi Ho", "Arijit Singh");
// Output: Now playing: "Tum Hi Ho" by Arijit Singh
// Output: [Logger] Logged song: Tum Hi Ho

// ──────────────────────────────────────────────────────────────
// 1b — .once() fires only one time
// ──────────────────────────────────────────────────────────────

console.log("\n--- .once() demo ---");

const newsDesk = new EventEmitter();

newsDesk.once("breaking-news", (headline) => {
  console.log(`  BREAKING: ${headline}`);
});

// WHY: .once() is perfect for one-time setup events like
//   'ready', 'connected', or first-time initialization.

newsDesk.emit("breaking-news", "Chandrayaan-4 launched successfully!");
// Output: BREAKING: Chandrayaan-4 launched successfully!

newsDesk.emit("breaking-news", "This will NOT print");
// (no output — listener was removed after first call)

console.log("  Second emit produced no output (as expected)");

// ──────────────────────────────────────────────────────────────
// 1c — .off() / removeListener to unsubscribe
// ──────────────────────────────────────────────────────────────

console.log("\n--- .off() / removeListener demo ---");

const fm983 = new EventEmitter();

function weatherReport(temp) {
  console.log(`  Weather: ${temp}°C`);
}

fm983.on("weather", weatherReport);
fm983.emit("weather", 38);
// Output: Weather: 38°C

fm983.off("weather", weatherReport);
// WHY: .off() is an alias for .removeListener(). You must pass
//   the exact same function reference — anonymous functions
//   cannot be removed this way.

fm983.emit("weather", 42);
console.log("  After .off(), weather emit produced no output");

// ──────────────────────────────────────────────────────────────
// 1d — listenerCount() and eventNames()
// ──────────────────────────────────────────────────────────────

console.log("\n--- Introspection: listenerCount, eventNames ---");

const dashboard = new EventEmitter();
dashboard.on("click", () => {});
dashboard.on("click", () => {});
dashboard.on("hover", () => {});
dashboard.once("load", () => {});

console.log("  listenerCount('click'):", dashboard.listenerCount("click"));
// Output: listenerCount('click'): 2

console.log("  eventNames():", dashboard.eventNames());
// Output: eventNames(): [ 'click', 'hover', 'load' ]

// ============================================================
// EXAMPLE BLOCK 2 — Error Events and Listener Management
// ============================================================

console.log("\n=== BLOCK 2: Error Events & Listener Management ===\n");

// ──────────────────────────────────────────────────────────────
// 2a — The special 'error' event
// ──────────────────────────────────────────────────────────────

// WHY: If an EventEmitter emits 'error' and no listener is
//   registered, Node throws an unhandled exception and crashes.
//   Always handle the 'error' event.

const faultyTransmitter = new EventEmitter();

// Without a listener, emitting 'error' would crash the process.
// Let's demonstrate safely with try/catch:
try {
  faultyTransmitter.emit("error", new Error("Antenna disconnected at 98.3 MHz!"));
} catch (err) {
  console.log("  Caught unhandled error event:", err.message);
  // Output: Caught unhandled error event: Antenna disconnected at 98.3 MHz!
}

// The safe way — register an error listener:
const safeMirchi = new EventEmitter();
safeMirchi.on("error", (err) => {
  console.log("  [Error Handler] Gracefully caught:", err.message);
});

safeMirchi.emit("error", new Error("Signal lost on 98.3 MHz"));
// Output: [Error Handler] Gracefully caught: Signal lost on 98.3 MHz

// ──────────────────────────────────────────────────────────────
// 2b — prependListener() — cut to the front of the line
// ──────────────────────────────────────────────────────────────

console.log("\n--- prependListener demo ---");

const broadcast = new EventEmitter();

broadcast.on("signal", () => {
  console.log("  Listener A (added first)");
});

broadcast.prependListener("signal", () => {
  console.log("  Listener B (prepended — runs first!)");
});

// WHY: prependListener adds the handler to the beginning of
//   the listener array, so it fires before earlier-registered
//   listeners. Useful for middleware-style interceptors.

broadcast.emit("signal");
// Output: Listener B (prepended — runs first!)
// Output: Listener A (added first)

// ──────────────────────────────────────────────────────────────
// 2c — setMaxListeners() — memory leak warning control
// ──────────────────────────────────────────────────────────────

console.log("\n--- setMaxListeners demo ---");

const crowded = new EventEmitter();

// Default max is 10. Exceeding it prints a warning.
// If you legitimately need more, increase the limit:
crowded.setMaxListeners(20);

console.log("  Max listeners set to:", crowded.getMaxListeners());
// Output: Max listeners set to: 20

// WHY: The default limit of 10 is a safeguard against memory
//   leaks from accidentally adding listeners in a loop.
//   Increase it deliberately when you know you need more.

for (let i = 0; i < 15; i++) {
  crowded.on("tick", () => {});
}
console.log("  Added 15 listeners without warning (limit is 20)");
console.log("  Listener count for 'tick':", crowded.listenerCount("tick"));
// Output: Listener count for 'tick': 15

// ============================================================
// EXAMPLE BLOCK 3 — Extending EventEmitter in a Custom Class
// ============================================================

console.log("\n=== BLOCK 3: Custom Class Extending EventEmitter ===\n");

// ──────────────────────────────────────────────────────────────
// 3a — MirchiStation class — a real-world pattern
// ──────────────────────────────────────────────────────────────

// WHY: This is how most Node.js core modules work — streams,
//   HTTP servers, and sockets all extend EventEmitter.

class MirchiStation extends EventEmitter {
  constructor(name, frequency) {
    super(); // Must call super() to initialize EventEmitter
    this.name = name;
    this.frequency = frequency;
    this.isLive = false;
  }

  goLive() {
    this.isLive = true;
    this.emit("live", this.name, this.frequency);
  }

  broadcast(message) {
    if (!this.isLive) {
      this.emit("error", new Error(`${this.name} is not live yet!`));
      return;
    }
    this.emit("broadcast", { station: this.name, message });
  }

  subscribe(listenerName) {
    this.on("broadcast", (data) => {
      console.log(`    [${listenerName}] heard on ${this.frequency}: "${data.message}"`);
    });
    console.log(`  ${listenerName} subscribed to ${this.name}`);
  }

  signOff() {
    this.isLive = false;
    this.emit("off-air", this.name);
    this.removeAllListeners();
  }
}

// ──────────────────────────────────────────────────────────────
// 3b — Using the MirchiStation class
// ──────────────────────────────────────────────────────────────

const radioMirchi = new MirchiStation("Radio Mirchi", "98.3 MHz");

// Handle errors gracefully
radioMirchi.on("error", (err) => {
  console.log(`  [Station Error] ${err.message}`);
});

radioMirchi.on("live", (name, freq) => {
  console.log(`  ${name} is now LIVE on ${freq}!`);
});

radioMirchi.on("off-air", (name) => {
  console.log(`  ${name} has signed off. Alvida listeners!`);
});

// Subscribe listeners
radioMirchi.subscribe("Priya");
radioMirchi.subscribe("Arjun");

// Try broadcasting before going live
radioMirchi.broadcast("Test message");
// Output: [Station Error] Radio Mirchi is not live yet!

// Go live and broadcast
radioMirchi.goLive();
// Output: Radio Mirchi is now LIVE on 98.3 MHz!

radioMirchi.broadcast("Suniye Chaiyya Chaiyya, A.R. Rahman ke saath!");
// Output: [Priya] heard on 98.3 MHz: "Suniye Chaiyya Chaiyya, A.R. Rahman ke saath!"
// Output: [Arjun] heard on 98.3 MHz: "Suniye Chaiyya Chaiyya, A.R. Rahman ke saath!"

radioMirchi.broadcast("Next up: Tum Hi Ho by Arijit Singh");
// Output: [Priya] heard on 98.3 MHz: "Next up: Tum Hi Ho by Arijit Singh"
// Output: [Arjun] heard on 98.3 MHz: "Next up: Tum Hi Ho by Arijit Singh"

console.log("\n  Listeners before signOff:", radioMirchi.eventNames());
radioMirchi.signOff();
// Output: Radio Mirchi has signed off. Alvida listeners!

console.log("  Listeners after signOff:", radioMirchi.eventNames());
// Output: Listeners after signOff: []

// ──────────────────────────────────────────────────────────────
// 3c — Quick pattern: async event with once()
// ──────────────────────────────────────────────────────────────

console.log("\n--- Async pattern: events.once() ---");

const { once } = require("events");

async function waitForSignal() {
  const signalEmitter = new EventEmitter();

  // Schedule emission for next tick
  setTimeout(() => signalEmitter.emit("ready", "all systems go"), 50);

  const [message] = await once(signalEmitter, "ready");
  console.log(`  Received signal: ${message}`);
  // Output: Received signal: all systems go
}

waitForSignal().then(() => {
  // ============================================================
  // KEY TAKEAWAYS
  // ============================================================
  console.log("\n============================================================");
  console.log("KEY TAKEAWAYS");
  console.log("============================================================");
  console.log("1. EventEmitter is the foundation — .on() listens, .emit() fires.");
  console.log("2. .once() auto-removes after one call — great for init events.");
  console.log("3. .off() requires the same function reference to remove a listener.");
  console.log("4. Always handle the 'error' event or your process will crash.");
  console.log("5. prependListener() lets you jump ahead in the listener queue.");
  console.log("6. setMaxListeners() controls the memory-leak warning threshold.");
  console.log("7. Extend EventEmitter for custom classes — this is the Node way.");
  console.log("8. events.once() returns a promise — perfect for async/await.");
  console.log("============================================================\n");
});
