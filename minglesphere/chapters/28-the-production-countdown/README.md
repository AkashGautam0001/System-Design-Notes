# Chapter 28: The Production Countdown

## Story

MingleSphere has survived twenty-seven chapters of development, testing, and feature building. The platform handles users, posts, transactions, geolocation, real-time events, and complex aggregations. But there is one final challenge before launch day: making sure everything is production-ready. The ops team has a checklist, and every item must pass before the servers go live.

Connection pooling needs to be tuned so the application can handle hundreds of concurrent users without overwhelming the database. Queries must be optimized -- lean queries for read-heavy endpoints, indexes verified through explain plans, and error handling hardened so a single bad connection does not crash the entire application. Most importantly, the application must shut down gracefully, finishing in-flight operations and closing database connections cleanly when a deploy or restart occurs.

Your mission is to complete the production countdown checklist. You will configure connection pool settings, demonstrate the performance benefit of lean queries, use explain to verify index usage, implement standardized error handling, and build a graceful shutdown routine.

## Concepts

### Connection Pooling

Mongoose maintains a pool of connections to MongoDB. Tuning the pool size affects how many concurrent operations your application can handle.

```js
const conn = mongoose.createConnection(uri, {
  maxPoolSize: 20,     // maximum connections in the pool
  minPoolSize: 5,      // minimum connections kept open
  maxIdleTimeMS: 30000, // close idle connections after 30 seconds
});
```

### Lean Queries

By default, Mongoose wraps query results in full Mongoose documents with change tracking, getters, and methods. For read-only operations, `.lean()` returns plain JavaScript objects, which is significantly faster and uses less memory.

```js
// Returns Mongoose documents (with .save(), .toJSON(), etc.)
const docs = await Model.find();

// Returns plain JS objects (POJOs) -- much faster for read-only use
const plainDocs = await Model.find().lean();
plainDocs[0].save; // undefined -- no Mongoose methods
```

### Explain Plans

Use `.explain('executionStats')` to see how MongoDB executes a query. This reveals whether an index is being used, how many documents were scanned, and how long the query took.

```js
const explain = await Model.find({ email: 'user@example.com' }).explain('executionStats');
// Check explain.executionStats.totalDocsExamined
// Check explain.queryPlanner.winningPlan for index usage
```

### Error Handling

Production applications must handle connection failures gracefully. Use try/catch with connection attempts and return standardized error objects that upstream code can process uniformly.

```js
try {
  const conn = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 1000 });
  await conn.asPromise();
} catch (error) {
  return { type: 'ConnectionError', message: error.message };
}
```

### Graceful Shutdown

When your application receives a termination signal, it should finish active operations and close database connections before exiting. This prevents data corruption and connection leaks.

```js
const conn = mongoose.createConnection(uri);
await conn.asPromise();

// ... perform operations ...

// Clean shutdown
await conn.close();
```

## Your Mission

Open `exercise.js` and implement the five exported functions:

1. **configureConnectionPool** -- Connect with custom pool options (maxPoolSize: 20, minPoolSize: 5, maxIdleTimeMS: 30000) and return the configuration.
2. **leanQueryPerformance** -- Seed 100 users, query with and without `.lean()`, return both results for comparison.
3. **analyzeQueryWithExplain** -- Create an index on email, run an explained query, return the explain output.
4. **handleErrors** -- Attempt to connect to an invalid URI, catch the error, return a standardized error object.
5. **gracefulShutdown** -- Connect, perform an operation, close the connection cleanly, and confirm each step succeeded.

Run your tests with:
```bash
npm run test:28
```

## Hints

<details>
<summary>Hint 1: Using createConnection for isolated pools</summary>

Use `mongoose.createConnection(uri, options)` instead of `mongoose.connect()` when you need an isolated connection with its own pool settings. Call `.asPromise()` to wait for the connection to be established, and `.close()` to shut it down.

</details>

<details>
<summary>Hint 2: Lean queries return POJOs</summary>

After calling `.lean()`, the returned objects are plain JavaScript objects. They will not have Mongoose document methods like `.save()` or `.toJSON()`. The test checks for this by verifying that `result.save` is `undefined`.

</details>

<details>
<summary>Hint 3: Creating an index before explain</summary>

Use `Model.collection.createIndex({ email: 1 })` to create the index directly on the collection. Then run your `.explain('executionStats')` query. The explain output shows whether the query planner used the index.

</details>

<details>
<summary>Hint 4: Triggering a connection error</summary>

Pass a clearly invalid hostname like `'mongodb://invalid-host-that-does-not-exist:27017/fake_db'` and set `serverSelectionTimeoutMS` to a low value (like 1000ms) so the test does not wait too long. The connection will fail and throw an error you can catch.

</details>

<details>
<summary>Hint 5: Graceful shutdown pattern</summary>

Create a connection, await it with `.asPromise()`, perform a simple read operation like `conn.db.listCollections().toArray()`, then close with `await conn.close()`. Track each step with boolean flags and return them as an object.

</details>
