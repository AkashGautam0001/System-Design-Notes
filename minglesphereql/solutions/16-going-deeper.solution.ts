import { getDb, schema } from '../shared/connection.js';
import { eq } from 'drizzle-orm';

/**
 * Chapter 16: Going Deeper - SOLUTIONS
 */

export async function getPostWithCommentsAndAuthors(postId: number) {
  const db = getDb();
  return db.query.posts.findFirst({
    where: eq(schema.posts.id, postId),
    with: {
      comments: { with: { author: true } },
      author: true,
    },
  });
}

export async function createThreadedComment(
  postId: number,
  authorId: number,
  content: string,
  parentId: number | null
) {
  const db = getDb();
  const [comment] = await db.insert(schema.comments)
    .values({ postId, authorId, content, parentId })
    .returning();
  return comment;
}

export async function getCommentThread(parentId: number) {
  const db = getDb();
  return db.query.comments.findMany({
    where: eq(schema.comments.parentId, parentId),
    with: { author: true, replies: true },
  });
}

export async function getUserWithPostsAndComments(userId: number) {
  const db = getDb();
  return db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    with: {
      posts: { with: { comments: true } },
    },
  });
}

export async function getPostsWithAllRelations() {
  const db = getDb();
  return db.query.posts.findMany({
    with: {
      author: true,
      comments: { with: { author: true } },
      postTags: { with: { tag: true } },
    },
  });
}
