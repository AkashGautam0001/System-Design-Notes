/**
 * ============================================================
 *  FILE 2 : Rajdhani Station Master Clock - Singleton Pattern
 *  Topic  : Singleton, Object Literal Singleton, Lazy Singleton
 *  WHY THIS MATTERS:
 *    Some resources must exist exactly once — a database pool,
 *    a configuration store, a logger.  The Singleton pattern
 *    ensures a single shared instance.  But misuse leads to
 *    hidden dependencies and hard-to-test code.  Knowing WHEN
 *    to use it is as important as knowing HOW.
 * ============================================================
 */

// STORY: Station Master Verma ensures there is only ONE master
//        clock at Mughalsarai Junction.  Every platform must
//        show the same time from that single clock.

console.log("=== FILE 02: Rajdhani Station Master Clock ===\n");

// ────────────────────────────────────
// BLOCK 1 — Object Literal & Closure-Based Singleton
// ────────────────────────────────────

// WHY: The simplest singleton is an object literal.  Since objects
//      are reference types, every variable that holds this object
//      points to the SAME instance.

const StationClock = {
  _hour: 12,
  _minute: 0,

  tick() {
    this._minute += 1;
    if (this._minute >= 60) {
      this._minute = 0;
      this._hour = (this._hour % 12) + 1;
    }
  },

  time() {
    const h = String(this._hour).padStart(2, "0");
    const m = String(this._minute).padStart(2, "0");
    return `${h}:${m}`;
  },
};

console.log("Verma checks:", StationClock.time());    // Output: Verma checks: 12:00
StationClock.tick();
StationClock.tick();
console.log("After 2 ticks:", StationClock.time());   // Output: After 2 ticks: 12:02

// WHY: Both references point to the same object.
const platform1 = StationClock;
const platform2 = StationClock;
console.log("Same instance?", platform1 === platform2); // Output: Same instance? true

// Closure-based singleton with private state
console.log("\n--- Closure Singleton ---");

const StationBell = (function () {
  let ringCount = 0;

  // WHY: The closure hides `ringCount`.  The returned object is
  //      the sole public interface — a singleton by construction.
  const instance = {
    ring() {
      ringCount++;
      return `Verma rings station bell #${ringCount}`;
    },
    total() {
      return ringCount;
    },
  };

  return instance;
})();

console.log(StationBell.ring());           // Output: Verma rings station bell #1
console.log(StationBell.ring());           // Output: Verma rings station bell #2
console.log("Total rings:", StationBell.total()); // Output: Total rings: 2

// ────────────────────────────────────
// BLOCK 2 — Class-Based Singleton with Lazy Initialisation
// ────────────────────────────────────

// WHY: Sometimes you need a class (for instanceof checks, inheritance,
//      or IDE autocompletion) but still want exactly one instance.
//      Lazy initialisation means the instance is created only when
//      first requested — like the clock activating only when the
//      first train arrives.

console.log("\n--- Class-Based Lazy Singleton ---");

class ClockMechanism {
  constructor() {
    if (ClockMechanism._instance) {
      return ClockMechanism._instance;
    }
    // WHY: First call — initialise the one true instance.
    this.gears = 42;
    this.wound = false;
    ClockMechanism._instance = this;
  }

  wind() {
    this.wound = true;
    return "Verma winds the mechanism";
  }

  status() {
    return `Gears: ${this.gears}, Wound: ${this.wound}`;
  }

  // WHY: A static accessor makes the singleton intent explicit.
  static getInstance() {
    if (!ClockMechanism._instance) {
      new ClockMechanism();
    }
    return ClockMechanism._instance;
  }
}

ClockMechanism._instance = null;

const mech1 = new ClockMechanism();
const mech2 = new ClockMechanism();
console.log("Same mechanism?", mech1 === mech2);      // Output: Same mechanism? true

mech1.wind();
console.log("mech2 status:", mech2.status());          // Output: mech2 status: Gears: 42, Wound: true

const mech3 = ClockMechanism.getInstance();
console.log("getInstance same?", mech3 === mech1);    // Output: getInstance same? true

