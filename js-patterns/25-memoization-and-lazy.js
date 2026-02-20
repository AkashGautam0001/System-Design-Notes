/**
 * ============================================================
 *  FILE 25 : Memoization, Lazy Evaluation & Thunks
 *  Topic   : Performance & Evaluation Patterns
 *  WHY THIS MATTERS:
 *    Memoization trades memory for speed by caching results.
 *    Lazy evaluation defers work until the result is actually
 *    needed. Thunks wrap computation for delayed execution.
 *    Together these patterns are essential for optimizing
 *    expensive calculations and managing side effects.
 * ============================================================
 */

// STORY: UPSC Aspirant — Priya caches her solved previous year
// questions and delays loading optional subject material until
// the exam day approaches.

// ────────────────────────────────────────────────────────────
//  BLOCK 1 : Memoization (simple, WeakMap-based, fibonacci)
// ────────────────────────────────────────────────────────────

// WHY: Repeatedly solving the same PYQ is wasteful.
//      A memo cache returns the stored answer instantly.

function memoize(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

console.log("=== Priya's UPSC Memoization Notes ===");               // Output: === Priya's UPSC Memoization Notes ===

let solveCount = 0;
const solvePYQ = memoize((topic) => {
  solveCount++;
  return `PYQ on "${topic}" solved`;
});

console.log(`  ${solvePYQ("Indian Polity")}`);                       // Output:   PYQ on "Indian Polity" solved
console.log(`  ${solvePYQ("Indian Polity")}`);                       // Output:   PYQ on "Indian Polity" solved
console.log(`  ${solvePYQ("Geography")}`);                           // Output:   PYQ on "Geography" solved
console.log(`  Actual solves: ${solveCount}`);                        // Output:   Actual solves: 2

// WHY: WeakMap-based memo for object keys — lets GC reclaim entries.

function memoizeWeak(fn) {
  const cache = new WeakMap();
  return function (obj) {
    if (cache.has(obj)) return cache.get(obj);
    const result = fn(obj);
    cache.set(obj, result);
    return result;
  };
}

const summarizeSyllabus = memoizeWeak((paper) =>
  `${paper.title}: ${paper.topics} topics`
);

const gs1 = { title: "GS Paper I", topics: 15 };
console.log(`  ${summarizeSyllabus(gs1)}`);                           // Output:   GS Paper I: 15 topics
console.log(`  ${summarizeSyllabus(gs1)}`);                           // Output:   GS Paper I: 15 topics

// Classic: memoized Fibonacci
const fib = memoize(function fibonacci(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
});

console.log(`  fib(10) = ${fib(10)}`);                                // Output:   fib(10) = 55
console.log(`  fib(30) = ${fib(30)}`);                                // Output:   fib(30) = 832040
console.log(`  fib(0)  = ${fib(0)}`);                                 // Output:   fib(0)  = 0

// ────────────────────────────────────────────────────────────
//  BLOCK 2 : Lazy Evaluation (lazy properties, generators)
// ────────────────────────────────────────────────────────────

// WHY: Lazy evaluation means "don't load optional subject material
//      until Priya actually opens it." Saves time if never needed.

class OptionalSubject {
  constructor(title, rawNotes) { this.title = title; this._rawNotes = rawNotes; this._analysis = undefined; }
  // WHY: The getter computes once on first access, then caches.
  get analysis() {
    if (this._analysis === undefined) {
      console.log(`  [Lazy] Loading notes for "${this.title}"...`);
      this._analysis = this._rawNotes.split(" ").reduce((acc, w) => { acc[w] = (acc[w] || 0) + 1; return acc; }, {});
    }
    return this._analysis;
  }
}

console.log("\n=== Priya's Lazy Study Loading ===");                  // Output: === Priya's Lazy Study Loading ===

const sociology = new OptionalSubject("Sociology", "caste class caste mobility stratification caste");
console.log(`  Subject created: ${sociology.title}`);                 // Output:   Subject created: Sociology

// First access triggers loading
const a1 = sociology.analysis;                                        // Output:   [Lazy] Loading notes for "Sociology"...
console.log(`  Word "caste": ${a1["caste"]}`);                       // Output:   Word "caste": 3

// Second access is instant — no reload
const a2 = sociology.analysis;
console.log(`  Cached "class": ${a2["class"]}`);                     // Output:   Cached "class": 1

// WHY: Generators produce values lazily — one at a time, on demand.

function* naturalNumbers() { let n = 1; while (true) yield n++; }

function* take(n, gen) { let count = 0; for (const val of gen) { if (count++ >= n) return; yield val; } }

function* mapGen(fn, gen) { for (const val of gen) yield fn(val); }

function* filterGen(pred, gen) { for (const val of gen) { if (pred(val)) yield val; } }

console.log("\n  --- Lazy Sequences with Generators ---");            // Output:   --- Lazy Sequences with Generators ---

const squares = mapGen((n) => n * n, naturalNumbers());
const evenSquares = filterGen((n) => n % 2 === 0, squares);
const firstFive = [...take(5, evenSquares)];
console.log(`  First 5 even squares: [${firstFive}]`);               // Output:   First 5 even squares: [4,16,36,64,100]

// Lazy range
function* range(start, end) {
  for (let i = start; i <= end; i++) yield i;
}

const sumOfRange = [...range(1, 5)].reduce((a, b) => a + b, 0);
console.log(`  Sum of 1..5: ${sumOfRange}`);                          // Output:   Sum of 1..5: 15

// ────────────────────────────────────────────────────────────
//  BLOCK 3 : Thunks (delayed computation, Redux-style, lazy)
// ────────────────────────────────────────────────────────────

// WHY: A thunk is a function that wraps a computation to delay
//      its execution — like Priya delaying answer evaluation until needed.

console.log("\n=== Priya's Answer Thunks ===");                       // Output: === Priya's Answer Thunks ===

// Simple thunk — wrap value in a function
const lazyAnswer = () => "Model answer from Priya's thunk!";
console.log(`  ${lazyAnswer()}`);                                     // Output:   Model answer from Priya's thunk!

// Thunk with caching (compute-once)
function createThunk(computation) {
  let computed = false;
  let value;
  return () => {
    if (!computed) {
      value = computation();
      computed = true;
    }
    return value;
  };
}

let evaluationCount = 0;
const heavyThunk = createThunk(() => {
  evaluationCount++;
  return 250 * 4;
});

console.log(`  Before force: evaluations=${evaluationCount}`);        // Output:   Before force: evaluations=0
console.log(`  First force:  ${heavyThunk()}`);                       // Output:   First force:  1000
console.log(`  Second force: ${heavyThunk()}`);                       // Output:   Second force: 1000
console.log(`  After forces: evaluations=${evaluationCount}`);        // Output:   After forces: evaluations=1

// WHY: Redux-style thunk — action creators that return functions
//      instead of plain objects, enabling async dispatch.

function createStore(reducer, initial) {
  let state = initial;
  return {
    getState: () => state,
    dispatch(action) {
      if (typeof action === "function") return action(this.dispatch.bind(this), this.getState);
      state = reducer(state, action);
    },
  };
}

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_ANSWER": return { ...state, answer: action.payload };
    case "SET_STATUS": return { ...state, status: action.payload };
    default: return state;
  }
};

