/**
 * ========================================================
 *  FILE 31: SETS AND MAPS
 * ========================================================
 *  Topic  : Set, Map, WeakSet, WeakMap — creation, core
 *           methods, iteration, set operations, and
 *           practical use-cases.
 *
 *  Why it matters:
 *    Arrays and plain objects are great general-purpose
 *    structures, but Sets guarantee uniqueness in O(1),
 *    and Maps allow any value (not just strings) as keys.
 *    Weak variants let the garbage collector reclaim
 *    entries automatically, preventing memory leaks.
 * ========================================================
 *
 *  STORY — The Sahitya Akademi Library System
 *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *  Pushpa ji is the head librarian at the Sahitya Akademi
 *  library. She manages the catalogue: unique ISBNs (Set),
 *  book-to-author mappings keyed by book objects (Map), and
 *  short-lived reading-room checkout slips that should vanish
 *  when a reader leaves (Weak*).
 * ========================================================
 */

// ========================================================
//  EXAMPLE 1 — Set (Unique ISBN Collection) & Set Operations
// ========================================================

// --------------------------------------------------------
// 1. CREATING AND USING A SET
// --------------------------------------------------------
// WHY: A Set stores unique values of any type. Duplicates
//      are silently ignored, giving you automatic dedup.

const isbnCollection = new Set();

// add() — insert values
isbnCollection.add("978-81-260-1234");
isbnCollection.add("978-81-260-5678");
isbnCollection.add("978-81-260-9012");
isbnCollection.add("978-81-260-1234");        // duplicate — ignored

console.log(isbnCollection);
// Output: Set(3) { '978-81-260-1234', '978-81-260-5678', '978-81-260-9012' }

console.log(isbnCollection.size);  // Output: 3

// has() — check membership (O(1))
console.log(isbnCollection.has("978-81-260-5678")); // Output: true
console.log(isbnCollection.has("978-81-260-0000")); // Output: false

// delete() — remove a value
isbnCollection.delete("978-81-260-5678");
console.log(isbnCollection.has("978-81-260-5678")); // Output: false
console.log(isbnCollection.size);           // Output: 2

// Initialise from an array (auto-deduplicates)
const newArrivals = ["978-93-5000-111", "978-93-5000-222", "978-93-5000-111", "978-93-5000-333", "978-93-5000-222"];
const uniqueArrivals = new Set(newArrivals);
console.log(uniqueArrivals);
// Output: Set(3) { '978-93-5000-111', '978-93-5000-222', '978-93-5000-333' }

// Convert back to an array
const uniqueArray = [...uniqueArrivals];
console.log(uniqueArray);
// Output: [ '978-93-5000-111', '978-93-5000-222', '978-93-5000-333' ]


// --------------------------------------------------------
// 2. ITERATING A SET
// --------------------------------------------------------
// WHY: Sets are iterable and maintain insertion order.

const awardWinningBooks = new Set(["Godaan", "Malgudi Days", "The Guide", "Raag Darbari"]);

console.log("\n--- Iterating the Award-Winning Books ---");

// for...of
for (const book of awardWinningBooks) {
  console.log(`Book: ${book}`);
}
// Output:
// Book: Godaan
// Book: Malgudi Days
// Book: The Guide
// Book: Raag Darbari

// forEach
awardWinningBooks.forEach((book) => {
  // In Set.forEach, value and key are the same
});

// Spread, Array.from, destructuring all work
const [firstBook, ...restBooks] = awardWinningBooks;
console.log(firstBook);  // Output: Godaan
console.log(restBooks);  // Output: [ 'Malgudi Days', 'The Guide', 'Raag Darbari' ]


// --------------------------------------------------------
// 3. SET OPERATIONS: UNION, INTERSECTION, DIFFERENCE
// --------------------------------------------------------
// WHY: Sets don't have built-in union/intersection, but
//      they're trivial to express with spread + filter.

const pushpaCollection = new Set(["Godaan", "Gitanjali", "Malgudi Days", "The Guide"]);
const branchCollection = new Set(["Malgudi Days", "The Guide", "Train to Pakistan", "Kanthapura"]);

// Union: everything from both
const union = new Set([...pushpaCollection, ...branchCollection]);
console.log("\nUnion:", [...union]);
// Output: Union: [ 'Godaan', 'Gitanjali', 'Malgudi Days', 'The Guide', 'Train to Pakistan', 'Kanthapura' ]

// Intersection: only items in both
const intersection = new Set(
  [...pushpaCollection].filter(book => branchCollection.has(book))
);
console.log("Intersection:", [...intersection]);
// Output: Intersection: [ 'Malgudi Days', 'The Guide' ]

