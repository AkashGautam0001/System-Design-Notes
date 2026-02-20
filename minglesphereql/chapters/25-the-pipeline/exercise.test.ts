import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables, seedUsers, seedPosts } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/25-the-pipeline.solution.ts'
  : './exercise.ts';

const {
  arrayAggUsers,
  stringAggTags,
  conditionalAggregation,
  coalesceAndNullif,
  lateralJoinExample,
} = await import(exercisePath);

describe('Chapter 25: The Pipeline', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should aggregate usernames into arrays grouped by status', async () => {
    const pool = getPool();
    // Create users with different statuses
    await pool.query(
      `INSERT INTO users (username, email, status) VALUES
       ('alice', 'alice@test.com', 'online'),
       ('bob', 'bob@test.com', 'online'),
       ('carol', 'carol@test.com', 'offline')`
    );

    const rows = await arrayAggUsers();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(2);

    const onlineGroup = rows.find((r: any) => r.status === 'online');
    expect(onlineGroup).toBeDefined();
    expect(onlineGroup.usernames).toContain('alice');
    expect(onlineGroup.usernames).toContain('bob');

    const offlineGroup = rows.find((r: any) => r.status === 'offline');
    expect(offlineGroup).toBeDefined();
    expect(offlineGroup.usernames).toContain('carol');
  });

  it('should aggregate tag names into a comma-separated string for a post', async () => {
    const pool = getPool();
    const users = await seedUsers(1);
    const posts = await seedPosts(users[0].id, 1);
    const postId = posts[0].id;

    // Create tags and link them
    await pool.query(`INSERT INTO tags (name) VALUES ('javascript'), ('typescript'), ('graphql')`);
    const tagResult = await pool.query(`SELECT id, name FROM tags ORDER BY name`);
    for (const tag of tagResult.rows) {
      await pool.query(`INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)`, [postId, tag.id]);
    }

    const row = await stringAggTags(postId);
    expect(row).toBeDefined();
    expect(row.id).toBe(postId);
    expect(row.tag_list).toBe('graphql, javascript, typescript');
  });

  it('should perform conditional aggregation with FILTER clauses', async () => {
    const pool = getPool();
    await pool.query(
      `INSERT INTO users (username, email, status, is_verified) VALUES
       ('u1', 'u1@test.com', 'online', true),
       ('u2', 'u2@test.com', 'online', false),
       ('u3', 'u3@test.com', 'offline', true),
       ('u4', 'u4@test.com', 'offline', false),
       ('u5', 'u5@test.com', 'online', true)`
    );

    const row = await conditionalAggregation();
    expect(row.online_count).toBe(3);
    expect(row.offline_count).toBe(2);
    expect(row.verified_count).toBe(3);
  });

  it('should use COALESCE and NULLIF to handle null and empty values', async () => {
    const pool = getPool();
    // User with no display_name and empty bio
    const result = await pool.query(
      `INSERT INTO users (username, email, display_name, bio, status)
       VALUES ('noname', 'noname@test.com', NULL, '', 'online')
       RETURNING id`
    );
    const userId = result.rows[0].id;

    const row = await coalesceAndNullif(userId);
    expect(row).toBeDefined();
    expect(row.effective_name).toBe('noname'); // COALESCE falls back to username
    expect(row.bio_or_null).toBeNull(); // NULLIF converts '' to NULL
  });

  it('should use a LATERAL join to get each user latest post', async () => {
    const pool = getPool();
    const users = await seedUsers(2);
    // Create posts for user 1 at different times
    await pool.query(
      `INSERT INTO posts (author_id, content, type, created_at) VALUES
       ($1, 'Old post', 'text', NOW() - INTERVAL '2 hours'),
       ($1, 'Latest post', 'text', NOW())`,
      [users[0].id]
    );
    // User 2 has no posts

    const rows = await lateralJoinExample();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(2);

    const user1Row = rows.find((r: any) => r.id === users[0].id);
    expect(user1Row.latest_post_content).toBe('Latest post');

    const user2Row = rows.find((r: any) => r.id === users[1].id);
    expect(user2Row.latest_post_content).toBeNull();
  });
});
