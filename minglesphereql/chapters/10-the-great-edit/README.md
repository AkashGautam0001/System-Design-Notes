# Chapter 10: The Great Edit

## Story

MingleSphereQL has been humming along nicely. Users are signing up, writing posts, and finding friends. But something is missing -- the ability to change. Jasper, one of the platform's earliest adopters, realizes that his display name still reads "jaspertheintern" from his college days. He has since become a senior engineer, and his profile should reflect that. Meanwhile, Lana notices a typo in her bio that has been haunting her for weeks. And Marcus, a power user, wants to update his avatar, display name, and bio all in a single, efficient operation.

The engineering team gathers for their morning standup. "We need UPDATE operations," says the lead developer, pulling up the Drizzle ORM documentation. "Not just simple overwrites -- we need atomic increments, conditional updates, and the ability to modify multiple fields at once. Our users deserve the power to edit their digital identities."

This chapter is about mastering the UPDATE statement through Drizzle ORM. In any social network, data is never static. Profiles evolve, statuses change, and counters tick upward with every new post. Understanding how to perform updates correctly -- especially atomic updates that avoid race conditions and conditional updates that respect existing data -- is fundamental to building robust applications.

You will learn to wield `db.update()` with surgical precision: targeting specific rows with `.where()`, modifying fields with `.set()`, and retrieving the modified data with `.returning()`. By the end of this chapter, the users of MingleSphereQL will finally be able to reinvent themselves.

## Key Concepts

- **Basic Updates**: Using `db.update(table).set({ field: value }).where(condition).returning()` to modify and return rows.
- **Updating Timestamps**: Setting `updatedAt` to `new Date()` so the application always knows when data last changed.
- **Atomic Increments with SQL Expressions**: Using `sql\`\`` template literals to perform database-level arithmetic (e.g., incrementing a counter) without race conditions.
- **Partial Updates**: Passing an object with only the fields you want to change, leaving the rest untouched.
- **Conditional Updates**: Combining multiple WHERE conditions with `and()` and `isNull()` to update only when specific criteria are met.

## Code Examples

### Simple field update
```ts
const result = await db
  .update(schema.users)
  .set({ displayName: 'New Name' })
  .where(eq(schema.users.id, userId))
  .returning();
```

### Atomic increment
```ts
await db
  .update(schema.users)
  .set({ postCount: sql`${schema.users.postCount} + 1` })
  .where(eq(schema.users.id, userId))
  .returning();
```

### Conditional update
```ts
const result = await db
  .update(schema.users)
  .set({ bio: 'New bio' })
  .where(and(eq(schema.users.id, userId), isNull(schema.users.bio)))
  .returning();
// result is empty array if the condition was not met
```

## What You Will Practice

1. Updating a single field on a user record and returning the updated row.
2. Updating multiple fields including a timestamp in one operation.
3. Using raw SQL expressions for atomic counter increments.
4. Performing partial updates with only the fields that were provided.
5. Writing conditional updates that only proceed when a precondition is met.

## Tips

- Always use `.returning()` when you need the updated row back -- it saves you a separate SELECT query.
- Use `sql\`\`` for arithmetic operations to avoid read-modify-write race conditions. The database handles the increment atomically.
- When passing a partial object to `.set()`, Drizzle will only update the fields present in the object. Undefined fields are ignored.
- The result of `.returning()` is always an array. Check its length to determine if any rows were actually updated.
- Combine `and()`, `or()`, `isNull()`, and other operators in `.where()` for precise targeting.
