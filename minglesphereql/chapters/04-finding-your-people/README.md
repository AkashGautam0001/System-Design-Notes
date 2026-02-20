# Chapter 4: Finding Your People

## The Search for Connection

A social network without search is like a library without a catalog -- full of potential, but impossible to navigate. After the first wave of signups, MingleSphereQL's users started asking the most natural question: "How do I find my friends?"

The product team gathered in the conference room, sticky notes covering the walls. "We need exact matching," said Priya, the product manager. "If I know someone's username, I should be able to find them instantly." She paused, then added: "But we also need fuzzy search. People remember display names, not exact usernames. And what about browsing? We need pagination."

Back at his desk, the backend engineer Marco opened his editor and began building the query layer. He started simple: find a user by username. One `WHERE` clause, one exact match. Then he layered on complexity: filtering by status to show who is online, searching by display name with case-insensitive partial matching, and finally implementing pagination so the frontend could load users page by page without overwhelming the browser.

Each query built on the previous one. Exact matching used `eq()`. Status filtering used the same `eq()` but against an enum column. Display name search introduced `ilike()` for case-insensitive pattern matching with wildcards. Pagination combined `limit()`, `offset()`, and `orderBy()`. And the "find by email or username" feature brought `or()` into the mix, combining two conditions into a single query.

This is the chapter where your data starts talking back. You have written rows into the database. Now you will learn to ask it questions.

## Key Concepts

### WHERE Clauses with Drizzle
Drizzle provides a rich set of comparison operators that map directly to SQL:

```typescript
import { eq, ne, like, ilike, and, or, gt, lt } from 'drizzle-orm';

// Exact match
db.select().from(users).where(eq(users.username, 'alice'));

// Case-insensitive pattern match
db.select().from(users).where(ilike(users.displayName, '%alice%'));

// OR condition
db.select().from(users).where(
  or(eq(users.email, email), eq(users.username, username))
);
```

### Pagination
Drizzle supports `limit()` and `offset()` for pagination. Always use `orderBy()` with pagination to ensure consistent results:

```typescript
db.select()
  .from(users)
  .orderBy(asc(users.id))
  .limit(10)
  .offset(20); // Skip 20, take 10
```

### Handling Empty Results
When a query might return zero results, handle it gracefully:

```typescript
const results = await db.select().from(users).where(eq(users.username, 'ghost'));
return results[0] || null; // Return null instead of undefined
```

## What You Will Practice

1. **Exact matching** -- Find a user by their unique username
2. **Status filtering** -- Query users by their enum status field
3. **Fuzzy search** -- Use `ilike` with wildcards for case-insensitive partial matching
4. **Pagination** -- Implement limit/offset pagination with consistent ordering
5. **Compound conditions** -- Combine multiple conditions with `or()`

## Code Examples

```typescript
// Find by exact field
const user = await db.select()
  .from(schema.users)
  .where(eq(schema.users.username, 'alice'));

// Search with wildcards
const matches = await db.select()
  .from(schema.users)
  .where(ilike(schema.users.displayName, `%${term}%`));

// Paginate results
const page = await db.select()
  .from(schema.users)
  .orderBy(asc(schema.users.id))
  .limit(pageSize)
  .offset(pageNumber * pageSize);
```

## Tips and Hints

- `eq()` performs an exact match (`=` in SQL). It is the most commonly used operator.
- `ilike()` is PostgreSQL-specific and performs case-insensitive LIKE matching. Standard `like()` is case-sensitive.
- When using `ilike()` with a search term, wrap it in `%` wildcards: `%${searchTerm}%`. The `%` matches any sequence of characters.
- Always return `null` (not `undefined`) when a single-result query finds no matches. Use `result[0] || null`.
- Pagination without `orderBy()` produces unpredictable results because PostgreSQL does not guarantee row order without an explicit `ORDER BY`.
- The `or()` function takes multiple conditions and returns rows matching **any** of them.
- When filtering by an enum column (like `status`), you may need to cast the string to `any` to satisfy TypeScript, since Drizzle expects the exact enum type.

## Running the Tests

```bash
# Run the exercise tests
npx vitest run chapters/04-finding-your-people/exercise.test.ts

# Run against the solution
SOLUTIONS=1 npx vitest run chapters/04-finding-your-people/exercise.test.ts
```
