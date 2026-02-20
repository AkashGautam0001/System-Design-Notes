# Chapter 23: The Vault

## Story

It started with a bug report that nobody could explain. A user on MingleSphereQL had transferred "likes" from one of their posts to another -- a feature the product team had just shipped to let creators consolidate engagement. The source post showed zero likes, which was correct. But the destination post also showed zero likes. The ten likes had simply vanished.

The postmortem revealed the problem in minutes. The transfer operation consisted of two separate UPDATE queries: one to decrement the source post's `likes_count` and another to increment the destination's. Between those two queries, the application server had crashed. The first update committed successfully, subtracting the likes. The second update never ran. Ten likes evaporated into the void.

The fix was a single word: transaction. By wrapping both updates in a database transaction, the engineering team guaranteed that either both changes would commit together, or neither would. This is the "A" in ACID -- Atomicity. A transaction is an all-or-nothing operation. If any step fails, the entire transaction rolls back, leaving the database exactly as it was before the transaction started.

But atomicity was just the beginning. The team quickly discovered more use cases. When creating a new user's account, they needed to insert a user row and a welcome post in a single atomic operation -- if the post insertion failed, the user row should not exist. They needed savepoints for complex workflows where partial rollback was acceptable. And when multiple transactions ran concurrently on the same data, they needed isolation levels to control how much one transaction could see of another's uncommitted work.

The vault was built. Every critical operation in MingleSphereQL now ran inside a transaction, protected from partial failures, race conditions, and data corruption. The likes never vanished again.

## Key Concepts

- **ACID Transactions**: Atomicity (all-or-nothing), Consistency (data remains valid), Isolation (concurrent transactions do not interfere), Durability (committed data survives crashes).
- **Drizzle Transactions**: Use `db.transaction(async (tx) => { ... })` to run multiple operations in a single transaction. If the callback throws, the transaction automatically rolls back.
- **Rollback on Error**: When an error is thrown inside a transaction callback, all changes made within that transaction are undone.
- **Savepoints**: Named points within a transaction that you can roll back to without aborting the entire transaction. Created with `SAVEPOINT name` and reverted with `ROLLBACK TO SAVEPOINT name`.
- **Isolation Levels**: PostgreSQL supports four levels: READ UNCOMMITTED, READ COMMITTED (default), REPEATABLE READ, and SERIALIZABLE. Higher levels provide stronger guarantees but may reduce concurrency.

## Code Examples

### Drizzle Transaction
```typescript
const result = await db.transaction(async (tx) => {
  await tx.update(schema.posts)
    .set({ likesCount: sql`${schema.posts.likesCount} - ${amount}` })
    .where(eq(schema.posts.id, fromPostId));

  await tx.update(schema.posts)
    .set({ likesCount: sql`${schema.posts.likesCount} + ${amount}` })
    .where(eq(schema.posts.id, toPostId));

  return { success: true };
});
```

### Rollback on Error
```typescript
try {
  await db.transaction(async (tx) => {
    await tx.update(schema.users).set({ bio: 'temp' }).where(eq(schema.users.id, id));
    throw new Error('Oops!'); // entire transaction rolls back
  });
} catch (e) {
  // bio is unchanged
}
```

### Savepoints with Raw SQL
```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(`UPDATE users SET bio = 'step 1' WHERE id = $1`, [id]);
  await client.query('SAVEPOINT sp1');
  await client.query(`UPDATE users SET bio = 'step 2' WHERE id = $1`, [id]);
  await client.query('ROLLBACK TO SAVEPOINT sp1');
  await client.query('COMMIT');
  // bio is 'step 1'
} finally {
  client.release();
}
```

### Isolation Levels
```typescript
const client = await pool.connect();
await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
// All reads within this transaction see a consistent snapshot
await client.query('COMMIT');
client.release();
```

## What You Will Practice

1. Transferring likes between posts inside a Drizzle transaction, ensuring atomicity
2. Demonstrating that an error inside a transaction causes a full rollback
3. Creating a user and their first post atomically in a single transaction
4. Using raw SQL savepoints to partially roll back within a transaction
5. Setting and verifying a SERIALIZABLE isolation level for a transaction

## Tips

- **Always use transactions for multi-step writes**: Any time you perform two or more writes that must succeed together, wrap them in a transaction. This prevents data corruption from partial failures.
- **Drizzle transactions auto-rollback**: If your callback throws an error, Drizzle automatically rolls back. You do not need to manually call ROLLBACK.
- **Savepoints are for advanced workflows**: Most of the time, a simple transaction is sufficient. Savepoints are useful when you want to try something risky within a larger transaction without aborting the whole thing.
- **Isolation levels have trade-offs**: SERIALIZABLE provides the strongest guarantees but can cause serialization failures that require retries. READ COMMITTED is the PostgreSQL default and works well for most applications.
- **Release your clients**: When using raw SQL with `pool.connect()`, always release the client in a `finally` block to avoid connection leaks.
