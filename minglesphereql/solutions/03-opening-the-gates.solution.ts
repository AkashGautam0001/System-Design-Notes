import { getDb } from '../shared/connection.js';
import { schema } from '../shared/connection.js';
import { count } from 'drizzle-orm';

/**
 * Chapter 3: Opening the Gates - SOLUTIONS
 */

export async function insertSingleUser(userData: {
  username: string;
  email: string;
  displayName: string;
}): Promise<any> {
  const db = getDb();
  const result = await db.insert(schema.users).values(userData).returning();
  return result[0];
}

export async function insertMultipleUsers(
  usersData: Array<{ username: string; email: string }>
): Promise<any[]> {
  const db = getDb();
  const result = await db.insert(schema.users).values(usersData).returning();
  return result;
}

export async function insertUserWithDefaults(
  username: string,
  email: string
): Promise<any> {
  const db = getDb();
  const result = await db
    .insert(schema.users)
    .values({ username, email })
    .returning();
  return result[0];
}

export async function insertAndReturnSpecificFields(userData: {
  username: string;
  email: string;
  displayName: string;
}): Promise<{ id: number; username: string }> {
  const db = getDb();
  const result = await db
    .insert(schema.users)
    .values(userData)
    .returning({ id: schema.users.id, username: schema.users.username });
  return result[0];
}

export async function getInsertedUserCount(): Promise<number> {
  const db = getDb();
  const result = await db
    .select({ count: count() })
    .from(schema.users);
  return result[0].count;
}