const store = createStore(reducer, { answer: null, status: "idle" });

// Thunk action creator — simulates async answer evaluation
function evaluateAnswer(topic) {
  return (dispatch, getState) => {
    dispatch({ type: "SET_STATUS", payload: "evaluating" });
    console.log(`  [Thunk] Status: ${getState().status}`);            // Output:   [Thunk] Status: evaluating
    // Simulate sync "evaluation" (no real network)
    const data = `Answer for "${topic}" evaluated`;
    dispatch({ type: "SET_ANSWER", payload: data });
    dispatch({ type: "SET_STATUS", payload: "done" });
    console.log(`  [Thunk] Status: ${getState().status}`);            // Output:   [Thunk] Status: done
  };
}

store.dispatch(evaluateAnswer("Indian Economy"));
console.log(`  Answer: ${store.getState().answer}`);                  // Output:   Answer: Answer for "Indian Economy" evaluated

// Thunk-based lazy list
function lazyList(arr) {
  let index = 0;
  return () => {
    if (index < arr.length) return { value: arr[index++], done: false };
    return { value: undefined, done: true };
  };
}

console.log("\n  --- Thunk-based Lazy Study List ---");               // Output:   --- Thunk-based Lazy Study List ---
const nextTopic = lazyList(["Polity", "Economics", "Ethics"]);
console.log(`  ${nextTopic().value}`);                                // Output:   Polity
console.log(`  ${nextTopic().value}`);                                // Output:   Economics
console.log(`  ${nextTopic().value}`);                                // Output:   Ethics
console.log(`  ${nextTopic().done}`);                                 // Output:   true

// ────────────────────────────────────────────────────────────
//  KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Memoization caches solved PYQs by topic — ideal for pure
//    functions called repeatedly with the same inputs.
// 2. Use WeakMap-based memo when keys are objects (like syllabus
//    papers), so entries can be garbage collected when unreferenced.
// 3. Lazy evaluation (getters, generators) defers loading optional
//    subject material until Priya actually needs it — saving time.
// 4. Thunks are zero-argument functions that delay computation.
//    Redux thunks let action creators perform async answer evaluation
//    before dispatching plain action objects to the store.
