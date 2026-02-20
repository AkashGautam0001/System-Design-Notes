import { getDb } from '../shared/connection.js';
import { schema } from '../shared/connection.js';
import { eq, or, ilike, asc } from 'drizzle-orm';

/**
 * Chapter 4: Finding Your People - SOLUTIONS
 */

export async function findUserByUsername(username: string): Promise<any | null> {
  const db = getDb();
  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username));
  return result[0] || null;
}

export async function findUsersByStatus(status: string): Promise<any[]> {
  const db = getDb();
  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.status, status as any));
  return result;
}

export async function searchUsersByName(searchTerm: string): Promise<any[]> {
  const db = getDb();
  const result = await db
    .select()
    .from(schema.users)
    .where(ilike(schema.users.displayName, `%${searchTerm}%`));
  return result;
}

export async function findUsersWithPagination(
  limit: number,
  offset: number
): Promise<any[]> {
  const db = getDb();
  const result = await db
    .select()
    .from(schema.users)
    .limit(limit)
    .offset(offset)
    .orderBy(asc(schema.users.id));
  return result;
}

export async function findUserByEmailOrUsername(
  email: string,
  username: string
): Promise<any | null> {
  const db = getDb();
  const result = await db
    .select()
    .from(schema.users)
    .where(or(eq(schema.users.email, email), eq(schema.users.username, username)));
  return result[0] || null;
}
