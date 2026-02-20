import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/07-the-migration-trail.solution.ts'
  : './exercise.ts';

const {
  addColumnToTable,
  dropColumnFromTable,
  renameColumn,
  addIndexToTable,
  getTableMigrationInfo,
} = await import(exercisePath);

describe('Chapter 7: The Migration Trail', () => {
  beforeEach(async () => {
    await clearAllTables();
    // Clean up any leftover columns from previous test runs
    const pool = getPool();
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS phone');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS temp_col');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS old_name');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS new_name');
    await pool.query('DROP INDEX IF EXISTS idx_users_display_name');
  });

  afterAll(async () => {
    // Final cleanup
    const pool = getPool();
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS phone');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS temp_col');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS old_name');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS new_name');
    await pool.query('DROP INDEX IF EXISTS idx_users_display_name');
    await closeConnection();
  });

  it('should add a phone column to the users table and verify it exists', async () => {
    const result = await addColumnToTable();
    expect(result).toBe(true);
  });

  it('should add and then drop a temporary column from the users table', async () => {
    const result = await dropColumnFromTable();
    expect(result).toBe(true);
  });

  it('should rename a column from old_name to new_name on the users table', async () => {
    const result = await renameColumn();
    expect(result).toBe(true);
  });

  it('should create an index on the display_name column and verify it exists', async () => {
    const result = await addIndexToTable();
    expect(result).toBe(true);
  });

  it('should return migration info with tableCount, columnCount, and indexCount', async () => {
    const info = await getTableMigrationInfo();
    expect(info.tableCount).toBe(1);
    expect(info.columnCount).toBeGreaterThan(0);
    expect(info.indexCount).toBeGreaterThan(0);
  });
});
