import { getPool } from '../shared/connection.js';

/**
 * Chapter 22: The Trigger Mechanism - SOLUTIONS
 */

export async function createUpdatedAtTrigger(): Promise<{ triggerCreated: boolean; updatedAtChanged: boolean }> {
  const pool = getPool();

  // Create the trigger function
  await pool.query(`
    CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create the trigger
  await pool.query(`
    CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  `);

  // Insert a test user
  const insertResult = await pool.query(
    `INSERT INTO users (username, email, display_name, bio, status)
     VALUES ('trigger_user', 'trigger@test.com', 'Trigger User', 'Original bio', 'online')
     RETURNING id, updated_at`
  );
  const userId = insertResult.rows[0].id;
  const originalUpdatedAt = insertResult.rows[0].updated_at;

  // Wait briefly to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Update the user's bio
  await pool.query(`UPDATE users SET bio = 'Updated bio' WHERE id = $1`, [userId]);

  // Check if updated_at changed
  const checkResult = await pool.query(`SELECT updated_at FROM users WHERE id = $1`, [userId]);
  const newUpdatedAt = checkResult.rows[0].updated_at;

  return {
    triggerCreated: true,
    updatedAtChanged: new Date(newUpdatedAt).getTime() > new Date(originalUpdatedAt).getTime(),
  };
}

export async function createPostCountTrigger(): Promise<{ postCountAfterInsert: number }> {
  const pool = getPool();

  // Create the trigger function
  await pool.query(`
    CREATE OR REPLACE FUNCTION increment_post_count() RETURNS TRIGGER AS $$
    BEGIN
      UPDATE users SET post_count = post_count + 1 WHERE id = NEW.author_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create the trigger
  await pool.query(`
    CREATE OR REPLACE TRIGGER trg_posts_increment
    AFTER INSERT ON posts
    FOR EACH ROW EXECUTE FUNCTION increment_post_count();
  `);

  // Insert a test user with post_count = 0
  const userResult = await pool.query(
    `INSERT INTO users (username, email, display_name, status, post_count)
     VALUES ('counter_user', 'counter@test.com', 'Counter User', 'online', 0)
     RETURNING id`
  );
  const userId = userResult.rows[0].id;

  // Insert a post for the user
  await pool.query(
    `INSERT INTO posts (author_id, content, type) VALUES ($1, 'Test post', 'text')`,
    [userId]
  );

  // Check the post_count
  const countResult = await pool.query(`SELECT post_count FROM users WHERE id = $1`, [userId]);

  return { postCountAfterInsert: countResult.rows[0].post_count };
}

export async function createAuditLogTrigger(): Promise<{ auditEntries: number }> {
  const pool = getPool();

  // Create the audit_log table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      table_name TEXT,
      operation TEXT,
      old_data JSONB,
      new_data JSONB,
      changed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Create the trigger function
  await pool.query(`
    CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO audit_log (table_name, operation, old_data, new_data)
      VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create the trigger
  await pool.query(`
    CREATE OR REPLACE TRIGGER trg_users_audit
    AFTER UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();
  `);

  // Insert a user and update them
  const userResult = await pool.query(
    `INSERT INTO users (username, email, display_name, bio, status)
     VALUES ('audit_user', 'audit@test.com', 'Audit User', 'Original', 'online')
     RETURNING id`
  );
  const userId = userResult.rows[0].id;

  await pool.query(`UPDATE users SET bio = 'Audited change' WHERE id = $1`, [userId]);

  // Check audit_log
  const auditResult = await pool.query(`SELECT COUNT(*)::int as count FROM audit_log`);

  return { auditEntries: auditResult.rows[0].count };
}

export async function createPreventDeleteTrigger(): Promise<{ errorCaught: boolean; errorMessage: string }> {
  const pool = getPool();

  // Create the trigger function
  await pool.query(`
    CREATE OR REPLACE FUNCTION prevent_verified_delete() RETURNS TRIGGER AS $$
    BEGIN
      IF OLD.is_verified = true THEN
        RAISE EXCEPTION 'Cannot delete verified users';
      END IF;
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create the trigger
  await pool.query(`
    CREATE OR REPLACE TRIGGER trg_prevent_verified_delete
    BEFORE DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION prevent_verified_delete();
  `);

  // Insert a verified user
  const userResult = await pool.query(
    `INSERT INTO users (username, email, display_name, status, is_verified)
     VALUES ('verified_user', 'verified@test.com', 'Verified User', 'online', true)
     RETURNING id`
  );
  const userId = userResult.rows[0].id;

  // Try to delete the verified user
  let errorCaught = false;
  let errorMessage = '';
  try {
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  } catch (e: any) {
    errorCaught = true;
    errorMessage = e.message;
  }

  return { errorCaught, errorMessage };
}

export async function listTriggers(tableName: string): Promise<any[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT trigger_name, event_manipulation, action_timing
     FROM information_schema.triggers
     WHERE event_object_table = $1
     ORDER BY trigger_name`,
    [tableName]
  );
  return result.rows;
}
