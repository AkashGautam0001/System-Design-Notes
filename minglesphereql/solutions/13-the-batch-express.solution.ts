import { getDb, getPool, schema } from '../shared/connection.js';
import { eq, inArray, sql } from 'drizzle-orm';

/**
 * Chapter 13: The Batch Express - SOLUTIONS
 */

export async function bulkInsertUsers(
  usersData: Array<{ username: string; email: string }>
): Promise<any[]> {
  const db = getDb();
  const result = await db
    .insert(schema.users)
    .values(usersData)
    .returning();
  return result;
}

export async function upsertUser(userData: {
  username: string;
  email: string;
  displayName: string;
}): Promise<any> {
  const db = getDb();
  const result = await db
    .insert(schema.users)
    .values(userData)
    .onConflictDoUpdate({
      target: schema.users.username,
      set: {
        displayName: userData.displayName,
        updatedAt: new Date(),
      },
    })
    .returning();
  return result[0];
}

export async function insertOrIgnore(userData: {
  username: string;
  email: string;
}): Promise<any[]> {
  const db = getDb();
  const result = await db
    .insert(schema.users)
    .values(userData)
    .onConflictDoNothing({
      target: schema.users.username,
    })
    .returning();
  return result;
}

export async function batchUpdateStatuses(
  userIds: number[],
  newStatus: string
): Promise<any[]> {
  const db = getDb();
  const result = await db
    .update(schema.users)
    .set({ status: newStatus as any })
    .where(inArray(schema.users.id, userIds))
    .returning();
  return result;
}

export async function bulkDeleteByIds(userIds: number[]): Promise<any[]> {
  const db = getDb();
  const result = await db
    .delete(schema.users)
    .where(inArray(schema.users.id, userIds))
    .returning();
  return result;
}
