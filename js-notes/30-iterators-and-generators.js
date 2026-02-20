/**
 * ========================================================
 *  FILE 30: ITERATORS AND GENERATORS
 * ========================================================
 *  Topic  : Iterator / iterable protocols, generator
 *           functions, yield, delegation, lazy sequences,
 *           infinite generators, two-way communication.
 *
 *  Why it matters:
 *    Iterators and generators let you produce values on
 *    demand — one at a time — instead of building entire
 *    arrays in memory. They power for...of, spread, and
 *    destructuring, and they unlock elegant patterns for
 *    pagination, streaming data, and infinite sequences.
 * ========================================================
 *
 *  STORY — Dadi's Bedtime Kahani
 *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *  Old Dadi sits on the charpai and spins tales, but she
 *  never rushes. She tells one chapter, then pauses —
 *  waiting for the grandchildren to say "aur sunao, Dadi!"
 *  before she continues. Each chapter is yielded only when
 *  asked for. That is exactly how generators work.
 * ========================================================
 */

// ========================================================
//  EXAMPLE 1 — Iterator Protocol & Custom Iterables
// ========================================================

// --------------------------------------------------------
// 1. THE ITERATOR PROTOCOL
// --------------------------------------------------------
// WHY: An iterator is any object with a next() method that
//      returns { value, done }. This is the lowest-level
//      contract that powers all iteration in JavaScript.

const kahaniIterator = {
  chapters: [
    "Chapter 1: The Village Well",
    "Chapter 2: The Banyan Tree Ghost",
    "Chapter 3: The Tiger's Den"
  ],
  index: 0,
  next() {
    if (this.index < this.chapters.length) {
      return { value: this.chapters[this.index++], done: false };
    }
    return { value: undefined, done: true };
  }
};

console.log(kahaniIterator.next());
// Output: { value: 'Chapter 1: The Village Well', done: false }
console.log(kahaniIterator.next());
// Output: { value: 'Chapter 2: The Banyan Tree Ghost', done: false }
console.log(kahaniIterator.next());
// Output: { value: "Chapter 3: The Tiger's Den", done: false }
console.log(kahaniIterator.next());
// Output: { value: undefined, done: true }


// --------------------------------------------------------
// 2. THE ITERABLE PROTOCOL
// --------------------------------------------------------
// WHY: An *iterable* is an object with a [Symbol.iterator]()
//      method that returns an iterator. This is what for...of,
//      spread, and destructuring actually look for.

const dadiKiKahani = {
  title: "Akbar-Birbal Ki Kahani",
  chapters: [
    "Chapter 1: Birbal Ka Sawaal",
    "Chapter 2: Akbar Ka Insaaf",
    "Chapter 3: Birbal Ki Chaalaaki",
    "Epilogue: Sabko Mila Insaaf"
  ],
  [Symbol.iterator]() {
    let idx = 0;
    const chapters = this.chapters;
    return {
      next() {
        if (idx < chapters.length) {
          return { value: chapters[idx++], done: false };
        }
        return { value: undefined, done: true };
      }
    };
  }
};

// for...of calls [Symbol.iterator]() behind the scenes
console.log("--- Dadi tells her kahani ---");
for (const chapter of dadiKiKahani) {
  console.log(`Dadi narrates: "${chapter}"`);
}
// Output:
// Dadi narrates: "Chapter 1: Birbal Ka Sawaal"
// Dadi narrates: "Chapter 2: Akbar Ka Insaaf"
// Dadi narrates: "Chapter 3: Birbal Ki Chaalaaki"
// Dadi narrates: "Epilogue: Sabko Mila Insaaf"

// Spread & destructuring also use the iterable protocol
const [firstChapter, secondChapter] = dadiKiKahani;
console.log(firstChapter);  // Output: Chapter 1: Birbal Ka Sawaal
console.log(secondChapter); // Output: Chapter 2: Akbar Ka Insaaf

const allChapters = [...dadiKiKahani];
console.log(allChapters.length); // Output: 4


// --------------------------------------------------------
// 3. FOR...OF UNDER THE HOOD
// --------------------------------------------------------
// WHY: Understanding what for...of actually does removes
//      the mystery — it's just calling next() in a loop.

