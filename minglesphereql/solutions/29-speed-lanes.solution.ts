import { getPool } from '../shared/connection.js';

/**
 * Chapter 29: Speed Lanes - SOLUTIONS
 */

export async function createBTreeIndex(): Promise<{ created: boolean; indexType: string }> {
  const pool = getPool();

  // Create a B-tree index on posts(content)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_content ON posts(content)`);

  // Verify the index exists and get its type from pg_indexes
  const result = await pool.query(
    `SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'idx_posts_content'`
  );

  const created = result.rows.length > 0;

  // pg_indexes doesn't directly expose access method; parse it from indexdef or query pg_am
  // The indexdef will contain "USING btree" for a default B-tree index
  let indexType = 'btree';
  if (created) {
    const amResult = await pool.query(`
      SELECT am.amname as index_type
      FROM pg_index idx
      JOIN pg_class cls ON cls.oid = idx.indexrelid
      JOIN pg_am am ON am.oid = cls.relam
      WHERE cls.relname = 'idx_posts_content'
    `);
    if (amResult.rows.length > 0) {
      indexType = amResult.rows[0].index_type;
    }
  }

  return { created, indexType };
}

export async function createPartialIndex(): Promise<{ created: boolean }> {
  const pool = getPool();

  // Create a partial index: only index emails for non-deleted users
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_active_users ON users(email) WHERE deleted_at IS NULL`
  );

  // Verify the index exists
  const result = await pool.query(
    `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_active_users'`
  );

  return { created: result.rows.length > 0 };
}

export async function createExpressionIndex(): Promise<{ created: boolean }> {
  const pool = getPool();

  // Create an expression index on the lowered username
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_users_lower_username ON users(LOWER(username))`
  );

  // Verify the index exists
  const result = await pool.query(
    `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_users_lower_username'`
  );

  return { created: result.rows.length > 0 };
}

export async function explainAnalyzeQuery(): Promise<{ plan: any; executionTime: number }> {
  const pool = getPool();

  // Seed some test users
  for (let i = 0; i < 10; i++) {
    await pool.query(
      `INSERT INTO users (username, email) VALUES ($1, $2)`,
      [`user${i}`, `user${i}@test.com`]
    );
  }

  // Run EXPLAIN ANALYZE in JSON format
  const result = await pool.query(
    'EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM users WHERE username = $1',
    ['user5']
  );

  const plan = result.rows[0]['QUERY PLAN'];

  return {
    plan,
    executionTime: plan[0]['Execution Time'],
  };
}

export async function listTableIndexes(tableName: string): Promise<any[]> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = $1 ORDER BY indexname`,
    [tableName]
  );

  return result.rows;
}
