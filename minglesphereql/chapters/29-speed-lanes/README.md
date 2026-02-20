# Chapter 29: Speed Lanes

## The Story So Far

MingleSphereQL has grown beyond anyone's wildest expectations. What started as a small social platform now handles millions of users and tens of millions of posts. The engineering team is celebrating the milestone -- until the alert dashboard lights up red. Response times on the user search endpoint have climbed from 15 milliseconds to 3 full seconds. The post feed, once snappy, now makes users stare at loading spinners. The database server's CPU is pinned at 95%, and it is doing the same thing over and over: sequential scans across massive tables, reading every single row just to find the one that matches.

The senior DBA pulls up a terminal and types two words that will change everything: `EXPLAIN ANALYZE`. The output tells the story -- PostgreSQL is walking through the entire users table, row by row, comparing usernames. With two million rows, that is a lot of walking. The solution is not more hardware or a bigger server. The solution is *speed lanes* -- indexes that let the database skip directly to the rows it needs, like an express lane on a highway that bypasses all the traffic.

But not all indexes are created equal. A B-tree index is the workhorse, perfect for equality and range queries. A partial index is the specialist, covering only the rows that matter (why index deleted users when nobody searches for them?). An expression index is the shape-shifter, transforming data on the fly so that case-insensitive searches become instant. Together, these tools transform a struggling database into a responsive engine that handles millions of queries without breaking a sweat.

## Concepts Covered

- **B-tree indexes**: The default and most common index type. Ideal for equality (`=`), range (`<`, `>`, `BETWEEN`), and sorting (`ORDER BY`) queries.
- **Partial indexes**: Indexes that only cover rows matching a `WHERE` condition. Smaller, faster, and more targeted than full indexes.
- **Expression indexes**: Indexes on the result of an expression or function (e.g., `LOWER(username)`), enabling efficient queries on transformed data.
- **EXPLAIN ANALYZE**: The diagnostic tool that shows exactly how PostgreSQL executes a query, including whether it uses an index or falls back to a sequential scan.
- **pg_indexes catalog**: The system view where PostgreSQL records every index, its definition, and which table it belongs to.

## Code Examples

### Creating a B-tree Index

```sql
CREATE INDEX IF NOT EXISTS idx_posts_content ON posts(content);
```

### Creating a Partial Index

```sql
-- Only index active (non-deleted) users
CREATE INDEX IF NOT EXISTS idx_active_users
  ON users(email)
  WHERE deleted_at IS NULL;
```

### Creating an Expression Index

```sql
-- Enable case-insensitive username lookups
CREATE INDEX IF NOT EXISTS idx_users_lower_username
  ON users(LOWER(username));
```

### Using EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, FORMAT JSON)
  SELECT * FROM users WHERE username = 'alice';
```

The JSON output includes the query plan tree, node types (Seq Scan, Index Scan, etc.), actual row counts, and the total execution time in milliseconds.

### Listing Indexes

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
ORDER BY indexname;
```

## Practice Goals

1. **Create a B-tree index** on the posts table and verify it exists and is of the correct type.
2. **Create a partial index** that only covers active users, keeping the index small and fast.
3. **Create an expression index** that enables efficient case-insensitive username lookups.
4. **Run EXPLAIN ANALYZE** on a real query and interpret the execution plan and timing.
5. **Query pg_indexes** to list all indexes on a table and understand what each one does.

## Tips

- Always use `IF NOT EXISTS` when creating indexes so your code is idempotent.
- Partial indexes are powerful for tables with a "soft delete" pattern -- index only the rows users actually query.
- Expression indexes must match the expression in the query exactly. If you index `LOWER(username)`, your query must also use `LOWER(username)` in the `WHERE` clause.
- `EXPLAIN ANALYZE` actually runs the query (including writes!). Use it on read queries or inside transactions you can roll back.
- The `FORMAT JSON` option gives structured output that is easy to parse programmatically.
- Creating an index on a large table locks it for writes by default. In production, use `CREATE INDEX CONCURRENTLY` to avoid downtime.
