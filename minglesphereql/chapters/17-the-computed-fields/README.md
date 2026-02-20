# Chapter 17: The Computed Fields

## Story

The MingleSphereQL dashboard was taking shape. The product team had designed beautiful profile cards, post previews, and analytics widgets. But every time they mocked up a new feature, they ran into the same problem: the data they needed did not exist as a stored column. The profile card wanted to show "User 1 (@user1)" -- but `display_name` and `username` were in separate columns. The analytics widget wanted to show how many days each user had been a member -- but there was no `account_age` column, only a `created_at` timestamp. The trending algorithm needed an "engagement score" for each post -- computed from likes and comment counts -- but no such field was stored in the database.

The junior developer's first instinct was to add new columns: `full_label`, `account_age_days`, `engagement_score`. But the senior engineer stopped them. "You're thinking about this wrong," she said. "These aren't new pieces of data. They're derived from data you already have. If you store them, you create a maintenance nightmare -- every time the underlying data changes, you need to update the derived column too. Instead, let the database compute them at query time."

This is the power of computed fields. PostgreSQL is not just a storage engine -- it is a computation engine. SQL expressions can concatenate strings, perform arithmetic, call functions like `EXTRACT()` and `NOW()`, run correlated subqueries that count rows in other tables, and even implement conditional logic with `CASE` statements. All of this happens at query time, inside the database, with no extra application code and no redundant storage.

Drizzle ORM exposes this power through its `sql` template literal. You can embed raw SQL expressions directly in your `select()` calls, mixing them freely with typed column references. The result is type-safe, readable, and extremely powerful. You get the full expressiveness of SQL with the safety net of TypeScript.

In this chapter, you will learn to compute string labels by concatenating columns, count related rows with correlated subqueries, extract time intervals from timestamps, calculate composite scores from multiple data points, and classify rows using conditional CASE logic. These techniques will transform how you think about querying -- instead of asking "what is stored?" you will start asking "what can be computed?"

## Key Concepts

- **SQL Template Literals**: Drizzle's `sql<T>\`...\`` lets you write raw SQL expressions with embedded schema references, returning typed results.
- **String Concatenation**: PostgreSQL's `||` operator joins strings together. Use it to build computed labels from multiple columns.
- **Correlated Subqueries**: A subquery that references a column from the outer query. For example, counting comments for each post by referencing `posts.id` inside the subquery.
- **Date/Time Functions**: `NOW()` returns the current timestamp, `EXTRACT(DAY FROM interval)` pulls the day component from an interval.
- **CASE Expressions**: SQL's equivalent of if/else. Evaluates conditions in order and returns the first matching result.
- **`.as()` Aliases**: Use `.as('column_name')` to give computed fields a name in the result set.

## Code Examples

### String Concatenation
```typescript
const users = await db.select({
  id: schema.users.id,
  fullLabel: sql<string>`${schema.users.displayName} || ' (@' || ${schema.users.username} || ')'`.as('full_label'),
}).from(schema.users);
// [{ id: 1, fullLabel: "Alice (@alice)" }]
```

### Correlated Subquery for Counts
```typescript
const posts = await db.select({
  id: schema.posts.id,
  commentCount: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.post_id = ${schema.posts.id})`.as('comment_count'),
}).from(schema.posts);
```

### Computing Account Age
```typescript
const users = await db.select({
  username: schema.users.username,
  ageDays: sql<number>`EXTRACT(DAY FROM NOW() - ${schema.users.createdAt})::int`.as('age_days'),
}).from(schema.users);
```

### CASE Expression
```typescript
const summary = await db.select({
  username: schema.users.username,
  level: sql<string>`CASE
    WHEN ${schema.users.postCount} > 10 THEN 'power_user'
    WHEN ${schema.users.postCount} > 0 THEN 'active'
    ELSE 'lurker'
  END`.as('level'),
}).from(schema.users);
```

## What You Will Practice

1. Building computed string labels by concatenating multiple columns with `||`
2. Using correlated subqueries to count related rows (comments per post)
3. Computing account age in days using `EXTRACT`, `NOW()`, and timestamp arithmetic
4. Calculating composite engagement scores from likes and comment counts
5. Classifying users into categories using `CASE` expressions based on their post count

## Tips

- **Type your sql expressions**: Always provide the generic type parameter to `sql<T>` so TypeScript knows the return type. Use `sql<string>` for text, `sql<number>` for numbers.
- **Always use `.as()`**: Give every computed field an alias with `.as('name')`. Without it, the field may have an unpredictable name in the result object.
- **Cast when needed**: PostgreSQL's `EXTRACT` returns a `double precision` value. Use `::int` to cast it to an integer if you need whole numbers.
- **Subquery performance**: Correlated subqueries execute once per row in the outer query. For large datasets, consider using joins with `count()` and `groupBy` instead.
- **CASE is evaluated in order**: The first `WHEN` condition that matches wins. Put your most specific conditions first and the most general last (before `ELSE`).
- **NULL handling**: If `display_name` is `NULL`, concatenation with `||` produces `NULL`. Use `COALESCE` to provide a fallback: `COALESCE(display_name, username)`.
