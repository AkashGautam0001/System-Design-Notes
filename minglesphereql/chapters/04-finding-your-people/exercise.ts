import { getDb } from '../../shared/connection.js';
import { schema } from '../../shared/connection.js';
import { eq, or, ilike, asc } from 'drizzle-orm';

/**
 * Chapter 4: Finding Your People
 *
 * With users in the system, it is time to build search and query features.
 * Learn to use Drizzle ORM's WHERE clauses, filtering operators, and pagination.
 */

/**
 * Find a user by their exact username.
 * Use db.select().from(schema.users).where(eq(...)) and return the first result or null.
 */
export async function findUserByUsername(username: string): Promise<any | null> {
  throw new Error('Not implemented');
}

/**
 * Find all users with a given status (e.g., 'online', 'offline').
 * Return the array of matching users.
 */
export async function findUsersByStatus(status: string): Promise<any[]> {
  throw new Error('Not implemented');
}

/**
 * Search users by display name using case-insensitive partial matching.
 * Use ilike with '%' wildcards around the search term.
 * Return the array of matching users.
 */
export async function searchUsersByName(searchTerm: string): Promise<any[]> {
  throw new Error('Not implemented');
}

/**
 * Find users with pagination support.
 * Use .limit() and .offset() with .orderBy(asc(schema.users.id)).
 * Return the array of users for the given page.
 */
export async function findUsersWithPagination(
  limit: number,
  offset: number
): Promise<any[]> {
  throw new Error('Not implemented');
}

/**
 * Find a user by either email or username (whichever matches).
 * Use or() to combine two eq() conditions.
 * Return the first result or null.
 */
export async function findUserByEmailOrUsername(
  email: string,
  username: string
): Promise<any | null> {
  throw new Error('Not implemented');
}
