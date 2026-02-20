/**
 * ============================================================
 * FILE 41: WeakRef & FinalizationRegistry
 * ============================================================
 * Topic: Weak references, deref(), cleanup callbacks, and the
 *        nuances of non-deterministic garbage collection.
 *
 * WHY IT MATTERS:
 * Sometimes you need to hold a reference to an object WITHOUT
 * preventing it from being garbage collected — for caches, DOM
 * tracking, or large-object management. WeakRef and
 * FinalizationRegistry give you those tools, but they come with
 * serious caveats that every developer must understand.
 * ============================================================
 */

// ============================================================
// STORY: THE JUGAAD LENDING LIBRARY
// Munna runs a street-side lending library in Daryaganj, Delhi.
// Books appear on his wooden cart when borrowed by readers, but
// once a reader returns the book and no one else needs it, it
// quietly disappears from the cart — picked up by the raddiwala.
// Munna uses WeakRef to keep a mental note of who borrowed what
// and FinalizationRegistry as his notebook that auto-updates
// when a book is gone.
// ============================================================


// ============================================================
// SECTION 1 — WeakRef: CREATING WEAK REFERENCES
// ============================================================

// WHY: A normal reference (let obj = {...}) keeps the object alive.
// A WeakRef holds a reference that does NOT prevent garbage
// collection. If the object has no other references, the GC
// can reclaim it, and the WeakRef becomes empty.

// --- Creating a WeakRef ---

let lentBook = { title: "Godan by Premchand", pages: 312 };

// Wrap the object in a WeakRef
const bookRef = new WeakRef(lentBook);

console.log("WeakRef created for:", bookRef.deref()?.title);
// Output: WeakRef created for: Godan by Premchand

// The WeakRef does NOT keep `lentBook` alive on its own.
// As long as the variable `lentBook` exists, the object stays.

// Key point: WeakRef only accepts objects (not primitives).
// new WeakRef(42) => TypeError


// ============================================================
// SECTION 2 — .deref(): ACCESSING THE TARGET
// ============================================================

// WHY: Since the referenced object can disappear at any time,
// you must use .deref() to safely access it. If the object has
// been garbage collected, .deref() returns undefined.

function checkBookOnCart(weakReference, label) {
  const book = weakReference.deref();
  if (book) {
    console.log(`[${label}] Book still on cart: "${book.title}" (${book.pages} pages)`);
  } else {
    console.log(`[${label}] Book has been picked up by the raddiwala.`);
  }
}

// Right now, lentBook still exists
checkBookOnCart(bookRef, "Check 1");
// Output: [Check 1] Book still on cart: "Godan by Premchand" (312 pages)

// Remove the strong reference
lentBook = null;

// The object is now ELIGIBLE for garbage collection.
// However, GC timing is non-deterministic — it might not happen
// immediately, even after setting to null.

checkBookOnCart(bookRef, "Check 2");
// Output: [Check 2] Book still on cart: "Godan by Premchand" (312 pages)
// NOTE: In practice, this may still show the book because GC
// hasn't run yet. You CANNOT force GC in standard JavaScript.

// Pattern: always check deref() before using the value
function getBookSafely(ref) {
  const book = ref.deref();
  if (book === undefined) {
    console.log("Book was taken by raddiwala. Arranging a new copy...");
    return { title: "Replacement Copy", pages: 0 };
  }
  return book;
}

const safeBook = getBookSafely(bookRef);
console.log("Safe access result:", safeBook.title);
// Output: Safe access result: Godan by Premchand
// (or "Replacement Copy" if GC has already run — timing varies)


// ============================================================
// SECTION 3 — FinalizationRegistry: CLEANUP CALLBACKS
// ============================================================

// WHY: Sometimes you need to run cleanup code when an object
// is garbage collected — close a file handle, remove a cache
// entry, log a metric. FinalizationRegistry provides this.

// --- Creating a FinalizationRegistry ---

const munnaNotebook = new FinalizationRegistry((heldValue) => {
  // This callback fires AFTER the registered object is GC'd.
  // `heldValue` is metadata you attach at registration time.
  console.log(`[Munna's Notebook] Book returned & gone: "${heldValue}"`);
});

// --- Registering an object ---

let rareBook = { title: "Chandrakanta by Devaki Nandan Khatri", edition: "1st" };

// Register the object with a held value (the title, for logging)
// and an optional unregister token
const unregisterToken = {};
munnaNotebook.register(rareBook, "Chandrakanta by Devaki Nandan Khatri", unregisterToken);

