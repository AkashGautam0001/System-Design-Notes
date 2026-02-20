/**
 * ========================================================
 *  FILE 34: ASYNC / AWAIT
 * ========================================================
 *  Topic  : async functions, await expressions, error
 *           handling with try/catch, sequential vs parallel
 *           execution, top-level await, async iteration,
 *           and converting callback APIs.
 *
 *  Why it matters:
 *    async/await is syntactic sugar over Promises that
 *    makes asynchronous code look and behave like
 *    synchronous code — easier to read, write, and debug.
 *    Understanding when tasks run in series vs in parallel
 *    is the difference between a 5-second page load and
 *    a 1-second page load.
 * ========================================================
 *
 *  STORY — Udupi Restaurant: Amma's Thali
 *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *  Amma runs a famous Udupi restaurant and is preparing a
 *  full South Indian thali. Some dishes must be cooked in
 *  order (the tempering before the sambar), while others
 *  can cook simultaneously on multiple burners (rasam and
 *  avial). She awaits each step at exactly the right moment
 *  — never blocking the kitchen longer than necessary.
 * ========================================================
 */

// ========================================================
//  HELPER FUNCTIONS (simulated async kitchen operations)
// ========================================================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function prepareIngredient(name, ms) {
  await delay(ms);
  console.log(`  [done] ${name} prepared (${ms}ms)`);
  return { ingredient: name, time: ms };
}

async function cookDish(name, ms, shouldFail = false) {
  await delay(ms);
  if (shouldFail) {
    throw new Error(`${name} curdled!`);
  }
  console.log(`  [done] ${name} cooked (${ms}ms)`);
  return { dish: name, time: ms };
}

// ========================================================
//  EXAMPLE 1 — async/await Fundamentals
// ========================================================

// --------------------------------------------------------
// 1. ASYNC FUNCTION (ALWAYS RETURNS A PROMISE)
// --------------------------------------------------------
// WHY: Marking a function async means it automatically
//      wraps its return value in a Promise. This is the
//      gateway to using await inside it.

async function greetGuests() {
  return "Welcome to Amma's Udupi Restaurant!";
}

// Even though we returned a string, it's wrapped in a Promise
greetGuests().then(msg => console.log(msg));
// Output: Welcome to Amma's Udupi Restaurant!


// --------------------------------------------------------
// 2. AWAIT EXPRESSION (PAUSES EXECUTION)
// --------------------------------------------------------
// WHY: await pauses the async function until the Promise
//      settles, then returns the resolved value. The rest
//      of the program continues running — the function is
//      suspended, not the entire thread.

async function makeChutney() {
  console.log("\n--- Making the Coconut Chutney ---");
  console.log("Amma starts the coconut chutney...");

  const coconut  = await prepareIngredient("grated coconut", 100);
  const greenChilli = await prepareIngredient("green chillies", 80);
  const coriander  = await prepareIngredient("fresh coriander", 50);

  console.log(`Chutney ready with: ${coconut.ingredient}, ${greenChilli.ingredient}, ${coriander.ingredient}`);
  return "Coconut Chutney";
}


// --------------------------------------------------------
// 3. ERROR HANDLING: try/catch WITH async/await
// --------------------------------------------------------
// WHY: Instead of .catch(), you use familiar try/catch
//      blocks. Rejected promises throw inside the async
//      function, making error handling feel synchronous.

async function makePayasam() {
  console.log("\n--- Attempting the Payasam ---");
  try {
    await prepareIngredient("jaggery", 50);
    await cookDish("Paal Payasam", 100, true); // this will fail — milk curdled!
    console.log("Payasam served!"); // never reached
  } catch (error) {
    console.log(`Payasam FAILED: ${error.message}`);
    // Output: Payasam FAILED: Paal Payasam curdled!

    // Fallback plan
    console.log("Serving banana sheera instead.");
    return "Banana Sheera";
  } finally {
    console.log("Kitchen cleaned up after payasam attempt.");
  }
}


// --------------------------------------------------------
// 4. SEQUENTIAL vs PARALLEL EXECUTION
// --------------------------------------------------------
// WHY: Awaiting in sequence is simple but slow when tasks
//      are independent. Promise.all() runs them in parallel,
//      cutting total time dramatically.

