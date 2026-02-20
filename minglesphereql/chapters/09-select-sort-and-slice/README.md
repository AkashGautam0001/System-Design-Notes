# Chapter 9: Select, Sort, and Slice

## Story

The user directory page of MingleSphereQL was a disaster. When it first launched, it simply dumped every user onto a single page. With fifty users, this was fine. With fifty thousand, it was unusable. The page took twelve seconds to load, the browser froze trying to render an endless list, and users scrolled for minutes trying to find anyone specific. Something had to change.

The product manager sketched out the requirements on a napkin during lunch: "Users should see a paginated list, maybe 20 per page. They should be able to sort by newest first or oldest first. The admin dashboard needs to know how many users are in each status category. And we need a leaderboard -- the top contributors ranked by post count." Each requirement demanded a different SQL technique: ORDER BY for sorting, LIMIT and OFFSET for pagination, GROUP BY with COUNT for aggregation, and the combination of ORDER BY with LIMIT for top-N queries.

In the world of databases, these operations are fundamental building blocks. Sorting allows users to find what they need quickly. Pagination prevents overwhelming both the server and the client by breaking large result sets into manageable chunks. Aggregation condenses thousands of rows into meaningful summaries -- "3,247 users are online right now" is far more useful than a list of 3,247 usernames. And top-N queries power leaderboards, trending content, and recommendation systems.

Drizzle ORM provides clean, chainable methods for all of these: `orderBy()` with `asc()` and `desc()` helpers, `limit()` and `offset()` for pagination, and `groupBy()` combined with aggregate functions like `count()`. The beauty of Drizzle's approach is that these methods compose naturally -- you can chain `.where().orderBy().limit().offset()` in a single, readable expression that generates optimized SQL.

In this chapter, you will implement five essential patterns that turn raw data into organized, navigable, and insightful views of MingleSphereQL's user base.

## Key Concepts

- **ORDER BY with asc/desc**: Sorts results by a column in ascending or descending order.
- **LIMIT and OFFSET**: Retrieves a specific "page" of results. OFFSET skips rows, LIMIT caps the count.
- **GROUP BY with count()**: Groups rows by a column and counts entries in each group.
- **Aggregate Functions**: `count()`, `sum()`, `avg()`, `min()`, `max()` -- condense rows into single values.
- **Top-N Queries**: Combine ORDER BY (descending) with LIMIT to get the highest/lowest N records.

## Code Examples

### Sorting Results
```typescript
import { asc, desc } from 'drizzle-orm';

// Oldest first
const oldest = await db.select().from(schema.users).orderBy(asc(schema.users.createdAt));

// Newest first
const newest = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt));
```

### Pagination
```typescript
const page = 2;
const pageSize = 20;
const offset = (page - 1) * pageSize;

const users = await db
  .select()
  .from(schema.users)
  .orderBy(asc(schema.users.id))
  .limit(pageSize)
  .offset(offset);
```

### Counting with GROUP BY
```typescript
import { count } from 'drizzle-orm';

const statusCounts = await db
  .select({
    status: schema.users.status,
    count: count(),
  })
  .from(schema.users)
  .groupBy(schema.users.status);
```

### Top-N Query
```typescript
const topPosters = await db
  .select()
  .from(schema.users)
  .orderBy(desc(schema.users.postCount))
  .limit(10);
```

## What You Will Practice

1. Sorting query results in both ascending and descending order using `orderBy()`
2. Implementing cursor-free pagination with `limit()` and `offset()`
3. Grouping rows and counting with `groupBy()` and `count()`
4. Extracting a single aggregate count as a plain number
5. Building top-N leaderboard queries combining `orderBy()` with `limit()`

## Tips

- Always include an `orderBy()` when using `limit()` and `offset()`. Without a deterministic sort order, pagination results are unpredictable -- the database may return rows in any order.
- Offset-based pagination (`OFFSET N`) is simple but can be slow for large offsets because the database must scan and discard N rows. For high-traffic production systems, consider cursor-based pagination instead.
- The `count()` function from Drizzle returns a value that may be a string or bigint depending on the driver. Use `Number()` to convert it safely when you need a JavaScript number.
- When using `groupBy()`, every column in the `select()` that is not inside an aggregate function must appear in the `groupBy()` clause.
- Drizzle's method chaining order does not affect the generated SQL order -- `.limit().offset()` and `.offset().limit()` produce the same query. But for readability, match the logical SQL order: SELECT, FROM, WHERE, GROUP BY, ORDER BY, LIMIT, OFFSET.