console.log("Registered rare book for finalization tracking.");
// Output: Registered rare book for finalization tracking.

// Now if rareBook gets garbage collected, the callback fires
// with "Chandrakanta by Devaki Nandan Khatri" as the heldValue.

// --- Unregistering (canceling the callback) ---

// If you no longer want the callback to fire:
const wasUnregistered = munnaNotebook.unregister(unregisterToken);
console.log("Unregistered before GC:", wasUnregistered);
// Output: Unregistered before GC: true

// Re-register it so we can see the pattern clearly
munnaNotebook.register(rareBook, "Chandrakanta by Devaki Nandan Khatri");

// Drop the strong reference (makes it eligible for GC)
rareBook = null;
// The finalization callback will fire "eventually" — not immediately,
// not predictably, and possibly never if the process exits first.


// ============================================================
// SECTION 4 — PRACTICAL USE CASE: A WeakRef CACHE
// ============================================================

// WHY: Caches often hold large objects. A WeakRef-based cache lets
// the GC reclaim entries when memory is tight, while keeping them
// available when memory is plentiful.

class LendingCache {
  constructor() {
    this.cache = new Map(); // key -> WeakRef

    // Cleanup: remove map entries when objects are GC'd
    this.registry = new FinalizationRegistry((key) => {
      // Only delete if the current entry is still the dead one
      const ref = this.cache.get(key);
      if (ref && ref.deref() === undefined) {
        this.cache.delete(key);
        console.log(`[Cache] Evicted entry for key: "${key}"`);
      }
    });
  }

  set(key, value) {
    // If there's an old entry, we let it be (GC will handle it)
    const ref = new WeakRef(value);
    this.cache.set(key, ref);
    this.registry.register(value, key); // track for cleanup
    console.log(`[Cache] Stored: "${key}"`);
  }

  get(key) {
    const ref = this.cache.get(key);
    if (!ref) {
      console.log(`[Cache] Miss (no entry): "${key}"`);
      return undefined;
    }

    const value = ref.deref();
    if (value === undefined) {
      // Object was GC'd but registry hasn't cleaned up yet
      this.cache.delete(key);
      console.log(`[Cache] Miss (GC'd): "${key}"`);
      return undefined;
    }

    console.log(`[Cache] Hit: "${key}"`);
    return value;
  }

  get size() {
    return this.cache.size;
  }
}

// --- Using the cache ---

const munnasCache = new LendingCache();

let bookA = { title: "Panchatantra", category: "Fables" };
let bookB = { title: "Meghadootam", category: "Kalidasa Poetry" };

munnasCache.set("fables", bookA);
// Output: [Cache] Stored: "fables"
munnasCache.set("poetry", bookB);
// Output: [Cache] Stored: "poetry"

console.log("Cache size:", munnasCache.size);
// Output: Cache size: 2

// Access while objects are alive
const fablesBook = munnasCache.get("fables");
// Output: [Cache] Hit: "fables"
console.log("Retrieved:", fablesBook?.title);
// Output: Retrieved: Panchatantra

// Remove strong references
bookA = null;
bookB = null;

// The cache entries still exist because the GC hasn't run.
// In a real app, under memory pressure, GC would reclaim them.
console.log("Cache size after nulling refs:", munnasCache.size);
// Output: Cache size after nulling refs: 2

// Attempting access — may still hit because GC is non-deterministic
const poetryBook = munnasCache.get("poetry");
// Output: [Cache] Hit: "poetry"  (or [Cache] Miss (GC'd): "poetry")


// ============================================================
// SECTION 5 — USE CASE: DOM ELEMENT TRACKING (CONCEPT)
// ============================================================

// WHY: In browser apps, you may track DOM elements for analytics
// or lazy updates. If the element is removed from the DOM and
// no JS references remain, a WeakRef lets it be GC'd naturally.

// Simulating DOM elements with plain objects
let borrowButton = { id: "btn-borrow", type: "button", text: "Kitaab Do" };
let returnForm = { id: "form-return", type: "form", fields: 5 };

const elementTracker = new Map();

function trackElement(element) {
  elementTracker.set(element.id, new WeakRef(element));
  console.log(`Tracking element: #${element.id}`);
}

function getElement(id) {
  const ref = elementTracker.get(id);
  if (!ref) return null;

  const el = ref.deref();
  if (!el) {
    elementTracker.delete(id);
    console.log(`Element #${id} was garbage collected`);
    return null;
  }
  return el;
}

