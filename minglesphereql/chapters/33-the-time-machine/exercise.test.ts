import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getPool, closeConnection } from '../../shared/connection.js';
import { clearAllTables, seedUsers } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/33-the-time-machine.solution.ts'
  : './exercise.ts';

const {
  getPostsByDateRange,
  getPostCountByMonth,
  generateDateSeries,
  getUserActivityTimeline,
  getRecentActivityStats,
} = await import(exercisePath);

describe('Chapter 33: The Time Machine', () => {
  let users: any[];

  beforeEach(async () => {
    await clearAllTables();
    const pool = getPool();
    users = await seedUsers(3);

    // Insert posts with varying dates across multiple months
    const dates = [
      '2024-01-15', '2024-01-20', '2024-02-10',
      '2024-02-15', '2024-03-01', '2024-03-15',
    ];
    for (let i = 0; i < dates.length; i++) {
      await pool.query(
        `INSERT INTO posts (author_id, content, created_at) VALUES ($1, $2, $3::timestamptz)`,
        [users[i % users.length].id, `Post from ${dates[i]}`, dates[i]],
      );
    }
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should query posts within a date range', async () => {
    const posts = await getPostsByDateRange('2024-01-01', '2024-02-01');

    expect(posts.length).toBe(2);
    expect(posts[0].content).toBe('Post from 2024-01-15');
    expect(posts[1].content).toBe('Post from 2024-01-20');
    // Verify ordering by created_at
    expect(new Date(posts[0].created_at).getTime()).toBeLessThanOrEqual(
      new Date(posts[1].created_at).getTime(),
    );
  });

  it('should group posts by month and count them', async () => {
    const monthly = await getPostCountByMonth();

    expect(monthly.length).toBe(3);
    // January: 2 posts, February: 2 posts, March: 2 posts
    expect(monthly[0].post_count).toBe(2);
    expect(monthly[1].post_count).toBe(2);
    expect(monthly[2].post_count).toBe(2);
    // Verify month ordering
    for (let i = 1; i < monthly.length; i++) {
      expect(new Date(monthly[i].month).getTime()).toBeGreaterThan(
        new Date(monthly[i - 1].month).getTime(),
      );
    }
  });

  it('should generate a date series with post counts per day', async () => {
    const series = await generateDateSeries('2024-01-14', '2024-01-21', '1 day');

    expect(series.length).toBe(8); // 14, 15, 16, 17, 18, 19, 20, 21
    // Jan 15 should have 1 post
    const jan15 = series.find(
      (r: any) => new Date(r.date).toISOString().startsWith('2024-01-15'),
    );
    expect(jan15).toBeDefined();
    expect(jan15.post_count).toBe(1);
    // Jan 20 should have 1 post
    const jan20 = series.find(
      (r: any) => new Date(r.date).toISOString().startsWith('2024-01-20'),
    );
    expect(jan20).toBeDefined();
    expect(jan20.post_count).toBe(1);
    // Jan 16 should have 0 posts
    const jan16 = series.find(
      (r: any) => new Date(r.date).toISOString().startsWith('2024-01-16'),
    );
    expect(jan16).toBeDefined();
    expect(jan16.post_count).toBe(0);
  });

  it('should get a user activity timeline with interval calculations', async () => {
    // User 0 has posts at indices 0, 3 => dates '2024-01-15' and '2024-02-15'
    const timeline = await getUserActivityTimeline(users[0].id);

    expect(timeline.length).toBe(2);
    expect(timeline[0].content).toBe('Post from 2024-01-15');
    expect(timeline[1].content).toBe('Post from 2024-02-15');
    // First post should have null time_since_last (LAG on first row)
    expect(timeline[0].time_since_last).toBeNull();
    // Second post should have a non-null time_since_last interval
    expect(timeline[1].time_since_last).toBeDefined();
    expect(timeline[1].time_since_last).not.toBeNull();
    // seconds_ago should be a positive integer
    expect(typeof timeline[0].seconds_ago).toBe('number');
    expect(timeline[0].seconds_ago).toBeGreaterThan(0);
  });

  it('should get recent activity stats for a time window', async () => {
    // Insert a very recent post (within last 1 hour)
    const pool = getPool();
    await pool.query(
      `INSERT INTO posts (author_id, content, created_at) VALUES ($1, $2, NOW())`,
      [users[0].id, 'Very recent post'],
    );
    // Insert a recent comment
    const recentPost = await pool.query(`SELECT id FROM posts ORDER BY created_at DESC LIMIT 1`);
    await pool.query(
      `INSERT INTO comments (post_id, author_id, content, created_at) VALUES ($1, $2, $3, NOW())`,
      [recentPost.rows[0].id, users[1].id, 'Recent comment'],
    );

    const stats = await getRecentActivityStats(1);

    expect(stats).toBeDefined();
    expect(stats.posts_created).toBeGreaterThanOrEqual(1);
    expect(stats.comments_created).toBeGreaterThanOrEqual(1);
    expect(stats.active_users).toBeGreaterThanOrEqual(1);
    expect(typeof stats.posts_created).toBe('number');
    expect(typeof stats.comments_created).toBe('number');
    expect(typeof stats.active_users).toBe('number');
  });
});
