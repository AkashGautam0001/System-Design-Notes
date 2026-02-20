import { getPool } from '../shared/connection.js';

/**
 * Chapter 33: The Time Machine - SOLUTIONS
 */

export async function getPostsByDateRange(
  startDate: string,
  endDate: string,
): Promise<any[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, content, created_at
     FROM posts
     WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
     ORDER BY created_at`,
    [startDate, endDate],
  );
  return result.rows;
}

export async function getPostCountByMonth(): Promise<any[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT date_trunc('month', created_at) as month, COUNT(*)::int as post_count
     FROM posts
     GROUP BY date_trunc('month', created_at)
     ORDER BY month`,
  );
  return result.rows;
}

export async function generateDateSeries(
  startDate: string,
  endDate: string,
  interval: string,
): Promise<any[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT d.date, COUNT(p.id)::int as post_count
     FROM generate_series($1::date, $2::date, $3::interval) as d(date)
     LEFT JOIN posts p ON date_trunc('day', p.created_at) = d.date
     GROUP BY d.date
     ORDER BY d.date`,
    [startDate, endDate, interval],
  );
  return result.rows;
}

export async function getUserActivityTimeline(
  userId: number,
): Promise<any[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT
       p.id, p.content, p.created_at,
       p.created_at - LAG(p.created_at) OVER (ORDER BY p.created_at) as time_since_last,
       EXTRACT(EPOCH FROM (NOW() - p.created_at))::int as seconds_ago
     FROM posts p
     WHERE p.author_id = $1
     ORDER BY p.created_at`,
    [userId],
  );
  return result.rows;
}

export async function getRecentActivityStats(
  hours: number,
): Promise<any> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT
       COUNT(DISTINCT p.id)::int as posts_created,
       COUNT(DISTINCT c.id)::int as comments_created,
       COUNT(DISTINCT p.author_id)::int as active_users
     FROM posts p
     LEFT JOIN comments c ON c.created_at >= NOW() - ($1 || ' hours')::interval
     WHERE p.created_at >= NOW() - ($1 || ' hours')::interval`,
    [hours],
  );
  return result.rows[0];
}
