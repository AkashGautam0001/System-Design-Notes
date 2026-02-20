# Chapter 25: The Pipeline

## Story

The analytics dashboard for MingleSphereQL was the most requested feature on the internal roadmap. Product managers wanted to see user engagement at a glance: how many users were online versus offline, what tags were trending on each post, who had been most active recently, and how user profiles looked when display names were missing. The engineering team started building these reports with application-layer code -- fetching rows from the database, looping through them in JavaScript, building maps, concatenating strings, and handling null values with ternary operators. It worked, but it was slow and brittle. Every new report required dozens of lines of transformation code.

Then the database architect introduced the team to PostgreSQL's data transformation functions -- the pipeline tools that could reshape, aggregate, and clean data inside a single SQL query. Instead of fetching every user and grouping them in JavaScript, they used `ARRAY_AGG` to produce grouped arrays directly from the database. Instead of fetching all tags for a post and joining them with commas in code, they used `STRING_AGG` to produce a ready-to-display string. Instead of running three separate COUNT queries for online users, offline users, and verified users, they used `COUNT(*) FILTER (WHERE ...)` to compute all three in a single pass over the table.

The null-handling story got cleaner too. `COALESCE` replaced chains of `if (value !== null)` checks, providing a fallback value when a column was NULL. `NULLIF` went the other direction, converting empty strings back to NULL so that downstream code could treat "no value" consistently regardless of whether the database stored it as NULL or as an empty string.

But the most powerful tool in the pipeline was the LATERAL join. Standard joins can only reference the tables already in the FROM clause. A LATERAL subquery, however, can reference columns from preceding tables -- which means you can write "for each user, find their most recent post" as a single query. No subqueries in SELECT. No window functions with partitions. Just a clean LEFT JOIN LATERAL that reads like English: "for each user, look sideways at their posts, take the newest one, and join it."

The analytics dashboard went from hundreds of lines of JavaScript transformation code to a handful of SQL queries, each producing exactly the shape of data the frontend needed. The pipeline was complete.

## Key Concepts

- **ARRAY_AGG**: Aggregates values from multiple rows into a PostgreSQL array. Supports `ORDER BY` within the aggregation to control the element order. Returns `NULL` if no rows match (use `COALESCE` for an empty array).
- **STRING_AGG**: Concatenates values from multiple rows into a single delimited string. Requires a delimiter (e.g., `', '`) and supports `ORDER BY` for consistent ordering.
- **FILTER Clause**: A PostgreSQL extension to aggregate functions that applies a WHERE condition to each row before aggregating. Allows multiple conditional counts in a single query without CASE WHEN.
- **COALESCE**: Returns the first non-NULL argument. Commonly used to provide fallback values, such as `COALESCE(display_name, username)` to use a display name if available, otherwise fall back to the username.
- **NULLIF**: Returns NULL if the two arguments are equal, otherwise returns the first argument. Useful for converting sentinel values (like empty strings) to NULL for consistent null handling.
- **LATERAL Join**: A subquery in the FROM clause preceded by the keyword LATERAL. It can reference columns from tables that appear earlier in the FROM clause, enabling correlated subqueries that execute once per row of the outer table.

## Code Examples

### ARRAY_AGG
```sql
SELECT status, ARRAY_AGG(username ORDER BY username) as usernames
FROM users
GROUP BY status
ORDER BY status;
-- Result: { status: 'online', usernames: ['alice', 'bob'] }
```

### STRING_AGG with Joins
```sql
SELECT p.id, STRING_AGG(t.name, ', ' ORDER BY t.name) as tag_list
FROM posts p
LEFT JOIN post_tags pt ON p.id = pt.post_id
LEFT JOIN tags t ON pt.tag_id = t.id
GROUP BY p.id;
-- Result: { id: 1, tag_list: 'graphql, javascript, typescript' }
```

### Conditional Aggregation with FILTER
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'online')::int as online_count,
  COUNT(*) FILTER (WHERE status = 'offline')::int as offline_count,
  COUNT(*) FILTER (WHERE is_verified = true)::int as verified_count
FROM users;
```

### COALESCE and NULLIF
```sql
SELECT id,
       COALESCE(display_name, username) as effective_name,
       NULLIF(bio, '') as bio_or_null
FROM users;
```

### LATERAL Join
```sql
SELECT u.id, u.username, latest.content, latest.created_at
FROM users u
LEFT JOIN LATERAL (
  SELECT content, created_at
  FROM posts
  WHERE author_id = u.id
  ORDER BY created_at DESC
  LIMIT 1
) latest ON true
ORDER BY u.id;
```

## What You Will Practice

1. Using `ARRAY_AGG` to group usernames by status into PostgreSQL arrays
2. Using `STRING_AGG` with joins to build comma-separated tag lists for posts
3. Performing conditional aggregation with `COUNT(*) FILTER (WHERE ...)` for multi-metric queries
4. Applying `COALESCE` and `NULLIF` to handle NULL and empty-string values in user profiles
5. Writing a `LEFT JOIN LATERAL` query to fetch each user's most recent post

## Tips

- **ARRAY_AGG and NULL**: If no rows match, `ARRAY_AGG` returns NULL, not an empty array. Wrap it in `COALESCE(ARRAY_AGG(...), '{}')` if you need an empty array instead.
- **STRING_AGG ignores NULLs**: If some values in the aggregation are NULL, they are silently skipped. This is usually the desired behavior when using LEFT JOINs where some rows have no match.
- **FILTER is PostgreSQL-specific**: The `FILTER (WHERE ...)` syntax is a PostgreSQL extension not available in all databases. The portable alternative is `SUM(CASE WHEN ... THEN 1 ELSE 0 END)`, but FILTER is cleaner and faster.
- **LATERAL vs correlated subquery**: A correlated subquery in SELECT can only return one column. A LATERAL join can return multiple columns and multiple rows, making it far more flexible.
- **Performance of LATERAL**: For each row in the outer table, the LATERAL subquery executes once. This is fine for small outer tables or when the subquery can use an index. For very large outer tables, consider materialized alternatives.
