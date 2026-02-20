import { getPool } from '../shared/connection.js';

/**
 * Chapter 26: The Invisible Walls - SOLUTIONS
 *
 * Row-Level Security fundamentals in PostgreSQL.
 */

/**
 * Exercise 1: Enable RLS on a table and verify via pg_class
 */
export async function enableRLS(tableName: string): Promise<{ enabled: boolean }> {
  const pool = getPool();

  // Enable RLS on the table (tableName is controlled by tests, safe to interpolate)
  await pool.query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);

  // Verify via pg_class using a parameterized query
  const result = await pool.query(
    'SELECT relrowsecurity FROM pg_class WHERE relname = $1',
    [tableName]
  );

  return { enabled: result.rows[0]?.relrowsecurity === true };
}

/**
 * Exercise 2: Create a basic SELECT policy restricting visibility to own row
 */
export async function createBasicPolicy(): Promise<{ visibleRows: number }> {
  const pool = getPool();

  // Insert two test users
  await pool.query(
    "INSERT INTO users (username, email) VALUES ('alice', 'alice@test.com'), ('bob', 'bob@test.com')"
  );

  // Enable RLS with FORCE so even the table owner is subject to policies
  await pool.query('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
  await pool.query('ALTER TABLE users FORCE ROW LEVEL SECURITY');

  // Create a policy that only lets a user see their own row
  await pool.query(
    "CREATE POLICY users_see_own ON users FOR SELECT USING (id = current_setting('app.current_user_id', true)::int)"
  );

  // Test visibility in a transaction using set_config
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // set_config with 'true' scopes to the current transaction
    await client.query("SELECT set_config('app.current_user_id', '1', true)");
    const result = await client.query('SELECT * FROM users');
    await client.query('COMMIT');
    return { visibleRows: result.rowCount! };
  } finally {
    client.release();
  }
}

/**
 * Exercise 3: Test default-deny behavior (RLS enabled, no policies)
 */
export async function testDefaultDeny(): Promise<{ rowCount: number }> {
  const pool = getPool();

  // Insert a user first (before enabling RLS)
  await pool.query(
    "INSERT INTO users (username, email) VALUES ('test', 'test@test.com')"
  );

  // Enable RLS with FORCE but create NO policies
  await pool.query('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
  await pool.query('ALTER TABLE users FORCE ROW LEVEL SECURITY');

  // Query - should see 0 rows due to default deny
  const result = await pool.query('SELECT * FROM users');
  return { rowCount: result.rowCount! };
}

/**
 * Exercise 4: Create an INSERT policy with WITH CHECK
 */
export async function createInsertPolicy(): Promise<{
  insertAllowed: boolean;
  insertBlocked: boolean;
}> {
  const pool = getPool();

  // Enable RLS with FORCE
  await pool.query('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
  await pool.query('ALTER TABLE users FORCE ROW LEVEL SECURITY');

  // Create a permissive SELECT policy so we can read results
  await pool.query(
    'CREATE POLICY users_select_all ON users FOR SELECT USING (true)'
  );

  // Create an INSERT policy that checks username matches the session variable
  await pool.query(
    "CREATE POLICY users_insert_own ON users FOR INSERT WITH CHECK (username = current_setting('app.current_username', true))"
  );

  let insertAllowed = false;
  let insertBlocked = false;

  // Test allowed insert: username matches current_username
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_username', 'alice', true)");
    try {
      await client.query(
        "INSERT INTO users (username, email) VALUES ('alice', 'alice@test.com')"
      );
      insertAllowed = true;
    } catch (_) {
      insertAllowed = false;
    }
    await client.query('COMMIT');
  } finally {
    client.release();
  }

  // Test blocked insert: username does NOT match current_username
  const client2 = await pool.connect();
  try {
    await client2.query('BEGIN');
    await client2.query("SELECT set_config('app.current_username', 'alice', true)");
    try {
      await client2.query(
        "INSERT INTO users (username, email) VALUES ('eve', 'eve@test.com')"
      );
      insertBlocked = false; // Insert succeeded when it should have been blocked
    } catch (_) {
      insertBlocked = true; // Insert was correctly blocked
    }
    await client2.query('ROLLBACK');
  } finally {
    client2.release();
  }

  return { insertAllowed, insertBlocked };
}

/**
 * Exercise 5: List all policies on a table from pg_policies
 */
export async function listPolicies(tableName: string): Promise<any[]> {
  const pool = getPool();

  const result = await pool.query(
    'SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = $1 ORDER BY policyname',
    [tableName]
  );

  return result.rows;
}
