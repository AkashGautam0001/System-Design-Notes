import { getPool } from '../shared/connection.js';

/**
 * Chapter 25: The Pipeline - SOLUTIONS
 */

export async function arrayAggUsers(): Promise<any[]> {
  const pool = getPool();
  const result = await pool.query(`
    SELECT status,
           ARRAY_AGG(username ORDER BY username) as usernames
    FROM users
    GROUP BY status
    ORDER BY status
  `);
  return result.rows;
}

export async function stringAggTags(postId: number): Promise<any> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT p.id,
            STRING_AGG(t.name, ', ' ORDER BY t.name) as tag_list
     FROM posts p
     LEFT JOIN post_tags pt ON p.id = pt.post_id
     LEFT JOIN tags t ON pt.tag_id = t.id
     WHERE p.id = $1
     GROUP BY p.id`,
    [postId]
  );
  return result.rows[0];
}

export async function conditionalAggregation(): Promise<any> {
  const pool = getPool();
  const result = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'online')::int as online_count,
      COUNT(*) FILTER (WHERE status = 'offline')::int as offline_count,
      COUNT(*) FILTER (WHERE is_verified = true)::int as verified_count
    FROM users
  `);
  return result.rows[0];
}

export async function coalesceAndNullif(userId: number): Promise<any> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id,
            COALESCE(display_name, username) as effective_name,
            NULLIF(bio, '') as bio_or_null
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return result.rows[0];
}

export async function lateralJoinExample(): Promise<any[]> {
  const pool = getPool();
  const result = await pool.query(`
    SELECT u.id, u.username,
           latest.content as latest_post_content,
           latest.created_at as latest_post_date
    FROM users u
    LEFT JOIN LATERAL (
      SELECT content, created_at
      FROM posts
      WHERE author_id = u.id
      ORDER BY created_at DESC
      LIMIT 1
    ) latest ON true
    ORDER BY u.id
  `);
  return result.rows;
}
