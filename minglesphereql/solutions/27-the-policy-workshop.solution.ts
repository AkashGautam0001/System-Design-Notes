import { getPool } from '../shared/connection.js';

/**
 * Chapter 27: The Policy Workshop - SOLUTIONS
 *
 * Nuanced RLS policies: owner writes, permissive/restrictive
 * composition, role-based access, and policy introspection.
 */

/**
 * Exercise 1: Create an owner-only UPDATE policy for posts
 */
export async function createOwnerWritePolicy(): Promise<{
  ownUpdateCount: number;
  otherUpdateCount: number;
}> {
  const pool = getPool();

  // Insert two users
  await pool.query(
    "INSERT INTO users (username, email) VALUES ('user1', 'user1@test.com')"
  );
  await pool.query(
    "INSERT INTO users (username, email) VALUES ('user2', 'user2@test.com')"
  );

  // Get their IDs
  const u1 = await pool.query("SELECT id FROM users WHERE username = 'user1'");
  const u2 = await pool.query("SELECT id FROM users WHERE username = 'user2'");
  const user1Id = u1.rows[0].id;
  const user2Id = u2.rows[0].id;

  // Insert posts: one by user1, one by user2
  await pool.query(
    'INSERT INTO posts (author_id, content, type) VALUES ($1, $2, $3)',
    [user1Id, 'Post by user1', 'text']
  );
  await pool.query(
    'INSERT INTO posts (author_id, content, type) VALUES ($1, $2, $3)',
    [user2Id, 'Post by user2', 'text']
  );

  // Enable RLS with FORCE
  await pool.query('ALTER TABLE posts ENABLE ROW LEVEL SECURITY');
  await pool.query('ALTER TABLE posts FORCE ROW LEVEL SECURITY');

  // Create a SELECT policy allowing all reads
  await pool.query('CREATE POLICY posts_select_all ON posts FOR SELECT USING (true)');

  // Create an UPDATE policy: only owner can update
  await pool.query(
    "CREATE POLICY posts_owner_write ON posts FOR UPDATE USING (author_id = current_setting('app.current_user_id', true)::int)"
  );

  // As user1, try to update own post
  const client1 = await pool.connect();
  let ownUpdateCount = 0;
  try {
    await client1.query('BEGIN');
    await client1.query("SELECT set_config('app.current_user_id', $1::text, true)", [user1Id]);
    const ownResult = await client1.query(
      "UPDATE posts SET content = 'Updated by owner' WHERE author_id = $1",
      [user1Id]
    );
    ownUpdateCount = ownResult.rowCount!;
    await client1.query('COMMIT');
  } finally {
    client1.release();
  }

  // As user1, try to update user2's post
  const client2 = await pool.connect();
  let otherUpdateCount = 0;
  try {
    await client2.query('BEGIN');
    await client2.query("SELECT set_config('app.current_user_id', $1::text, true)", [user1Id]);
    const otherResult = await client2.query(
      "UPDATE posts SET content = 'Attempted hijack' WHERE author_id = $1",
      [user2Id]
    );
    otherUpdateCount = otherResult.rowCount!;
    await client2.query('COMMIT');
  } finally {
    client2.release();
  }

  return { ownUpdateCount, otherUpdateCount };
}

/**
 * Exercise 2: Create multiple permissive policies combined with OR
 */
