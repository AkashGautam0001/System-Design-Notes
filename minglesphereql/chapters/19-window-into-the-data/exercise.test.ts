import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection } from '../../shared/connection.js';
import { clearAllTables, seedUsers, seedPosts, rawQuery } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/19-window-into-the-data.solution.ts'
  : './exercise.ts';

const {
  rankUsersByPostCount,
  getPostsWithRowNumbers,
  getPostsWithRunningLikeTotal,
  getPostsWithLagLead,
  getDenseRankByLikes,
} = await import(exercisePath);

describe('Chapter 19: Window into the Data', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should rank users by post count using RANK()', async () => {
    const users = await seedUsers(3);
    // Set post_count directly on users table for the window function query
    await rawQuery('UPDATE users SET post_count = $1 WHERE id = $2', [10, users[0].id]);
    await rawQuery('UPDATE users SET post_count = $1 WHERE id = $2', [5, users[1].id]);
    await rawQuery('UPDATE users SET post_count = $1 WHERE id = $2', [5, users[2].id]);

    const results = await rankUsersByPostCount();
    expect(results).toHaveLength(3);

    const ranked = results.sort((a: any, b: any) => Number(a.rank) - Number(b.rank));
    expect(ranked[0].username).toBe('user1');
    expect(Number(ranked[0].rank)).toBe(1);
    // Users with same post_count get the same rank
    expect(Number(ranked[1].rank)).toBe(2);
    expect(Number(ranked[2].rank)).toBe(2);
  });

  it('should get posts with row numbers partitioned by author', async () => {
    const users = await seedUsers(2);
    await seedPosts(users[0].id, 3);
    await seedPosts(users[1].id, 2);

    const results = await getPostsWithRowNumbers();
    expect(results).toHaveLength(5);

    // Each author's posts should be numbered starting from 1
    const user1Posts = results.filter((r: any) => r.author_id === users[0].id);
    const user2Posts = results.filter((r: any) => r.author_id === users[1].id);
    expect(user1Posts).toHaveLength(3);
    expect(user2Posts).toHaveLength(2);

    const user1RowNums = user1Posts.map((r: any) => Number(r.row_num)).sort();
    expect(user1RowNums).toEqual([1, 2, 3]);
  });

  it('should get posts with a running total of likes', async () => {
    const users = await seedUsers(1);
    // Create posts with specific likes_count values
    await rawQuery(
      'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4)',
      [users[0].id, 'Post A', 'text', 10]
    );
    await rawQuery(
      'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4)',
      [users[0].id, 'Post B', 'text', 20]
    );
    await rawQuery(
      'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4)',
      [users[0].id, 'Post C', 'text', 30]
    );

    const results = await getPostsWithRunningLikeTotal();
    expect(results).toHaveLength(3);

    // Running total should increase with each row
    const totals = results.map((r: any) => Number(r.running_total));
    expect(totals[0]).toBe(10);
    expect(totals[1]).toBe(30);
    expect(totals[2]).toBe(60);
  });

  it('should get posts with LAG and LEAD values for likes', async () => {
    const users = await seedUsers(1);
    await rawQuery(
      'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4)',
      [users[0].id, 'First', 'text', 5]
    );
    await rawQuery(
      'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4)',
      [users[0].id, 'Second', 'text', 15]
    );
    await rawQuery(
      'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4)',
      [users[0].id, 'Third', 'text', 25]
    );

    const results = await getPostsWithLagLead();
    expect(results).toHaveLength(3);

    // First row: no previous, next should be 15
    expect(results[0].prev_likes).toBeNull();
    expect(Number(results[0].next_likes)).toBe(15);

    // Middle row: prev should be 5, next should be 25
    expect(Number(results[1].prev_likes)).toBe(5);
    expect(Number(results[1].next_likes)).toBe(25);

    // Last row: prev should be 15, no next
    expect(Number(results[2].prev_likes)).toBe(15);
    expect(results[2].next_likes).toBeNull();
  });

  it('should get posts with DENSE_RANK by likes', async () => {
    const users = await seedUsers(1);
    await rawQuery(
      'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4)',
      [users[0].id, 'Low', 'text', 5]
    );
    await rawQuery(
      'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4)',
      [users[0].id, 'Medium', 'text', 10]
    );
    await rawQuery(
      'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4)',
      [users[0].id, 'Also Medium', 'text', 10]
    );
    await rawQuery(
      'INSERT INTO posts (author_id, content, type, likes_count) VALUES ($1, $2, $3, $4)',
      [users[0].id, 'High', 'text', 20]
    );

    const results = await getDenseRankByLikes();
    expect(results).toHaveLength(4);

    const sorted = results.sort((a: any, b: any) => Number(b.likes_count) - Number(a.likes_count));
    expect(Number(sorted[0].dense_rank)).toBe(1); // 20 likes
    expect(Number(sorted[1].dense_rank)).toBe(2); // 10 likes
    expect(Number(sorted[2].dense_rank)).toBe(2); // 10 likes (same rank, dense)
    expect(Number(sorted[3].dense_rank)).toBe(3); // 5 likes (no gap)
  });
});
