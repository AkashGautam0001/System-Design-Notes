# Chapter 21: The View from Above

## Story

The MingleSphereQL dashboard is getting heavier. Every time the admin panel loads, it fires off half a dozen complex queries -- joining users with posts, counting comments, computing engagement metrics. The queries are correct, but they are slow. And worse, the same complex joins are scattered across multiple endpoints, duplicated and drifting out of sync.

You step back and look at the problem from above. What if you could define a query once and treat its result like a table? That is exactly what a view does. A SQL view is a named query that behaves like a virtual table. When you SELECT from a view, PostgreSQL runs the underlying query on the fly. The data is always fresh, and the logic lives in one place. If the definition of "user statistics" changes, you update the view and every consumer benefits instantly.

But freshness has a cost. If the underlying query is expensive -- involving multiple joins, aggregations, and large table scans -- running it on every request is wasteful. This is where materialized views enter the picture. A materialized view executes the query once and stores the result physically on disk. Subsequent reads are blazingly fast because they read from the stored snapshot. The trade-off is that the data can become stale. You must explicitly REFRESH the materialized view to pick up new data. This makes materialized views ideal for analytics dashboards that update periodically rather than in real time.

The combination of views and materialized views gives you a powerful spectrum. Use regular views for always-fresh data that is not too expensive to compute. Use materialized views for heavy analytics that can tolerate periodic staleness. Together, they let you define your analytics logic once, store it where it belongs -- in the database -- and query it with the simplicity of a single SELECT statement.

In this chapter, you will create both types of views, learn to refresh materialized views, query from views with filters, and clean up after yourself by dropping views when they are no longer needed.

## Concepts

- **View**: A named SQL query that acts as a virtual table; always returns fresh results
- **Materialized View**: A named query whose results are stored physically; must be refreshed
- **CREATE OR REPLACE VIEW**: Creates or updates a view definition
- **CREATE MATERIALIZED VIEW**: Creates a materialized view (use IF NOT EXISTS for safety)
- **REFRESH MATERIALIZED VIEW**: Re-executes the query and updates the stored data
- **DROP VIEW / DROP MATERIALIZED VIEW**: Removes the view definition and stored data

## Code Examples

### Creating a regular view

```sql
CREATE OR REPLACE VIEW user_stats_view AS
SELECT
  u.id, u.username, u.display_name,
  COUNT(DISTINCT p.id)::int as post_count,
  COUNT(DISTINCT c.id)::int as comment_count
FROM users u
LEFT JOIN posts p ON u.id = p.author_id
LEFT JOIN comments c ON u.id = c.author_id
GROUP BY u.id, u.username, u.display_name;
```

### Creating a materialized view

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS post_analytics_mv AS
SELECT
  p.id, p.content, p.likes_count,
  p.author_id, u.username as author_name,
  COUNT(c.id)::int as comment_count
FROM posts p
JOIN users u ON p.author_id = u.id
LEFT JOIN comments c ON p.id = c.post_id
GROUP BY p.id, p.content, p.likes_count, p.author_id, u.username;
```

### Refreshing and querying

```sql
-- Refresh to pick up new data
REFRESH MATERIALIZED VIEW post_analytics_mv;

-- Query like a normal table
SELECT * FROM user_stats_view WHERE post_count >= 3 ORDER BY post_count DESC;
```

### Dropping views

```sql
DROP MATERIALIZED VIEW IF EXISTS post_analytics_mv;
DROP VIEW IF EXISTS user_stats_view;
```

## Practice Goals

1. Create a regular view that computes user statistics with post and comment counts
2. Create a materialized view for post analytics including author names and comment counts
3. Refresh a materialized view after new data has been inserted
4. Query a view with WHERE filters and ORDER BY clauses
5. Clean up by dropping both view types safely with IF EXISTS

## Tips

- Always use `IF NOT EXISTS` with `CREATE MATERIALIZED VIEW` to avoid errors on re-runs
- Regular views support `CREATE OR REPLACE`; materialized views do not -- you must drop and recreate
- Materialized views can have indexes added to them for even faster reads
- `REFRESH MATERIALIZED VIEW CONCURRENTLY` allows reads during refresh (requires a unique index)
- Drop materialized views before regular views if the materialized view depends on the regular view
- Views do not store data; they are query aliases. Materialized views store data physically
- Use `::int` casts in COUNT to avoid bigint type mismatches in your application code
