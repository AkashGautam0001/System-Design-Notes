// ============================================================
// FILE 20: CLOSURES
// Topic: Closures — what they are, how they work, and practical
//        patterns including privacy, factories, loop traps, and utilities
// WHY: Closures are the mechanism behind data privacy, factories,
//      memoization, and most callback patterns. They are one of the
//      most powerful (and most tested) concepts in JavaScript.
// ============================================================

// ============================================================
// EXAMPLE 1 — The Hawala Operator's Coded Ledger
// Story: Hawala operator Munna keeps a private ledger that only
// his trusted function can access. Even after the office closes,
// the function remembers the ledger.
// ============================================================

// WHY: A closure is a function bundled with its lexical environment.
// When a function is returned from another function, it retains
// access to the variables that were in scope when it was created.

// --- What Is a Closure? ---

function createHawalaChannel(secretCode) {
  // `secretCode` lives in createHawalaChannel's scope
  // The returned function "closes over" this variable

  return function verifyAgent(guess) {
    if (guess === secretCode) {
      return "Code MATCHED! Transaction approved.";
    }
    return "Wrong code. Transaction denied.";
  };
}

const munnaChannel = createHawalaChannel("saffron-42");
// createHawalaChannel has returned, its execution context is gone...
// but `secretCode` lives on inside the closure!

console.log(munnaChannel("cardamom-99"));
// Output: Wrong code. Transaction denied.
console.log(munnaChannel("saffron-42"));
// Output: Code MATCHED! Transaction approved.

// There is NO way to access `secretCode` directly — it's truly private
// console.log(munnaChannel.secretCode); // undefined


// --- Classic Counter Example ---

function createCounter(startValue = 0) {
  let count = startValue; // Enclosed variable

  return {
    increment() { return ++count; },
    decrement() { return --count; },
    getCount() { return count; },
    reset() { count = startValue; return count; },
  };
}

const transactionLog = createCounter();
console.log("\n=== Counter (Classic Closure) ===");
console.log("Transaction #1:", transactionLog.increment());
// Output: Transaction #1: 1
console.log("Transaction #2:", transactionLog.increment());
// Output: Transaction #2: 2
console.log("Transaction #3:", transactionLog.increment());
// Output: Transaction #3: 3
console.log("Current count:", transactionLog.getCount());
// Output: Current count: 3
console.log("Reset:", transactionLog.reset());
// Output: Reset: 0

// Each counter is independent — they have their own enclosed `count`
const anotherLog = createCounter(100);
console.log("Another log:", anotherLog.increment());
// Output: Another log: 101
console.log("Original log:", transactionLog.getCount());
// Output: Original log: 0   <-- Not affected!


// ============================================================
// EXAMPLE 2 — Data Privacy & Factory Functions
// Story: Munna's hawala network has multiple operators in different
// cities. Each operator has their own private ledger (state).
// ============================================================

// WHY: Closures are JavaScript's primary mechanism for data privacy.
// Before classes had #private fields, closures were the ONLY way
// to achieve true encapsulation.

// --- Data Privacy / Encapsulation Pattern ---

function createHawalaLedger(operatorName, initialBalance) {
  // Private state — completely hidden from the outside
  let balance = initialBalance;
  const transactionLog = [];

  function logTransaction(type, amount) {
    transactionLog.push({
      type,
      amount,
      balance,
      timestamp: new Date().toISOString(),
    });
  }

  // Public API — only way to interact with private state
  return {
    deposit(amount) {
      if (amount <= 0) return "Invalid amount.";
      balance += amount;
      logTransaction("deposit", amount);
      return `Deposited \u20B9${amount}. Balance: \u20B9${balance}`;
    },

    withdraw(amount) {
      if (amount <= 0) return "Invalid amount.";
      if (amount > balance) return "Insufficient funds!";
      balance -= amount;
      logTransaction("withdrawal", amount);
      return `Withdrew \u20B9${amount}. Balance: \u20B9${balance}`;
    },

    getBalance() {
      return `${operatorName}'s balance: \u20B9${balance}`;
    },

    getHistory() {
      return [...transactionLog]; // Return a copy, not the original
    },
  };
}

console.log("\n=== Data Privacy with Closures ===");
const munnaLedger = createHawalaLedger("Munna Bhai", 1000);

