# Chapter 34: The Production Countdown

## Story

The calendar had a red circle around Friday. Launch day. MingleSphereQL was going live, and the engineering team was running through the final production readiness checklist. The code was solid, the schema was battle-tested, and the queries had been optimized. But shipping to production is not just about correct queries -- it is about resilience, observability, and operational awareness.

Mara, the site reliability engineer, gathered the team around her monitor. "Before we flip the switch, I need to know three things. First, is our connection pool configured correctly? A pool that is too small will queue requests and add latency. A pool that is too large will overwhelm the database with connections. Second, are we handling errors gracefully? In production, queries will fail -- bad input, deadlocks, timeouts. The application needs to catch those failures, log them with useful context, and return sensible responses. Third, can we observe what the database is doing? We need metrics: active connections, database size, table counts, index counts. These are the vital signs that tell us whether the system is healthy."

The team built five capabilities for the launch checklist. They started by inspecting the connection pool itself -- reading `totalCount`, `idleCount`, and `waitingCount` from the `pg` Pool object to understand connection utilization. Next, they implemented named prepared statements, which PostgreSQL can cache on the server side for repeated execution, reducing parse overhead on hot paths. They built a query performance measurement utility using `performance.now()` to capture execution timing alongside result metadata. Then came graceful error handling -- a try/catch wrapper that captures PostgreSQL error codes, messages, and severity levels so that failures can be diagnosed without crashing the application. Finally, they wrote a database statistics collector that queries `pg_stat_activity`, `pg_database_size`, `information_schema.tables`, and `pg_indexes` to produce a health dashboard snapshot.

When Friday morning arrived, Mara ran the checklist one last time. Connection pool: healthy. Prepared statements: cached. Error handling: bulletproof. Database stats: all green. She looked at the team, smiled, and said: "We are go for launch."

MingleSphereQL went live that afternoon. And when the traffic surged, the system held steady -- because the team had not just built features, they had built for production.

## Concepts

- **Connection pooling**: Reuse database connections across requests to avoid the overhead of establishing new connections.
- **Pool metrics**: `totalCount` (allocated connections), `idleCount` (available), `waitingCount` (queued requests waiting for a connection).
- **Prepared statements**: Server-side cached query plans identified by a name, reducing parse and plan overhead for repeated queries.
- **Performance measurement**: Use `performance.now()` for high-resolution timing of database operations.
- **Graceful error handling**: Catch PostgreSQL errors and extract structured information (`code`, `message`, `severity`) for logging and monitoring.
- **Database introspection**: Query system catalogs (`pg_stat_activity`, `information_schema`, `pg_indexes`) to collect operational metrics.

## Code Examples

### Inspecting the connection pool

```ts
const pool = getPool();
console.log({
  total: pool.totalCount,    // All connections (active + idle)
  idle: pool.idleCount,      // Connections available for use
  waiting: pool.waitingCount // Requests queued for a connection
});
```

### Named prepared statements

```ts
const result = await pool.query({
  name: 'find_user_by_username',
  text: 'SELECT id, username, email FROM users WHERE username = $1',
  values: ['alice'],
});
```

### Measuring query performance

```ts
const start = performance.now();
const result = await pool.query('SELECT * FROM posts LIMIT 100');
const durationMs = performance.now() - start;
console.log(`Query took ${durationMs.toFixed(2)}ms, returned ${result.rowCount} rows`);
```

### Graceful error handling

```ts
try {
  await pool.query(someQuery);
} catch (error: any) {
  console.error({
    code: error.code,       // e.g., '42P01' for undefined table
    message: error.message,
    severity: error.severity // e.g., 'ERROR'
  });
}
```

### Database health check

```sql
SELECT
  (SELECT COUNT(*)::int FROM pg_stat_activity WHERE datname = current_database()) as connections,
  (SELECT pg_database_size(current_database())) as size_bytes,
  (SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = 'public') as tables,
  (SELECT COUNT(*)::int FROM pg_indexes WHERE schemaname = 'public') as indexes;
```

## Practice Goals

1. Read and return connection pool configuration and runtime metrics.
2. Execute a named prepared statement for efficient repeated queries.
3. Measure query execution time with high-resolution timing and return result metadata.
4. Implement try/catch error handling that captures PostgreSQL error codes, messages, and severity.
5. Collect database statistics by querying PostgreSQL system catalogs and views.

## Tips

- The `pg` Pool's `max` option defaults to `10` if not explicitly set. In production, tune this based on your database's `max_connections` setting and the number of application instances.
- Named prepared statements are cached per connection. If the pool rotates connections, the statement will be re-prepared on the new connection automatically.
- `performance.now()` provides sub-millisecond precision -- much better than `Date.now()` for benchmarking queries.
- PostgreSQL error codes follow a structured pattern: `42P01` means "undefined table", `23505` means "unique violation", `23503` means "foreign key violation". Familiarize yourself with the common codes for better error handling.
- The `pg_stat_activity` view shows all active connections across all clients -- not just your application's pool. It is a crucial diagnostic tool for connection leak detection.
- `pg_database_size()` returns a `bigint`, which the `pg` driver delivers as a string in JavaScript. Parse it with `parseInt()` or `BigInt()` if you need to do arithmetic.