console.log("--- Manual for...of simulation ---");
const iter = dadiKiKahani[Symbol.iterator]();
let result = iter.next();
while (!result.done) {
  console.log(`Manual read: ${result.value}`);
  result = iter.next();
}
// Output:
// Manual read: Chapter 1: Birbal Ka Sawaal
// Manual read: Chapter 2: Akbar Ka Insaaf
// Manual read: Chapter 3: Birbal Ki Chaalaaki
// Manual read: Epilogue: Sabko Mila Insaaf


// ========================================================
//  EXAMPLE 2 — Generator Functions, yield, Delegation
// ========================================================

// --------------------------------------------------------
// 4. GENERATOR FUNCTIONS: function* AND yield
// --------------------------------------------------------
// WHY: Writing iterators by hand is tedious. Generators
//      let you write what looks like a normal function
//      that pauses at each yield and resumes when next()
//      is called.

function* dadiKahaniGenerator() {
  console.log("  (Dadi adjusts her dupatta...)");
  yield "Chapter 1: The Magical Peacock";

  console.log("  (Dadi takes a sip of chai...)");
  yield "Chapter 2: The River Crossing";

  console.log("  (Dadi pulls the blanket over the children...)");
  yield "Chapter 3: The Grand Celebration";

  console.log("  (Dadi smiles — the kahani is done.)");
}

console.log("\n--- Generator-based storytelling ---");
const gen = dadiKahaniGenerator();

console.log(gen.next());
// Output: { value: 'Chapter 1: The Magical Peacock', done: false }
console.log(gen.next());
// Output: { value: 'Chapter 2: The River Crossing', done: false }
console.log(gen.next());
// Output: { value: 'Chapter 3: The Grand Celebration', done: false }
console.log(gen.next());
// Output: { value: undefined, done: true }


// --------------------------------------------------------
// 5. yield* — DELEGATION
// --------------------------------------------------------
// WHY: yield* delegates to another iterable or generator,
//      letting you compose sequences without manual loops.

function* bachpanKiKahaniyaan() {
  yield "Prologue I: Nani Ka Ghar";
  yield "Prologue II: Galli Ka Cricket";
}

function* mainKahaniyaan() {
  yield "Chapter 1: School Ka Pehla Din";
  yield "Chapter 2: Diwali Ki Taiyyari";
  yield "Chapter 3: Exam Ka Natija";
}

function* puriKahani() {
  yield* bachpanKiKahaniyaan();   // delegate to bachpan
  yield* mainKahaniyaan();         // then delegate to main
  yield "Epilogue: Nayi Subah";    // own yield at the end
}

console.log("\n--- Full saga via yield* delegation ---");
for (const part of puriKahani()) {
  console.log(part);
}
// Output:
// Prologue I: Nani Ka Ghar
// Prologue II: Galli Ka Cricket
// Chapter 1: School Ka Pehla Din
// Chapter 2: Diwali Ki Taiyyari
// Chapter 3: Exam Ka Natija
// Epilogue: Nayi Subah


// --------------------------------------------------------
// 6. LAZY SEQUENCES & INFINITE GENERATORS
// --------------------------------------------------------
// WHY: Generators compute values on demand (lazily).
//      This means you can model infinite sequences without
//      running out of memory — just take what you need.

function* fibonacci() {
  let prev = 0;
  let curr = 1;
  while (true) {          // infinite!
    yield prev;
    [prev, curr] = [curr, prev + curr];
  }
}

// Take the first 10 Fibonacci numbers
console.log("\n--- First 10 Fibonacci numbers ---");
const fib = fibonacci();
const first10 = [];
for (let i = 0; i < 10; i++) {
  first10.push(fib.next().value);
}
console.log(first10);
// Output: [ 0, 1, 1, 2, 3, 5, 8, 13, 21, 34 ]


// A handy range() generator (like Python's range)
function* range(start, end, step = 1) {
  for (let i = start; i < end; i += step) {
    yield i;
  }
}

console.log([...range(0, 10, 2)]);
// Output: [ 0, 2, 4, 6, 8 ]

console.log([...range(1, 6)]);
// Output: [ 1, 2, 3, 4, 5 ]


// ========================================================
//  EXAMPLE 3 — Two-Way Communication & Practical Patterns
// ========================================================

// --------------------------------------------------------
// 7. TWO-WAY COMMUNICATION: generator.next(value)
// --------------------------------------------------------
// WHY: When you call gen.next(value), the value is sent
//      INTO the generator and becomes the result of the
//      yield expression that is currently paused. This
//      turns generators into interactive coroutines.

