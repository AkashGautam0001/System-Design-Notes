import { getPool, getDb, schema } from '../shared/connection.js';

/**
 * Chapter 6: The Gatekeepers - SOLUTIONS
 */

export async function testUniqueConstraint(): Promise<string> {
  const pool = getPool();
  try {
    await pool.query(
      `INSERT INTO users (username, email) VALUES ($1, $2)`,
      ['duplicate_user', 'first@test.com']
    );
    await pool.query(
      `INSERT INTO users (username, email) VALUES ($1, $2)`,
      ['duplicate_user', 'second@test.com']
    );
    return '';
  } catch (err: any) {
    return err.code;
  }
}

export async function testNotNullConstraint(): Promise<string> {
  const pool = getPool();
  try {
    await pool.query(`INSERT INTO users (email) VALUES ('test@test.com')`);
    return '';
  } catch (err: any) {
    return err.code;
  }
}

export async function testForeignKeyConstraint(): Promise<string> {
  const pool = getPool();
  try {
    await pool.query(
      `INSERT INTO posts (author_id, content, type) VALUES ($1, $2, $3)`,
      [99999, 'Orphan post', 'text']
    );
    return '';
  } catch (err: any) {
    return err.code;
  }
}

export async function testCheckConstraintOnLength(): Promise<string> {
  const pool = getPool();
  let errorCode = '';
  try {
    await pool.query(
      `ALTER TABLE users ADD CONSTRAINT chk_username_length CHECK (length(username) >= 3)`
    );
    await pool.query(
      `INSERT INTO users (username, email) VALUES ($1, $2)`,
      ['ab', 'short@test.com']
    );
  } catch (err: any) {
    errorCode = err.code;
  } finally {
    await pool.query(
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_username_length`
    );
  }
  return errorCode;
}

export async function testDefaultValues(): Promise<{
  hasCreatedAt: boolean;
  hasStatus: boolean;
  statusValue: string;
}> {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *`,
    ['defaultuser', 'default@test.com']
  );
  const user = result.rows[0];
  return {
    hasCreatedAt: user.created_at !== null,
    hasStatus: user.status !== null,
    statusValue: user.status,
  };
}
