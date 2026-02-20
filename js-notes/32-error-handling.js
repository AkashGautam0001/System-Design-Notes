/**
 * ========================================================
 *  FILE 32: ERROR HANDLING
 * ========================================================
 *  Topic  : try/catch/finally, Error objects, built-in
 *           error types, custom error classes, guard
 *           clauses, validation, and rethrowing.
 *
 *  Why it matters:
 *    Things go wrong — networks fail, users type garbage,
 *    files disappear. Robust error handling separates code
 *    that "works in demos" from code that survives reality.
 *    Knowing how to throw, catch, classify, and propagate
 *    errors keeps your programs resilient and debuggable.
 * ========================================================
 *
 *  STORY — ISRO Chandrayaan Lander Vikram's Failsafe Systems
 *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *  The Chandrayaan lander *Vikram* is descending towards the
 *  lunar surface. Every subsystem — navigation, thrusters,
 *  communication — has failsafe routines. When something
 *  breaks, Vikram catches the error, logs it to telemetry,
 *  and activates a backup plan instead of letting the entire
 *  mission crash.
 * ========================================================
 */

// ========================================================
//  EXAMPLE 1 — try/catch/finally, Error Objects, Built-ins
// ========================================================

// --------------------------------------------------------
// 1. BASIC try / catch / finally
// --------------------------------------------------------
// WHY: try wraps code that might fail. catch receives the
//      error. finally always runs — perfect for cleanup.

console.log("--- Navigation System Boot ---");

function bootNavigation(terrainMapLoaded) {
  try {
    console.log("Initialising navigation system...");

    if (!terrainMapLoaded) {
      throw new Error("Lunar terrain map data is missing!");
    }

    console.log("Navigation online. Descent trajectory plotted.");
    return "NAV_OK";

  } catch (error) {
    console.log(`Navigation FAILED: ${error.message}`);
    console.log("Activating backup inertial guidance...");
    return "NAV_BACKUP";

  } finally {
    // Runs whether or not an error occurred
    console.log("Navigation boot sequence complete.\n");
  }
}

const status1 = bootNavigation(true);
console.log(`Result: ${status1}`);
// Output:
// Initialising navigation system...
// Navigation online. Descent trajectory plotted.
// Navigation boot sequence complete.
//
// Result: NAV_OK

const status2 = bootNavigation(false);
console.log(`Result: ${status2}`);
// Output:
// Initialising navigation system...
// Navigation FAILED: Lunar terrain map data is missing!
// Activating backup inertial guidance...
// Navigation boot sequence complete.
//
// Result: NAV_BACKUP


// --------------------------------------------------------
// 2. THE ERROR OBJECT: message, name, stack
// --------------------------------------------------------
// WHY: Every Error carries diagnostic info. .message is
//      the human-readable string, .name is the error type,
//      and .stack shows the call path for debugging.

try {
  throw new Error("Thruster pressure anomaly detected");
} catch (err) {
  console.log("name:", err.name);       // Output: name: Error
  console.log("message:", err.message); // Output: message: Thruster pressure anomaly detected
  // err.stack is a multi-line string; let's show the first line
  console.log("stack (first line):", err.stack.split("\n")[0]);
  // Output: stack (first line): Error: Thruster pressure anomaly detected
}


// --------------------------------------------------------
// 3. BUILT-IN ERROR TYPES
// --------------------------------------------------------
// WHY: JavaScript has specialised error classes. Using the
//      right one makes catch blocks more informative.

console.log("\n--- Built-in Error Types ---");

// TypeError — wrong type
try {
  const thruster = null;
  thruster.ignite();
} catch (e) {
  console.log(`${e.name}: ${e.message}`);
  // Output: TypeError: Cannot read properties of null (reading 'ignite')
}

// RangeError — value out of range
try {
  const arr = new Array(-1);
} catch (e) {
  console.log(`${e.name}: ${e.message}`);
  // Output: RangeError: Invalid array length
}

// ReferenceError — accessing an undeclared variable
try {
  console.log(altimeterReading);
} catch (e) {
  console.log(`${e.name}: ${e.message}`);
  // Output: ReferenceError: altimeterReading is not defined
}

// SyntaxError — can't be caught at runtime from eval
//               (but can be thrown manually)
try {
  eval("if (");
} catch (e) {
  console.log(`${e.name}: ${e.message}`);
  // Output: SyntaxError: Unexpected end of input
}

