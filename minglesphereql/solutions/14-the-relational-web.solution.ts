import { getDb, schema } from '../shared/connection.js';
import { eq, count } from 'drizzle-orm';

/**
 * Chapter 14: The Relational Web - SOLUTIONS
 */

export async function createPostForUser(userId: number, content: string) {
  const db = getDb();
  const [post] = await db.insert(schema.posts)
    .values({ authorId: userId, content })
    .returning();
  return post;
}

export async function getPostsWithAuthor() {
  const db = getDb();
  return db.select()
    .from(schema.posts)
    .innerJoin(schema.users, eq(schema.posts.authorId, schema.users.id));
}

export async function getUserWithPosts(userId: number) {
  const db = getDb();
  return db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    with: { posts: true },
  });
}

export async function getPostsByAuthorUsername(username: string) {
  const db = getDb();
  return db.select()
    .from(schema.posts)
    .innerJoin(schema.users, eq(schema.posts.authorId, schema.users.id))
    .where(eq(schema.users.username, username));
}

export async function countPostsPerUser() {
  const db = getDb();
  return db.select({
      username: schema.users.username,
      postCount: count(schema.posts.id),
    })
    .from(schema.users)
    .leftJoin(schema.posts, eq(schema.users.id, schema.posts.authorId))
    .groupBy(schema.users.username);
}
