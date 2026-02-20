import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection } from '../../shared/connection.js';
import { clearAllTables, seedUsers, seedPosts } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/18-the-aggregation-engine.solution.ts'
  : './exercise.ts';

const {
  getTotalPostsByUser,
  getAverageLikesPerUser,
  getPostStatsByType,
  getUsersWithMinPosts,
  getOverallStats,
} = await import(exercisePath);

describe('Chapter 18: The Aggregation Engine', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should get total posts grouped by user', async () => {
    const users = await seedUsers(3);
    await seedPosts(users[0].id, 4);
    await seedPosts(users[1].id, 2);
    await seedPosts(users[2].id, 1);

    const results = await getTotalPostsByUser();
    expect(results).toHaveLength(3);

    const user1Stats = results.find((r: any) => r.userId === users[0].id);
    const user2Stats = results.find((r: any) => r.userId === users[1].id);
    const user3Stats = results.find((r: any) => r.userId === users[2].id);
    expect(user1Stats.totalPosts).toBe(4);
    expect(user2Stats.totalPosts).toBe(2);
    expect(user3Stats.totalPosts).toBe(1);
  });

  it('should get average likes per user', async () => {
    const users = await seedUsers(2);
    await seedPosts(users[0].id, 3);
    await seedPosts(users[1].id, 2);

    const results = await getAverageLikesPerUser();
    expect(results).toHaveLength(2);

    const user1Stats = results.find((r: any) => r.userId === users[0].id);
    const user2Stats = results.find((r: any) => r.userId === users[1].id);
    expect(user1Stats.avgLikes).toBeDefined();
    expect(user2Stats.avgLikes).toBeDefined();
    // avgLikes should be a string representation of the average (Drizzle returns avg as string)
    expect(Number(user1Stats.avgLikes)).toBeGreaterThanOrEqual(0);
    expect(Number(user2Stats.avgLikes)).toBeGreaterThanOrEqual(0);
  });

  it('should get post statistics grouped by type', async () => {
    const users = await seedUsers(2);
    await seedPosts(users[0].id, 3);
    await seedPosts(users[1].id, 2);

    const results = await getPostStatsByType();
    expect(results.length).toBeGreaterThanOrEqual(1);

    const textStats = results.find((r: any) => r.type === 'text');
    expect(textStats).toBeDefined();
    expect(textStats.totalPosts).toBe(5);
    expect(Number(textStats.totalLikes)).toBeGreaterThanOrEqual(0);
    expect(Number(textStats.avgLikes)).toBeGreaterThanOrEqual(0);
  });

  it('should get users with at least the minimum number of posts using HAVING', async () => {
    const users = await seedUsers(3);
    await seedPosts(users[0].id, 5);
    await seedPosts(users[1].id, 2);
    await seedPosts(users[2].id, 1);

    const results = await getUsersWithMinPosts(3);
    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe(users[0].id);
    expect(results[0].postCount).toBe(5);

    const results2 = await getUsersWithMinPosts(2);
    expect(results2).toHaveLength(2);
  });

  it('should get overall platform statistics', async () => {
    const users = await seedUsers(3);
    await seedPosts(users[0].id, 2);
    await seedPosts(users[1].id, 3);

    const stats = await getOverallStats();
    expect(stats.totalUsers).toBe(3);
    expect(stats.totalPosts).toBe(5);
    expect(Number(stats.totalLikes)).toBeGreaterThanOrEqual(0);
    expect(stats.maxLikes).toBeDefined();
    expect(stats.minLikes).toBeDefined();
    expect(Number(stats.maxLikes)).toBeGreaterThanOrEqual(Number(stats.minLikes));
  });
});
