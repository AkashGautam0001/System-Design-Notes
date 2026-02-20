import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/26-the-invisible-walls.solution.ts'
  : './exercise.ts';

const {
  enableRLS,
  createBasicPolicy,
  testDefaultDeny,
  createInsertPolicy,
  listPolicies,
} = await import(exercisePath);

describe('Chapter 26: The Invisible Walls', () => {
  beforeEach(async () => {
    const pool = getPool();
    // Clean up any RLS policies and settings from previous tests
    await pool.query('DROP POLICY IF EXISTS users_see_own ON users');
    await pool.query('DROP POLICY IF EXISTS users_select_all ON users');
    await pool.query('DROP POLICY IF EXISTS users_insert_own ON users');
    await pool.query('DROP POLICY IF EXISTS users_isolation_policy ON users');
    await pool.query('DROP POLICY IF EXISTS posts_isolation_policy ON posts');
    await pool.query('ALTER TABLE users DISABLE ROW LEVEL SECURITY');
    await pool.query('ALTER TABLE posts DISABLE ROW LEVEL SECURITY');
    await pool.query('RESET ROLE');
    await clearAllTables();
  });

  afterAll(async () => {
    const pool = getPool();
    try {
      await pool.query('DROP POLICY IF EXISTS users_see_own ON users');
      await pool.query('DROP POLICY IF EXISTS users_select_all ON users');
      await pool.query('DROP POLICY IF EXISTS users_insert_own ON users');
      await pool.query('DROP POLICY IF EXISTS users_isolation_policy ON users');
      await pool.query('DROP POLICY IF EXISTS posts_isolation_policy ON posts');
      await pool.query('ALTER TABLE users DISABLE ROW LEVEL SECURITY');
      await pool.query('ALTER TABLE posts DISABLE ROW LEVEL SECURITY');
      await pool.query('RESET ROLE');
    } catch (_) {
      // Ignore cleanup errors during teardown
    }
    await closeConnection();
  });

  it('Exercise 1: should enable RLS on a table and verify via pg_class', async () => {
    const result = await enableRLS('users');

    expect(result).toBeDefined();
    expect(result.enabled).toBe(true);

    // Double-check directly
    const pool = getPool();
    const check = await pool.query(
      'SELECT relrowsecurity FROM pg_class WHERE relname = $1',
      ['users']
    );
    expect(check.rows[0].relrowsecurity).toBe(true);
  });

  it('Exercise 2: should create a basic policy that restricts visibility to own row', async () => {
    const result = await createBasicPolicy();

    expect(result).toBeDefined();
    expect(result.visibleRows).toBe(1);
  });

  it('Exercise 3: should default-deny all rows when RLS is enabled with no policies', async () => {
    const result = await testDefaultDeny();

    expect(result).toBeDefined();
    expect(result.rowCount).toBe(0);
  });

  it('Exercise 4: should enforce INSERT policy with WITH CHECK', async () => {
    const result = await createInsertPolicy();

    expect(result).toBeDefined();
    expect(result.insertAllowed).toBe(true);
    expect(result.insertBlocked).toBe(true);
  });

  it('Exercise 5: should list all policies on a table from pg_policies', async () => {
    const pool = getPool();
    // Create some policies to list
    await pool.query('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
    await pool.query(
      "CREATE POLICY users_see_own ON users FOR SELECT USING (id = current_setting('app.current_user_id', true)::int)"
    );
    await pool.query(
      "CREATE POLICY users_insert_own ON users FOR INSERT WITH CHECK (username = current_setting('app.current_username', true))"
    );

    const result = await listPolicies('users');

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);

    const policyNames = result.map((r: any) => r.policyname);
    expect(policyNames).toContain('users_insert_own');
    expect(policyNames).toContain('users_see_own');
  });
});
