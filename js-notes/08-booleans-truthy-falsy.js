// ============================================================
// FILE 08: Booleans, Truthy & Falsy Values
// Topic: How JavaScript decides what is "true" and "false"
// Why: Every if-statement, loop guard, and ternary relies on
//      truthiness — misunderstanding it causes silent bugs.
// ============================================================

// =============================================
// STORY: The Rajdhani Express TC (Ticket Checker)
// TC Pandey patrols the Rajdhani Express with a
// simple rulebook: only 8 specific things get you
// THROWN OFF (falsy). Everyone with a valid ticket
// or pass STAYS ON BOARD (truthy). Let's watch
// the journey unfold.
// =============================================

// WHY: JavaScript coerces values to booleans in conditions.
// Knowing the exact 8 falsy values prevents surprise bugs.

// ----- THE 8 FALSY VALUES (thrown off the train) -----

const tcChecklist = [
  false,        // 1. the literal boolean false
  0,            // 2. the number zero
  -0,           // 3. negative zero (yes, it exists)
  0n,           // 4. BigInt zero
  "",           // 5. empty string (no name on the ticket)
  null,         // 6. null — nobody showed up
  undefined,    // 7. undefined — the passenger was never booked
  NaN           // 8. NaN — the ticket number is unreadable
];

console.log("--- TC Pandey throws these off (falsy values) ---");
tcChecklist.forEach((passenger, i) => {
  console.log(`Passenger ${i + 1}: ${String(passenger).padEnd(10)} => Can stay on board? ${Boolean(passenger)}`);
});
// Output:
// Passenger 1: false      => Can stay on board? false
// Passenger 2: 0          => Can stay on board? false
// Passenger 3: 0          => Can stay on board? false
// Passenger 4: 0          => Can stay on board? false
// Passenger 5:            => Can stay on board? false
// Passenger 6: null       => Can stay on board? false
// Passenger 7: undefined  => Can stay on board? false
// Passenger 8: NaN        => Can stay on board? false

// ----- TRUTHY VALUES (valid passengers stay on board) -----

// WHY: Many beginners think "0", "false", [], and {} are falsy.
// They are NOT. TC Pandey lets them right through.

const surpriseTruthyPassengers = [
  "0",          // non-empty string — the character zero
  "false",      // non-empty string — the word "false"
  " ",          // string with a space — still not empty
  [],           // empty array — an object, truthy!
  {},           // empty object — still an object, truthy!
  -1,           // negative one — not zero, truthy!
  Infinity,     // infinity — a valid number, truthy!
  -Infinity,    // negative infinity — still a number
  new Date(),   // a Date object — objects are always truthy
  function(){}, // a function — also an object under the hood
];

console.log("\n--- TC Pandey lets these stay (truthy surprises) ---");
surpriseTruthyPassengers.forEach((passenger, i) => {
  const label = typeof passenger === "function" ? "function(){}" : JSON.stringify(passenger);
  console.log(`Surprise passenger ${i + 1}: ${String(label).padEnd(22)} => Can stay on board? ${Boolean(passenger)}`);
});
// Output:
// Surprise passenger 1: "0"                    => Can stay on board? true
// Surprise passenger 2: "false"                => Can stay on board? true
// Surprise passenger 3: " "                    => Can stay on board? true
// Surprise passenger 4: []                     => Can stay on board? true
// Surprise passenger 5: {}                     => Can stay on board? true
// Surprise passenger 6: -1                     => Can stay on board? true
// Surprise passenger 7: null                   => Can stay on board? true  (Infinity becomes null in JSON)
// Surprise passenger 8: null                   => Can stay on board? true
// Surprise passenger 9: "2026-..."             => Can stay on board? true
// Surprise passenger 10: "function(){}"        => Can stay on board? true


// =============================================
// LOGICAL OPERATORS — TC Pandey's Decision Tools
// =============================================

// WHY: &&, ||, and ! don't always return booleans in JS.
// They return the *actual value* that decided the outcome.

// --- The AND operator (&&) ---
// "Both conditions must pass to stay on board."
// Returns the first FALSY value, or the last value if all truthy.

const hasTicket = "RAJDHANI-CONFIRM";
const seatNumber = 42;

const andResult = hasTicket && seatNumber;
console.log("\n--- AND (&&) operator ---");
console.log(andResult);
// Output: 42
// (Both truthy, so the last value is returned)

const noTicket = "";
const andResult2 = noTicket && seatNumber;
console.log(andResult2);
// Output: ""
// (First falsy value returned — TC Pandey stopped checking)

// --- The OR operator (||) ---
// "At least one valid document must exist."
// Returns the first TRUTHY value, or the last value if all falsy.

const confirmedSeat = null;
const racSeat = "RAC-17";

const assignedSeat = confirmedSeat || racSeat;
console.log("\n--- OR (||) operator ---");
console.log(`Assigned seat: ${assignedSeat}`);
// Output: Assigned seat: RAC-17

const allCancelled = null || 0 || "" || undefined;
console.log(allCancelled);
// Output: undefined
// (All falsy — returns the last one)

// --- The NOT operator (!) ---
// "Flip the decision."

