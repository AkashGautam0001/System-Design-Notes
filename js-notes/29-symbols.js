/**
 * ========================================================
 *  FILE 29: SYMBOLS
 * ========================================================
 *  Topic  : Creating symbols, uniqueness, property keys,
 *           well-known symbols, and the global registry.
 *
 *  Why it matters:
 *    Symbols give JavaScript a truly unique, collision-free
 *    primitive — perfect for hidden object properties,
 *    framework-level hooks, and protocol contracts that
 *    no accidental string key can ever overwrite.
 * ========================================================
 *
 *  STORY — Aadhaar's Hidden Biometric Keys
 *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *  At UIDAI headquarters every citizen is assigned a unique
 *  identifier. Ordinary clerks see only the citizen's visible
 *  properties, but authorized officers who know the right
 *  biometric key can read hidden data etched onto the same
 *  record.
 * ========================================================
 */

// --------------------------------------------------------
// 1. CREATING SYMBOLS & THE UNIQUENESS GUARANTEE
// --------------------------------------------------------
// WHY: Symbols are primitives that are *always* unique.
//      Two symbols with the same description are still
//      different values — no accidental collisions.

const aadhaarOf_Ravi  = Symbol("aadhaar");
const aadhaarOf_Anita = Symbol("aadhaar");    // same description, different symbol

console.log(typeof aadhaarOf_Ravi);            // Output: symbol
console.log(aadhaarOf_Ravi === aadhaarOf_Anita); // Output: false  (always unique!)
console.log(aadhaarOf_Ravi.toString());        // Output: Symbol(aadhaar)
console.log(aadhaarOf_Ravi.description);       // Output: aadhaar

// A symbol with no description
const anonymousId = Symbol();
console.log(anonymousId.description);          // Output: undefined


// --------------------------------------------------------
// 2. SYMBOLS AS PROPERTY KEYS (HIDDEN PROPERTIES)
// --------------------------------------------------------
// WHY: Symbol-keyed properties don't show up in for...in,
//      Object.keys(), or JSON.stringify(). This makes them
//      ideal for attaching metadata without polluting the
//      public API of an object.

const biometricHash = Symbol("biometricHash");
const bloodGroup     = Symbol("bloodGroup");

const citizenRecord = {
  name: "Rajesh Kumar",
  age: 35,
  [biometricHash]: "a7f3c9e2d1",   // hidden from ordinary loops
  [bloodGroup]: "O+"                // hidden from JSON
};

// Clerks see only the visible properties
console.log(Object.keys(citizenRecord));
// Output: [ 'name', 'age' ]

console.log(JSON.stringify(citizenRecord));
// Output: {"name":"Rajesh Kumar","age":35}

// Authorized officers who know the biometric key can read the hidden data
console.log(citizenRecord[biometricHash]); // Output: a7f3c9e2d1
console.log(citizenRecord[bloodGroup]);    // Output: O+

// You CAN discover symbols if you look specifically
console.log(Object.getOwnPropertySymbols(citizenRecord));
// Output: [ Symbol(biometricHash), Symbol(bloodGroup) ]

// Reflect.ownKeys returns BOTH string and symbol keys
console.log(Reflect.ownKeys(citizenRecord));
// Output: [ 'name', 'age', Symbol(biometricHash), Symbol(bloodGroup) ]


// --------------------------------------------------------
// 3. WELL-KNOWN SYMBOLS
// --------------------------------------------------------
// WHY: JavaScript uses built-in symbols to let you
//      customize core language behaviour — iteration,
//      type conversion, instanceof checks, and more.

// --- 3a. Symbol.iterator ---
// Makes an object usable in for...of loops.
const rtiQueryBook = {
  queries: ["Infrastructure Budget", "Ration Card Status", "Land Records", "Pension Details"],
  [Symbol.iterator]() {
    let index = 0;
    const queries = this.queries;
    return {
      next() {
        if (index < queries.length) {
          return { value: queries[index++], done: false };
        }
        return { value: undefined, done: true };
      }
    };
  }
};

console.log("--- Iterating the RTI Query Book ---");
for (const query of rtiQueryBook) {
  console.log(`Filing RTI: ${query}`);
}
// Output:
// Filing RTI: Infrastructure Budget
// Filing RTI: Ration Card Status
// Filing RTI: Land Records
// Filing RTI: Pension Details

