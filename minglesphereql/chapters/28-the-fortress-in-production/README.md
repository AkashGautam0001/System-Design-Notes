# Chapter 28: The Fortress in Production

## Story

Launch day had arrived. After weeks of building and testing Row-Level Security policies in development, MingleSphereQL was about to go live with its first multi-tenant enterprise customer: GlobalTech Industries. Five regional divisions, thousands of employees, and an ironclad contractual requirement that no data would leak between tenants. The penalty clause for a cross-tenant data breach was severe enough to make the CTO lose sleep.

The deployment was scheduled for 2 AM on a Saturday -- the quietest window in the traffic graph. Priya, the lead architect, had prepared a checklist that read more like a military operations brief than a release plan. Step one: add the `tenant_id` column to all tenant-scoped tables. Step two: backfill existing data with the correct tenant identifiers. Step three: enable RLS and create the isolation policies. Step four: verify isolation with automated cross-tenant penetration tests. Step five: monitor query plans to ensure the RLS filters were not destroying performance.

"The database is the last line of defense," Priya reminded the team during the pre-launch huddle. "If the application layer has a bug -- a missing middleware, a malformed JWT, a race condition in the tenant resolver -- the database must still hold the line. That is the entire point of RLS. It is not a convenience feature. It is a fortress."

The first challenge was the tenant context propagation pattern. In a connection-pooled environment, you cannot simply set a session variable once and forget about it. Connections are shared across requests. The pattern that emerged was transactional scoping: at the start of every database transaction, the application sets `SET LOCAL app.tenant_id = ?`. The `SET LOCAL` command scopes the variable to the current transaction only. When the transaction commits or rolls back, the variable is automatically cleared. No leaked state. No cross-request contamination. Every request starts clean.

The second challenge was performance. RLS adds a filter to every query plan. The team needed to verify that PostgreSQL's query planner was smart enough to push the RLS predicate down into index scans rather than applying it as a post-filter on a sequential scan. Running `EXPLAIN (FORMAT JSON)` on tenant-filtered queries revealed the answer: with a proper index on `tenant_id`, the planner combined the RLS filter with the query's own WHERE clause into a single index condition. The performance overhead was negligible.

The third challenge was observability. In production, you need to know which tables have RLS enabled, which have it forced, and how many policies are attached to each table. A simple query against `pg_class` and `pg_policies` provides a real-time dashboard of the entire RLS landscape. If someone accidentally disables RLS on a table, the monitoring query catches it immediately.

The deployment went smoothly. By 3:15 AM, all five divisions were live on the platform. The cross-tenant test suite -- 200 automated scenarios that attempted to read, write, update, and delete data across tenant boundaries -- passed with zero failures. The fortress was holding.

This chapter puts you in the architect's seat. You will set up multi-tenant RLS from scratch, verify cross-tenant isolation, implement the transactional context pattern with `SET LOCAL`, inspect query plans to understand the performance characteristics, and build the monitoring queries that keep the fortress under surveillance.

## Key Concepts

- **Multi-Tenant Isolation**: Adding a `tenant_id` column and creating an RLS policy like `USING (tenant_id = current_setting('app.tenant_id')::int)` ensures complete data isolation between tenants at the database level.
- **SET LOCAL for Transaction Scoping**: `SET LOCAL app.tenant_id = '1'` sets the variable only for the current transaction. When the transaction ends, the variable is automatically cleared. This is the production-safe pattern for connection pooling.
- **set_config vs SET LOCAL**: `SELECT set_config('app.tenant_id', '1', true)` is the function equivalent of `SET LOCAL`. The third parameter `true` means "local to transaction."
- **EXPLAIN with RLS**: Running `EXPLAIN (FORMAT JSON) SELECT ...` on a table with RLS shows how the database applies the policy filter. Look for `Filter` entries in the plan that correspond to your RLS policy expressions.
- **pg_class for RLS Status**: `pg_class.relrowsecurity` indicates whether RLS is enabled; `pg_class.relforcerowsecurity` indicates whether FORCE is active. Combined with `pg_policies`, this gives a complete picture of the RLS configuration.
- **Cross-Tenant Penetration Testing**: After setting up RLS, always test by setting the tenant context to one tenant and attempting to access another tenant's data. The query should return zero rows, not an error -- the data is invisible, not forbidden.

## Code Examples

### Add tenant_id and create isolation policy
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE POLICY users_tenant_isolation ON users
  USING (tenant_id = current_setting('app.tenant_id', true)::int);
```

### Transactional tenant context with SET LOCAL
```ts
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query("SET LOCAL app.tenant_id = '1'");
  const result = await client.query('SELECT * FROM users');
  await client.query('COMMIT');
  // result.rows contains only tenant 1 data
  // After COMMIT, app.tenant_id is automatically cleared
} finally {
  client.release();
}
```

### EXPLAIN to inspect RLS filter in query plan
```ts
const result = await pool.query('EXPLAIN (FORMAT JSON) SELECT * FROM users');
const plan = result.rows[0]['QUERY PLAN'];
const hasFilter = JSON.stringify(plan).includes('Filter');
```

### Monitor RLS status across tables
```sql
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  COUNT(p.policyname)::int AS policy_count
FROM pg_class c
LEFT JOIN pg_policies p ON c.relname = p.tablename
WHERE c.relname IN ('users', 'posts')
GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
ORDER BY c.relname;
```

## Common Pitfalls

- **Forgetting to set tenant context**: If `app.tenant_id` is not set and your policy uses `current_setting('app.tenant_id', true)::int`, the cast to int will fail on NULL. Consider adding a `COALESCE` or ensuring the variable is always set before queries.
- **Connection pool state leakage**: Never use `SET` (without `LOCAL`) in a pooled environment. The variable persists on the connection and may leak to the next request. Always use `SET LOCAL` or `set_config(..., true)`.
- **Missing indexes on tenant_id**: Without an index on `tenant_id`, every RLS-filtered query becomes a sequential scan with a post-filter. Create an index: `CREATE INDEX idx_users_tenant_id ON users (tenant_id)`.
- **Backfill before enabling RLS**: If you enable RLS before backfilling `tenant_id`, rows with NULL tenant_id become invisible (since `NULL = 1` is false). Backfill first, then enable.
- **Testing only happy paths**: Always test cross-tenant access, not just same-tenant access. Verify that UPDATE, DELETE, and INSERT are also isolated, not just SELECT.
- **FORCE in production**: In development, you connect as the table owner and need FORCE. In production, your application should connect as a non-owner role, making FORCE unnecessary (but still recommended for defense in depth).

## What You Will Practice

1. Setting up complete multi-tenant isolation by adding a `tenant_id` column and creating RLS policies.
2. Verifying cross-tenant isolation by querying as one tenant and confirming another tenant's data is invisible.
3. Implementing the transactional tenant context pattern using `SET LOCAL` within a dedicated client connection.
4. Inspecting EXPLAIN output to observe how PostgreSQL applies RLS filters in query plans.
5. Building monitoring queries that report RLS status (enabled, forced, policy count) across all tables.