// Difference: in Pushpa ji's but NOT in branch's
const difference = new Set(
  [...pushpaCollection].filter(book => !branchCollection.has(book))
);
console.log("Difference:", [...difference]);
// Output: Difference: [ 'Godaan', 'Gitanjali' ]


// ========================================================
//  EXAMPLE 2 — Map, WeakSet, WeakMap (Book Catalogue)
// ========================================================

// --------------------------------------------------------
// 4. CREATING AND USING A MAP
// --------------------------------------------------------
// WHY: A Map holds key-value pairs where *any* value can
//      be a key — objects, functions, numbers — not just
//      strings. It also preserves insertion order and has
//      an efficient .size property.

console.log("\n--- Book Catalogue (Map) ---");

const bookCatalogue = new Map();

// set() — add entries
bookCatalogue.set("godaan",     { title: "Godaan",       price: 250 });
bookCatalogue.set("gitanjali",  { title: "Gitanjali",    price: 199 });
bookCatalogue.set("the-guide",  { title: "The Guide",    price: 350 });

// get() — retrieve by key
console.log(bookCatalogue.get("the-guide"));
// Output: { title: 'The Guide', price: 350 }

// has() — check key existence
console.log(bookCatalogue.has("gitanjali")); // Output: true
console.log(bookCatalogue.has("wings-of-fire")); // Output: false

// size
console.log(bookCatalogue.size); // Output: 3

// delete()
bookCatalogue.delete("gitanjali");
console.log(bookCatalogue.size); // Output: 2

// Objects as keys — something plain objects can't do safely
const bookA = { id: 1, title: "Meghdootam" };
const bookB = { id: 2, title: "Arthashastra" };

const authorMap = new Map();
authorMap.set(bookA, { author: "Kalidasa", estimatedYear: 400 });
authorMap.set(bookB, { author: "Kautilya", estimatedYear: -300 });

console.log(authorMap.get(bookA));
// Output: { author: 'Kalidasa', estimatedYear: 400 }


// --------------------------------------------------------
// 5. ITERATING A MAP
// --------------------------------------------------------
// WHY: Maps are iterable. You can loop over entries, keys,
//      or values — all in insertion order.

// Initialise from an array of [key, value] pairs
const shelfMap = new Map([
  ["shelf-A", ["Godaan", "Gitanjali"]],
  ["shelf-B", ["Malgudi Days"]],
  ["shelf-C", ["The Guide", "Kanthapura", "Train to Pakistan"]]
]);

// for...of iterates [key, value] pairs
console.log("\n--- Books by shelf ---");
for (const [shelf, books] of shelfMap) {
  console.log(`${shelf}: ${books.join(", ")}`);
}
// Output:
// shelf-A: Godaan, Gitanjali
// shelf-B: Malgudi Days
// shelf-C: The Guide, Kanthapura, Train to Pakistan

// .keys(), .values(), .entries()
console.log([...shelfMap.keys()]);
// Output: [ 'shelf-A', 'shelf-B', 'shelf-C' ]

console.log([...shelfMap.values()]);
// Output: [ [ 'Godaan', 'Gitanjali' ], [ 'Malgudi Days' ], [ 'The Guide', 'Kanthapura', 'Train to Pakistan' ] ]

// forEach
shelfMap.forEach((books, shelf) => {
  // shelf is the key, books is the value
});


// --------------------------------------------------------
// 6. MAP vs OBJECT COMPARISON
// --------------------------------------------------------
// WHY: Knowing when to reach for Map vs a plain object
//      avoids performance pitfalls and API surprises.

console.log("\n--- Map vs Object ---");

// Feature               | Object          | Map
// ----------------------|-----------------|------------------
// Key types             | string / symbol | ANY value
// Insertion order       | mostly*         | guaranteed
// Size                  | Object.keys().length | .size (O(1))
// Iteration             | manual          | built-in iterable
// Prototype pollution   | possible        | not possible
// Performance (freq add/remove) | slower  | optimised
// JSON serialisation    | native          | needs conversion

// *Object keys: integer-like keys are sorted numerically first

// Converting Map <-> Object
const configMap = new Map([["language", "Hindi"], ["script", "Devanagari"]]);
const configObj = Object.fromEntries(configMap);
console.log(configObj);            // Output: { language: 'Hindi', script: 'Devanagari' }

const backToMap = new Map(Object.entries(configObj));
console.log(backToMap.get("language")); // Output: Hindi


// --------------------------------------------------------
// 7. WEAKSET — OBJECT-ONLY, GARBAGE-COLLECTIBLE
// --------------------------------------------------------
// WHY: A WeakSet holds objects weakly — if no other
//      reference exists, the entry is garbage-collected.
//      Perfect for tracking objects without preventing
//      their cleanup. No iteration, no size.

