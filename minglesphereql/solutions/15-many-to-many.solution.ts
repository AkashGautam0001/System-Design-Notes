import { getDb, schema } from '../shared/connection.js';
import { eq, and, count } from 'drizzle-orm';

/**
 * Chapter 15: Many to Many - SOLUTIONS
 */

export async function addTagToPost(postId: number, tagId: number) {
  const db = getDb();
  const [result] = await db.insert(schema.postTags)
    .values({ postId, tagId })
    .returning();
  return result;
}

export async function getPostTags(postId: number) {
  const db = getDb();
  return db.select({ tagName: schema.tags.name, tagId: schema.tags.id })
    .from(schema.postTags)
    .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
    .where(eq(schema.postTags.postId, postId));
}

export async function getPostsByTag(tagName: string) {
  const db = getDb();
  return db.select({ postId: schema.posts.id, content: schema.posts.content })
    .from(schema.posts)
    .innerJoin(schema.postTags, eq(schema.posts.id, schema.postTags.postId))
    .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
    .where(eq(schema.tags.name, tagName));
}

export async function removeTagFromPost(postId: number, tagId: number) {
  const db = getDb();
  const [deleted] = await db.delete(schema.postTags)
    .where(and(eq(schema.postTags.postId, postId), eq(schema.postTags.tagId, tagId)))
    .returning();
  return deleted;
}

export async function getTagsWithPostCount() {
  const db = getDb();
  return db.select({ name: schema.tags.name, postCount: count(schema.postTags.postId) })
    .from(schema.tags)
    .leftJoin(schema.postTags, eq(schema.tags.id, schema.postTags.tagId))
    .groupBy(schema.tags.name);
}
