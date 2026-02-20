/**
 * ============================================================
 *  FILE 22: The `this` Keyword
 * ============================================================
 *  Topic: How JavaScript determines the value of `this` in
 *         different execution contexts.
 *
 *  Why it matters: `this` is one of the most misunderstood
 *  parts of JavaScript. Mastering it prevents a whole class
 *  of bugs where methods lose their context and variables
 *  point to the wrong object.
 * ============================================================
 *
 *  STORY: Meet Ranveer, a Bollywood actor who takes on a
 *  different persona depending on which stage he performs on.
 *  On the Global Stage he is "nobody special." On the Object
 *  Stage he becomes whoever the film script says. And when he
 *  steps inside an arrow-function costume, he keeps the identity
 *  he had right before he put the costume on.
 * ============================================================
 */

// ============================================================
//  EXAMPLE 1 — Ranveer on Different Stages
// ============================================================

// WHY: The value of `this` is NOT decided when a function is
// written — it is decided when the function is CALLED. The
// calling context (the "stage") determines who Ranveer becomes.

// ----- 1a. Global context -----
// In Node the global `this` inside a module is `{}` (module.exports).
// In a browser it would be `window`.
console.log("--- 1a. Global context ---");
console.log(this); // Output: {} (in Node module scope)

// ----- 1b. Regular function — sloppy mode -----
function ranveerOnGlobalStage() {
  // In sloppy mode, a plain function call sets `this` to the
  // global object (`global` in Node, `window` in browsers).
  return typeof this;
}
console.log("\n--- 1b. Regular function (sloppy mode) ---");
console.log(ranveerOnGlobalStage()); // Output: object

// ----- 1c. Regular function — strict mode -----
function ranveerWithNoScript() {
  "use strict";
  // In strict mode a plain call gives `this` as undefined —
  // the actor has no identity at all (no script given).
  return this;
}
console.log("\n--- 1c. Regular function (strict mode) ---");
console.log(ranveerWithNoScript()); // Output: undefined

// ----- 1d. Method on an object (the Film Set Stage) -----
const bollywoodFilm = {
  name: "Bajirao Mastani",
  lead: "Ranveer",
  introduce() {
    // When called as a method, `this` is the owning object.
    return `${this.lead} performs in ${this.name}`;
  },
};
console.log("\n--- 1d. Method call ---");
console.log(bollywoodFilm.introduce());
// Output: Ranveer performs in Bajirao Mastani

// ----- 1e. Arrow functions (the Costume that locks identity) -----
const filmDirector = {
  name: "Sanjay Leela Bhansali",
  cast: ["Ranveer", "Deepika", "Priyanka"],
  announceCast() {
    // Arrow function inherits `this` from `announceCast`,
    // which was called as a method on `filmDirector`.
    this.cast.forEach((actor) => {
      console.log(`${this.name} introduces ${actor}`);
    });
  },
};
console.log("\n--- 1e. Arrow function (lexical this) ---");
filmDirector.announceCast();
// Output: Sanjay Leela Bhansali introduces Ranveer
// Output: Sanjay Leela Bhansali introduces Deepika
// Output: Sanjay Leela Bhansali introduces Priyanka


// ============================================================
//  EXAMPLE 2 — The Classic Gotchas
// ============================================================

// WHY: Nested regular functions and detached methods are the
// two most common traps developers fall into. Knowing them
// saves hours of debugging.

// ----- 2a. Nested function gotcha -----
const filmSet = {
  crew: "Spot Boys",
  prepareProps() {
    console.log(`Outer this.crew: ${this.crew}`);
    // Output: Outer this.crew: Spot Boys

    // A regular nested function does NOT inherit `this`.
    function arrangeChairs() {
      // `this` here is global (sloppy) or undefined (strict).
      console.log(`Inner this.crew: ${this?.crew}`);
      // Output: Inner this.crew: undefined
    }
    arrangeChairs();

    // Fix: use an arrow function instead.
    const arrangeLights = () => {
      console.log(`Arrow this.crew: ${this.crew}`);
      // Output: Arrow this.crew: Spot Boys
    };
    arrangeLights();
  },
};
console.log("\n--- 2a. Nested function gotcha ---");
filmSet.prepareProps();

// ----- 2b. Detached method -----
const actor = {
  name: "Ranveer",
  bow() {
    return `${this.name} takes a bow`;
  },
};
// Assigning the method to a variable detaches it from `actor`.
const detachedBow = actor.bow;
console.log("\n--- 2b. Detached method ---");
// `this` is now global/undefined — Ranveer loses his identity!
try {
  console.log(detachedBow()); // Output: undefined takes a bow (sloppy) or TypeError (strict)
} catch (e) {
  console.log("TypeError: Cannot read properties of undefined");
}


// ============================================================
//  EXAMPLE 3 — setTimeout and Event Handlers
// ============================================================

// WHY: Callbacks passed to setTimeout or DOM event listeners
// are common real-world situations where `this` slips away.

// ----- 3a. setTimeout loses context -----
const assistantDirector = {
  name: "Rohit",
  cueActor() {
    console.log(`${this.name} cues the actor`);
  },
  cueWithDelay() {
    // setTimeout calls the callback as a plain function,
    // so `this` becomes the global object.
    setTimeout(function () {
      // `this.name` is undefined here — Rohit lost his badge!
      console.log(`Delayed (regular fn): ${this?.name || "LOST CONTEXT"}`);
      // Output: Delayed (regular fn): LOST CONTEXT
    }, 100);

    // Fix: arrow function preserves `this` from cueWithDelay.
    setTimeout(() => {
      console.log(`Delayed (arrow fn): ${this.name}`);
      // Output: Delayed (arrow fn): Rohit
    }, 200);
  },
};

console.log("\n--- 3a. setTimeout loses context ---");
assistantDirector.cueWithDelay();

// ----- 3b. Event handlers — conceptual note -----
// In a browser, when you write:
//
//   button.addEventListener("click", function () {
//     console.log(this); // `this` === the button element
//   });
//
// The DOM sets `this` to the element that received the event.
// With an arrow function, `this` would instead be the
// enclosing lexical scope — often `window` or a class instance.
// Choose deliberately based on what you need.

console.log("\n--- 3b. Event handlers (conceptual) ---");
console.log(
  "In DOM event listeners, `this` is the element (regular fn) " +
  "or lexical scope (arrow fn)."
);
// Output: In DOM event listeners, `this` is the element (regular fn) or lexical scope (arrow fn).


// ============================================================
//  KEY TAKEAWAYS
// ============================================================
// 1. `this` is determined by HOW a function is called, not
//    where it is written (except arrow functions).
// 2. Method call (obj.fn()) => `this` is `obj`.
// 3. Plain call (fn()) => `this` is global (sloppy) or
//    undefined (strict).
// 4. Arrow functions capture `this` from their enclosing
//    lexical scope — they have no `this` of their own.
// 5. setTimeout, detached methods, and nested functions are
//    the classic traps — fix with arrow functions or bind().
// 6. In DOM event listeners, `this` is the element (regular
//    function) or the surrounding scope (arrow function).
// ============================================================