async function makeThaliSequential() {
  console.log("\n--- Thali (SEQUENTIAL) ---");
  const start = Date.now();

  // Each await waits for the previous to finish
  const sambar   = await cookDish("Sambar", 200);
  const rasam    = await cookDish("Rasam", 150);
  const avial    = await cookDish("Avial", 100);

  const elapsed = Date.now() - start;
  console.log(`Sequential total: ~${elapsed}ms (sambar + rasam + avial)`);
  // Output: Sequential total: ~450ms (sambar + rasam + avial)
  return [sambar, rasam, avial];
}

async function makeThaliParallel() {
  console.log("\n--- Thali (PARALLEL — multiple burners) ---");
  const start = Date.now();

  // All three cook at the same time on different burners
  const [sambar, rasam, avial] = await Promise.all([
    cookDish("Sambar", 200),
    cookDish("Rasam", 150),
    cookDish("Avial", 100)
  ]);

  const elapsed = Date.now() - start;
  console.log(`Parallel total: ~${elapsed}ms (only as slow as the slowest)`);
  // Output: Parallel total: ~200ms (only as slow as the slowest)
  return [sambar, rasam, avial];
}


// --------------------------------------------------------
// 5. HANDLING PARALLEL ERRORS
// --------------------------------------------------------
// WHY: With Promise.all(), if any task fails the whole
//      batch rejects. Use Promise.allSettled() if you need
//      partial results.

async function cookMultipleDishesWithFallback() {
  console.log("\n--- Parallel with allSettled (graceful) ---");

  const results = await Promise.allSettled([
    cookDish("Rasam", 100),
    cookDish("Payasam", 150, true),    // will fail — milk curdled
    cookDish("Appalam", 80)
  ]);

  results.forEach(result => {
    if (result.status === "fulfilled") {
      console.log(`  OK: ${result.value.dish}`);
    } else {
      console.log(`  FAILED: ${result.reason.message}`);
    }
  });
  // Output:
  //   OK: Rasam
  //   FAILED: Payasam curdled!
  //   OK: Appalam
}


// ========================================================
//  EXAMPLE 2 — Advanced Patterns
// ========================================================

// --------------------------------------------------------
// 6. ASYNC ITERATION: for await...of
// --------------------------------------------------------
// WHY: When you have an async data source that produces
//      values over time (streams, paginated APIs), for
//      await...of lets you consume them one at a time
//      in a clean loop.

async function* thaliCourseGenerator() {
  // An async generator yields Promises (or awaits internally)
  yield await cookDish("Coconut Chutney", 50);
  yield await cookDish("Sambar", 80);
  yield await cookDish("Avial", 120);
  yield await cookDish("Payasam (dessert)", 30);
}

async function serveThaliCourses() {
  console.log("\n--- Async Iteration: Serving Thali Courses ---");
  let courseNumber = 1;

  for await (const course of thaliCourseGenerator()) {
    console.log(`  Course ${courseNumber++}: ${course.dish}`);
  }
  // Output:
  //   Course 1: Coconut Chutney
  //   Course 2: Sambar
  //   Course 3: Avial
  //   Course 4: Payasam (dessert)

  console.log("All thali courses served.");
}


// --------------------------------------------------------
// 7. CONVERTING CALLBACK APIs TO async/await
// --------------------------------------------------------
// WHY: Many older Node.js APIs use callbacks. Wrapping them
//      in Promises lets you use async/await with them.

// Old-style callback API (simulated)
function tandoorTimerCallback(item, minutes, callback) {
  setTimeout(() => {
    if (minutes > 10) {
      callback(new Error(`${item} overcooked — timer too long!`));
    } else {
      callback(null, { item, minutes, status: "perfectly done" });
    }
  }, minutes * 10); // speed up for demo
}

