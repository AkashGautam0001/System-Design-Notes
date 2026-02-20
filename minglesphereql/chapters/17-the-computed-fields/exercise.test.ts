import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection } from '../../shared/connection.js';
import { clearAllTables, seedUsers, seedPosts, seedComments, rawQuery } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/17-the-computed-fields.solution.ts'
  : './exercise.ts';

const {
  getUsersWithFullInfo,
  getPostsWithCommentCount,
  getUsersWithAccountAge,
  getPostsWithEngagementScore,
  getUserStatusSummary,
} = await import(exercisePath);

describe('Chapter 17: The Computed Fields', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should get users with a computed full label combining display name and username', async () => {
    await seedUsers(2);
    const results = await getUsersWithFullInfo();
    expect(results).toHaveLength(2);
    const user1 = results.find((r: any) => r.username === 'user1');
    expect(user1).toBeDefined();
    expect(user1.fullLabel).toBe('User 1 (@user1)');
    expect(user1.id).toBeDefined();
  });

  it('should get posts with a computed comment count via subquery', async () => {
    const users = await seedUsers(1);
    const posts = await seedPosts(users[0].id, 2);
    await seedComments(posts[0].id, users[0].id, 4);
    await seedComments(posts[1].id, users[0].id, 1);
    const results = await getPostsWithCommentCount();
    expect(results).toHaveLength(2);
    const post1 = results.find((r: any) => r.id === posts[0].id);
    const post2 = results.find((r: any) => r.id === posts[1].id);
    expect(Number(post1.commentCount)).toBe(4);
    expect(Number(post2.commentCount)).toBe(1);
  });

  it('should get users with a computed account age in days', async () => {
    await seedUsers(1);
    const results = await getUsersWithAccountAge();
    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('user1');
    expect(results[0].accountAgeDays).toBeDefined();
    // Account was just created, so age should be 0 or very small
    expect(Number(results[0].accountAgeDays)).toBeGreaterThanOrEqual(0);
    expect(Number(results[0].accountAgeDays)).toBeLessThan(2);
  });

  it('should get posts with a computed engagement score (likes*2 + comments)', async () => {
    const users = await seedUsers(1);
    // Create a post with known likes_count
    await rawQuery(
      'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4)',
      [users[0].id, 'Engaging post', 'text', 10]
    );
    const postsResult = await rawQuery('SELECT * FROM posts WHERE content = $1', ['Engaging post']);
    const post = postsResult.rows[0];
    // Add 3 comments
    await seedComments(post.id, users[0].id, 3);
    const results = await getPostsWithEngagementScore();
    expect(results).toHaveLength(1);
    // engagement = 10 * 2 + 3 = 23
    expect(Number(results[0].engagementScore)).toBe(23);
  });

  it('should classify users by activity level using a CASE expression', async () => {
    const users = await seedUsers(3);
    // Set post_count: user1 = 15 (power_user), user2 = 5 (active), user3 = 0 (lurker)
    await rawQuery('UPDATE users SET post_count = 15 WHERE id = $1', [users[0].id]);
    await rawQuery('UPDATE users SET post_count = 5 WHERE id = $1', [users[1].id]);
    await rawQuery('UPDATE users SET post_count = 0 WHERE id = $1', [users[2].id]);
    const results = await getUserStatusSummary();
    expect(results).toHaveLength(3);
    const user1 = results.find((r: any) => r.username === 'user1');
    const user2 = results.find((r: any) => r.username === 'user2');
    const user3 = results.find((r: any) => r.username === 'user3');
    expect(user1.activityLevel).toBe('power_user');
    expect(user2.activityLevel).toBe('active');
    expect(user3.activityLevel).toBe('lurker');
  });
});
