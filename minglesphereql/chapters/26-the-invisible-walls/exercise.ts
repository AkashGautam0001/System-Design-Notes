import { getPool } from '../../shared/connection.js';

/**
 * Chapter 26: The Invisible Walls
 *
 * Explore PostgreSQL Row-Level Security (RLS) fundamentals.
 * Organizations join MingleSphere and each must only see their own data.
 * Complete each function to make the tests pass.
 */

/**
 * Exercise 1: Enable Row-Level Security on a table
 *
 * Execute ALTER TABLE to enable RLS on the given table.
 * Then verify by querying pg_class to confirm RLS is active.
 * Return { enabled: boolean }.
 */
export async function enableRLS(tableName: string): Promise<{ enabled: boolean }> {
  throw new Error('Not implemented');
}

/**
 * Exercise 2: Create a basic SELECT policy
 *
 * Enable RLS on the users table with FORCE, then create a policy
 * that only lets a user see their own row based on the
 * `app.current_user_id` session variable.
 *
 * Insert two test users, then use a dedicated client with
 * set_config inside a transaction to test visibility.
 * Return { visibleRows: number } - should be 1.
 */
export async function createBasicPolicy(): Promise<{ visibleRows: number }> {
  throw new Error('Not implemented');
}

/**
 * Exercise 3: Test the default-deny behavior of RLS
 *
 * Enable RLS with FORCE but create NO policies.
 * Insert a user first, then query - should see 0 rows.
 * Return { rowCount: number }.
 */
export async function testDefaultDeny(): Promise<{ rowCount: number }> {
  throw new Error('Not implemented');
}

/**
 * Exercise 4: Create an INSERT policy with WITH CHECK
 *
 * Enable RLS on users with FORCE. Create:
 *   - A permissive SELECT policy that allows all reads (USING (true))
 *   - An INSERT policy using WITH CHECK to only allow inserts
 *     where username matches current_setting('app.current_username', true)
 *
 * Test that a matching insert succeeds and a non-matching insert is blocked.
 * Return { insertAllowed: boolean, insertBlocked: boolean }.
 */
export async function createInsertPolicy(): Promise<{
  insertAllowed: boolean;
  insertBlocked: boolean;
}> {
  throw new Error('Not implemented');
}

/**
 * Exercise 5: List all RLS policies on a table
 *
 * Query the pg_policies catalog view to retrieve all policies
 * for the given table, ordered by policyname.
 * Return the array of policy rows with policyname, cmd, qual, with_check.
 */
export async function listPolicies(tableName: string): Promise<any[]> {
  throw new Error('Not implemented');
}
