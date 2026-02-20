import mongoose from 'mongoose';

/**
 * Create a Post schema with embedded comment subdocuments.
 * Each comment has: author (String), text (String), createdAt (Date).
 * Create a post with title, body, and 2 comments. Return the saved post.
 */
export async function createPostWithComments() {
  const commentSchema = new mongoose.Schema({
    author: String,
    text: String,
    createdAt: { type: Date, default: Date.now },
  });

  const postSchema = new mongoose.Schema({
    title: String,
    body: String,
    comments: [commentSchema],
  });

  const Post = mongoose.models.SubdocPost || mongoose.model('SubdocPost', postSchema);

  const post = new Post({
    title: 'Welcome to MingleSphere',
    body: 'This is our very first post with comments!',
    comments: [
      { author: 'Alice', text: 'Great platform!' },
      { author: 'Bob', text: 'Looking forward to using this!' },
    ],
  });

  await post.save();
  return post;
}

/**
 * Find a subdocument by its _id using the .id() method.
 */
export async function findSubdocById(post, commentId) {
  return post.comments.id(commentId);
}

/**
 * Add a new comment subdocument to an existing post.
 */
export async function addSubdocument(Model, postId, comment) {
  const post = await Model.findById(postId);
  post.comments.push(comment);
  await post.save();
  return post;
}

/**
 * Remove a comment subdocument from a post by its _id.
 */
export async function removeSubdocument(Model, postId, commentId) {
  const post = await Model.findById(postId);
  post.comments.pull({ _id: commentId });
  await post.save();
  return post;
}

/**
 * Demonstrate subdocument validation.
 */
export async function validateSubdocument() {
  const commentSchema = new mongoose.Schema({
    author: String,
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  });

  const postSchema = new mongoose.Schema({
    title: String,
    body: String,
    comments: [commentSchema],
  });

  const Post = mongoose.models.ValidatedSubdocPost || mongoose.model('ValidatedSubdocPost', postSchema);

  const post = new Post({
    title: 'Test Validation',
    body: 'This post has an invalid comment',
    comments: [{ author: 'Alice' }], // missing required 'text'
  });

  try {
    await post.validate();
  } catch (error) {
    return error;
  }
}
