import { getDb, schema } from '../../shared/connection.js';
import { eq, and, count } from 'drizzle-orm';

/**
 * Chapter 15: Many to Many
 *
 * Tags on posts -- the classic many-to-many relationship.
 * A post can have many tags, and a tag can belong to many posts.
 * The junction table `post_tags` bridges them together.
 * Complete each function to master many-to-many operations.
 */

/**
 * Add a tag to a post by inserting into the post_tags junction table.
 * Use db.insert(schema.postTags).values({ postId, tagId }).returning()
 * Return the first element of the returned array.
 */
export async function addTagToPost(postId: number, tagId: number) {
  throw new Error('Not implemented');
}

/**
 * Get all tags for a given post.
 * Join postTags with tags:
 *   db.select({ tagName: schema.tags.name, tagId: schema.tags.id })
 *     .from(schema.postTags)
 *     .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
 *     .where(eq(schema.postTags.postId, postId))
 * Return the array of { tagName, tagId } objects.
 */
export async function getPostTags(postId: number) {
  throw new Error('Not implemented');
}

/**
 * Get all posts that have a specific tag (by tag name).
 * Join through postTags to get posts:
 *   db.select({ postId: schema.posts.id, content: schema.posts.content })
 *     .from(schema.posts)
 *     .innerJoin(schema.postTags, eq(schema.posts.id, schema.postTags.postId))
 *     .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
 *     .where(eq(schema.tags.name, tagName))
 * Return the array.
 */
export async function getPostsByTag(tagName: string) {
  throw new Error('Not implemented');
}

/**
 * Remove a tag from a post by deleting from the junction table.
 * Use db.delete(schema.postTags)
 *   .where(and(eq(schema.postTags.postId, postId), eq(schema.postTags.tagId, tagId)))
 *   .returning()
 * Return the first element of the returned array (the deleted row).
 */
export async function removeTagFromPost(postId: number, tagId: number) {
  throw new Error('Not implemented');
}

/**
 * Get all tags with a count of how many posts use each tag.
 * Use db.select({ name: schema.tags.name, postCount: count(schema.postTags.postId) })
 *   .from(schema.tags)
 *   .leftJoin(schema.postTags, eq(schema.tags.id, schema.postTags.tagId))
 *   .groupBy(schema.tags.name)
 * Return the array of { name, postCount } objects.
 */
export async function getTagsWithPostCount() {
  throw new Error('Not implemented');
}
