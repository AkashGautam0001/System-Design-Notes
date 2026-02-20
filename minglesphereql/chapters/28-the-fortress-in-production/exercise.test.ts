import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/28-the-fortress-in-production.solution.ts'
  : './exercise.ts';

const {
  setupMultiTenant,
  testCrossTenantIsolation,
  rlsWithTransaction,
  explainWithRLS,
  inspectRLSStatus,
} = await import(exercisePath);

describe('Chapter 28: The Fortress in Production', () => {
  beforeEach(async () => {
    const pool = getPool();
    // Clean up any RLS policies, columns, and settings from previous tests
    await pool.query('DROP POLICY IF EXISTS users_tenant_isolation ON users');
    await pool.query('DROP POLICY IF EXISTS posts_tenant_isolation ON posts');
    await pool.query('ALTER TABLE users DISABLE ROW LEVEL SECURITY');
    await pool.query('ALTER TABLE posts DISABLE ROW LEVEL SECURITY');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS tenant_id');
    await pool.query('ALTER TABLE posts DROP COLUMN IF EXISTS tenant_id');
    await pool.query('RESET ROLE');
    await clearAllTables();
  });

  afterAll(async () => {
    const pool = getPool();
    try {
      await pool.query('DROP POLICY IF EXISTS users_tenant_isolation ON users');
      await pool.query('DROP POLICY IF EXISTS posts_tenant_isolation ON posts');
      await pool.query('ALTER TABLE users DISABLE ROW LEVEL SECURITY');
      await pool.query('ALTER TABLE posts DISABLE ROW LEVEL SECURITY');
      await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS tenant_id');
      await pool.query('ALTER TABLE posts DROP COLUMN IF EXISTS tenant_id');
      await pool.query('RESET ROLE');
    } catch (_) {
      // Ignore cleanup errors during teardown
    }
    await closeConnection();
  });

  it('Exercise 1: should set up multi-tenant isolation with RLS', async () => {
    const result = await setupMultiTenant();

    expect(result).toBeDefined();
    expect(result.tenant1Visible).toBe(2);
    expect(result.tenant2Visible).toBe(1);
  });

  it('Exercise 2: should enforce cross-tenant isolation', async () => {
    const result = await testCrossTenantIsolation();

    expect(result).toBeDefined();
    expect(result.isolated).toBe(true);
    expect(result.visibleCount).toBe(2);
  });

  it('Exercise 3: should use SET LOCAL in a transaction for RLS context', async () => {
    const result = await rlsWithTransaction();

    expect(result).toBeDefined();
    expect(result.rowCount).toBe(1);
    expect(result.tenantId).toBe(1);
  });

  it('Exercise 4: should show RLS filter in EXPLAIN output', async () => {
    const result = await explainWithRLS();

    expect(result).toBeDefined();
    expect(result.hasFilter).toBe(true);
    expect(result.plan).toBeDefined();
  });

  it('Exercise 5: should inspect RLS status across tables', async () => {
    const pool = getPool();
    // Set up RLS on users with a policy so we have something to inspect
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER');
    await pool.query('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
    await pool.query('ALTER TABLE users FORCE ROW LEVEL SECURITY');
    await pool.query(
      "CREATE POLICY users_tenant_isolation ON users USING (tenant_id = current_setting('app.tenant_id', true)::int)"
    );

    const result = await inspectRLSStatus();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);

    const usersStatus = result.find((r: any) => r.table_name === 'users');
    expect(usersStatus).toBeDefined();
    expect(usersStatus.rls_enabled).toBe(true);
    expect(usersStatus.policy_count).toBeGreaterThanOrEqual(1);

    const postsStatus = result.find((r: any) => r.table_name === 'posts');
    expect(postsStatus).toBeDefined();
    expect(postsStatus.rls_enabled).toBe(false);
  });
});
