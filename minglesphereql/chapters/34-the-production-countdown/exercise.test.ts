import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getPool, closeConnection } from '../../shared/connection.js';
import { clearAllTables, seedUsers } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/34-the-production-countdown.solution.ts'
  : './exercise.ts';

const {
  getConnectionPoolConfig,
  preparedStatementQuery,
  measureQueryPerformance,
  gracefulErrorHandling,
  getDatabaseStats,
} = await import(exercisePath);

describe('Chapter 34: The Production Countdown', () => {
  beforeEach(async () => {
    await clearAllTables();
    await seedUsers(3);
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should return the connection pool configuration', () => {
    const config = getConnectionPoolConfig();

    expect(config).toBeDefined();
    expect(typeof config.totalCount).toBe('number');
    expect(typeof config.idleCount).toBe('number');
    expect(typeof config.waitingCount).toBe('number');
    expect(typeof config.max).toBe('number');
    expect(config.max).toBe(10);
    expect(config.totalCount).toBeGreaterThanOrEqual(0);
    expect(config.idleCount).toBeGreaterThanOrEqual(0);
    expect(config.waitingCount).toBeGreaterThanOrEqual(0);
  });

  it('should execute a named prepared statement to find a user', async () => {
    const rows = await preparedStatementQuery('user1');

    expect(rows.length).toBe(1);
    expect(rows[0].username).toBe('user1');
    expect(rows[0].email).toBe('user1@minglesphereql.dev');
    expect(rows[0].id).toBeDefined();
    // Should not return extra fields beyond id, username, email
    expect(Object.keys(rows[0]).sort()).toEqual(['email', 'id', 'username']);
  });

  it('should measure query performance with timing and field info', async () => {
    const result = await measureQueryPerformance('SELECT id, username, email FROM users');

    expect(result).toBeDefined();
    expect(result.rowCount).toBe(3);
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.fields).toEqual(['id', 'username', 'email']);
  });

  it('should handle errors gracefully and return error details', async () => {
    // Test with a valid query first
    const success = await gracefulErrorHandling('SELECT 1');
    expect(success.success).toBe(true);
    expect(success.rowCount).toBe(1);

    // Test with an invalid query
    const failure = await gracefulErrorHandling('SELECT * FROM nonexistent_table_xyz');
    expect(failure.success).toBe(false);
    expect(failure.errorCode).toBeDefined();
    expect(failure.errorMessage).toBeDefined();
    expect(failure.errorMessage).toContain('nonexistent_table_xyz');
    expect(failure.errorSeverity).toBe('ERROR');
  });

  it('should collect database statistics', async () => {
    const stats = await getDatabaseStats();

    expect(stats).toBeDefined();
    expect(typeof stats.active_connections).toBe('number');
    expect(stats.active_connections).toBeGreaterThanOrEqual(1);
    expect(typeof stats.database_size_bytes).toBe('string'); // pg_database_size returns bigint as string
    expect(parseInt(stats.database_size_bytes, 10)).toBeGreaterThan(0);
    expect(typeof stats.table_count).toBe('number');
    expect(stats.table_count).toBeGreaterThanOrEqual(1);
    expect(typeof stats.index_count).toBe('number');
    expect(stats.index_count).toBeGreaterThanOrEqual(0);
  });
});
