import { getPool } from '../shared/connection.js';

/**
 * Chapter 7: The Migration Trail - SOLUTIONS
 */

export async function addColumnToTable(): Promise<boolean> {
  const pool = getPool();
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)');
  const result = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'users' AND table_schema = 'public' AND column_name = 'phone'`
  );
  return result.rows.length > 0;
}

export async function dropColumnFromTable(): Promise<boolean> {
  const pool = getPool();
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_col TEXT');
  await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS temp_col');
  const result = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'users' AND table_schema = 'public' AND column_name = 'temp_col'`
  );
  return result.rows.length === 0;
}

export async function renameColumn(): Promise<boolean> {
  const pool = getPool();
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS old_name TEXT');
  await pool.query('ALTER TABLE users RENAME COLUMN old_name TO new_name');
  const result = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'users' AND table_schema = 'public' AND column_name = 'new_name'`
  );
  const exists = result.rows.length > 0;
  await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS new_name');
  return exists;
}

export async function addIndexToTable(): Promise<boolean> {
  const pool = getPool();
  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name)');
  const result = await pool.query(
    `SELECT indexname FROM pg_indexes
     WHERE tablename = 'users' AND indexname = 'idx_users_display_name'`
  );
  const exists = result.rows.length > 0;
  await pool.query('DROP INDEX IF EXISTS idx_users_display_name');
  return exists;
}

export async function getTableMigrationInfo(): Promise<{
  tableCount: number;
  columnCount: number;
  indexCount: number;
}> {
  const pool = getPool();

  const tableResult = await pool.query(
    `SELECT COUNT(*)::int as count FROM pg_tables
     WHERE tablename = 'users' AND schemaname = 'public'`
  );

  const columnResult = await pool.query(
    `SELECT COUNT(*)::int as count FROM information_schema.columns
     WHERE table_name = 'users' AND table_schema = 'public'`
  );

  const indexResult = await pool.query(
    `SELECT COUNT(*)::int as count FROM pg_indexes
     WHERE tablename = 'users' AND schemaname = 'public'`
  );

  return {
    tableCount: tableResult.rows[0].count,
    columnCount: columnResult.rows[0].count,
    indexCount: indexResult.rows[0].count,
  };
}
