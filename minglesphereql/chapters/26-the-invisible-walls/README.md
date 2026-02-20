# Chapter 26: The Invisible Walls

## Story

The email arrived at 7:14 AM on a Tuesday morning, and it changed everything about how MingleSphereQL handled data. It was from GlobalTech Industries, a multinational conglomerate with 40,000 employees, and they wanted to bring MingleSphere into their organization. There was just one condition: each of their five regional divisions -- North America, Europe, Asia-Pacific, Latin America, and Africa -- must operate as fully isolated tenants on the platform. An employee in the Berlin office should never see a post from the Tokyo team unless both teams explicitly opted in. A manager in Sao Paulo should never stumble across HR discussions happening in Chicago. The data had to be invisible across boundaries.

The engineering team's first instinct was the obvious one: add WHERE clauses everywhere. Every query, every API endpoint, every background job would include `WHERE tenant_id = ?`. It sounded simple enough. But the lead architect, Priya, shook her head. "We tried that at my last company," she said, leaning back in her chair. "We had 2,300 queries across the codebase. Within six months, we found twelve places where someone forgot the WHERE clause. Twelve data leaks. One of them exposed salary data across divisions. The CEO was not amused."

She pulled up a PostgreSQL documentation page. "Row-Level Security," she said. "The database enforces the rules, not the application. Even if a developer forgets to add the filter, the database silently applies it. The rows simply do not exist from the perspective of the query. It is like invisible walls."

Row-Level Security (RLS) is one of PostgreSQL's most powerful yet underutilized features. When enabled on a table, every query against that table is automatically filtered through a set of policies -- boolean expressions that determine which rows a given session can see, insert, update, or delete. If no policy grants access, the default behavior is to deny everything. This is not a query rewrite at the application layer; it is enforcement at the storage engine level. No ORM bug, no missing middleware, no accidental API exposure can bypass it.

The concept is deceptively simple: you enable RLS on a table, define one or more policies, and set a session variable (like `app.current_user_id` or `app.tenant_id`) at the start of each database connection. From that moment forward, the database acts as though the unauthorized rows do not exist at all. A `SELECT *` returns only permitted rows. A `COUNT(*)` counts only permitted rows. Even `DELETE FROM table` without a WHERE clause will only delete rows the session is allowed to see.

This chapter introduces RLS from the ground up. You will learn how to enable it, observe the default-deny behavior, write your first policies, and see how `FORCE ROW LEVEL SECURITY` ensures that even the table owner is subject to the rules. By the end, the invisible walls will be standing, and MingleSphereQL's multi-tenant future will have a solid foundation.

## Key Concepts

- **Enabling RLS**: `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY` activates policy enforcement. Without any policies, all queries return zero rows (default-deny).
- **FORCE ROW LEVEL SECURITY**: By default, table owners (typically the role that created the table) bypass RLS. `ALTER TABLE tablename FORCE ROW LEVEL SECURITY` ensures that even the owner is subject to policies -- critical for testing and for superuser connections.
- **Session Variables**: PostgreSQL's `current_setting()` and `set_config()` functions allow you to attach arbitrary key-value pairs to a database session. RLS policies reference these variables to determine the current user or tenant.
- **USING Clause**: Defines which existing rows a session can see (applies to SELECT, UPDATE, DELETE). Think of it as an automatic WHERE clause.
- **WITH CHECK Clause**: Defines which rows a session is allowed to insert or update to. It validates the new row data rather than filtering existing rows.
- **Default Deny**: When RLS is enabled but no policies exist, all operations return zero rows. This is a safe default -- you must explicitly grant access.
- **pg_policies Catalog**: The `pg_policies` system view lets you inspect all active policies, their commands (SELECT, INSERT, UPDATE, DELETE, ALL), and their expressions.

## Code Examples

### Enable RLS on a table
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
```

### Create a SELECT policy using session variables
```sql
CREATE POLICY users_see_own ON users
  FOR SELECT
  USING (id = current_setting('app.current_user_id', true)::int);
```

### Set session variable and query within a transaction
```ts
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query("SELECT set_config('app.current_user_id', '1', true)");
  const result = await client.query('SELECT * FROM users');
  await client.query('COMMIT');
  // result.rows contains only the row with id = 1
} finally {
  client.release();
}
```

### Create an INSERT policy with WITH CHECK
```sql
CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (username = current_setting('app.current_username', true));
```

### Query pg_policies to inspect active policies
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
```

## Common Pitfalls

- **Forgetting FORCE**: If you created the table with the same role you are querying from, RLS will not apply unless you use `ALTER TABLE ... FORCE ROW LEVEL SECURITY`. This catches many developers by surprise during testing.
- **Missing second argument in current_setting**: `current_setting('app.tenant_id')` will throw an error if the variable is not set. Always use `current_setting('app.tenant_id', true)` to return NULL instead of erroring when the variable is absent.
- **Locking yourself out**: Enabling RLS with no policies and FORCE means even you cannot see the data. Always create at least one policy before FORCE, or be prepared to disable RLS to recover.
- **Superuser bypass**: Superusers bypass RLS even with FORCE. For production multi-tenant systems, never let your application connect as a superuser.
- **Connection pooling**: Session variables are per-connection. With connection pooling, you must set the variables at the start of every transaction, not once at connection time. Use `SET LOCAL` or `set_config(..., true)` to scope variables to the current transaction.

## What You Will Practice

1. Enabling Row-Level Security on a table and verifying it through the `pg_class` system catalog.
2. Creating a basic SELECT policy that restricts each user to seeing only their own row using session variables.
3. Observing the default-deny behavior when RLS is enabled without any policies.
4. Writing an INSERT policy with `WITH CHECK` to control which rows can be created.
5. Querying the `pg_policies` catalog to inspect all active policies on a table.
