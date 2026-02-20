import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables, seedUsers, seedPosts, seedComments } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/21-the-view-from-above.solution.ts'
  : './exercise.ts';

const {
  createUserStatsView,
  createPostAnalyticsMaterializedView,
  refreshMaterializedView,
  queryFromView,
  dropViews,
} = await import(exercisePath);

describe('Chapter 21: The View from Above', () => {
  beforeEach(async () => {
    const pool = getPool();
    // Clean up views for a fresh state
    await pool.query('DROP MATERIALIZED VIEW IF EXISTS post_analytics_mv');
    await pool.query('DROP VIEW IF EXISTS user_stats_view');
    await clearAllTables();
  });

  afterAll(async () => {
    const pool = getPool();
    await pool.query('DROP MATERIALIZED VIEW IF EXISTS post_analytics_mv');
    await pool.query('DROP VIEW IF EXISTS user_stats_view');
    await closeConnection();
  });

  it('should create a user_stats_view and return user statistics', async () => {
    const users = await seedUsers(3);
    const posts = await seedPosts(users[0].id, 3);
    await seedPosts(users[1].id, 1);
    await seedComments(posts[0].id, users[1].id, 2);
    await seedComments(posts[0].id, users[2].id, 1);

    const results = await createUserStatsView();
    expect(results).toHaveLength(3);

    const user1 = results.find((r: any) => r.id === users[0].id);
    const user2 = results.find((r: any) => r.id === users[1].id);
    const user3 = results.find((r: any) => r.id === users[2].id);
    expect(user1.post_count).toBe(3);
    expect(user2.comment_count).toBe(2);
    expect(user3.post_count).toBe(0);
  });

  it('should create a materialized view with post analytics', async () => {
    const users = await seedUsers(2);
    const posts = await seedPosts(users[0].id, 2);
    await seedPosts(users[1].id, 1);
    await seedComments(posts[0].id, users[1].id, 3);

    const results = await createPostAnalyticsMaterializedView();
    expect(results).toHaveLength(3);

    const postWithComments = results.find((r: any) => r.id === posts[0].id);
    expect(postWithComments.comment_count).toBe(3);
    expect(postWithComments.author_name).toBe('user1');
  });

  it('should refresh the materialized view to include new data', async () => {
    const users = await seedUsers(1);
    await seedPosts(users[0].id, 1);

    // Create the materialized view first
    await createPostAnalyticsMaterializedView();

    // Add more data after the view was created
    await seedPosts(users[0].id, 2);

    // Refresh should pick up the new posts
    const results = await refreshMaterializedView();
    expect(results).toHaveLength(3);
  });

  it('should query from the user stats view with a minimum post filter', async () => {
    const users = await seedUsers(3);
    await seedPosts(users[0].id, 5);
    await seedPosts(users[1].id, 2);
    // user3 has 0 posts

    // Create the view first
    await createUserStatsView();

    const results = await queryFromView(3);
    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('user1');
    expect(results[0].post_count).toBe(5);

    const results2 = await queryFromView(1);
    expect(results2).toHaveLength(2);
    expect(results2[0].post_count).toBeGreaterThanOrEqual(results2[1].post_count);
  });

  it('should drop both views and return true', async () => {
    const users = await seedUsers(1);
    await seedPosts(users[0].id, 1);

    // Create both views first
    await createUserStatsView();
    await createPostAnalyticsMaterializedView();

    const result = await dropViews();
    expect(result).toBe(true);

    // Verify the views no longer exist by checking pg_views
    const pool = getPool();
    const viewCheck = await pool.query(
      "SELECT COUNT(*)::int as cnt FROM information_schema.views WHERE table_name = 'user_stats_view'"
    );
    expect(viewCheck.rows[0].cnt).toBe(0);

    const matViewCheck = await pool.query(
      "SELECT COUNT(*)::int as cnt FROM pg_matviews WHERE matviewname = 'post_analytics_mv'"
    );
    expect(matViewCheck.rows[0].cnt).toBe(0);
  });
});