console.log("\n--- WeakSet: Reading-Room Passes ---");

const issuedPasses = new WeakSet();

let readerAnand = { name: "Anand" };
let readerMeera = { name: "Meera" };

issuedPasses.add(readerAnand);
issuedPasses.add(readerMeera);

console.log(issuedPasses.has(readerAnand)); // Output: true
console.log(issuedPasses.has(readerMeera)); // Output: true

// When Meera leaves and we drop our reference...
readerMeera = null;
// ...the WeakSet entry for Meera becomes eligible for GC.
// (We can't verify this synchronously, but it will happen.)

// WeakSet limitations:
// - Only objects (no primitives)
// - No .size, no iteration (forEach, for...of, etc.)
// - No clear()

// Common use-case: marking objects as "catalogued"
const cataloguedBooks = new WeakSet();

function catalogueBook(book) {
  if (cataloguedBooks.has(book)) {
    console.log(`${book.title} already catalogued — skipping.`);
    return;
  }
  console.log(`Cataloguing ${book.title}...`);
  cataloguedBooks.add(book);
}

const manuscript = { title: "Panchatantra Manuscript" };
catalogueBook(manuscript); // Output: Cataloguing Panchatantra Manuscript...
catalogueBook(manuscript); // Output: Panchatantra Manuscript already catalogued — skipping.


// --------------------------------------------------------
// 8. WEAKMAP — OBJECT KEYS, GARBAGE-COLLECTIBLE
// --------------------------------------------------------
// WHY: A WeakMap holds key-value pairs where keys must be
//      objects and are held weakly. When the key object is
//      garbage-collected, the entry disappears. Perfect for
//      private data, caches, and DOM metadata.

console.log("\n--- WeakMap: Private Book Notes ---");

const curatorNotes = new WeakMap();

let rareBook1 = { title: "Tirukkural First Edition" };
let rareBook2 = { title: "Abhijnana Shakuntalam" };

curatorNotes.set(rareBook1, "Handle with cotton gloves only");
curatorNotes.set(rareBook2, "Pages fragile, needs restoration");

console.log(curatorNotes.get(rareBook1));
// Output: Handle with cotton gloves only

console.log(curatorNotes.has(rareBook2)); // Output: true

// If we lose the reference to rareBook1, its WeakMap entry
// becomes eligible for garbage collection.
rareBook1 = null;

// WeakMap limitations (same as WeakSet):
// - Keys must be objects
// - No .size, no iteration, no clear()

// Practical pattern: truly private instance data
const _stamina = new WeakMap();

class Librarian {
  constructor(name, energy) {
    this.name = name;
    _stamina.set(this, energy);   // private via WeakMap
  }

  shelveBooks(hours) {
    const current = _stamina.get(this);
    const remaining = Math.max(0, current - hours * 10);
    _stamina.set(this, remaining);
    console.log(`${this.name} shelves for ${hours}h -> Energy: ${remaining}`);
  }

  isActive() {
    return _stamina.get(this) > 0;
  }
}

const pushpaJi = new Librarian("Pushpa ji", 100);
pushpaJi.shelveBooks(3);
// Output: Pushpa ji shelves for 3h -> Energy: 70

pushpaJi.shelveBooks(8);
// Output: Pushpa ji shelves for 8h -> Energy: 0

console.log(`Is Pushpa ji still active? ${pushpaJi.isActive()}`);
// Output: Is Pushpa ji still active? false

// No way to access _stamina from outside without the WeakMap reference
console.log(Object.keys(pushpaJi));
// Output: [ 'name' ]   (energy is NOT on the object)


/**
 * ========================================================
 *  KEY TAKEAWAYS
 * ========================================================
 *  1. SET stores unique values, offers O(1) has/add/delete,
 *     and is iterable in insertion order.
 *
 *  2. Set operations (union, intersection, difference) are
 *     simple with spread + filter.
 *
 *  3. MAP stores key-value pairs with *any* key type,
 *     preserves insertion order, and has .size.
 *
 *  4. Prefer Map over Object when you need non-string keys,
 *     frequent additions/deletions, or guaranteed order.
 *
 *  5. WEAKSET holds objects weakly — no iteration, entries
 *     are GC'd when the object has no other references.
 *     Great for tagging/marking objects.
 *
 *  6. WEAKMAP uses object keys held weakly — ideal for
 *     private data, caches, and metadata that should
 *     disappear when the key object is collected.
 *
 *  7. Weak* collections prevent memory leaks by not
 *     keeping strong references to their entries.
 * ========================================================
 */
