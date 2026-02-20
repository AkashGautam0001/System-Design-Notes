import { getDb, getPool, schema } from '../shared/connection.js';
import { eq, isNull, sql } from 'drizzle-orm';

/**
 * Chapter 12: The Clean Sweep - SOLUTIONS
 */

export async function hardDeleteUser(userId: number): Promise<any> {
  const db = getDb();
  const result = await db
    .delete(schema.users)
    .where(eq(schema.users.id, userId))
    .returning();
  return result[0];
}

export async function softDeleteUser(userId: number): Promise<any> {
  const db = getDb();
  const result = await db
    .update(schema.users)
    .set({ deletedAt: new Date() })
    .where(eq(schema.users.id, userId))
    .returning();
  return result[0];
}

export async function findActiveUsers(): Promise<any[]> {
  const db = getDb();
  const result = await db
    .select()
    .from(schema.users)
    .where(isNull(schema.users.deletedAt));
  return result;
}

export async function cascadeDeleteTest(userId: number): Promise<{
  userDeleted: boolean;
  postsRemaining: number;
}> {
  const pool = getPool();
  const db = getDb();

  // First, insert a post for the user
  await pool.query(
    `INSERT INTO posts (author_id, content, type) VALUES ($1, $2, $3)`,
    [userId, 'A post that should be cascade deleted', 'text']
  );

  // Delete the user (CASCADE should remove the post)
  await db
    .delete(schema.users)
    .where(eq(schema.users.id, userId));

  // Check if user was deleted
  const userCheck = await pool.query(
    'SELECT COUNT(*)::int as count FROM users WHERE id = $1',
    [userId]
  );

  // Check remaining posts for this author
  const postCheck = await pool.query(
    'SELECT COUNT(*)::int as count FROM posts WHERE author_id = $1',
    [userId]
  );

  return {
    userDeleted: userCheck.rows[0].count === 0,
    postsRemaining: postCheck.rows[0].count,
  };
}

export async function restoreSoftDeletedUser(userId: number): Promise<any> {
  const db = getDb();
  const result = await db
    .update(schema.users)
    .set({ deletedAt: null })
    .where(eq(schema.users.id, userId))
    .returning();
  return result[0];
}
