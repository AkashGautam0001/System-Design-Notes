import { getPool } from '../../shared/connection.js';

/**
 * Chapter 2: The Schema Forge
 *
 * Explore the structure of the users table by querying PostgreSQL's
 * information_schema. Learn how tables, columns, constraints, and
 * defaults are represented in the database catalog.
 */

/**
 * Get all columns of the users table with their data types and nullability.
 * Query information_schema.columns for table_name = 'users', ordered by ordinal_position.
 * Return an array of objects with { column_name, data_type, is_nullable }.
 */
export async function getTableColumns(): Promise<
  Array<{ column_name: string; data_type: string; is_nullable: string }>
> {
  throw new Error('Not implemented');
}

/**
 * Get all constraints on the users table.
 * Query information_schema.table_constraints for table_name = 'users',
 * ordered by constraint_name.
 * Return an array of objects with { constraint_name, constraint_type }.
 */
export async function getTableConstraints(): Promise<
  Array<{ constraint_name: string; constraint_type: string }>
> {
  throw new Error('Not implemented');
}

/**
 * Verify that the users table exists in the database.
 * Query information_schema.tables for table_name = 'users'.
 * Return a boolean indicating whether the table exists.
 */
export async function verifyUsersTableExists(): Promise<boolean> {
  throw new Error('Not implemented');
}

/**
 * Get columns that have default values defined.
 * Query information_schema.columns for table_name = 'users' where column_default IS NOT NULL.
 * Return an array of objects with { column_name, column_default }, ordered by ordinal_position.
 */
export async function getColumnDefaults(): Promise<
  Array<{ column_name: string; column_default: string }>
> {
  throw new Error('Not implemented');
}

/**
 * Count the total number of tables in the public schema.
 * Query information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'.
 * Return the count as a number.
 */
export async function countTotalTables(): Promise<number> {
  throw new Error('Not implemented');
}
