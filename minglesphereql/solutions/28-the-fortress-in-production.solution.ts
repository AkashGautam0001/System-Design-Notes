import { getPool } from '../shared/connection.js';

/**
 * Chapter 28: The Fortress in Production - SOLUTIONS
 *
 * Multi-tenant RLS in production: tenant isolation, cross-tenant
 * protection, transactional context, EXPLAIN inspection, and monitoring.
 */

/**
 * Exercise 1: Set up multi-tenant isolation with RLS
 */
export async function setupMultiTenant(): Promise<{
  tenant1Visible: number;
  tenant2Visible: number;
}> {
  const pool = getPool();

  // Add tenant_id column
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER');

  // Insert users for two tenants
  await pool.query(
    "INSERT INTO users (username, email, tenant_id) VALUES ('t1_alice', 't1_alice@test.com', 1)"
  );
  await pool.query(
    "INSERT INTO users (username, email, tenant_id) VALUES ('t1_bob', 't1_bob@test.com', 1)"
  );
  await pool.query(
    "INSERT INTO users (username, email, tenant_id) VALUES ('t2_carol', 't2_carol@test.com', 2)"
  );

  // Enable RLS with FORCE
  await pool.query('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
  await pool.query('ALTER TABLE users FORCE ROW LEVEL SECURITY');

  // Create tenant isolation policy
  await pool.query(
    "CREATE POLICY users_tenant_isolation ON users USING (tenant_id = current_setting('app.tenant_id', true)::int)"
  );

  // Query as tenant 1
  const client1 = await pool.connect();
  let tenant1Visible: number;
  try {
    await client1.query('BEGIN');
    await client1.query("SELECT set_config('app.tenant_id', '1', true)");
    const result1 = await client1.query('SELECT * FROM users');
    tenant1Visible = result1.rowCount!;
    await client1.query('COMMIT');
  } finally {
    client1.release();
  }

  // Query as tenant 2
  const client2 = await pool.connect();
  let tenant2Visible: number;
  try {
    await client2.query('BEGIN');
    await client2.query("SELECT set_config('app.tenant_id', '2', true)");
    const result2 = await client2.query('SELECT * FROM users');
    tenant2Visible = result2.rowCount!;
    await client2.query('COMMIT');
  } finally {
    client2.release();
  }

  return { tenant1Visible, tenant2Visible };
}

/**
 * Exercise 2: Verify cross-tenant isolation is enforced
 */
export async function testCrossTenantIsolation(): Promise<{
  isolated: boolean;
  visibleCount: number;
}> {
  const pool = getPool();

  // Add tenant_id column
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER');

  // Insert users for two tenants
  await pool.query(
    "INSERT INTO users (username, email, tenant_id) VALUES ('t1_user1', 't1_u1@test.com', 1)"
  );
  await pool.query(
    "INSERT INTO users (username, email, tenant_id) VALUES ('t1_user2', 't1_u2@test.com', 1)"
  );
  await pool.query(
    "INSERT INTO users (username, email, tenant_id) VALUES ('t2_user1', 't2_u1@test.com', 2)"
  );

  // Enable RLS with FORCE
  await pool.query('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
  await pool.query('ALTER TABLE users FORCE ROW LEVEL SECURITY');

  // Create tenant isolation policy
  await pool.query(
    "CREATE POLICY users_tenant_isolation ON users USING (tenant_id = current_setting('app.tenant_id', true)::int)"
  );

  // As tenant 1, query users
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', '1', true)");
    const result = await client.query('SELECT * FROM users');
    await client.query('COMMIT');

    // Verify all visible rows belong to tenant 1
    const allTenant1 = result.rows.every((row: any) => row.tenant_id === 1);
    const visibleCount = result.rowCount!;

    return {
      isolated: allTenant1 && visibleCount === 2,
      visibleCount,
    };
  } finally {
    client.release();
  }
}

/**
 * Exercise 3: Use SET LOCAL in a transaction for RLS context
 */
export async function rlsWithTransaction(): Promise<{
  rowCount: number;
  tenantId: number;
}> {
  const pool = getPool();

  // Setup: add tenant_id, enable RLS, create policy
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER');
  await pool.query('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
  await pool.query('ALTER TABLE users FORCE ROW LEVEL SECURITY');
  await pool.query(
    "CREATE POLICY users_tenant_isolation ON users USING (tenant_id = current_setting('app.tenant_id', true)::int)"
  );

  // Insert data for two tenants
  await pool.query(
    "INSERT INTO users (username, email, tenant_id) VALUES ('t1_user', 't1@test.com', 1), ('t2_user', 't2@test.com', 2)"
  );

  // Use a dedicated client with SET LOCAL in a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // SET LOCAL scopes the setting to the current transaction only
    await client.query("SET LOCAL app.tenant_id = '1'");
    const result = await client.query('SELECT * FROM users');
    await client.query('COMMIT');
    // After COMMIT, app.tenant_id is automatically cleared
    return { rowCount: result.rowCount!, tenantId: 1 };
  } finally {
    client.release();
  }
}

/**
 * Exercise 4: Inspect EXPLAIN output with RLS active
 */
export async function explainWithRLS(): Promise<{
  hasFilter: boolean;
  plan: any;
}> {
  const pool = getPool();

  // Setup: add tenant_id, enable RLS, create policy
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER');
  await pool.query(
    "INSERT INTO users (username, email, tenant_id) VALUES ('user1', 'u1@test.com', 1)"
  );
  await pool.query('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
  await pool.query('ALTER TABLE users FORCE ROW LEVEL SECURITY');
  await pool.query(
    "CREATE POLICY users_tenant_isolation ON users USING (tenant_id = current_setting('app.tenant_id', true)::int)"
  );

  // Run EXPLAIN with tenant context set
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', '1', true)");
    const result = await client.query('EXPLAIN (FORMAT JSON) SELECT * FROM users');
    await client.query('COMMIT');

    const plan = result.rows[0]['QUERY PLAN'];
    const planString = JSON.stringify(plan);

    // Check if the plan contains a filter related to tenant_id (RLS adds it)
    const hasFilter = planString.includes('Filter') || planString.includes('tenant_id');

    return { hasFilter, plan };
  } finally {
    client.release();
  }
}

/**
 * Exercise 5: Inspect RLS status across tables
 */
export async function inspectRLSStatus(): Promise<any[]> {
  const pool = getPool();

  const result = await pool.query(`
    SELECT
      c.relname AS table_name,
      c.relrowsecurity AS rls_enabled,
      c.relforcerowsecurity AS rls_forced,
      COUNT(p.policyname)::int AS policy_count
    FROM pg_class c
    LEFT JOIN pg_policies p ON c.relname = p.tablename
    WHERE c.relname IN ('users', 'posts')
    GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
    ORDER BY c.relname
  `);

  return result.rows;
}
