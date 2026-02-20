# Chapter 3: Opening the Gates

## The First Users Arrive

The infrastructure was in place. The schema was forged. And then, one Tuesday afternoon, the MingleSphereQL beta launched to a small group of early adopters. The first signup came within seconds -- a user named "alice" with an email address and a display name. The team watched the database logs in real time as the INSERT statement executed and a row materialized in the users table. MingleSphereQL had its first citizen.

But one user does not make a social network. Within the first hour, dozens of signups poured in. Some users filled out every field -- username, email, display name, bio. Others provided only the bare minimum: a username and an email. The application needed to handle both gracefully, relying on database defaults to fill in the gaps. Status would default to "offline." Verification would default to false. Timestamps would be set automatically.

The engineering team quickly realized they needed more than just raw SQL for their insert operations. They needed type safety, automatic returning of inserted rows, and the ability to select only specific fields from the result. This is where Drizzle ORM entered the picture -- providing a fluent, TypeScript-native API for building insert statements that felt as natural as writing plain objects.

Opening the gates was not just about letting users in. It was about building the foundation for every interaction that would follow. Every post, every comment, every friend request starts with a user row in the database.

## Key Concepts

### Drizzle ORM Insert API
Drizzle provides a type-safe, chainable API for INSERT operations:

```typescript
// Basic insert with all fields returned
const result = await db.insert(schema.users)
  .values({ username: 'alice', email: 'alice@example.com' })
  .returning();
```

### Returning Specific Fields
You can choose which columns to return after an insert:

```typescript
const result = await db.insert(schema.users)
  .values(userData)
  .returning({ id: schema.users.id, username: schema.users.username });
```

### Batch Inserts
Insert multiple rows in a single statement by passing an array to `.values()`:

```typescript
const users = await db.insert(schema.users)
  .values([
    { username: 'bob', email: 'bob@example.com' },
    { username: 'charlie', email: 'charlie@example.com' },
  ])
  .returning();
```

### Database Defaults
When you omit a field that has a default value defined in the schema, PostgreSQL fills it in automatically. Drizzle respects these defaults -- you only need to provide the required (NOT NULL without default) columns.

### Counting Rows
Use Drizzle's aggregate functions to count rows:

```typescript
import { count } from 'drizzle-orm';

const result = await db.select({ count: count() }).from(schema.users);
const totalUsers = result[0].count; // number
```

## What You Will Practice

1. **Inserting a single user** -- The fundamental write operation with full row return
2. **Batch inserting multiple users** -- Efficient multi-row inserts
3. **Relying on defaults** -- Understanding what happens when you omit optional fields
4. **Selective returning** -- Getting back only the fields you need
5. **Counting rows** -- Using aggregate functions to verify your inserts

## Tips and Hints

- `.returning()` without arguments returns the full row. With arguments, it returns only the specified fields.
- When inserting multiple rows, `.values()` accepts an array of objects. All objects should have the same shape.
- The `count()` function from `drizzle-orm` is used inside `db.select()` to perform aggregation.
- The result of `.returning()` is always an array, even for single inserts. Use `[0]` to get the first element.
- Default values are defined in the schema (`default('offline')`, `defaultNow()`, etc.) and are applied by PostgreSQL, not by Drizzle.

## Running the Tests

```bash
# Run the exercise tests
npx vitest run chapters/03-opening-the-gates/exercise.test.ts

# Run against the solution
SOLUTIONS=1 npx vitest run chapters/03-opening-the-gates/exercise.test.ts
```
