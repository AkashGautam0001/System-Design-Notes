import { getDb, schema } from '../shared/connection.js';
import { eq, ne, and, between, isNull, inArray } from 'drizzle-orm';

/**
 * Chapter 8: The Query Masters - SOLUTIONS
 */

export async function findOnlineVerifiedUsers(): Promise<any[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.status, 'online'),
        eq(schema.users.isVerified, true)
      )
    );
}

export async function findUsersNotOffline(): Promise<any[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.users)
    .where(ne(schema.users.status, 'offline'));
}

export async function findUsersCreatedBetween(startDate: Date, endDate: Date): Promise<any[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.users)
    .where(between(schema.users.createdAt, startDate, endDate));
}

export async function findUsersWithNullBio(): Promise<any[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.users)
    .where(isNull(schema.users.bio));
}

export async function findUsersByMultipleStatuses(statuses: string[]): Promise<any[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.users)
    .where(inArray(schema.users.status, statuses));
}
