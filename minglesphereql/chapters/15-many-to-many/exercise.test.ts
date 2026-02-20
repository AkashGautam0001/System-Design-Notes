import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection } from '../../shared/connection.js';
import { clearAllTables, seedUsers, seedPosts, seedTags, rawQuery } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/15-many-to-many.solution.ts'
  : './exercise.ts';

const {
  addTagToPost,
  getPostTags,
  getPostsByTag,
  removeTagFromPost,
  getTagsWithPostCount,
} = await import(exercisePath);

describe('Chapter 15: Many to Many', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should add a tag to a post via the junction table', async () => {
    const users = await seedUsers(1);
    const posts = await seedPosts(users[0].id, 1);
    const tags = await seedTags(['javascript']);
    const result = await addTagToPost(posts[0].id, tags[0].id);
    expect(result).toBeDefined();
    expect(result.postId).toBe(posts[0].id);
    expect(result.tagId).toBe(tags[0].id);
  });

  it('should get all tags for a specific post', async () => {
    const users = await seedUsers(1);
    const posts = await seedPosts(users[0].id, 1);
    const tags = await seedTags(['typescript', 'drizzle', 'postgres']);
    for (const tag of tags) {
      await rawQuery('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)', [posts[0].id, tag.id]);
    }
    const result = await getPostTags(posts[0].id);
    expect(result).toHaveLength(3);
    const tagNames = result.map((r: any) => r.tagName).sort();
    expect(tagNames).toEqual(['drizzle', 'postgres', 'typescript']);
  });

  it('should get all posts with a specific tag name', async () => {
    const users = await seedUsers(1);
    const posts = await seedPosts(users[0].id, 3);
    const tags = await seedTags(['graphql', 'rest']);
    // Tag first two posts with 'graphql', third with 'rest'
    await rawQuery('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)', [posts[0].id, tags[0].id]);
    await rawQuery('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)', [posts[1].id, tags[0].id]);
    await rawQuery('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)', [posts[2].id, tags[1].id]);
    const result = await getPostsByTag('graphql');
    expect(result).toHaveLength(2);
    const postIds = result.map((r: any) => r.postId).sort();
    expect(postIds).toContain(posts[0].id);
    expect(postIds).toContain(posts[1].id);
  });

  it('should remove a tag from a post and return the deleted junction row', async () => {
    const users = await seedUsers(1);
    const posts = await seedPosts(users[0].id, 1);
    const tags = await seedTags(['removeme']);
    await rawQuery('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)', [posts[0].id, tags[0].id]);
    const deleted = await removeTagFromPost(posts[0].id, tags[0].id);
    expect(deleted).toBeDefined();
    expect(deleted.postId).toBe(posts[0].id);
    expect(deleted.tagId).toBe(tags[0].id);
    // Verify it was actually removed
    const remaining = await getPostTags(posts[0].id);
    expect(remaining).toHaveLength(0);
  });

  it('should get tags with their post counts including tags with zero posts', async () => {
    const users = await seedUsers(1);
    const posts = await seedPosts(users[0].id, 2);
    const tags = await seedTags(['popular', 'niche', 'unused']);
    // 'popular' on both posts, 'niche' on one, 'unused' on none
    await rawQuery('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)', [posts[0].id, tags[0].id]);
    await rawQuery('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)', [posts[1].id, tags[0].id]);
    await rawQuery('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)', [posts[0].id, tags[1].id]);
    const result = await getTagsWithPostCount();
    expect(result).toHaveLength(3);
    const popular = result.find((r: any) => r.name === 'popular');
    const niche = result.find((r: any) => r.name === 'niche');
    const unused = result.find((r: any) => r.name === 'unused');
    expect(popular.postCount).toBe(2);
    expect(niche.postCount).toBe(1);
    expect(unused.postCount).toBe(0);
  });
});