// Lazy variant: instance only created on first getInstance call
console.log("\n--- Lazy Singleton ---");

class AnnouncementSystem {
  constructor(volume) {
    this.volume = volume;
    this.armed = false;
  }

  arm() {
    this.armed = true;
    return `Announcement system armed at volume ${this.volume}`;
  }

  static getInstance() {
    // WHY: The instance is created lazily — only when the first
    //      train arrives and the announcement is needed.
    if (!AnnouncementSystem._instance) {
      AnnouncementSystem._instance = new AnnouncementSystem(11);
      console.log("Verma activates the announcement system");   // Output: Verma activates the announcement system
    }
    return AnnouncementSystem._instance;
  }
}

AnnouncementSystem._instance = null;

const announce = AnnouncementSystem.getInstance();
console.log(announce.arm());                                     // Output: Announcement system armed at volume 11
const announce2 = AnnouncementSystem.getInstance();              // no activation message — already exists
console.log("Same system?", announce === announce2);             // Output: Same system? true

// ────────────────────────────────────
// BLOCK 3 — Pitfalls and Module-Level Singleton
// ────────────────────────────────────

// WHY: Singletons can make testing painful because they carry state
//      between tests.  They also create hidden dependencies — code
//      that silently relies on a global instance.

console.log("\n--- Singleton Pitfalls ---");

// Pitfall 1: Hidden dependency
class Logger {
  constructor() {
    this.entries = [];
  }
  log(msg) {
    this.entries.push(msg);
  }
  dump() {
    return this.entries.slice();
  }
}

const globalLogger = new Logger();

function processTrainArrival(train) {
  // WHY: `globalLogger` is a hidden dependency — the function
  //      signature does not reveal it.  Testing requires resetting
  //      or mocking the global.  This is the #1 singleton pitfall.
  globalLogger.log(`Processing ${train}`);
  return `Arrival: ${train}`;
}

console.log(processTrainArrival("Rajdhani Express"));          // Output: Arrival: Rajdhani Express
console.log("Hidden log:", globalLogger.dump());               // Output: Hidden log: [ 'Processing Rajdhani Express' ]

// Pitfall 2: Hard to reset between tests
globalLogger.entries.length = 0; // manual reset — fragile!
console.log("After reset:", globalLogger.dump());              // Output: After reset: []

// Better approach: Module-level singleton (idiomatic JS)
console.log("\n--- Module-Level Singleton (Idiomatic) ---");

// WHY: In modern JS, each file IS a module with its own scope.
//      Exporting a single instance from a module gives you a
//      natural singleton — no class tricks needed.  We simulate
//      this here with a factory.

function createStationConfig() {
  const config = {
    platforms: 8,
    tracks: 12,
    junction: "Mughalsarai",
  };

  // WHY: Object.freeze prevents mutation — making this a true
  //      immutable singleton.  Config should rarely change at runtime.
  return Object.freeze(config);
}

const StationConfig = createStationConfig();

console.log("Platforms:", StationConfig.platforms);      // Output: Platforms: 8
console.log("Tracks:", StationConfig.tracks);            // Output: Tracks: 12

// Attempting mutation silently fails (or throws in strict mode)
StationConfig.platforms = 999;
console.log("Still 8?", StationConfig.platforms);        // Output: Still 8? 8

// ────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────
// 1. The simplest singleton is a plain object literal — no class needed.
// 2. Closure-based singletons keep state truly private.
// 3. Class-based singletons use a static `_instance` field and
//    return it from the constructor or a `getInstance()` method.
// 4. Lazy initialisation defers creation until first access — like
//    the station clock activating only when the first train arrives.
// 5. Singleton pitfalls: hidden dependencies, shared mutable state
//    that bleeds between tests, and tight coupling.
// 6. The idiomatic JS singleton is simply a module that exports
//    one instance.  Freeze it if it should be immutable.

console.log("\n=== Verma locks the cabin. The station clock keeps ticking. ===");
// Output: === Verma locks the cabin. The station clock keeps ticking. ===
