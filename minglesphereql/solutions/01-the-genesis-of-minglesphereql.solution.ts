import { getPool } from '../shared/connection.js';

/**
 * Chapter 1: The Genesis of MingleSphereQL - SOLUTIONS
 */

export async function verifyConnection(): Promise<{ connected: number }> {
  const pool = getPool();
  const result = await pool.query('SELECT 1 as connected');
  return result.rows[0];
}

export async function getDatabaseName(): Promise<string> {
  const pool = getPool();
  const result = await pool.query('SELECT current_database()');
  return result.rows[0].current_database;
}

export async function getServerVersion(): Promise<string> {
  const pool = getPool();
  const result = await pool.query('SHOW server_version');
  return result.rows[0].server_version;
}

export async function listExtensions(): Promise<string[]> {
  const pool = getPool();
  const result = await pool.query('SELECT extname FROM pg_extension ORDER BY extname');
  return result.rows.map((row: any) => row.extname);
}

export async function getConnectionPoolStatus(): Promise<{
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}> {
  const pool = getPool();
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}
