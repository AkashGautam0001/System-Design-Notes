import { getPool } from '../shared/connection.js';

/**
 * Chapter 34: The Production Countdown - SOLUTIONS
 */

export function getConnectionPoolConfig(): {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  max: number;
} {
  const pool = getPool();
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    max: (pool as any).options?.max || 10,
  };
}

export async function preparedStatementQuery(
  username: string,
): Promise<any[]> {
  const pool = getPool();
  const result = await pool.query({
    name: 'find_user_by_username',
    text: 'SELECT id, username, email FROM users WHERE username = $1',
    values: [username],
  });
  return result.rows;
}

export async function measureQueryPerformance(
  query: string,
): Promise<{ rowCount: number | null; durationMs: number; fields: string[] }> {
  const pool = getPool();
  const start = performance.now();
  const result = await pool.query(query);
  const duration = performance.now() - start;
  return {
    rowCount: result.rowCount,
    durationMs: Math.round(duration * 100) / 100,
    fields: result.fields.map((f: any) => f.name),
  };
}

export async function gracefulErrorHandling(
  query: string,
): Promise<any> {
  const pool = getPool();
  try {
    const result = await pool.query(query);
    return { success: true, rowCount: result.rowCount };
  } catch (error: any) {
    return {
      success: false,
      errorCode: error.code,
      errorMessage: error.message,
      errorSeverity: error.severity,
    };
  }
}

export async function getDatabaseStats(): Promise<any> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
       (SELECT pg_database_size(current_database())) as database_size_bytes,
       (SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = 'public') as table_count,
       (SELECT COUNT(*)::int FROM pg_indexes WHERE schemaname = 'public') as index_count`,
  );
  return result.rows[0];
}