export async function createPermissivePolicies(): Promise<{ visibleCount: number }> {
  const pool = getPool();

  // Insert two users
  await pool.query(
    "INSERT INTO users (username, email) VALUES ('user1', 'user1@test.com')"
  );
  await pool.query(
    "INSERT INTO users (username, email) VALUES ('user2', 'user2@test.com')"
  );

  const u1 = await pool.query("SELECT id FROM users WHERE username = 'user1'");
  const u2 = await pool.query("SELECT id FROM users WHERE username = 'user2'");
  const user1Id = u1.rows[0].id;
  const user2Id = u2.rows[0].id;

  // user1's post with low likes
  await pool.query(
    'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4)',
    [user1Id, 'My regular post', 'text', 5]
  );

  // user2's post with high likes (popular)
  await pool.query(
    'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4)',
    [user2Id, 'Popular post', 'text', 15]
  );

  // Enable RLS with FORCE
  await pool.query('ALTER TABLE posts ENABLE ROW LEVEL SECURITY');
  await pool.query('ALTER TABLE posts FORCE ROW LEVEL SECURITY');

  // Permissive policy 1: see own posts
  await pool.query(
    "CREATE POLICY posts_author_read ON posts FOR SELECT USING (author_id = current_setting('app.current_user_id', true)::int)"
  );

  // Permissive policy 2: see popular posts (likes_count > 10)
  await pool.query(
    'CREATE POLICY posts_popular_read ON posts FOR SELECT USING (likes_count > 10)'
  );

  // As user1, query posts - should see both (own with 5 likes + popular with 15 likes)
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user_id', $1::text, true)", [user1Id]);
    const result = await client.query('SELECT * FROM posts');
    await client.query('COMMIT');
    return { visibleCount: result.rowCount! };
  } finally {
    client.release();
  }
}

/**
 * Exercise 3: Create a restrictive policy that ANDs with permissive policies
 */
export async function createRestrictivePolicy(): Promise<{ visibleCount: number }> {
  const pool = getPool();

  // Insert a user
  await pool.query(
    "INSERT INTO users (username, email) VALUES ('user1', 'user1@test.com')"
  );
  const u1 = await pool.query("SELECT id FROM users WHERE username = 'user1'");
  const user1Id = u1.rows[0].id;

  // Insert 2 posts
  await pool.query(
    'INSERT INTO posts (author_id, content, type) VALUES ($1, $2, $3)',
    [user1Id, 'Active post', 'text']
  );
  await pool.query(
    'INSERT INTO posts (author_id, content, type) VALUES ($1, $2, $3)',
    [user1Id, 'Deleted post', 'text']
  );

  // Soft-delete the second post
  await pool.query(
    "UPDATE posts SET deleted_at = NOW() WHERE content = 'Deleted post'"
  );

  // Enable RLS with FORCE
  await pool.query('ALTER TABLE posts ENABLE ROW LEVEL SECURITY');
  await pool.query('ALTER TABLE posts FORCE ROW LEVEL SECURITY');

  // Permissive policy: allow all reads
  await pool.query(
    'CREATE POLICY posts_all_read ON posts FOR SELECT USING (true)'
  );

  // Restrictive policy: never show soft-deleted
  await pool.query(
    'CREATE POLICY posts_not_deleted ON posts AS RESTRICTIVE FOR SELECT USING (deleted_at IS NULL)'
  );

  // Query - should only see the active post
  const result = await pool.query('SELECT * FROM posts');
  return { visibleCount: result.rowCount! };
}

/**
 * Exercise 4: Create database roles for role-based access
 */
export async function createRoleBasedPolicies(): Promise<{ rolesCreated: boolean }> {
  const pool = getPool();

  // Create roles (idempotent using exception handling)
  await pool.query(
    "DO $$ BEGIN CREATE ROLE app_admin; EXCEPTION WHEN duplicate_object THEN NULL; END $$"
  );
  await pool.query(
    "DO $$ BEGIN CREATE ROLE app_user; EXCEPTION WHEN duplicate_object THEN NULL; END $$"
  );

  // Grant permissions to app_admin
  await pool.query('GRANT ALL ON posts TO app_admin');
  await pool.query('GRANT ALL ON users TO app_admin');
  await pool.query('GRANT USAGE ON SCHEMA public TO app_admin');
  await pool.query('GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_admin');

  // Grant permissions to app_user
  await pool.query('GRANT SELECT, INSERT, UPDATE ON posts TO app_user');
  await pool.query('GRANT SELECT, INSERT, UPDATE ON users TO app_user');
  await pool.query('GRANT USAGE ON SCHEMA public TO app_user');
  await pool.query('GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user');

  return { rolesCreated: true };
}

/**
 * Exercise 5: Get comprehensive policy details from pg_policies
 */
export async function getPolicyDetails(tableName: string): Promise<any[]> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT policyname, permissive, roles, cmd, qual AS using_expr, with_check
     FROM pg_policies
     WHERE tablename = $1
     ORDER BY policyname`,
    [tableName]
  );

  return result.rows;
}
