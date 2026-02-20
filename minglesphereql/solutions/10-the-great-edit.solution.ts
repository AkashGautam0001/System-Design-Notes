import { getDb, getPool, schema } from '../shared/connection.js';
import { eq, and, isNull, sql } from 'drizzle-orm';

/**
 * Chapter 10: The Great Edit - SOLUTIONS
 */

export async function updateUserDisplayName(userId: number, newName: string): Promise<any> {
  const db = getDb();
  const result = await db
    .update(schema.users)
    .set({ displayName: newName })
    .where(eq(schema.users.id, userId))
    .returning();
  return result[0];
}

export async function updateUserStatus(userId: number, status: string): Promise<any> {
  const db = getDb();
  const result = await db
    .update(schema.users)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(schema.users.id, userId))
    .returning();
  return result[0];
}

export async function incrementPostCount(userId: number): Promise<any> {
  const db = getDb();
  const result = await db
    .update(schema.users)
    .set({ postCount: sql`${schema.users.postCount} + 1` })
    .where(eq(schema.users.id, userId))
    .returning();
  return result[0];
}

export async function updateMultipleFields(
  userId: number,
  fields: { displayName?: string; bio?: string; avatarUrl?: string }
): Promise<any> {
  const db = getDb();
  const result = await db
    .update(schema.users)
    .set(fields)
    .where(eq(schema.users.id, userId))
    .returning();
  return result[0];
}

export async function conditionalUpdate(userId: number, newBio: string): Promise<any> {
  const db = getDb();
  const result = await db
    .update(schema.users)
    .set({ bio: newBio })
    .where(and(eq(schema.users.id, userId), isNull(schema.users.bio)))
    .returning();
  return result.length > 0 ? result[0] : null;
}
