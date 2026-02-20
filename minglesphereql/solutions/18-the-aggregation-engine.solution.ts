import { getDb, schema } from '../shared/connection.js';
import { eq, count, sum, avg, min, max, sql } from 'drizzle-orm';

/**
 * Chapter 18: The Aggregation Engine - SOLUTIONS
 */

export async function getTotalPostsByUser() {
  const db = getDb();
  return db
    .select({
      userId: schema.posts.authorId,
      totalPosts: count(),
    })
    .from(schema.posts)
    .groupBy(schema.posts.authorId);
}

export async function getAverageLikesPerUser() {
  const db = getDb();
  return db
    .select({
      userId: schema.posts.authorId,
      avgLikes: avg(schema.posts.likesCount),
    })
    .from(schema.posts)
    .groupBy(schema.posts.authorId);
}

export async function getPostStatsByType() {
  const db = getDb();
  return db
    .select({
      type: schema.posts.type,
      totalPosts: count(),
      totalLikes: sum(schema.posts.likesCount),
      avgLikes: avg(schema.posts.likesCount),
    })
    .from(schema.posts)
    .groupBy(schema.posts.type);
}

export async function getUsersWithMinPosts(minPosts: number) {
  const db = getDb();
  return db
    .select({
      userId: schema.posts.authorId,
      postCount: count(),
    })
    .from(schema.posts)
    .groupBy(schema.posts.authorId)
    .having(sql`count(*) >= ${minPosts}`);
}

export async function getOverallStats() {
  const db = getDb();

  const [userStats] = await db
    .select({ totalUsers: count() })
    .from(schema.users);

  const [postStats] = await db
    .select({
      totalPosts: count(),
      totalLikes: sum(schema.posts.likesCount),
      maxLikes: max(schema.posts.likesCount),
      minLikes: min(schema.posts.likesCount),
    })
    .from(schema.posts);

  return {
    totalUsers: userStats.totalUsers,
    totalPosts: postStats.totalPosts,
    totalLikes: postStats.totalLikes,
    maxLikes: postStats.maxLikes,
    minLikes: postStats.minLikes,
  };
}
