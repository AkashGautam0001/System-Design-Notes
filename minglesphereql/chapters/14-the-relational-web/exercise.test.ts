import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection } from '../../shared/connection.js';
import { clearAllTables, seedUsers, seedPosts } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/14-the-relational-web.solution.ts'
  : './exercise.ts';

const {
  createPostForUser,
  getPostsWithAuthor,
  getUserWithPosts,
  getPostsByAuthorUsername,
  countPostsPerUser,
} = await import(exercisePath);

describe('Chapter 14: The Relational Web', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should create a post linked to a user and return it', async () => {
    const users = await seedUsers(1);
    const post = await createPostForUser(users[0].id, 'Hello relational world!');
    expect(post).toBeDefined();
    expect(post.content).toBe('Hello relational world!');
    expect(post.authorId).toBe(users[0].id);
  });

  it('should get posts with their authors via inner join', async () => {
    const users = await seedUsers(2);
    await seedPosts(users[0].id, 2);
    await seedPosts(users[1].id, 1);
    const results = await getPostsWithAuthor();
    expect(results).toHaveLength(3);
    expect(results[0].users).toBeDefined();
    expect(results[0].posts).toBeDefined();
    expect(results[0].users.username).toBeDefined();
  });

  it('should get a user with their posts using the relational query API', async () => {
    const users = await seedUsers(1);
    await seedPosts(users[0].id, 3);
    const user = await getUserWithPosts(users[0].id);
    expect(user).toBeDefined();
    expect(user.posts).toHaveLength(3);
    expect(user.username).toBe('user1');
  });

  it('should get posts filtered by author username', async () => {
    const users = await seedUsers(2);
    await seedPosts(users[0].id, 2);
    await seedPosts(users[1].id, 3);
    const results = await getPostsByAuthorUsername('user1');
    expect(results).toHaveLength(2);
    results.forEach((r: any) => {
      expect(r.users.username).toBe('user1');
    });
  });

  it('should count posts per user including users with zero posts', async () => {
    const users = await seedUsers(3);
    await seedPosts(users[0].id, 4);
    await seedPosts(users[1].id, 2);
    // users[2] has no posts
    const results = await countPostsPerUser();
    expect(results).toHaveLength(3);
    const user1 = results.find((r: any) => r.username === 'user1');
    const user2 = results.find((r: any) => r.username === 'user2');
    const user3 = results.find((r: any) => r.username === 'user3');
    expect(user1.postCount).toBe(4);
    expect(user2.postCount).toBe(2);
    expect(user3.postCount).toBe(0);
  });
});