// --- 3b. Symbol.toPrimitive ---
// Controls how an object converts to a number, string, or default.
const governmentScheme = {
  name: "PM Kisan Yojana",
  beneficiaries: 42,
  [Symbol.toPrimitive](hint) {
    if (hint === "number")  return this.beneficiaries;
    if (hint === "string")  return this.name;
    return `${this.name} (beneficiaries: ${this.beneficiaries})`; // default
  }
};

console.log(+governmentScheme);          // Output: 42
console.log(`${governmentScheme}`);       // Output: PM Kisan Yojana
console.log(governmentScheme + "!");      // Output: PM Kisan Yojana (beneficiaries: 42)!

// --- 3c. Symbol.toStringTag ---
// Customises what Object.prototype.toString returns.
class AadhaarCard {
  get [Symbol.toStringTag]() {
    return "AadhaarCard";
  }
}

const card = new AadhaarCard();
console.log(Object.prototype.toString.call(card));
// Output: [object AadhaarCard]

// --- 3d. Symbol.hasInstance ---
// Customises the behaviour of `instanceof`.
class UIDAIRegistry {
  static [Symbol.hasInstance](candidate) {
    return candidate.hasAadhaar === true && candidate.hasBiometrics === true;
  }
}

const verifiedCitizen = { hasAadhaar: true, hasBiometrics: true };
const unregistered = { hasAadhaar: false, hasBiometrics: false };

console.log(verifiedCitizen instanceof UIDAIRegistry);  // Output: true
console.log(unregistered instanceof UIDAIRegistry);     // Output: false


// --------------------------------------------------------
// 4. GLOBAL SYMBOL REGISTRY — Symbol.for() & Symbol.keyFor()
// --------------------------------------------------------
// WHY: Sometimes you WANT the same symbol across different
//      files, iframes, or realms. Symbol.for(key) returns
//      a shared symbol from a global registry, creating it
//      only if it doesn't already exist.

// Two distant offices who never coordinated still share the same PAN key
const panFromDelhi  = Symbol.for("pan-number");
const panFromMumbai = Symbol.for("pan-number");

console.log(panFromDelhi === panFromMumbai); // Output: true

// Symbol.keyFor() retrieves the registry key of a global symbol
console.log(Symbol.keyFor(panFromDelhi)); // Output: pan-number

// Local (non-registered) symbols have no registry key
const localId = Symbol("pan-number");
console.log(Symbol.keyFor(localId));      // Output: undefined

// A local symbol and a global symbol with the same description
// are still different
console.log(localId === panFromDelhi);    // Output: false


// --------------------------------------------------------
// 5. PRACTICAL PATTERN: USING SYMBOLS FOR ENUM-LIKE CONSTANTS
// --------------------------------------------------------
// WHY: Because symbols are unique, they make excellent
//      enum values — no risk of collision with strings.

const Season = Object.freeze({
  SUMMER:  Symbol("summer"),
  MONSOON: Symbol("monsoon"),
  WINTER:  Symbol("winter"),
  SPRING:  Symbol("spring")
});

function describeIndianSeason(season) {
  switch (season) {
    case Season.SUMMER:
      return "Loo winds sweep across the plains!";
    case Season.MONSOON:
      return "The rains drench the fields of Punjab!";
    case Season.WINTER:
      return "Fog blankets the Indo-Gangetic belt!";
    case Season.SPRING:
      return "Mustard flowers bloom across Rajasthan!";
    default:
      return "Unknown season — the forecast fizzles.";
  }
}

console.log(describeIndianSeason(Season.SUMMER));
// Output: Loo winds sweep across the plains!

console.log(describeIndianSeason(Season.MONSOON));
// Output: The rains drench the fields of Punjab!

// Passing a random string won't accidentally match
console.log(describeIndianSeason("summer"));
// Output: Unknown season — the forecast fizzles.


/**
 * ========================================================
 *  KEY TAKEAWAYS
 * ========================================================
 *  1. Symbol() always creates a UNIQUE primitive — two
 *     symbols with the same description are never equal.
 *
 *  2. Symbol-keyed properties are hidden from for...in,
 *     Object.keys(), and JSON.stringify(), making them
 *     ideal for private metadata.
 *
 *  3. Well-known symbols (Symbol.iterator, Symbol.toPrimitive,
 *     Symbol.toStringTag, Symbol.hasInstance, etc.) let you
 *     hook into JavaScript's core protocols.
 *
 *  4. Symbol.for(key) accesses a global registry so the SAME
 *     symbol can be shared across modules and realms.
 *     Symbol.keyFor(sym) looks up the registry key.
 *
 *  5. Symbols are excellent as enum-like constants because
 *     they can never collide with strings or other symbols.
 * ========================================================
 */
