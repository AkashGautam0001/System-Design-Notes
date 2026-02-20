import { getDb, getPool, schema } from '../shared/connection.js';
import { eq, sql } from 'drizzle-orm';

/**
 * Chapter 11: The JSON Vault - SOLUTIONS
 */

export async function insertUserWithMetadata(
  username: string,
  email: string,
  metadata: any
): Promise<any> {
  const db = getDb();
  const result = await db
    .insert(schema.users)
    .values({ username, email, metadata })
    .returning();
  return result[0];
}

export async function queryByJsonField(field: string, value: string): Promise<any[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM users WHERE metadata->>$1 = $2`,
    [field, value]
  );
  return result.rows;
}

export async function updateJsonField(userId: number, key: string, value: any): Promise<any> {
  const pool = getPool();
  const result = await pool.query(
    `UPDATE users SET metadata = jsonb_set(COALESCE(metadata, '{}'), $2, $3) WHERE id = $1 RETURNING *`,
    [userId, `{${key}}`, JSON.stringify(value)]
  );
  return result.rows[0];
}

export async function queryNestedJson(path: string[], value: string): Promise<any[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM users WHERE metadata #>> $1 = $2`,
    [path, value]
  );
  return result.rows;
}

export async function getJsonKeys(userId: number): Promise<string[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT jsonb_object_keys(metadata) as key FROM users WHERE id = $1 ORDER BY key`,
    [userId]
  );
  return result.rows.map((row: any) => row.key);
}
