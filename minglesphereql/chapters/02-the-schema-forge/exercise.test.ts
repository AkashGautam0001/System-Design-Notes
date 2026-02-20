import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection } from '../../shared/connection.js';
import { clearAllTables } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/02-the-schema-forge.solution.ts'
  : './exercise.ts';

const {
  getTableColumns,
  getTableConstraints,
  verifyUsersTableExists,
  getColumnDefaults,
  countTotalTables,
} = await import(exercisePath);

describe('Chapter 2: The Schema Forge', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should return columns of the users table with correct structure', async () => {
    const columns = await getTableColumns();
    expect(Array.isArray(columns)).toBe(true);
    expect(columns.length).toBeGreaterThan(0);
    // Every row should have the expected keys
    for (const col of columns) {
      expect(col).toHaveProperty('column_name');
      expect(col).toHaveProperty('data_type');
      expect(col).toHaveProperty('is_nullable');
    }
    // The 'id' column should be present
    const idCol = columns.find((c: any) => c.column_name === 'id');
    expect(idCol).toBeDefined();
  });

  it('should return constraints on the users table', async () => {
    const constraints = await getTableConstraints();
    expect(Array.isArray(constraints)).toBe(true);
    expect(constraints.length).toBeGreaterThan(0);
    for (const c of constraints) {
      expect(c).toHaveProperty('constraint_name');
      expect(c).toHaveProperty('constraint_type');
    }
    // Should have a PRIMARY KEY constraint
    const pk = constraints.find((c: any) => c.constraint_type === 'PRIMARY KEY');
    expect(pk).toBeDefined();
  });

  it('should verify the users table exists', async () => {
    const exists = await verifyUsersTableExists();
    expect(exists).toBe(true);
  });

  it('should return columns that have default values', async () => {
    const defaults = await getColumnDefaults();
    expect(Array.isArray(defaults)).toBe(true);
    expect(defaults.length).toBeGreaterThan(0);
    for (const d of defaults) {
      expect(d).toHaveProperty('column_name');
      expect(d).toHaveProperty('column_default');
    }
    // created_at should have a default (now())
    const createdAt = defaults.find((d: any) => d.column_name === 'created_at');
    expect(createdAt).toBeDefined();
  });

  it('should count the total number of tables in the public schema', async () => {
    const tableCount = await countTotalTables();
    expect(typeof tableCount).toBe('number');
    // We know there are at least 10 tables in the schema
    expect(tableCount).toBeGreaterThanOrEqual(10);
  });
});
