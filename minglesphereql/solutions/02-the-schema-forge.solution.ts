import { getPool } from '../shared/connection.js';

/**
 * Chapter 2: The Schema Forge - SOLUTIONS
 */

export async function getTableColumns(): Promise<
  Array<{ column_name: string; data_type: string; is_nullable: string }>
> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_name = 'users'
     ORDER BY ordinal_position`
  );
  return result.rows;
}

export async function getTableConstraints(): Promise<
  Array<{ constraint_name: string; constraint_type: string }>
> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT constraint_name, constraint_type
     FROM information_schema.table_constraints
     WHERE table_name = 'users'
     ORDER BY constraint_name`
  );
  return result.rows;
}

export async function verifyUsersTableExists(): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT EXISTS(SELECT FROM information_schema.tables WHERE table_name = 'users')`
  );
  return result.rows[0].exists;
}

export async function getColumnDefaults(): Promise<
  Array<{ column_name: string; column_default: string }>
> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT column_name, column_default
     FROM information_schema.columns
     WHERE table_name = 'users' AND column_default IS NOT NULL
     ORDER BY ordinal_position`
  );
  return result.rows;
}

export async function countTotalTables(): Promise<number> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT COUNT(*)::int as count
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  );
  return result.rows[0].count;
}
