import { getDb, schema } from '../shared/connection.js';
import { asc, desc, count } from 'drizzle-orm';

/**
 * Chapter 9: Select, Sort, and Slice - SOLUTIONS
 */

export async function getUsersSortedByCreatedAt(direction: 'asc' | 'desc'): Promise<any[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.users)
    .orderBy(
      direction === 'asc'
        ? asc(schema.users.createdAt)
        : desc(schema.users.createdAt)
    );
}

export async function getUsersPageinated(page: number, pageSize: number): Promise<any[]> {
  const db = getDb();
  const offset = (page - 1) * pageSize;
  return db
    .select()
    .from(schema.users)
    .limit(pageSize)
    .offset(offset)
    .orderBy(asc(schema.users.id));
}

export async function countUsersByStatus(): Promise<{ status: string | null; count: number }[]> {
  const db = getDb();
  return db
    .select({
      status: schema.users.status,
      count: count(),
    })
    .from(schema.users)
    .groupBy(schema.users.status);
}

export async function getTotalUserCount(): Promise<number> {
  const db = getDb();
  const result = await db
    .select({ count: count() })
    .from(schema.users);
  return Number(result[0].count);
}

export async function getTopUsersByPostCount(limit: number): Promise<any[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.users)
    .orderBy(desc(schema.users.postCount))
    .limit(limit);
}
