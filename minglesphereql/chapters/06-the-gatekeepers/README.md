# Chapter 6: The Gatekeepers

## Story

The early days of MingleSphereQL were blissful. Users signed up, posted their thoughts, and connected with friends in a thriving digital community. But paradise never lasts. One Monday morning, the team discovered the nightmare: spammers had invaded. Hundreds of duplicate accounts flooded the system, usernames like "a" and "" cluttered the database, and orphaned posts pointed to users that never existed. The data was a mess.

The lead engineer gathered the team around a whiteboard. "We've been too trusting," she said. "We let anything into our database without question. It's time to build the gatekeepers -- constraints that stand guard at every table, rejecting bad data before it can cause harm."

Database constraints are the silent guardians of data integrity. They operate at the lowest level of your application stack, ensuring that no matter how data arrives -- whether through your API, a migration script, or a rogue SQL query -- it must meet the rules you define. Unlike application-level validation, which can be bypassed, database constraints are absolute. They are the last line of defense.

In this chapter, you will test and understand five fundamental types of PostgreSQL constraints: UNIQUE constraints that prevent duplicate entries, NOT NULL constraints that demand required fields, FOREIGN KEY constraints that maintain referential integrity between tables, CHECK constraints that enforce custom business rules, and DEFAULT values that fill in missing data automatically. Each of these plays a critical role in keeping MingleSphereQL's data clean, consistent, and trustworthy.

## Key Concepts

- **UNIQUE Constraint**: Ensures no two rows have the same value in a column (e.g., usernames must be unique). Violation error code: `23505`.
- **NOT NULL Constraint**: Ensures a column cannot contain NULL values. Violation error code: `23502`.
- **FOREIGN KEY Constraint**: Ensures values in a column reference existing rows in another table. Violation error code: `23503`.
- **CHECK Constraint**: Enforces a custom boolean expression that must be true for all rows. Violation error code: `23514`.
- **DEFAULT Values**: Automatically fills in a value when none is provided during insertion.

## Code Examples

### Catching a Unique Violation
```typescript
try {
  await pool.query(`INSERT INTO users (username, email) VALUES ('alice', 'a@test.com')`);
  await pool.query(`INSERT INTO users (username, email) VALUES ('alice', 'b@test.com')`);
} catch (err: any) {
  console.log(err.code); // '23505'
}
```

### Adding a CHECK Constraint
```sql
ALTER TABLE users ADD CONSTRAINT chk_username_length CHECK (length(username) >= 3);
```

### Verifying Default Values
```typescript
const result = await pool.query(
  `INSERT INTO users (username, email) VALUES ('newuser', 'new@test.com') RETURNING *`
);
console.log(result.rows[0].status); // 'offline' (the default)
```

## What You Will Practice

1. Triggering and catching unique constraint violations
2. Triggering and catching not-null constraint violations
3. Triggering and catching foreign key constraint violations
4. Creating, testing, and cleaning up CHECK constraints
5. Verifying that DEFAULT values are properly applied on insert

## Tips

- PostgreSQL error objects in Node.js have a `.code` property containing the 5-character SQLSTATE error code.
- Always clean up custom constraints in a `finally` block to avoid polluting the database state for other tests.
- Use `try/catch` blocks around the violating query, not the entire function, to ensure you only catch the expected error.
- The `RETURNING *` clause is your friend when you need to inspect what was actually inserted into the database.
- Remember that constraints operate at the database level -- they protect your data even if your application code has bugs.
