import { getDb, getPool } from '../shared/connection.js';
import { schema } from '../shared/connection.js';
import { eq } from 'drizzle-orm';

/**
 * Chapter 5: The Column Codex - SOLUTIONS
 */

export async function insertUserWithAllTypes(data: {
  username: string;
  email: string;
  displayName: string;
  bio: string;
  isVerified: boolean;
  postCount: number;
  metadata: any;
}): Promise<any> {
  const db = getDb();
  const result = await db.insert(schema.users).values(data).returning();
  return result[0];
}

export async function queryJsonbField(
  key: string,
  value: string
): Promise<any[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM users WHERE metadata->>$1 = $2`,
    [key, value]
  );
  return result.rows;
}

export async function getUserTimestamps(
  userId: number
): Promise<{ createdAt: Date; updatedAt: Date }> {
  const db = getDb();
  const result = await db
    .select({
      createdAt: schema.users.createdAt,
      updatedAt: schema.users.updatedAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  return result[0];
}

export async function findVerifiedUsers(): Promise<any[]> {
  const db = getDb();
  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.isVerified, true));
  return result;
}

export async function updateUserMetadata(
  userId: number,
  metadata: any
): Promise<any> {
  const db = getDb();
  const result = await db
    .update(schema.users)
    .set({ metadata })
    .where(eq(schema.users.id, userId))
    .returning();
  return result[0];
}
