import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection } from '../../shared/connection.js';
import { clearAllTables, seedUsers, seedPosts, seedComments, rawQuery } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/20-the-common-path.solution.ts'
  : './exercise.ts';

const {
  getActiveUsersWithPosts,
  getTopPostsWithComments,
  getCommentTreeRecursive,
  existsUsersWithoutPosts,
  getMultipleCTEStats,
} = await import(exercisePath);

describe('Chapter 20: The Common Path', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should get active users with their post counts using a CTE', async () => {
    const users = await seedUsers(3);
    await seedPosts(users[0].id, 3);
    await seedPosts(users[1].id, 2);
    // Soft-delete user3
    await rawQuery('UPDATE users SET deleted_at = NOW() WHERE id = $1', [users[2].id]);

    const results = await getActiveUsersWithPosts();
    expect(results).toHaveLength(2);

    const user1 = results.find((r: any) => r.id === users[0].id);
    const user2 = results.find((r: any) => r.id === users[1].id);
    expect(user1.post_count).toBe(3);
    expect(user2.post_count).toBe(2);
    // Deleted user should not appear
    const user3 = results.find((r: any) => r.id === users[2].id);
    expect(user3).toBeUndefined();
  });

  it('should get popular posts with comment counts using a CTE', async () => {
    const users = await seedUsers(1);
    // Create posts with specific likes
    const post1 = await rawQuery(
      'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4) RETURNING *',
      [users[0].id, 'Popular post', 'text', 50]
    );
    const post2 = await rawQuery(
      'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4) RETURNING *',
      [users[0].id, 'Unpopular post', 'text', 2]
    );
    const post3 = await rawQuery(
      'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4) RETURNING *',
      [users[0].id, 'Another popular post', 'text', 30]
    );

    await seedComments(post1.rows[0].id, users[0].id, 3);
    await seedComments(post3.rows[0].id, users[0].id, 1);

    const results = await getTopPostsWithComments(10);
    expect(results).toHaveLength(2);

    const popular = results.find((r: any) => r.id === post1.rows[0].id);
    expect(popular.comment_count).toBe(3);
    expect(popular.likes_count).toBe(50);
  });

  it('should get a recursive comment tree from a root comment', async () => {
    const users = await seedUsers(1);
    const posts = await seedPosts(users[0].id, 1);

    // Create a comment hierarchy: root -> child1, child2; child1 -> grandchild1
    const root = await rawQuery(
      'INSERT INTO comments (post_id, author_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [posts[0].id, users[0].id, 'Root comment', null]
    );
    const child1 = await rawQuery(
      'INSERT INTO comments (post_id, author_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [posts[0].id, users[0].id, 'Child 1', root.rows[0].id]
    );
    await rawQuery(
      'INSERT INTO comments (post_id, author_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [posts[0].id, users[0].id, 'Child 2', root.rows[0].id]
    );
    await rawQuery(
      'INSERT INTO comments (post_id, author_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [posts[0].id, users[0].id, 'Grandchild 1', child1.rows[0].id]
    );

    const results = await getCommentTreeRecursive(root.rows[0].id);
    expect(results).toHaveLength(4);

    // Root should have depth 1
    const rootResult = results.find((r: any) => r.id === root.rows[0].id);
    expect(rootResult.depth).toBe(1);

    // Grandchild should have depth 3
    const grandchild = results.find((r: any) => r.content === 'Grandchild 1');
    expect(grandchild.depth).toBe(3);
  });

  it('should find users without any posts using NOT EXISTS', async () => {
    const users = await seedUsers(3);
    await seedPosts(users[0].id, 2);
    await seedPosts(users[1].id, 1);
    // users[2] has no posts

    const results = await existsUsersWithoutPosts();
    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('user3');
  });

  it('should get combined statistics from multiple CTEs', async () => {
    const users = await seedUsers(3);
    const posts = await seedPosts(users[0].id, 2);
    await seedPosts(users[1].id, 1);
    await seedComments(posts[0].id, users[1].id, 4);
    await seedComments(posts[1].id, users[2].id, 2);

    const stats = await getMultipleCTEStats();
    expect(stats.total_users).toBe(3);
    expect(stats.total_posts).toBe(3);
    expect(stats.total_comments).toBe(6);
    expect(Number(stats.total_likes)).toBeGreaterThanOrEqual(0);
  });
});
