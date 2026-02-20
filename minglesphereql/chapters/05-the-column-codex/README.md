# Chapter 5: The Column Codex

## Beyond Strings and Numbers

MingleSphereQL was growing. Users were signing up, finding each other, and starting to build their profiles. But a profile with just a username and email felt hollow. Users wanted to express themselves -- with bios, verification badges, post counts, and custom preferences stored as structured metadata.

Lena, the frontend engineer, walked over to the backend team's area with a list of feature requests from the beta testers. "They want rich profiles," she said. "Bios, verified checkmarks, activity counters, and we need a flexible metadata field for things like theme preferences, language settings, and notification configurations. Oh, and timestamps need to work properly -- users want to see when they joined and when their profile was last updated."

This was the moment the team had to grapple with PostgreSQL's type system in earnest. Text fields for bios. Booleans for verification status. Integers for post counts. JSONB for flexible, schemaless metadata. Timestamps with time zones for tracking when things happened. Each type brought its own considerations: How do you query inside a JSONB object? How do timestamps behave when they cross the boundary between PostgreSQL and JavaScript? How do you update a single JSONB field without overwriting the rest?

The Column Codex is the team's internal reference guide to data types -- a map of how PostgreSQL types translate into TypeScript types through Drizzle ORM. Mastering this translation is what separates a developer who uses an ORM from one who understands it.

## Key Concepts

### PostgreSQL Data Types in Drizzle

| PostgreSQL Type | Drizzle Declaration | TypeScript Type |
|---|---|---|
| `VARCHAR(n)` | `varchar('col', { length: n })` | `string` |
| `TEXT` | `text('col')` | `string` |
| `INTEGER` | `integer('col')` | `number` |
| `BOOLEAN` | `boolean('col')` | `boolean` |
| `JSONB` | `jsonb('col')` | `any` (or typed) |
| `TIMESTAMP WITH TIME ZONE` | `timestamp('col', { withTimezone: true })` | `Date` |

### JSONB: Flexible Structured Data
JSONB is PostgreSQL's binary JSON type. It allows you to store and query structured data without a fixed schema:

```sql
-- Query a top-level JSONB key
SELECT * FROM users WHERE metadata->>'theme' = 'dark';

-- The ->> operator extracts a JSONB value as text
-- The -> operator extracts a JSONB value as JSONB (for nested access)
```

### Timestamps in PostgreSQL and JavaScript
PostgreSQL's `TIMESTAMP WITH TIME ZONE` is stored internally as UTC. When Drizzle reads it, it converts it to a JavaScript `Date` object. This means:

- `createdAt` in PostgreSQL -> `Date` in TypeScript
- You can use `.getTime()`, `.toISOString()`, etc.
- Comparisons work naturally with JavaScript date arithmetic

### Updating Specific Fields
Drizzle's `update()` method lets you change specific columns without affecting others:

```typescript
await db.update(schema.users)
  .set({ metadata: { theme: 'light' } })
  .where(eq(schema.users.id, userId))
  .returning();
```

## What You Will Practice

1. **Inserting with diverse types** -- Create a user row that exercises strings, booleans, numbers, and JSONB
2. **Querying JSONB fields** -- Use raw SQL with the `->>` operator to filter by JSONB key-value pairs
3. **Working with timestamps** -- Select timestamp columns and verify they arrive as JavaScript Date objects
4. **Boolean filtering** -- Query users by a boolean column (isVerified)
5. **Updating JSONB data** -- Replace a user's metadata field and return the updated row

## Code Examples

```typescript
// Insert with multiple types
const user = await db.insert(schema.users).values({
  username: 'alice',
  email: 'alice@example.com',
  bio: 'Hello world!',
  isVerified: true,
  postCount: 10,
  metadata: { theme: 'dark', notifications: true },
}).returning();

// Query JSONB with raw SQL
const pool = getPool();
const result = await pool.query(
  'SELECT * FROM users WHERE metadata->>$1 = $2',
  ['theme', 'dark']
);

// Select specific timestamp fields
const timestamps = await db.select({
  createdAt: schema.users.createdAt,
  updatedAt: schema.users.updatedAt,
}).from(schema.users).where(eq(schema.users.id, userId));
```

## Tips and Hints

- When inserting JSONB data through Drizzle, just pass a plain JavaScript object. Drizzle handles the serialization.
- When querying JSONB with raw SQL, use parameterized queries (`$1`, `$2`) to prevent SQL injection. The `->>` operator extracts values as text strings.
- Drizzle automatically converts PostgreSQL timestamps to JavaScript `Date` objects. You do not need to do any parsing.
- `db.update().set()` only modifies the columns you specify. Other columns remain unchanged.
- The `.returning()` method on updates works the same as on inserts -- it returns the full updated row (or specific fields if you pass an object).
- Boolean columns in PostgreSQL map directly to JavaScript `true`/`false`. No special handling needed.
- The `metadata` column is typed as `jsonb` in the schema, which means it accepts any valid JSON structure: objects, arrays, strings, numbers, booleans, or null.

## Running the Tests

```bash
# Run the exercise tests
npx vitest run chapters/05-the-column-codex/exercise.test.ts

# Run against the solution
SOLUTIONS=1 npx vitest run chapters/05-the-column-codex/exercise.test.ts
```
