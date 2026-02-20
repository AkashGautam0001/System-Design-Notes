import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection } from '../../shared/connection.js';
import { clearAllTables } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/01-the-genesis-of-minglesphereql.solution.ts'
  : './exercise.ts';

const {
  verifyConnection,
  getDatabaseName,
  getServerVersion,
  listExtensions,
  getConnectionPoolStatus,
} = await import(exercisePath);

describe('Chapter 1: The Genesis of MingleSphereQL', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should verify the database connection returns { connected: 1 }', async () => {
    const result = await verifyConnection();
    expect(result).toEqual({ connected: 1 });
  });

  it('should return the current database name as a string', async () => {
    const dbName = await getDatabaseName();
    expect(typeof dbName).toBe('string');
    expect(dbName.length).toBeGreaterThan(0);
  });

  it('should return the server version as a string', async () => {
    const version = await getServerVersion();
    expect(typeof version).toBe('string');
    expect(version).toMatch(/^\d+/);
  });

  it('should list installed extensions as an array of strings', async () => {
    const extensions = await listExtensions();
    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBeGreaterThan(0);
    // plpgsql is always installed
    expect(extensions).toContain('plpgsql');
  });

  it('should return connection pool status with correct shape', async () => {
    const status = await getConnectionPoolStatus();
    expect(status).toHaveProperty('totalCount');
    expect(status).toHaveProperty('idleCount');
    expect(status).toHaveProperty('waitingCount');
    expect(typeof status.totalCount).toBe('number');
    expect(typeof status.idleCount).toBe('number');
    expect(typeof status.waitingCount).toBe('number');
  });
});
