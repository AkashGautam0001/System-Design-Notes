import { getPool } from '../shared/connection.js';

/**
 * Chapter 20: The Common Path - SOLUTIONS
 */

export async function getActiveUsersWithPosts() {
  const pool = getPool();
  const result = await pool.query(`
    WITH active_users AS (
      SELECT * FROM users WHERE deleted_at IS NULL
    )
    SELECT au.id, au.username, COUNT(p.id)::int as post_count
    FROM active_users au
    LEFT JOIN posts p ON au.id = p.author_id
    GROUP BY au.id, au.username
    ORDER BY au.id
  `);
  return result.rows;
}

export async function getTopPostsWithComments(minLikes: number) {
  const pool = getPool();
  const result = await pool.query(`
    WITH popular_posts AS (
      SELECT * FROM posts WHERE likes_count >= $1
    )
    SELECT pp.id, pp.content, pp.likes_count, COUNT(c.id)::int as comment_count
    FROM popular_posts pp
    LEFT JOIN comments c ON pp.id = c.post_id
    GROUP BY pp.id, pp.content, pp.likes_count
    ORDER BY pp.likes_count DESC
  `, [minLikes]);
  return result.rows;
}

export async function getCommentTreeRecursive(rootCommentId: number) {
  const pool = getPool();
  const result = await pool.query(`
    WITH RECURSIVE comment_tree AS (
      SELECT id, content, parent_id, 1 as depth
      FROM comments
      WHERE id = $1
      UNION ALL
      SELECT c.id, c.content, c.parent_id, ct.depth + 1
      FROM comments c
      JOIN comment_tree ct ON c.parent_id = ct.id
    )
    SELECT * FROM comment_tree
    ORDER BY depth, id
  `, [rootCommentId]);
  return result.rows;
}

export async function existsUsersWithoutPosts() {
  const pool = getPool();
  const result = await pool.query(`
    SELECT id, username
    FROM users u
    WHERE NOT EXISTS (
      SELECT 1 FROM posts p WHERE p.author_id = u.id
    )
    ORDER BY u.id
  `);
  return result.rows;
}

export async function getMultipleCTEStats() {
  const pool = getPool();
  const result = await pool.query(`
    WITH user_stats AS (
      SELECT COUNT(*)::int as total_users FROM users
    ),
    post_stats AS (
      SELECT COUNT(*)::int as total_posts, COALESCE(SUM(likes_count), 0)::int as total_likes FROM posts
    ),
    comment_stats AS (
      SELECT COUNT(*)::int as total_comments FROM comments
    )
    SELECT * FROM user_stats, post_stats, comment_stats
  `);
  return result.rows[0];
}
