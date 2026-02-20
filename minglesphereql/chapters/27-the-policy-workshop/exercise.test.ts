import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/27-the-policy-workshop.solution.ts'
  : './exercise.ts';

const {
  createOwnerWritePolicy,
  createPermissivePolicies,
  createRestrictivePolicy,
  createRoleBasedPolicies,
  getPolicyDetails,
} = await import(exercisePath);

describe('Chapter 27: The Policy Workshop', () => {
  beforeEach(async () => {
    const pool = getPool();
    // Clean up any RLS policies and settings from previous tests
    await pool.query('DROP POLICY IF EXISTS posts_owner_write ON posts');
    await pool.query('DROP POLICY IF EXISTS posts_select_all ON posts');
    await pool.query('DROP POLICY IF EXISTS posts_public_read ON posts');
    await pool.query('DROP POLICY IF EXISTS posts_admin_all ON posts');
    await pool.query('DROP POLICY IF EXISTS posts_author_read ON posts');
    await pool.query('DROP POLICY IF EXISTS posts_popular_read ON posts');
    await pool.query('DROP POLICY IF EXISTS posts_all_read ON posts');
    await pool.query('DROP POLICY IF EXISTS posts_not_deleted ON posts');
    await pool.query('DROP POLICY IF EXISTS posts_restrictive ON posts');
    await pool.query('DROP POLICY IF EXISTS users_read_all ON users');
    await pool.query('DROP POLICY IF EXISTS users_write_own ON users');
    await pool.query('ALTER TABLE users DISABLE ROW LEVEL SECURITY');
    await pool.query('ALTER TABLE posts DISABLE ROW LEVEL SECURITY');
    await pool.query('RESET ROLE');
    await clearAllTables();
  });

  afterAll(async () => {
    const pool = getPool();
    try {
      await pool.query('DROP POLICY IF EXISTS posts_owner_write ON posts');
      await pool.query('DROP POLICY IF EXISTS posts_select_all ON posts');
      await pool.query('DROP POLICY IF EXISTS posts_public_read ON posts');
      await pool.query('DROP POLICY IF EXISTS posts_admin_all ON posts');
      await pool.query('DROP POLICY IF EXISTS posts_author_read ON posts');
      await pool.query('DROP POLICY IF EXISTS posts_popular_read ON posts');
      await pool.query('DROP POLICY IF EXISTS posts_all_read ON posts');
      await pool.query('DROP POLICY IF EXISTS posts_not_deleted ON posts');
      await pool.query('DROP POLICY IF EXISTS posts_restrictive ON posts');
      await pool.query('DROP POLICY IF EXISTS users_read_all ON users');
      await pool.query('DROP POLICY IF EXISTS users_write_own ON users');
      await pool.query('ALTER TABLE users DISABLE ROW LEVEL SECURITY');
      await pool.query('ALTER TABLE posts DISABLE ROW LEVEL SECURITY');
      await pool.query('RESET ROLE');
    } catch (_) {
      // Ignore cleanup errors during teardown
    }
    await closeConnection();
  });

  it('Exercise 1: should enforce owner-only UPDATE policy on posts', async () => {
    const result = await createOwnerWritePolicy();

    expect(result).toBeDefined();
    expect(result.ownUpdateCount).toBe(1);
    expect(result.otherUpdateCount).toBe(0);
  });

  it('Exercise 2: should combine permissive policies with OR (own + popular)', async () => {
    const result = await createPermissivePolicies();

    expect(result).toBeDefined();
    expect(result.visibleCount).toBe(2);
  });

  it('Exercise 3: should use restrictive policy to hide soft-deleted rows', async () => {
    const result = await createRestrictivePolicy();

    expect(result).toBeDefined();
    expect(result.visibleCount).toBe(1);
  });

  it('Exercise 4: should create database roles for role-based access', async () => {
    const result = await createRoleBasedPolicies();

    expect(result).toBeDefined();
    expect(result.rolesCreated).toBe(true);

    // Verify roles exist in pg_roles
    const pool = getPool();
    const check = await pool.query(
      "SELECT rolname FROM pg_roles WHERE rolname IN ('app_admin', 'app_user') ORDER BY rolname"
    );
    expect(check.rows.length).toBe(2);
    expect(check.rows[0].rolname).toBe('app_admin');
    expect(check.rows[1].rolname).toBe('app_user');
  });

  it('Exercise 5: should retrieve comprehensive policy details', async () => {
    const pool = getPool();
    // Create policies to inspect
    await pool.query('ALTER TABLE posts ENABLE ROW LEVEL SECURITY');
    await pool.query(
      'CREATE POLICY posts_all_read ON posts FOR SELECT USING (true)'
    );
    await pool.query(
      "CREATE POLICY posts_owner_write ON posts FOR UPDATE USING (author_id = current_setting('app.current_user_id', true)::int)"
    );

    const result = await getPolicyDetails('posts');

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);

    const allRead = result.find((r: any) => r.policyname === 'posts_all_read');
    expect(allRead).toBeDefined();
    expect(allRead.cmd).toBe('SELECT');
    expect(allRead.permissive).toBe('PERMISSIVE');

    const ownerWrite = result.find((r: any) => r.policyname === 'posts_owner_write');
    expect(ownerWrite).toBeDefined();
    expect(ownerWrite.cmd).toBe('UPDATE');
  });
});