const isConfirmed = true;
console.log("\n--- NOT (!) operator ---");
console.log(!isConfirmed);
// Output: false

console.log(!0);
// Output: true

console.log(!"Rajdhani");
// Output: false


// =============================================
// SHORT-CIRCUIT EVALUATION — TC Pandey's Shortcuts
// =============================================

// WHY: Short-circuiting is used constantly in real code for
// defaults, guards, and conditional execution.

console.log("\n--- Short-circuit patterns ---");

// Pattern 1: Default values with ||
const passengerName = "" || "Unknown Yatri";
console.log(`Welcome, ${passengerName}!`);
// Output: Welcome, Unknown Yatri!

// Pattern 2: Guard with &&
const traveller = { name: "Sharma Ji", tripsThisYear: 5 };
const loyaltyPerk = traveller.tripsThisYear > 3 && "Free chai and samosa!";
console.log(loyaltyPerk);
// Output: Free chai and samosa!

// Pattern 3: Conditional function execution
const isFestivalSeason = true;
const serveLaddoo = () => console.log("Pantry serves laddoos to everyone!");
isFestivalSeason && serveLaddoo();
// Output: Pantry serves laddoos to everyone!

// CAUTION with || for defaults:
// 0 and "" are falsy, so || treats them as "missing"
const berthNumber = 0;
const defaultedWrong = berthNumber || "No berth";
console.log(defaultedWrong);
// Output: No berth   <-- BUG! Passenger had berth #0

// Fix with nullish coalescing (??) — only null/undefined trigger the default
const defaultedRight = berthNumber ?? "No berth";
console.log(defaultedRight);
// Output: 0   <-- Correct! 0 is a valid berth number


// =============================================
// DOUBLE BANG (!!) — TC Pandey's Final Verdict
// =============================================

// WHY: !! converts any value to its boolean equivalent.
// Useful when you need an explicit true/false (not the original value).

console.log("\n--- Double bang (!!) ---");

const passengerList = ["Sharma Ji", "Gupta Ji", "Verma Ji"];
const hasPassengers = !!passengerList.length;
console.log(`Has passengers? ${hasPassengers}`);
// Output: Has passengers? true

const emptyCoach = [];
const hasAnyPassengers = !!emptyCoach.length;
console.log(`Has any passengers? ${hasAnyPassengers}`);
// Output: Has any passengers? false

// How it works step by step:
const pnrNumber = "4512367890";
console.log(!pnrNumber);     // Output: false   (truthy becomes false)
console.log(!!pnrNumber);    // Output: true    (false becomes true)

// Equivalent to Boolean()
console.log(Boolean(pnrNumber));  // Output: true

// Common real-world use: converting to boolean for APIs or flags
const userInput = "   ";
const hasInput = !!userInput.trim();  // false — only whitespace
console.log(`User typed something? ${hasInput}`);
// Output: User typed something? false


// =============================================
// PUTTING IT ALL TOGETHER — A Full Journey on Rajdhani Express
// =============================================

console.log("\n--- Full journey on Rajdhani Express ---");

function tcDecision(passengerName, age, hasID, isBlacklisted) {
  // Short-circuit: if blacklisted, immediately throw off
  if (isBlacklisted) {
    console.log(`${passengerName}: THROWN OFF - You're blacklisted!`);
    return false;
  }

  // Guard: must have ID AND be over 18
  const canTravel = !!hasID && age >= 18;

  // Ternary using the boolean
  const status = canTravel ? "WELCOME ABOARD" : "THROWN OFF";
  const reason = !hasID ? "no ID" : age < 18 ? "too young" : "all good";

  console.log(`${passengerName} (age: ${age || "unknown"}): ${status} — ${reason}`);
  return canTravel;
}

tcDecision("Sharma Ji", 45, true, false);
// Output: Sharma Ji (age: 45): WELCOME ABOARD — all good

tcDecision("Chhotu", 14, true, false);
// Output: Chhotu (age: 14): THROWN OFF — too young

tcDecision("Bhootni Amma", undefined, false, false);
// Output: Bhootni Amma (age: unknown): THROWN OFF — no ID

tcDecision("Gundappa", 35, true, true);
// Output: Gundappa: THROWN OFF - You're blacklisted!


// ============================================================
// KEY TAKEAWAYS
// ------------------------------------------------------------
// 1. There are exactly 8 falsy values in JavaScript:
//    false, 0, -0, 0n, "", null, undefined, NaN
//    EVERYTHING else is truthy — including [], {}, "0", "false".
//
// 2. && returns the first falsy value (or the last value).
//    || returns the first truthy value (or the last value).
//    They return the actual VALUE, not necessarily a boolean.
//
// 3. Short-circuit evaluation means JS stops evaluating as soon
//    as the outcome is determined — use this for defaults, guards,
//    and conditional execution.
//
// 4. !! (double bang) converts any value to its true boolean.
//    Equivalent to Boolean(value).
//
// 5. Be careful with || for defaults: 0 and "" are falsy.
//    Use ?? (nullish coalescing) when 0 or "" are valid values.
// ============================================================
