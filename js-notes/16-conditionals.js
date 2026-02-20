// ============================================================
// FILE 16: CONDITIONALS
// Topic: Decision-making in code — if/else, ternary, switch, logical assignment
// WHY: Every program must make choices. Mastering conditionals means
//      writing logic that is both correct and readable.
// ============================================================

// ============================================================
// EXAMPLE 1 — IRCTC Ticket Booking Journey
// Story: The passenger is booking a train ticket on IRCTC.
// Every choice leads to a different booking outcome.
// ============================================================

// WHY: if/else is the backbone of decision-making — it reads like
// plain English and handles any condition, simple or complex.

// --- if, else if, else ---

const seatsAvailable = 75;
const hasAadhaar = true;
const hasSeniorCitizenID = false;

if (seatsAvailable <= 0) {
  console.log("Booking Failed. Train is fully booked — try Tatkal tomorrow.");
} else if (seatsAvailable < 30) {
  console.log("Hurry! Only a few seats left. Book now before RAC!");
} else if (seatsAvailable < 60) {
  console.log("Seats filling up. Confirm your ticket soon.");
} else {
  console.log("Seats available! Proceed with your IRCTC booking.");
}
// Output: Seats available! Proceed with your IRCTC booking.

// Combined conditions
if (hasAadhaar && seatsAvailable > 50) {
  console.log("Aadhaar verified and seats plenty — smooth booking ahead.");
} else if (hasAadhaar || hasSeniorCitizenID) {
  console.log("At least one valid ID found — you can proceed.");
} else {
  console.log("No valid ID — please link Aadhaar to IRCTC first.");
}
// Output: Aadhaar verified and seats plenty — smooth booking ahead.


// WHY: The ternary operator is great for simple one-line decisions,
// but nested ternaries quickly become unreadable — avoid them.

// --- Ternary Operator ---

const documents = ["aadhaar", "pan-card", "passport"];
const canBookTatkal = documents.includes("aadhaar") ? "Yes" : "No";
console.log("Can book Tatkal?", canBookTatkal);
// Output: Can book Tatkal? Yes

// Ternary in template literals — clean and concise
const bookingMessage = `Your ticket is ${documents.includes("concession-cert") ? "concession" : "regular"} fare.`;
console.log(bookingMessage);
// Output: Your ticket is regular fare.

// --- Nested Ternary (why to avoid it) ---

const trainStatus = "waiting";

// BAD — nested ternary is hard to read and debug
const statusMessageBad =
  trainStatus === "confirmed" ? "Your berth is confirmed!" :
  trainStatus === "waiting" ? "You are on the waitlist..." :
  trainStatus === "rac" ? "RAC — you get a side berth." :
  "Check PNR status again.";
console.log("Nested ternary:", statusMessageBad);
// Output: Nested ternary: You are on the waitlist...

// GOOD — use if/else or a map instead
function getStatusMessage(status) {
  if (status === "confirmed") return "Your berth is confirmed!";
  if (status === "waiting") return "You are on the waitlist...";
  if (status === "rac") return "RAC — you get a side berth.";
  return "Check PNR status again.";
}
console.log("Clean version:", getStatusMessage(trainStatus));
// Output: Clean version: You are on the waitlist...


// WHY: switch is ideal when comparing one value against many possibilities.
// Forgetting `break` causes fall-through — sometimes a bug, sometimes intentional.

// --- switch with break, fall-through, and default ---

const chosenClass = "AC3";

switch (chosenClass) {
  case "Sleeper":
    console.log("You selected Sleeper Class — affordable and breezy.");
    break;
  case "AC3":
    console.log("You selected AC 3-Tier — comfortable with AC.");
    break;
  case "AC2":
    console.log("You selected AC 2-Tier — extra space and privacy.");
    break;
  case "AC1":
    console.log("You selected AC First Class — premium travel.");
    break;
  default:
    console.log("Invalid class — please choose Sleeper, AC3, AC2, or AC1.");
}
// Output: You selected AC 3-Tier — comfortable with AC.

// --- Intentional Fall-Through ---
// Sometimes multiple cases share the same outcome

