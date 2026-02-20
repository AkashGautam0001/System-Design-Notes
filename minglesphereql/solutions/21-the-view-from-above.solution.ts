import { getPool } from '../shared/connection.js';

/**
 * Chapter 21: The View from Above - SOLUTIONS
 */

export async function createUserStatsView() {
  const pool = getPool();
  await pool.query(`
    CREATE OR REPLACE VIEW user_stats_view AS
    SELECT
      u.id,
      u.username,
      u.display_name,
      COUNT(DISTINCT p.id)::int as post_count,
      COUNT(DISTINCT c.id)::int as comment_count
    FROM users u
    LEFT JOIN posts p ON u.id = p.author_id
    LEFT JOIN comments c ON u.id = c.author_id
    GROUP BY u.id, u.username, u.display_name
  `);

  const result = await pool.query('SELECT * FROM user_stats_view ORDER BY id');
  return result.rows;
}

export async function createPostAnalyticsMaterializedView() {
  const pool = getPool();
  await pool.query(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS post_analytics_mv AS
    SELECT
      p.id,
      p.content,
      p.likes_count,
      p.author_id,
      u.username as author_name,
      COUNT(c.id)::int as comment_count
    FROM posts p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN comments c ON p.id = c.post_id
    GROUP BY p.id, p.content, p.likes_count, p.author_id, u.username
  `);

  const result = await pool.query('SELECT * FROM post_analytics_mv ORDER BY id');
  return result.rows;
}

export async function refreshMaterializedView() {
  const pool = getPool();
  await pool.query('REFRESH MATERIALIZED VIEW post_analytics_mv');
  const result = await pool.query('SELECT * FROM post_analytics_mv ORDER BY id');
  return result.rows;
}

export async function queryFromView(minPosts: number) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM user_stats_view WHERE post_count >= $1 ORDER BY post_count DESC',
    [minPosts]
  );
  return result.rows;
}

export async function dropViews() {
  const pool = getPool();
  await pool.query('DROP MATERIALIZED VIEW IF EXISTS post_analytics_mv');
  await pool.query('DROP VIEW IF EXISTS user_stats_view');
  return true;
}