// URIError
try {
  decodeURIComponent("%");
} catch (e) {
  console.log(`${e.name}: ${e.message}`);
  // Output: URIError: URI malformed
}

// Note: EvalError exists for legacy reasons but is
// rarely encountered in modern JavaScript.


// --------------------------------------------------------
// 4. THROWING CUSTOM ERRORS
// --------------------------------------------------------
// WHY: throw new Error("msg") gives you a clear, traceable
//      exception. You can throw anything, but Error objects
//      carry the crucial .stack trace.

function setThrustLevel(level) {
  if (typeof level !== "number") {
    throw new TypeError(`Thrust level must be a number, got ${typeof level}`);
  }
  if (level < 0 || level > 100) {
    throw new RangeError(`Thrust level ${level} out of range (0-100)`);
  }
  console.log(`Thrust set to ${level}%`);
}

try {
  setThrustLevel(75);   // Output: Thrust set to 75%
  setThrustLevel("max");
} catch (e) {
  console.log(`${e.name}: ${e.message}`);
  // Output: TypeError: Thrust level must be a number, got string
}

try {
  setThrustLevel(150);
} catch (e) {
  console.log(`${e.name}: ${e.message}`);
  // Output: RangeError: Thrust level 150 out of range (0-100)
}


// ========================================================
//  EXAMPLE 2 — Custom Error Classes, Guard Clauses,
//              Rethrowing
// ========================================================

// --------------------------------------------------------
// 5. CUSTOM ERROR CLASSES (EXTENDING Error)
// --------------------------------------------------------
// WHY: Domain-specific errors let you distinguish between
//      different failure modes and handle each one
//      appropriately — just like different alarm types
//      on the Vikram lander.

class LanderError extends Error {
  constructor(message, subsystem) {
    super(message);
    this.name = "LanderError";
    this.subsystem = subsystem;
    this.timestamp = new Date().toISOString();
  }
}

class AltitudeError extends LanderError {
  constructor(message) {
    super(message, "ALTIMETER");
    this.name = "AltitudeError";
  }
}

class ThrusterError extends LanderError {
  constructor(message, thrusterId) {
    super(message, "THRUSTER");
    this.name = "ThrusterError";
    this.thrusterId = thrusterId;
  }
}

class CommunicationError extends LanderError {
  constructor(message) {
    super(message, "COMMUNICATION");
    this.name = "CommunicationError";
  }
}

// Using custom errors
console.log("\n--- Custom Error Classes ---");

function checkSubsystem(subsystem) {
  switch (subsystem) {
    case "altimeter":
      throw new AltitudeError("Altitude sensor reading erratic");
    case "comm":
      throw new CommunicationError("Deep Space Network link lost");
    case "thruster":
      throw new ThrusterError("Fuel line blockage", 3);
    default:
      console.log(`${subsystem} is nominal.`);
  }
}

try {
  checkSubsystem("thruster");
} catch (error) {
  if (error instanceof ThrusterError) {
    console.log(`THRUSTER ALERT on thruster #${error.thrusterId}: ${error.message}`);
    console.log(`Subsystem: ${error.subsystem}`);
    // Output: THRUSTER ALERT on thruster #3: Fuel line blockage
    // Output: Subsystem: THRUSTER
  } else if (error instanceof LanderError) {
    console.log(`LANDER ALERT [${error.subsystem}]: ${error.message}`);
  } else {
    throw error; // unknown error — don't swallow it
  }
}


// --------------------------------------------------------
// 6. GUARD CLAUSES & VALIDATION PATTERNS
// --------------------------------------------------------
// WHY: Guard clauses validate inputs at the TOP of a
//      function and bail out early with descriptive errors.
//      This keeps the "happy path" unindented and readable.

function initiateDescent(crew, landingSite, fuelLevel) {
  // Guard clauses — validate everything first
  if (!Array.isArray(crew) || crew.length === 0) {
    throw new LanderError("Cannot descend with empty crew manifest", "COMMAND");
  }
  if (typeof landingSite !== "string" || landingSite.trim() === "") {
    throw new LanderError("Landing site must be a non-empty string", "ALTIMETER");
  }
  if (typeof fuelLevel !== "number" || fuelLevel < 20) {
    throw new LanderError(
      `Insufficient fuel: ${fuelLevel}% (minimum 20%)`,
      "THRUSTER"
    );
  }

  // Happy path — all validations passed
  console.log(`Descent initiated! Crew: ${crew.join(", ")}`);
  console.log(`Targeting ${landingSite} with ${fuelLevel}% fuel.`);
}

