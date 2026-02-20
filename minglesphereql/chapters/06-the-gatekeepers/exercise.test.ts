import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection } from '../../shared/connection.js';
import { clearAllTables } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/06-the-gatekeepers.solution.ts'
  : './exercise.ts';

const {
  testUniqueConstraint,
  testNotNullConstraint,
  testForeignKeyConstraint,
  testCheckConstraintOnLength,
  testDefaultValues,
} = await import(exercisePath);

describe('Chapter 6: The Gatekeepers', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should catch a unique constraint violation (error code 23505)', async () => {
    const errorCode = await testUniqueConstraint();
    expect(errorCode).toBe('23505');
  });

  it('should catch a not-null constraint violation (error code 23502)', async () => {
    const errorCode = await testNotNullConstraint();
    expect(errorCode).toBe('23502');
  });

  it('should catch a foreign key constraint violation (error code 23503)', async () => {
    const errorCode = await testForeignKeyConstraint();
    expect(errorCode).toBe('23503');
  });

  it('should catch a check constraint violation (error code 23514)', async () => {
    const errorCode = await testCheckConstraintOnLength();
    expect(errorCode).toBe('23514');
  });

  it('should apply default values when inserting a user with only username and email', async () => {
    const result = await testDefaultValues();
    expect(result.hasCreatedAt).toBe(true);
    expect(result.hasStatus).toBe(true);
    expect(result.statusValue).toBe('offline');
  });
});
