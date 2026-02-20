import { getPool } from '../shared/connection.js';

/**
 * Chapter 19: Window into the Data - SOLUTIONS
 */

export async function rankUsersByPostCount() {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, username, post_count, RANK() OVER (ORDER BY post_count DESC) as rank FROM users`
  );
  return result.rows;
}

export async function getPostsWithRowNumbers() {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, content, author_id, ROW_NUMBER() OVER (PARTITION BY author_id ORDER BY created_at DESC) as row_num FROM posts`
  );
  return result.rows;
}

export async function getPostsWithRunningLikeTotal() {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, content, likes_count, SUM(likes_count) OVER (ORDER BY created_at) as running_total FROM posts`
  );
  return result.rows;
}

export async function getPostsWithLagLead() {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, content, likes_count, LAG(likes_count) OVER (ORDER BY created_at) as prev_likes, LEAD(likes_count) OVER (ORDER BY created_at) as next_likes FROM posts`
  );
  return result.rows;
}

export async function getDenseRankByLikes() {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, content, likes_count, DENSE_RANK() OVER (ORDER BY likes_count DESC) as dense_rank FROM posts`
  );
  return result.rows;
}