const coachType = "3A";

switch (coachType) {
  case "3A":
  case "3E":
  case "CC":
    // All three are AC coaches
    console.log("AC coach — blankets and curtains provided!");
    break;
  case "SL":
  case "2S":
    console.log("Non-AC coach — carry your own bedding.");
    break;
  default:
    console.log("Unknown coach type — check your ticket again.");
}
// Output: AC coach — blankets and curtains provided!


// ============================================================
// EXAMPLE 2 — IRCTC Booking Options: Logical Assignment Operators
// Story: The passenger manages booking preferences and quota
// state using modern assignment shortcuts.
// ============================================================

// WHY: Logical assignment operators (||=, &&=, ??=) let you set
// defaults and update values conditionally in a single expression.
// They reduce boilerplate and make intent crystal clear.

// --- ||= (Logical OR Assignment) ---
// Assigns if the current value is falsy (false, 0, "", null, undefined, NaN)

let passengerName = "";
passengerName ||= "Guest Passenger";
console.log("Passenger:", passengerName);
// Output: Passenger: Guest Passenger

let loyaltyPoints = 0;
loyaltyPoints ||= 100; // CAUTION: 0 is falsy, so this WILL reassign!
console.log("Loyalty Points:", loyaltyPoints);
// Output: Loyalty Points: 100   <-- Probably not what you wanted if 0 is valid


// --- ??= (Nullish Coalescing Assignment) ---
// Assigns ONLY if the current value is null or undefined (not 0, not "")

let waitlistPosition = 0;
waitlistPosition ??= 3; // 0 is NOT null/undefined, so this does NOT reassign
console.log("Waitlist:", waitlistPosition);
// Output: Waitlist: 0   <-- Correct! 0 is a valid waitlist position

let quotaType = null;
quotaType ??= "General";
console.log("Quota:", quotaType);
// Output: Quota: General

let mealPreference = undefined;
mealPreference ??= "veg";
console.log("Meal:", mealPreference);
// Output: Meal: veg


// --- &&= (Logical AND Assignment) ---
// Assigns ONLY if the current value is truthy

let activeBooking = "PNR-4523178";
activeBooking &&= `${activeBooking} [CONFIRMED]`;
console.log("Booking:", activeBooking);
// Output: Booking: PNR-4523178 [CONFIRMED]

let cancelledBooking = null;
cancelledBooking &&= `${cancelledBooking} [REFUNDED]`; // null is falsy — no assignment
console.log("Cancelled:", cancelledBooking);
// Output: Cancelled: null


// --- Practical Pattern: Building a Config with Defaults ---

function startBooking(options = {}) {
  // Only fill in what the caller didn't provide
  options.passengerName ??= "Guest";
  options.travelClass ??= "Sleeper";
  options.meals ??= 1;
  options.seatPreference ||= "lower_berth"; // empty string = use default

  console.log("Booking config:", options);
}

startBooking({ passengerName: "Sharma ji", seatPreference: "" });
// Output: Booking config: { passengerName: 'Sharma ji', seatPreference: 'lower_berth', travelClass: 'Sleeper', meals: 1 }

startBooking({ meals: 0 });
// Output: Booking config: { meals: 0, passengerName: 'Guest', travelClass: 'Sleeper', seatPreference: 'lower_berth' }
// Note: meals stayed 0 because ??= respects 0 as a valid value


// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. if/else handles any condition and is the most readable for
//    complex branching logic.
// 2. Ternary (a ? b : c) is great for simple inline decisions;
//    AVOID nesting ternaries — use if/else or a lookup map instead.
// 3. switch compares one value against many cases; always use break
//    unless you intentionally want fall-through behavior.
// 4. ||= assigns when the value is falsy — watch out with 0 and "".
// 5. ??= assigns only when the value is null or undefined — use this
//    when 0, false, and "" are valid values you want to keep.
// 6. &&= assigns only when the value is truthy — useful for
//    augmenting existing values without touching null/undefined.
// 7. Pick the right tool: if/else for complex logic, ternary for
//    simple inline, switch for multi-case, ??= for safe defaults.
// ============================================================
