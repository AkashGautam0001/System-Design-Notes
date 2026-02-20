import { getDb, getPool, schema } from '../../shared/connection.js';
import { eq, isNull, sql } from 'drizzle-orm';

/**
 * Chapter 12: The Clean Sweep
 *
 * Master DELETE operations - both hard deletes and soft deletes.
 * Complete each function to make the tests pass.
 */

/**
 * Exercise 1: Hard delete a user by ID
 * Use db.delete() to permanently remove a user from the database.
 * Return the deleted user via .returning().
 */
export async function hardDeleteUser(userId: number): Promise<any> {
  throw new Error('Not implemented');
}

/**
 * Exercise 2: Soft delete a user by setting deletedAt
 * Instead of removing the row, set the deletedAt timestamp to now.
 * Return the updated user.
 */
export async function softDeleteUser(userId: number): Promise<any> {
  throw new Error('Not implemented');
}

/**
 * Exercise 3: Find all active (non-soft-deleted) users
 * Select all users where deletedAt is null.
 * Return the array of active users.
 */
export async function findActiveUsers(): Promise<any[]> {
  throw new Error('Not implemented');
}

/**
 * Exercise 4: Test cascade delete behavior
 * First insert a post for the given user, then hard delete the user.
 * The post should be automatically deleted via CASCADE.
 * Return { userDeleted: boolean, postsRemaining: number }.
 */
export async function cascadeDeleteTest(userId: number): Promise<{
  userDeleted: boolean;
  postsRemaining: number;
}> {
  throw new Error('Not implemented');
}

/**
 * Exercise 5: Restore a soft-deleted user
 * Set deletedAt back to null for the given user.
 * Return the restored user.
 */
export async function restoreSoftDeletedUser(userId: number): Promise<any> {
  throw new Error('Not implemented');
}
