# Chapter 13: The Batch Express

## Story

MingleSphereQL hit a milestone: one hundred thousand users. The celebration was short-lived. That same morning, the onboarding team imported a CSV of 5,000 beta testers from a partner company. The import script inserted users one at a time, each in its own database round trip. It took forty-seven minutes. The database connection pool was exhausted. Other parts of the application ground to a halt. The CTO was not pleased.

"We need bulk operations," declared the backend lead, slamming his laptop shut after watching the Grafana dashboard spike red. "One query to insert a thousand rows. One query to update statuses for an entire cohort. One query to clean up a batch of spam accounts. We are not sending five thousand individual INSERT statements ever again."

The team dove into Drizzle ORM's batch capabilities. They discovered that `db.insert().values([...])` could accept an array of records and insert them all in a single SQL statement. They learned about `onConflictDoUpdate()` for upserting -- inserting a record if it does not exist, or updating specific fields if it does. They found `onConflictDoNothing()` for idempotent inserts that silently skip duplicates. And they realized that `inArray()` in WHERE clauses made batch updates and deletes as straightforward as single-row operations.

But it was not just about performance. The upsert pattern solved a real problem: when users signed up through multiple OAuth providers, the same person might trigger multiple inserts with the same username. Instead of crashing with a unique constraint violation, the upsert gracefully updated the existing record with the latest information. The "insert or ignore" pattern was equally valuable for importing data from external sources where duplicates were expected.

This chapter teaches you the batch operations that separate hobby projects from production systems. You will bulk insert arrays of records, handle conflicts with upserts and ignore strategies, update multiple rows with a single query using `inArray()`, and perform bulk deletes efficiently. These patterns are the backbone of data import pipelines, admin dashboards, background job processors, and any system that needs to operate on sets of data rather than individual rows.

## Key Concepts

- **Bulk Insert**: Passing an array to `db.insert().values([...])` to insert many rows in one round trip.
- **Upsert (ON CONFLICT DO UPDATE)**: Using `onConflictDoUpdate()` to insert a new row or update specific fields if a unique constraint conflict occurs.
- **Insert or Ignore (ON CONFLICT DO NOTHING)**: Using `onConflictDoNothing()` to silently skip inserts that would violate a unique constraint.
- **Batch Update with `inArray()`**: Targeting multiple rows for update by matching their IDs against an array.
- **Bulk Delete with `inArray()`**: Removing multiple rows in a single DELETE statement.

## Code Examples

### Bulk insert
```ts
const result = await db
  .insert(schema.users)
  .values([
    { username: 'alice', email: 'alice@example.com' },
    { username: 'bob', email: 'bob@example.com' },
    { username: 'charlie', email: 'charlie@example.com' },
  ])
  .returning();
```

### Upsert
```ts
const result = await db
  .insert(schema.users)
  .values({ username: 'alice', email: 'alice@example.com', displayName: 'Alice' })
  .onConflictDoUpdate({
    target: schema.users.username,
    set: { displayName: 'Alice Updated', updatedAt: new Date() },
  })
  .returning();
```

### Insert or ignore
```ts
const result = await db
  .insert(schema.users)
  .values({ username: 'alice', email: 'alice@example.com' })
  .onConflictDoNothing({ target: schema.users.username })
  .returning();
// result is [] if conflict occurred
```

### Batch update
```ts
const updated = await db
  .update(schema.users)
  .set({ status: 'offline' })
  .where(inArray(schema.users.id, [1, 2, 3]))
  .returning();
```

### Bulk delete
```ts
const deleted = await db
  .delete(schema.users)
  .where(inArray(schema.users.id, [4, 5, 6]))
  .returning();
```

## What You Will Practice

1. Inserting multiple users in a single bulk insert operation.
2. Implementing upsert logic that inserts or updates based on username conflicts.
3. Using insert-or-ignore to gracefully handle duplicate entries.
4. Batch updating status fields for a subset of users identified by their IDs.
5. Bulk deleting multiple users by ID in a single query.

## Tips

- Bulk inserts are dramatically faster than individual inserts because they reduce network round trips and allow the database to optimize the operation internally.
- The `onConflictDoUpdate` target must reference a column (or set of columns) that has a unique constraint or unique index.
- When using `onConflictDoNothing().returning()`, the returned array will be empty if the conflict was triggered -- this is how you detect whether the insert happened.
- The `inArray()` function generates a SQL `IN (...)` clause. Be cautious with very large arrays (thousands of IDs) as they can impact query plan efficiency. For extremely large sets, consider using temporary tables or CTEs.
- Batch operations are atomic by default -- if one row in a bulk insert fails (e.g., due to a constraint violation on a non-conflicting column), the entire batch rolls back. Use transactions explicitly if you need partial success handling.