console.log("\n--- Guard Clause Validation ---");

try {
  initiateDescent(["Mission Director Somnath", "Engineer Ritu"], "Shiv Shakti Point", 85);
  // Output: Descent initiated! Crew: Mission Director Somnath, Engineer Ritu
  // Output: Targeting Shiv Shakti Point with 85% fuel.
} catch (e) {
  console.log(`Descent aborted: ${e.message}`);
}

try {
  initiateDescent([], "South Pole", 50);
} catch (e) {
  console.log(`Descent aborted: ${e.message}`);
  // Output: Descent aborted: Cannot descend with empty crew manifest
}

try {
  initiateDescent(["Pilot Priya"], "Manzinus Crater", 10);
} catch (e) {
  console.log(`Descent aborted: ${e.message}`);
  // Output: Descent aborted: Insufficient fuel: 10% (minimum 20%)
}


// --------------------------------------------------------
// 7. RETHROWING ERRORS
// --------------------------------------------------------
// WHY: Sometimes you catch an error to inspect it, but
//      if it's not the kind you can handle, you should
//      rethrow it so a higher-level handler can deal with it.

function repairSubsystem(subsystemName) {
  try {
    checkSubsystem(subsystemName);
  } catch (error) {
    if (error instanceof AltitudeError) {
      // We know how to fix altimeter issues
      console.log("AUTO-FIX: Recalibrating backup altimeter...");
      console.log("Altimeter restored.\n");
    } else {
      // We can't fix this here — rethrow for mission control
      console.log(`Cannot auto-fix ${error.name}. Escalating...`);
      throw error;  // <-- rethrow
    }
  }
}

console.log("--- Rethrowing Errors ---");

// Altimeter error — handled locally
repairSubsystem("altimeter");
// Output: AUTO-FIX: Recalibrating backup altimeter...
// Output: Altimeter restored.

// Communication error — rethrown and caught at a higher level
try {
  repairSubsystem("comm");
} catch (error) {
  console.log(`MISSION CONTROL ALERT: ${error.name} — ${error.message}`);
  console.log("ISTRAC Bengaluru must authorize manual repair.");
  // Output: Cannot auto-fix CommunicationError. Escalating...
  // Output: MISSION CONTROL ALERT: CommunicationError — Deep Space Network link lost
  // Output: ISTRAC Bengaluru must authorize manual repair.
}


// --------------------------------------------------------
// 8. NESTED try/catch AND ERROR WRAPPING
// --------------------------------------------------------
// WHY: In larger systems you often wrap low-level errors
//      in higher-level ones, preserving the original cause.

class MissionError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "MissionError";
    this.cause = cause;   // ES2022 error cause
  }
}

function preDescentChecks() {
  try {
    checkSubsystem("thruster");
  } catch (originalError) {
    throw new MissionError(
      "Pre-descent checks failed",
      originalError       // attach the original cause
    );
  }
}

console.log("\n--- Error Wrapping ---");

try {
  preDescentChecks();
} catch (error) {
  console.log(`${error.name}: ${error.message}`);
  // Output: MissionError: Pre-descent checks failed

  console.log(`Caused by: ${error.cause.name} — ${error.cause.message}`);
  // Output: Caused by: ThrusterError — Fuel line blockage
}


/**
 * ========================================================
 *  KEY TAKEAWAYS
 * ========================================================
 *  1. try/catch/finally is the foundation — try wraps risky
 *     code, catch handles failures, finally always runs.
 *
 *  2. Every Error has .message, .name, and .stack.  Use the
 *     right built-in type (TypeError, RangeError, etc.)
 *     to communicate what went wrong.
 *
 *  3. Custom error classes (extending Error) let you model
 *     domain-specific failures and handle them precisely
 *     with instanceof checks.
 *
 *  4. Guard clauses at the top of functions validate inputs
 *     early and keep the happy path clean.
 *
 *  5. RETHROW errors you can't handle — never silently
 *     swallow an unexpected exception.
 *
 *  6. Error wrapping (attaching a .cause) preserves the
 *     original failure context while giving higher layers
 *     a meaningful summary.
 * ========================================================
 */
