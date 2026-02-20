# Chapter 22: The Trigger Mechanism

## Story

The MingleSphereQL platform was humming along nicely. Users were posting, commenting, and connecting. But behind the scenes, the engineering team was drowning in maintenance code. Every time someone created a post, a separate query had to run to increment the user's `post_count`. Every time a record was updated, a developer had to remember to manually set the `updated_at` timestamp. And when the compliance team asked for an audit trail of all user profile changes, the engineers realized they had no systematic way to track what had changed, when, and what the previous values were.

Then a senior engineer proposed a solution that had been built into PostgreSQL since the beginning: triggers. "Why are we doing all this work in the application layer," she asked, "when the database can do it automatically?" The idea was simple but powerful. A trigger is a function that the database executes automatically in response to certain events -- an INSERT, UPDATE, or DELETE on a table. Instead of scattering counter-increment logic across dozens of API endpoints, a single trigger on the `posts` table could handle it. Instead of trusting every developer to remember to update a timestamp, a BEFORE UPDATE trigger could guarantee it happens every time.

The team started small. First, they created an `updated_at` trigger that would fire before any update to the `users` table, automatically setting the timestamp to `NOW()`. Next, they added a post-count trigger that would fire after every insert into `posts`, incrementing the author's `post_count` column. Then came the audit log -- a separate table that recorded every change to user profiles, including the old and new values serialized as JSONB. Finally, they added a safety trigger: a BEFORE DELETE trigger that refused to delete any verified user, raising an exception that would abort the transaction.

The database was no longer a passive store. It had become an active participant in the application's logic, enforcing rules and maintaining consistency even when application code made mistakes.

## Key Concepts

- **Trigger Functions**: PostgreSQL functions written in PL/pgSQL that return `TRIGGER`. They have access to special variables like `NEW` (the row after the operation), `OLD` (the row before), `TG_OP` (the operation name), and `TG_TABLE_NAME` (the table being modified).
- **BEFORE Triggers**: Execute before the operation. They can modify `NEW` (for INSERT/UPDATE) or prevent the operation by returning `NULL` or raising an exception.
- **AFTER Triggers**: Execute after the operation has completed. Useful for side effects like updating counters or inserting audit log entries.
- **FOR EACH ROW**: The trigger fires once per affected row, as opposed to `FOR EACH STATEMENT` which fires once per SQL statement.
- **Audit Logging**: A pattern where a trigger captures old and new row data into a separate audit table, providing a complete history of changes.
- **Guarding Deletes**: BEFORE DELETE triggers can raise exceptions to prevent dangerous deletions based on business rules.

## Code Examples

### Auto-Updating Timestamps
```sql
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Counter Trigger
```sql
CREATE OR REPLACE FUNCTION increment_post_count() RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET post_count = post_count + 1 WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_posts_increment
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION increment_post_count();
```

### Audit Trail
```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  table_name TEXT,
  operation TEXT,
  old_data JSONB,
  new_data JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, operation, old_data, new_data)
  VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Listing Triggers
```sql
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
ORDER BY trigger_name;
```

## What You Will Practice

1. Creating a BEFORE UPDATE trigger that auto-updates the `updated_at` timestamp on the users table
2. Creating an AFTER INSERT trigger that automatically increments a user's `post_count` when a post is created
3. Building an audit log system with a trigger that records old and new data as JSONB
4. Creating a safety trigger that prevents deletion of verified users by raising an exception
5. Querying `information_schema.triggers` to inspect existing triggers on a table

## Tips

- **Always use `CREATE OR REPLACE`**: This avoids errors when running your trigger creation code multiple times. Without it, a second run would fail because the function or trigger already exists.
- **BEFORE vs AFTER**: Use BEFORE when you need to modify the row data (like setting `updated_at`) or cancel the operation. Use AFTER when you need to perform side effects based on the final state of the row.
- **Return value matters**: In BEFORE triggers, returning `NULL` cancels the operation. Return `NEW` for INSERT/UPDATE or `OLD` for DELETE to allow it to proceed. In AFTER triggers, the return value is ignored.
- **Testing triggers**: Triggers are invisible to the application -- they fire automatically. The only way to verify they work is to perform the triggering operation and check the side effects.
- **Cleaning up**: Always drop triggers and their functions when tearing down tests. Triggers persist in the database and can interfere with other tests if left behind.