console.log(munnaLedger.deposit(500));
// Output: Deposited ₹500. Balance: ₹1500
console.log(munnaLedger.withdraw(200));
// Output: Withdrew ₹200. Balance: ₹1300
console.log(munnaLedger.getBalance());
// Output: Munna Bhai's balance: ₹1300

// Cannot access internals directly
// console.log(munnaLedger.balance);        // undefined
// console.log(munnaLedger.transactionLog); // undefined

console.log("History:", munnaLedger.getHistory().length, "transactions");
// Output: History: 2 transactions


// --- Factory Functions Using Closures ---

function createHawalaNetwork(cityTier) {
  const agentCodes = new Map();
  let networkName = `Tier-${cityTier} Hawala Network`;

  return {
    registerAgent(agentId, code) {
      agentCodes.set(agentId, code);
      return `${agentId} registered in ${networkName}`;
    },

    authenticate(agentId, code) {
      if (!agentCodes.has(agentId)) return "Unknown agent.";
      return agentCodes.get(agentId) === code
        ? `${agentId}: Authentication SUCCESS`
        : `${agentId}: Authentication FAILED`;
    },

    getAgentCount() {
      return agentCodes.size;
    },

    // Each instance has its own `agentCodes` — fully isolated
    getNetworkInfo() {
      return `${networkName} — ${agentCodes.size} agent(s) registered`;
    },
  };
}

const mumbaiNetwork = createHawalaNetwork(1);
const jaipurNetwork = createHawalaNetwork(3);

mumbaiNetwork.registerAgent("Munna", "alpha-omega");
mumbaiNetwork.registerAgent("Circuit", "delta-prime");
jaipurNetwork.registerAgent("Pappu", "password123");

console.log("\n=== Factory Functions ===");
console.log(mumbaiNetwork.authenticate("Munna", "alpha-omega"));
// Output: Munna: Authentication SUCCESS
console.log(mumbaiNetwork.authenticate("Munna", "wrong"));
// Output: Munna: Authentication FAILED
console.log(jaipurNetwork.authenticate("Munna", "alpha-omega"));
// Output: Unknown agent.   <-- Different network, different data!

console.log(mumbaiNetwork.getNetworkInfo());
// Output: Tier-1 Hawala Network — 2 agent(s) registered
console.log(jaipurNetwork.getNetworkInfo());
// Output: Tier-3 Hawala Network — 1 agent(s) registered


// ============================================================
// EXAMPLE 3 — The Classic Traps & Practical Utilities
// Story: Munna's network has a timed delivery sequence — but a
// notorious bug makes all deliveries fire at the same time...
// ============================================================

// WHY: The var-in-loop closure bug is one of the most infamous
// JavaScript gotchas. Understanding it proves you truly grasp
// how closures capture variables by REFERENCE, not by value.

// --- Closures in Loops: The Classic `var` Bug ---

console.log("\n=== The var Loop Bug ===");

// BUG: All callbacks share the SAME `i` variable (function-scoped)
for (var i = 0; i < 3; i++) {
  setTimeout(function () {
    console.log("var bug — Delivery #" + i);
  }, 10);
}
// After a brief delay:
// Output: var bug — Delivery #3
// Output: var bug — Delivery #3
// Output: var bug — Delivery #3
// All print 3 because `i` is 3 by the time the callbacks run!


// FIX 1: Use `let` — each iteration gets its own block-scoped `i`
for (let i = 0; i < 3; i++) {
  setTimeout(function () {
    console.log("let fix — Delivery #" + i);
  }, 20);
}
// After a brief delay:
// Output: let fix — Delivery #0
// Output: let fix — Delivery #1
// Output: let fix — Delivery #2


// FIX 2: IIFE — creates a new scope for each iteration (pre-ES6 approach)
for (var k = 0; k < 3; k++) {
  (function (captured) {
    setTimeout(function () {
      console.log("IIFE fix — Delivery #" + captured);
    }, 30);
  })(k); // `k` is passed by value, creating a new `captured` each time
}
// After a brief delay:
// Output: IIFE fix — Delivery #0
// Output: IIFE fix — Delivery #1
// Output: IIFE fix — Delivery #2


