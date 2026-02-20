import { getPool } from '../../shared/connection.js';

/**
 * Chapter 1: The Genesis of MingleSphereQL
 *
 * Day one of MingleSphereQL - getting the database connected.
 * Complete each function to verify your database connection is alive.
 */

/**
 * Verify the database connection by executing a simple query.
 * Use getPool() to query `SELECT 1 as connected` and return the result rows[0] object.
 * Expected return: { connected: 1 }
 */
export async function verifyConnection(): Promise<{ connected: number }> {
  throw new Error('Not implemented');
}

/**
 * Get the name of the current database.
 * Query `SELECT current_database()` and return the database name string.
 */
export async function getDatabaseName(): Promise<string> {
  throw new Error('Not implemented');
}

/**
 * Get the PostgreSQL server version.
 * Query `SHOW server_version` and return the version string.
 */
export async function getServerVersion(): Promise<string> {
  throw new Error('Not implemented');
}

/**
 * List all installed PostgreSQL extensions.
 * Query `SELECT extname FROM pg_extension ORDER BY extname` and return
 * an array of extension name strings.
 */
export async function listExtensions(): Promise<string[]> {
  throw new Error('Not implemented');
}

/**
 * Get the connection pool status.
 * Use getPool() to return an object with totalCount, idleCount, and waitingCount.
 */
export async function getConnectionPoolStatus(): Promise<{
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}> {
  throw new Error('Not implemented');
}
