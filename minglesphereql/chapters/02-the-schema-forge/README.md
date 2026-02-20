# Chapter 2: The Schema Forge

## The Blueprint Takes Shape

With the database connection humming along, the MingleSphereQL team turned to their next challenge: designing the data layer. Anya stood at the whiteboard and drew a single rectangle labeled "users." It was the cornerstone of everything they would build -- every post, every message, every friend request would trace back to a user.

But designing a table is not just about choosing column names. It is about understanding data types, constraints, defaults, and how PostgreSQL itself sees the structure you create. The team needed to answer fundamental questions: What columns does a user need? Which fields are required and which are optional? What happens when a new user signs up without providing a bio or an avatar? Where do the constraints live, and how do we verify them?

Marcus, the database architect, opened a SQL console and started querying the `information_schema` -- PostgreSQL's built-in catalog of metadata. He showed the team how every table, every column, every constraint is recorded in these system views. "Think of it as the blueprint room," he said. "Before you build a house, you check the blueprints. Before you query a table, you check the schema."

This chapter takes you into the Schema Forge -- the place where raw ideas become structured tables. You will learn to inspect your database's architecture using the same tools that database administrators use every day.

## Key Concepts

### The Information Schema
PostgreSQL provides the `information_schema` -- a standardized set of views defined by the SQL standard. These views let you introspect your database:

- **`information_schema.tables`** -- Lists all tables, views, and other relations
- **`information_schema.columns`** -- Describes every column in every table
- **`information_schema.table_constraints`** -- Shows primary keys, foreign keys, unique constraints, and check constraints

### Column Properties
Each column in PostgreSQL has several important properties:

- **`column_name`** -- The name of the column
- **`data_type`** -- The SQL data type (e.g., `integer`, `character varying`, `timestamp with time zone`)
- **`is_nullable`** -- `YES` or `NO` indicating whether NULL values are allowed
- **`column_default`** -- The default value expression, if any

### Constraint Types
PostgreSQL supports several constraint types:
- `PRIMARY KEY` -- Uniquely identifies each row
- `UNIQUE` -- Ensures no duplicate values
- `FOREIGN KEY` -- References a row in another table
- `CHECK` -- Validates data against a condition
- `NOT NULL` -- Prevents NULL values (tracked as a column property, not in table_constraints)

## What You Will Practice

1. **Querying column metadata** -- Inspect the users table to see what columns exist and what types they use
2. **Exploring constraints** -- Discover primary keys, unique constraints, and foreign keys
3. **Checking table existence** -- Programmatically verify that a table exists before querying it
4. **Understanding defaults** -- See which columns have default values and what those defaults are
5. **Counting schema objects** -- Determine how many tables your schema contains

## Code Examples

```typescript
// Query columns for a specific table
const result = await pool.query(`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'users'
  ORDER BY ordinal_position
`);

// Check if a table exists
const exists = await pool.query(`
  SELECT EXISTS(
    SELECT FROM information_schema.tables
    WHERE table_name = 'users'
  )
`);
// exists.rows[0].exists => true
```

## Tips and Hints

- The `information_schema` is read-only -- you are querying metadata, not modifying your database.
- `ordinal_position` gives you the order in which columns were defined in the `CREATE TABLE` statement.
- `column_default` stores the *expression* as a string, not the evaluated value. For example, `now()` appears as `now()`, and serial columns show `nextval('users_id_seq'::regclass)`.
- When counting tables, always filter by `table_schema = 'public'` to exclude internal PostgreSQL tables.
- Use `::int` to cast the `COUNT(*)` result to an integer so you get a JavaScript number rather than a string.

## Running the Tests

```bash
# Run the exercise tests
npx vitest run chapters/02-the-schema-forge/exercise.test.ts

# Run against the solution
SOLUTIONS=1 npx vitest run chapters/02-the-schema-forge/exercise.test.ts
```