// WHY: Closures power many practical utility functions — memoization
// caches expensive results, once() prevents repeated execution,
// and debounce controls how often a function fires.

// --- Practical: Memoization ---

function memoize(fn) {
  const cache = new Map(); // Enclosed — persists across calls

  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      console.log(`  [cache hit] key: ${key}`);
      return cache.get(key);
    }
    console.log(`  [computing] key: ${key}`);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

function calculateCommission(transactionCount) {
  // Simulate expensive computation
  let result = 0;
  for (let i = 0; i < transactionCount * 1000000; i++) {
    result += Math.random();
  }
  return Math.floor(result);
}

const memoizedCommission = memoize(calculateCommission);

console.log("\n=== Memoization ===");
console.log("Result 1:", memoizedCommission(1));
// Output:   [computing] key: [1]
// Output: Result 1: <number>

console.log("Result 2:", memoizedCommission(1)); // Same args — cache hit!
// Output:   [cache hit] key: [1]
// Output: Result 2: <same number>

console.log("Result 3:", memoizedCommission(2)); // Different args — computed
// Output:   [computing] key: [2]
// Output: Result 3: <number>


// --- Practical: once() ---

function once(fn) {
  let called = false;  // Enclosed flag
  let result;          // Enclosed cached result

  return function (...args) {
    if (called) {
      console.log("  [once] Already called — returning cached result.");
      return result;
    }
    called = true;
    result = fn(...args);
    return result;
  };
}

const initializeLedger = once((city) => {
  console.log(`  Initializing ledger: ${city}`);
  return { city, initialized: true };
});

console.log("\n=== once() ===");
const l1 = initializeLedger("Mumbai Main");
// Output:   Initializing ledger: Mumbai Main
console.log("First call:", l1);
// Output: First call: { city: 'Mumbai Main', initialized: true }

const l2 = initializeLedger("Should Be Ignored");
// Output:   [once] Already called — returning cached result.
console.log("Second call:", l2);
// Output: Second call: { city: 'Mumbai Main', initialized: true }


// --- Practical: Debounce Concept ---

function debounce(fn, delayMs) {
  let timerId = null; // Enclosed timer reference

  return function (...args) {
    clearTimeout(timerId); // Cancel any pending call
    timerId = setTimeout(() => {
      fn(...args);
    }, delayMs);
  };
}

// Simulating rapid hawala code entries — only the last one should fire
const processHawalaEntry = debounce((code) => {
  console.log(`  Processing hawala code: ${code}`);
}, 100);

console.log("\n=== Debounce ===");
processHawalaEntry("1111"); // Cancelled
processHawalaEntry("2222"); // Cancelled
processHawalaEntry("3333"); // This one fires after 100ms
// After 100ms:
// Output:   Processing hawala code: 3333


// --- How Closures Actually Work (Mental Model) ---

console.log("\n=== Closure Mental Model ===");
console.log(`
  When a function is created, it captures a reference to the
  variables in its surrounding scope — NOT a snapshot of their values.

  function outer() {
    let x = 10;
    return function inner() {
      return x;  // <-- inner "closes over" x
    };
  }

  const fn = outer();
  // outer() is done, but x=10 survives because inner() holds a reference.
  // This reference + the function = a CLOSURE.

  Key insight: closures capture variables by REFERENCE, not by value.
  That's why the var loop bug happens — all closures share the same var.
`);


// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. A CLOSURE is a function + its lexical environment (the
//    variables that were in scope when it was created).
// 2. Closures capture variables by REFERENCE — if the outer
//    variable changes, the closure sees the new value.
// 3. Closures enable DATA PRIVACY — enclosed variables are
//    truly inaccessible from outside, unlike _ conventions.
// 4. FACTORY FUNCTIONS use closures to create independent
//    instances with their own private state.
// 5. The classic VAR LOOP BUG: var is function-scoped, so all
//    closures in the loop share the same variable. Fix with
//    `let` (block-scoped) or an IIFE.
// 6. MEMOIZATION caches results using a closure-enclosed Map —
//    powerful for expensive computations.
// 7. once() uses a closure flag to ensure a function only
//    executes a single time.
// 8. DEBOUNCE uses a closure to hold a timer reference,
//    delaying execution until input settles.
// ============================================================
