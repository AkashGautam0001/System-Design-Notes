import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables, seedUsers, seedPosts } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/23-the-vault.solution.ts'
  : './exercise.ts';

const {
  transferLikes,
  transactionRollbackOnError,
  createUserWithPost,
  savepointExample,
  isolationLevelTest,
} = await import(exercisePath);

describe('Chapter 23: The Vault', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should transfer likes between posts atomically', async () => {
    const users = await seedUsers(1);
    const pool = getPool();
    // Create two posts with known likes_count
    await pool.query(
      `INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, 'Post A', 'text', 10)`,
      [users[0].id]
    );
    await pool.query(
      `INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, 'Post B', 'text', 5)`,
      [users[0].id]
    );
    const postsResult = await pool.query(`SELECT id FROM posts ORDER BY id`);
    const postA = postsResult.rows[0].id;
    const postB = postsResult.rows[1].id;

    const result = await transferLikes(postA, postB, 3);
    expect(result.from.likesCount).toBe(7);
    expect(result.to.likesCount).toBe(8);
  });

  it('should rollback transaction on error, leaving data unchanged', async () => {
    const users = await seedUsers(1);
    const result = await transactionRollbackOnError(users[0].id);
    expect(result.rolledBack).toBe(true);
  });

  it('should create a user and post atomically in a single transaction', async () => {
    const result = await createUserWithPost('txn_user', 'txn@test.com', 'My first transactional post');
    expect(result.user).toBeDefined();
    expect(result.post).toBeDefined();
    expect(result.user.username).toBe('txn_user');
    expect(result.post.content).toBe('My first transactional post');
    expect(result.post.authorId).toBe(result.user.id);
  });

  it('should use savepoints to partially rollback within a transaction', async () => {
    const users = await seedUsers(1);
    const result = await savepointExample(users[0].id);
    expect(result.bio).toBe('first update');
  });

  it('should set and verify transaction isolation level', async () => {
    await seedUsers(3);
    const result = await isolationLevelTest();
    expect(result.isolationLevel).toBe('serializable');
    expect(result.count).toBe(3);
  });
});
