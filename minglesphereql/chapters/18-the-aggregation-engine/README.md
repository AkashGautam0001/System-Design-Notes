# Chapter 18: The Aggregation Engine

## Story

The MingleSphereQL leadership team has gathered around the conference table with a singular demand: "We need numbers." The platform is growing rapidly, but nobody can answer even basic questions -- how many posts does each user create? Which content types generate the most engagement? What does the overall health of the platform look like?

You, the database engineer, know exactly what this calls for. Raw row-by-row data is useful for detail views, but dashboards and analytics require a fundamentally different approach. You need to collapse hundreds of thousands of rows into meaningful summaries. You need the aggregation engine.

Aggregation in SQL is the art of grouping rows together and computing summary statistics across those groups. Instead of asking "show me every post," you ask "show me how many posts each user has made." Instead of scanning every like count individually, you ask "what is the average number of likes across all posts of each type?" This is the power of GROUP BY combined with aggregate functions like COUNT, SUM, AVG, MIN, and MAX.

But aggregation has a subtlety that trips up even experienced developers: the HAVING clause. While WHERE filters individual rows before grouping, HAVING filters entire groups after aggregation. Want only users who have written at least 5 posts? You cannot use WHERE for that -- you need HAVING, because the count does not exist until after the grouping is done.

In this chapter, you will build the analytics backbone of MingleSphereQL. By the end, you will be able to answer any question the leadership team throws at you.

## Concepts

- **GROUP BY**: Collapses rows that share the same value(s) into a single summary row
- **COUNT()**: Counts the number of rows in each group
- **SUM()**: Adds up all values in a column for each group
- **AVG()**: Computes the arithmetic mean of a column for each group
- **MIN() / MAX()**: Finds the smallest or largest value in each group
- **HAVING**: Filters groups after aggregation (unlike WHERE which filters before)

## Code Examples

### Basic GROUP BY with COUNT

```typescript
const postsByUser = await db
  .select({
    userId: schema.posts.authorId,
    totalPosts: count(),
  })
  .from(schema.posts)
  .groupBy(schema.posts.authorId);
```

### Using HAVING to filter groups

```typescript
const activeUsers = await db
  .select({
    userId: schema.posts.authorId,
    postCount: count(),
  })
  .from(schema.posts)
  .groupBy(schema.posts.authorId)
  .having(sql`count(*) >= ${minPosts}`);
```

### Combining multiple aggregate functions

```typescript
const stats = await db
  .select({
    type: schema.posts.type,
    total: count(),
    totalLikes: sum(schema.posts.likesCount),
    avgLikes: avg(schema.posts.likesCount),
  })
  .from(schema.posts)
  .groupBy(schema.posts.type);
```

## Practice Goals

1. Group posts by author and count them
2. Calculate average likes per user
3. Generate multi-metric statistics grouped by post type
4. Use HAVING to filter groups by aggregate conditions
5. Combine multiple queries into a single platform-wide statistics object

## Tips

- Drizzle's `avg()` and `sum()` return string representations of numbers -- cast with `Number()` when needed
- `count()` without arguments counts all rows; `count(column)` counts non-null values
- You can group by multiple columns: `.groupBy(col1, col2)`
- HAVING uses `sql` template literals because the condition references aggregate results
- Always import aggregate functions from `drizzle-orm`: `count`, `sum`, `avg`, `min`, `max`
