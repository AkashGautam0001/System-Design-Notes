import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/29-speed-lanes.solution.ts'
  : './exercise.ts';

const {
  createBTreeIndex,
  createPartialIndex,
  createExpressionIndex,
  explainAnalyzeQuery,
  listTableIndexes,
} = await import(exercisePath);

describe('Chapter 29: Speed Lanes', () => {
  beforeEach(async () => {
    const pool = getPool();
    // Drop custom indexes to start clean
    await pool.query('DROP INDEX IF EXISTS idx_posts_content');
    await pool.query('DROP INDEX IF EXISTS idx_active_users');
    await pool.query('DROP INDEX IF EXISTS idx_users_lower_username');
    await clearAllTables();
  });

  afterAll(async () => {
    const pool = getPool();
    await pool.query('DROP INDEX IF EXISTS idx_posts_content');
    await pool.query('DROP INDEX IF EXISTS idx_active_users');
    await pool.query('DROP INDEX IF EXISTS idx_users_lower_username');
    await closeConnection();
  });

  it('should create a B-tree index on posts(content) and verify it exists', async () => {
    const result = await createBTreeIndex();
    expect(result.created).toBe(true);
    expect(result.indexType).toBe('btree');
  });

  it('should create a partial index on active users and verify it exists', async () => {
    const result = await createPartialIndex();
    expect(result.created).toBe(true);

    // Verify the index definition includes the WHERE clause
    const pool = getPool();
    const check = await pool.query(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_active_users'`
    );
    expect(check.rows.length).toBe(1);
    expect(check.rows[0].indexdef.toLowerCase()).toContain('where');
  });

  it('should create an expression index on LOWER(username) and verify it exists', async () => {
    const result = await createExpressionIndex();
    expect(result.created).toBe(true);

    // Verify the index definition includes the expression
    const pool = getPool();
    const check = await pool.query(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_users_lower_username'`
    );
    expect(check.rows.length).toBe(1);
    expect(check.rows[0].indexdef.toLowerCase()).toContain('lower');
  });

  it('should run EXPLAIN ANALYZE and return the execution plan with timing', async () => {
    const result = await explainAnalyzeQuery();
    expect(result.plan).toBeDefined();
    expect(typeof result.executionTime).toBe('number');
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });

  it('should list all indexes for a given table', async () => {
    const indexes = await listTableIndexes('users');
    expect(Array.isArray(indexes)).toBe(true);
    expect(indexes.length).toBeGreaterThanOrEqual(1);
    // Every row should have indexname and indexdef
    for (const idx of indexes) {
      expect(idx.indexname).toBeDefined();
      expect(idx.indexdef).toBeDefined();
    }
  });
});
