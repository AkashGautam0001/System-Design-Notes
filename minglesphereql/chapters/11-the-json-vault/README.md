# Chapter 11: The JSON Vault

## Story

It started with a simple feature request. Priya, MingleSphereQL's most active product manager, walked into the engineering room with a stack of user feedback. "People want to customize their experience," she said. "Theme preferences, notification settings, language choices, display density -- the list goes on. And it changes every sprint. We cannot keep adding columns to the users table for every new preference."

The team had seen this pattern before. In their previous monolith, they had dozens of preference columns, most of which were null for the vast majority of users. Migrations were slow. Deployments were nerve-wracking. There had to be a better way.

"JSONB," said the senior database engineer, leaning back in his chair. "PostgreSQL's JSONB type gives us the flexibility of a document store with the power of a relational database. We can store arbitrary structured data in a single column, query into it with operators like `->>` and `#>>`, update individual keys with `jsonb_set()`, and even index specific paths for performance."

The team got to work. They added a `metadata` JSONB column to the users table -- a flexible vault where each user could store their own configuration, preferences, and auxiliary data. No more schema migrations for every new toggle. No more sparse columns. Just structured, queryable JSON living alongside their relational data.

This chapter teaches you to work with PostgreSQL's JSONB capabilities. You will insert documents, query by top-level and nested fields, update individual keys without overwriting the entire object, and introspect the structure of stored JSON data. These skills are essential for building flexible, schema-light features on top of a rock-solid relational foundation.

## Key Concepts

- **JSONB Columns**: Storing structured, schema-flexible data in a binary JSON format that supports indexing and efficient querying.
- **The `->>` Operator**: Extracting a top-level key's value as text for comparison (e.g., `metadata->>'theme' = 'dark'`).
- **The `#>>` Operator**: Extracting a nested value by path as text (e.g., `metadata #>> '{preferences,theme}' = 'dark'`).
- **`jsonb_set()` Function**: Updating a specific key within a JSONB column without replacing the entire document.
- **`COALESCE` with JSONB**: Handling null metadata gracefully by defaulting to an empty object `'{}'`.
- **`jsonb_object_keys()`**: Introspecting the top-level keys of a JSONB value.

## Code Examples

### Insert with JSONB metadata
```ts
const result = await db
  .insert(schema.users)
  .values({
    username: 'alice',
    email: 'alice@example.com',
    metadata: { theme: 'dark', lang: 'en' },
  })
  .returning();
```

### Query by JSON field
```sql
SELECT * FROM users WHERE metadata->>'role' = 'admin';
```

### Update a single JSON key
```sql
UPDATE users
SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{theme}', '"dark"')
WHERE id = 1
RETURNING *;
```

### Query nested JSON path
```sql
SELECT * FROM users WHERE metadata #>> '{preferences,theme}' = 'dark';
```

### Get all metadata keys
```sql
SELECT jsonb_object_keys(metadata) as key FROM users WHERE id = 1 ORDER BY key;
```

## What You Will Practice

1. Inserting records with JSONB data using Drizzle ORM.
2. Querying users by top-level JSON field values using raw SQL and the `->>` operator.
3. Updating individual keys within a JSONB column using `jsonb_set()`.
4. Querying by nested JSON paths using the `#>>` operator.
5. Extracting and listing the keys stored in a JSONB column.

## Tips

- JSONB stores data in a decomposed binary format, which is slightly slower to insert than JSON but significantly faster to query and index.
- Always use `COALESCE(metadata, '{}')` when calling `jsonb_set()` to handle rows where metadata is null.
- The `->>` operator returns text, while `->` returns a JSON object. Use `->>` when comparing to string values.
- The `#>>` operator takes a text array path like `'{a,b,c}'` and returns the nested value as text.
- For raw SQL queries with JSONB, you can pass JavaScript objects as parameters -- the `pg` driver handles JSON serialization. However, for `jsonb_set()`, you need to pass `JSON.stringify(value)` explicitly for the replacement value.
- Consider adding GIN indexes on JSONB columns if you frequently query by JSON fields in production.
