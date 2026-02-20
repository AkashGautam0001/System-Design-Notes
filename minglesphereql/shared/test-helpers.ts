import { getPool, getDb } from './connection.js';
import { sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

/**
 * Truncate all tables in the test database (cascade).
 * Call in beforeEach for full isolation.
 */
export async function clearAllTables(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    TRUNCATE TABLE
      post_tags, comments, posts, tags,
      friend_requests, messages, notifications,
      sessions, reports, locations, users
    CASCADE
  `);
}

/**
 * Get the row count for a specific table.
 */
export async function getRowCount(tableName: string): Promise<number> {
  const pool = getPool();
  const result = await pool.query(`SELECT COUNT(*)::int as count FROM ${tableName}`);
  return result.rows[0].count;
}

/**
 * Seed users with test data.
 */
export async function seedUsers(count: number = 5): Promise<any[]> {
  const pool = getPool();
  const users = [];
  for (let i = 1; i <= count; i++) {
    const result = await pool.query(
      `INSERT INTO users (username, email, display_name, bio, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [`user${i}`, `user${i}@minglesphereql.dev`, `User ${i}`, `Bio for user ${i}`, 'online']
    );
    users.push(result.rows[0]);
  }
  return users;
}

/**
 * Seed posts with test data. Requires users to exist.
 */
export async function seedPosts(authorId: number, count: number = 3): Promise<any[]> {
  const pool = getPool();
  const posts = [];
  for (let i = 1; i <= count; i++) {
    const result = await pool.query(
      `INSERT INTO posts (author_id, content, type, likes_count)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [authorId, `Post ${i} by author ${authorId}`, 'text', Math.floor(Math.random() * 100)]
    );
    posts.push(result.rows[0]);
  }
  return posts;
}

/**
 * Seed tags with test data.
 */
export async function seedTags(names: string[]): Promise<any[]> {
  const pool = getPool();
  const tags = [];
  for (const name of names) {
    const result = await pool.query(
      `INSERT INTO tags (name) VALUES ($1) RETURNING *`,
      [name]
    );
    tags.push(result.rows[0]);
  }
  return tags;
}

/**
 * Seed comments for a post.
 */
export async function seedComments(postId: number, authorId: number, count: number = 3): Promise<any[]> {
  const pool = getPool();
  const comments = [];
  for (let i = 1; i <= count; i++) {
    const result = await pool.query(
      `INSERT INTO comments (post_id, author_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [postId, authorId, `Comment ${i} on post ${postId}`]
    );
    comments.push(result.rows[0]);
  }
  return comments;
}

/**
 * Execute raw SQL on the test database.
 */
export async function rawQuery(query: string, params: any[] = []): Promise<any> {
  const pool = getPool();
  return pool.query(query, params);
}