function* interactiveKahani() {
  const reaction1 = yield "Dadi: 'Raja ne apni talwar uthaai...'";
  console.log(`  (Bacche react karte hain: "${reaction1}")`);

  const reaction2 = yield "Dadi: 'Usne akele raakshas ka saamna kiya...'";
  console.log(`  (Bacche react karte hain: "${reaction2}")`);

  yield `Dadi: 'Aur phir... raja ${
    reaction2 === "taaliyan" ? "jeet gaya!" : "mushkil se bacha."
  }'`;
}

console.log("\n--- Two-way generator communication ---");
const interactive = interactiveKahani();

// First next() starts the generator — cannot send a value yet
console.log(interactive.next().value);
// Output: Dadi: 'Raja ne apni talwar uthaai...'

console.log(interactive.next("haaye").value);
// Output: Dadi: 'Usne akele raakshas ka saamna kiya...'

console.log(interactive.next("taaliyan").value);
// Output: Dadi: 'Aur phir... raja jeet gaya!'


// --------------------------------------------------------
// 8. PRACTICAL: A PAGINATOR GENERATOR
// --------------------------------------------------------
// WHY: Generators are perfect for paginated data — fetch
//      one page at a time, only when the consumer asks.

function* paginator(dataset, pageSize) {
  for (let i = 0; i < dataset.length; i += pageSize) {
    yield dataset.slice(i, i + pageSize);
  }
}

const mithaaiList = [
  "Gulab Jamun", "Rasgulla", "Jalebi",
  "Barfi", "Ladoo", "Peda",
  "Halwa"
];

console.log("\n--- Paginated mithaai list (3 per page) ---");
const pages = paginator(mithaaiList, 3);

console.log("Page 1:", pages.next().value);
// Output: Page 1: [ 'Gulab Jamun', 'Rasgulla', 'Jalebi' ]

console.log("Page 2:", pages.next().value);
// Output: Page 2: [ 'Barfi', 'Ladoo', 'Peda' ]

console.log("Page 3:", pages.next().value);
// Output: Page 3: [ 'Halwa' ]

console.log("Page 4:", pages.next());
// Output: Page 4: { value: undefined, done: true }


// --------------------------------------------------------
// 9. MAKING A CLASS ITERABLE WITH A GENERATOR
// --------------------------------------------------------
// WHY: Generators can be used as the [Symbol.iterator]
//      method, giving you a concise way to make any
//      class work with for...of.

class KahaniCollection {
  constructor(storyteller) {
    this.storyteller = storyteller;
    this.stories = [];
  }

  addStory(title) {
    this.stories.push(title);
  }

  *[Symbol.iterator]() {
    for (const story of this.stories) {
      yield `${this.storyteller} sunati hain: "${story}"`;
    }
  }
}

const collection = new KahaniCollection("Dadi");
collection.addStory("Chaand Wali Raat");
collection.addStory("Himalaya Ka Rahasya");
collection.addStory("Aakhri Diya");

console.log("\n--- Iterable KahaniCollection ---");
for (const narration of collection) {
  console.log(narration);
}
// Output:
// Dadi sunati hain: "Chaand Wali Raat"
// Dadi sunati hain: "Himalaya Ka Rahasya"
// Dadi sunati hain: "Aakhri Diya"


/**
 * ========================================================
 *  KEY TAKEAWAYS
 * ========================================================
 *  1. An ITERATOR is any object with a next() method that
 *     returns { value, done }.
 *
 *  2. An ITERABLE is any object with a [Symbol.iterator]()
 *     method that returns an iterator. for...of, spread,
 *     and destructuring all rely on this protocol.
 *
 *  3. GENERATOR FUNCTIONS (function*) automatically produce
 *     iterators. yield pauses execution; next() resumes it.
 *
 *  4. yield* delegates to another iterable, enabling clean
 *     composition of sequences.
 *
 *  5. Generators are LAZY — they compute values only when
 *     asked, making infinite sequences safe and efficient.
 *
 *  6. gen.next(value) sends data INTO the generator,
 *     enabling two-way communication (coroutines).
 *
 *  7. Practical patterns: range(), fibonacci, paginators,
 *     and making classes iterable with *[Symbol.iterator].
 * ========================================================
 */