trackElement(borrowButton);
// Output: Tracking element: #btn-borrow
trackElement(returnForm);
// Output: Tracking element: #form-return

console.log("Tracked button:", getElement("btn-borrow")?.text);
// Output: Tracked button: Kitaab Do

// Simulate removing the button from the DOM
borrowButton = null;
// In a real browser, once the DOM node is detached and no JS
// variable holds it, the WeakRef would eventually return undefined.

console.log("Tracked form:", getElement("form-return")?.fields, "fields");
// Output: Tracked form: 5 fields


// ============================================================
// SECTION 6 — CAVEATS: NON-DETERMINISTIC GC
// ============================================================

// WHY: This is the MOST IMPORTANT thing to understand about WeakRef
// and FinalizationRegistry. Getting this wrong leads to subtle bugs.

console.log("\n--- Critical Caveats ---");

// 1. GC timing is UNPREDICTABLE
//    You cannot rely on when (or even IF) an object will be collected.
//    The finalization callback might never fire before process exit.
console.log("Caveat 1: GC timing is unpredictable.");
// Output: Caveat 1: GC timing is unpredictable.

// 2. Do NOT use finalization for essential cleanup
//    If you MUST close a resource (file, socket, DB connection),
//    use try/finally or explicit .close() methods — not finalization.
console.log("Caveat 2: Never rely on finalization for essential cleanup.");
// Output: Caveat 2: Never rely on finalization for essential cleanup.

// 3. deref() can return the object in one microtask and undefined
//    in the next. Always use the result immediately, don't store it
//    long-term (that would re-create a strong reference).
console.log("Caveat 3: Use deref() result immediately, don't cache it.");
// Output: Caveat 3: Use deref() result immediately, don't cache it.

// 4. Different JS engines have different GC strategies.
//    V8, SpiderMonkey, and JavaScriptCore all behave differently.
console.log("Caveat 4: GC behavior varies across engines.");
// Output: Caveat 4: GC behavior varies across engines.

// 5. The TC39 proposal explicitly says:
//    "Correct code must not depend on finalization running."
console.log("Caveat 5: Correct code must not depend on finalization running.");
// Output: Caveat 5: Correct code must not depend on finalization running.


// ============================================================
// SECTION 7 — WeakRef vs WeakMap/WeakSet COMPARISON
// ============================================================

// WHY: People often confuse these. They serve different purposes.

// WeakMap/WeakSet:
//   - Keys are weakly held (values are strong in WeakMap)
//   - You CANNOT iterate over them
//   - You CANNOT get the size
//   - Use case: associating metadata with objects without leaking

// WeakRef:
//   - Holds a weak reference to a SINGLE object
//   - You access it via .deref()
//   - Use case: caches, memoization, optional tracking

// FinalizationRegistry:
//   - Runs a callback when a registered object is GC'd
//   - Use case: logging, cleanup of external resources

const comparisonTable = `
  Feature          | WeakMap/WeakSet | WeakRef          | FinalizationRegistry
  -----------------+-----------------+------------------+---------------------
  Holds reference  | Keys (weak)     | Single object    | Registered objects
  Access pattern   | .get(key)       | .deref()         | Callback on GC
  Iterable         | No              | N/A              | N/A
  Primary use      | Metadata        | Caches/tracking  | Cleanup side effects
`;
console.log(comparisonTable);


// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. WeakRef wraps an object without preventing garbage collection.
//    Use new WeakRef(obj) to create, .deref() to access.
//
// 2. If .deref() returns undefined, the object has been collected.
//    Always check before using the result.
//
// 3. FinalizationRegistry runs a callback when a registered object
//    is GC'd. Use it for non-essential cleanup (logging, cache
//    eviction), NEVER for critical resource management.
//
// 4. GC is NON-DETERMINISTIC: you cannot predict when or if it
//    will run. Code must be correct even if finalization never fires.
//
// 5. WeakRef caches are elegant: they let the GC manage memory
//    pressure for you, evicting entries when needed.
//
// 6. For DOM tracking, WeakRef prevents memory leaks from detached
//    elements that your code still references.
//
// 7. WeakRef !== WeakMap. WeakRef holds one object's reference.
//    WeakMap weakly holds keys for metadata association.
//
// Munna's Daryaganj wisdom: "Kitaabon ko halke haath se pakdo.
// Agar woh chali gayi, jaane do — raddiwala jaanta hai kya karna hai."
// ============================================================
