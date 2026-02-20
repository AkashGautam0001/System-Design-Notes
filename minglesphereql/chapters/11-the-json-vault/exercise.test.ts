import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/11-the-json-vault.solution.ts'
  : './exercise.ts';

const {
  insertUserWithMetadata,
  queryByJsonField,
  updateJsonField,
  queryNestedJson,
  getJsonKeys,
} = await import(exercisePath);

describe('Chapter 11: The JSON Vault', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should insert a user with JSONB metadata', async () => {
    const metadata = { theme: 'dark', language: 'en', notifications: true };
    const result = await insertUserWithMetadata('jsonuser', 'json@test.com', metadata);

    expect(result).toBeDefined();
    expect(result.username).toBe('jsonuser');
    expect(result.metadata).toEqual(metadata);
  });

  it('should query users by a top-level JSON field', async () => {
    const pool = getPool();
    await pool.query(
      `INSERT INTO users (username, email, metadata) VALUES ($1, $2, $3)`,
      ['alice', 'alice@test.com', JSON.stringify({ role: 'admin', level: '5' })]
    );
    await pool.query(
      `INSERT INTO users (username, email, metadata) VALUES ($1, $2, $3)`,
      ['bob', 'bob@test.com', JSON.stringify({ role: 'user', level: '2' })]
    );
    await pool.query(
      `INSERT INTO users (username, email, metadata) VALUES ($1, $2, $3)`,
      ['charlie', 'charlie@test.com', JSON.stringify({ role: 'admin', level: '3' })]
    );

    const admins = await queryByJsonField('role', 'admin');

    expect(admins).toHaveLength(2);
    const usernames = admins.map((u: any) => u.username).sort();
    expect(usernames).toEqual(['alice', 'charlie']);
  });

  it('should update a specific key inside JSONB metadata', async () => {
    const pool = getPool();
    const insertResult = await pool.query(
      `INSERT INTO users (username, email, metadata) VALUES ($1, $2, $3) RETURNING *`,
      ['updatejson', 'updatejson@test.com', JSON.stringify({ theme: 'light' })]
    );
    const userId = insertResult.rows[0].id;

    const result = await updateJsonField(userId, 'theme', 'dark');

    expect(result).toBeDefined();
    expect(result.metadata.theme).toBe('dark');
  });

  it('should query by a nested JSON path', async () => {
    const pool = getPool();
    await pool.query(
      `INSERT INTO users (username, email, metadata) VALUES ($1, $2, $3)`,
      ['nested1', 'nested1@test.com', JSON.stringify({ preferences: { theme: 'dark', fontSize: '14' } })]
    );
    await pool.query(
      `INSERT INTO users (username, email, metadata) VALUES ($1, $2, $3)`,
      ['nested2', 'nested2@test.com', JSON.stringify({ preferences: { theme: 'light', fontSize: '16' } })]
    );

    const darkThemeUsers = await queryNestedJson(['preferences', 'theme'], 'dark');

    expect(darkThemeUsers).toHaveLength(1);
    expect(darkThemeUsers[0].username).toBe('nested1');
  });

  it('should get all top-level keys from user metadata', async () => {
    const pool = getPool();
    const insertResult = await pool.query(
      `INSERT INTO users (username, email, metadata) VALUES ($1, $2, $3) RETURNING *`,
      ['keyuser', 'keyuser@test.com', JSON.stringify({ alpha: 1, beta: 2, gamma: 3 })]
    );
    const userId = insertResult.rows[0].id;

    const keys = await getJsonKeys(userId);

    expect(keys).toEqual(['alpha', 'beta', 'gamma']);
  });
});