// Promisified wrapper
function tandoorTimer(item, minutes) {
  return new Promise((resolve, reject) => {
    tandoorTimerCallback(item, minutes, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

// Now we can await it!
async function bakeWithAsyncAwait() {
  console.log("\n--- Converted Callback API ---");
  try {
    const result1 = await tandoorTimer("Naan", 5);
    console.log(`  ${result1.item}: ${result1.status}`);
    // Output: Naan: perfectly done

    const result2 = await tandoorTimer("Roti", 15); // too long!
    console.log(`  ${result2.item}: ${result2.status}`);
  } catch (error) {
    console.log(`  Tandoor error: ${error.message}`);
    // Output: Tandoor error: Roti overcooked — timer too long!
  }
}


// --------------------------------------------------------
// 8. PRACTICAL PATTERN: RETRY WITH ASYNC/AWAIT
// --------------------------------------------------------
// WHY: Network requests fail. A retry loop with exponential
//      backoff is a common real-world pattern that reads
//      beautifully with async/await.

async function unreliableDish(name, failCount) {
  let attempts = 0;
  return () => {
    attempts++;
    if (attempts <= failCount) {
      return Promise.reject(new Error(`${name} attempt #${attempts} failed`));
    }
    return Promise.resolve({ dish: name, status: "success" });
  };
}

async function cookWithRetry(cookFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await cookFn();
      console.log(`    Attempt ${attempt}: ${result.dish} — ${result.status}`);
      return result;
    } catch (error) {
      console.log(`    Attempt ${attempt}: ${error.message}`);
      if (attempt === maxRetries) {
        throw new Error(`All ${maxRetries} attempts failed`);
      }
      // Exponential backoff
      const backoff = attempt * 50;
      console.log(`    Retrying in ${backoff}ms...`);
      await delay(backoff);
    }
  }
}

async function retryDemo() {
  console.log("\n--- Retry Pattern ---");

  // This dish fails twice, then succeeds on attempt 3
  const temperamentalPayasam = await unreliableDish("Payasam", 2);

  try {
    const result = await cookWithRetry(temperamentalPayasam, 4);
    console.log(`  Final result: ${result.dish} is ready!`);
  } catch (error) {
    console.log(`  Gave up: ${error.message}`);
  }
  // Output:
  //     Attempt 1: Payasam attempt #1 failed
  //     Retrying in 50ms...
  //     Attempt 2: Payasam attempt #2 failed
  //     Retrying in 100ms...
  //     Attempt 3: Payasam — success
  //   Final result: Payasam is ready!
}


// --------------------------------------------------------
// 9. TOP-LEVEL AWAIT (MODULE CONTEXT)
// --------------------------------------------------------
// WHY: In ES modules (.mjs files or "type": "module" in
//      package.json), you can use await at the top level
//      without wrapping it in an async function. This is
//      handy for setup/init scripts.

// NOTE: This file runs as a CommonJS script with Node, so
// top-level await would cause a syntax error here. In a
// module context, you'd write:
//
//   const config = await loadConfig();
//   const db = await connectToDatabase(config);
//   console.log("App ready!");
//
// For this demo, we simulate it inside our main runner.


// ========================================================
//  MAIN RUNNER — execute all demos in order
// ========================================================

async function main() {
  // Example 1: Fundamentals
  await makeChutney();
  await makePayasam();
  await makeThaliSequential();
  await makeThaliParallel();
  await cookMultipleDishesWithFallback();

  // Example 2: Advanced patterns
  await serveThaliCourses();
  await bakeWithAsyncAwait();
  await retryDemo();

  console.log("\n--- Amma's thali service is complete! ---");
}

main().catch(err => console.error("Unexpected error:", err));


/**
 * ========================================================
 *  KEY TAKEAWAYS
 * ========================================================
 *  1. An async function ALWAYS returns a Promise. The
 *     return value is automatically wrapped.
 *
 *  2. await pauses the async function (not the thread)
 *     until the awaited Promise settles. It unwraps the
 *     resolved value so you can assign it directly.
 *
 *  3. Use try/catch inside async functions for error
 *     handling — it feels just like synchronous code.
 *
 *  4. SEQUENTIAL: await one after another when tasks depend
 *     on each other. PARALLEL: use Promise.all() when tasks
 *     are independent — total time = slowest task.
 *
 *  5. for await...of consumes async iterables (async
 *     generators, streams) one value at a time.
 *
 *  6. Convert callback APIs by wrapping them in
 *     new Promise((resolve, reject) => { ... }).
 *
 *  7. Top-level await works in ES modules, letting you
 *     await at the script's root without an async wrapper.
 *
 *  8. Common patterns: retry with backoff, timeout races
 *     (see File 33), and parallel-with-fallback using
 *     Promise.allSettled().
 * ========================================================
 */
