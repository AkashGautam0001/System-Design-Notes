import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection } from '../../shared/connection.js';
import { clearAllTables, seedUsers, seedPosts, seedComments, seedTags, rawQuery } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/16-going-deeper.solution.ts'
  : './exercise.ts';

const {
  getPostWithCommentsAndAuthors,
  createThreadedComment,
  getCommentThread,
  getUserWithPostsAndComments,
  getPostsWithAllRelations,
} = await import(exercisePath);

describe('Chapter 16: Going Deeper', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should get a post with comments and their authors plus the post author', async () => {
    const users = await seedUsers(2);
    const posts = await seedPosts(users[0].id, 1);
    await seedComments(posts[0].id, users[1].id, 2);
    const result = await getPostWithCommentsAndAuthors(posts[0].id);
    expect(result).toBeDefined();
    expect(result.author).toBeDefined();
    expect(result.author.username).toBe('user1');
    expect(result.comments).toHaveLength(2);
    expect(result.comments[0].author).toBeDefined();
    expect(result.comments[0].author.username).toBe('user2');
  });

  it('should create a threaded comment with a parent reference', async () => {
    const users = await seedUsers(1);
    const posts = await seedPosts(users[0].id, 1);
    // Create a root comment
    const rootComment = await createThreadedComment(posts[0].id, users[0].id, 'Root comment', null);
    expect(rootComment).toBeDefined();
    expect(rootComment.parentId).toBeNull();
    // Create a reply to the root comment
    const reply = await createThreadedComment(posts[0].id, users[0].id, 'This is a reply', rootComment.id);
    expect(reply).toBeDefined();
    expect(reply.parentId).toBe(rootComment.id);
    expect(reply.content).toBe('This is a reply');
  });

  it('should get a comment thread with replies and their authors', async () => {
    const users = await seedUsers(2);
    const posts = await seedPosts(users[0].id, 1);
    // Create root comment via raw query
    const rootResult = await rawQuery(
      'INSERT INTO comments (post_id, author_id, content) VALUES ($1, $2, $3) RETURNING *',
      [posts[0].id, users[0].id, 'Thread root']
    );
    const rootId = rootResult.rows[0].id;
    // Create two replies
    await rawQuery(
      'INSERT INTO comments (post_id, author_id, content, parent_id) VALUES ($1, $2, $3, $4)',
      [posts[0].id, users[1].id, 'Reply 1', rootId]
    );
    await rawQuery(
      'INSERT INTO comments (post_id, author_id, content, parent_id) VALUES ($1, $2, $3, $4)',
      [posts[0].id, users[0].id, 'Reply 2', rootId]
    );
    const thread = await getCommentThread(rootId);
    expect(thread).toHaveLength(2);
    expect(thread[0].author).toBeDefined();
    expect(thread[0].author.username).toBeDefined();
  });

  it('should get a user with posts and each post with its comments', async () => {
    const users = await seedUsers(1);
    const posts = await seedPosts(users[0].id, 2);
    await seedComments(posts[0].id, users[0].id, 3);
    await seedComments(posts[1].id, users[0].id, 1);
    const result = await getUserWithPostsAndComments(users[0].id);
    expect(result).toBeDefined();
    expect(result.username).toBe('user1');
    expect(result.posts).toHaveLength(2);
    const postWithThreeComments = result.posts.find((p: any) => p.id === posts[0].id);
    const postWithOneComment = result.posts.find((p: any) => p.id === posts[1].id);
    expect(postWithThreeComments.comments).toHaveLength(3);
    expect(postWithOneComment.comments).toHaveLength(1);
  });

  it('should get posts with author, comments with authors, and tags', async () => {
    const users = await seedUsers(2);
    const posts = await seedPosts(users[0].id, 1);
    await seedComments(posts[0].id, users[1].id, 2);
    const tags = await seedTags(['nodejs', 'drizzle']);
    await rawQuery('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)', [posts[0].id, tags[0].id]);
    await rawQuery('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)', [posts[0].id, tags[1].id]);
    const results = await getPostsWithAllRelations();
    expect(results).toHaveLength(1);
    const post = results[0];
    expect(post.author).toBeDefined();
    expect(post.author.username).toBe('user1');
    expect(post.comments).toHaveLength(2);
    expect(post.comments[0].author).toBeDefined();
    expect(post.postTags).toHaveLength(2);
    expect(post.postTags[0].tag).toBeDefined();
  });
});
