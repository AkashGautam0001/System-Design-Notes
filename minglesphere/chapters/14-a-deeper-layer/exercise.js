import mongoose from 'mongoose';

/**
 * Create a Post schema with embedded comment subdocuments.
 * Each comment has: author (String), text (String), createdAt (Date).
 * Create a post with title, body, and 2 comments. Return the saved post.
 *
 * @returns {Promise<Object>} The saved post document with 2 embedded comments
 */
export async function createPostWithComments() {
  // TODO: Define a commentSchema with author, text, createdAt fields
  // TODO: Define a postSchema with title, body, and comments as [commentSchema]
  // TODO: Create and save a post with 2 comments
  // TODO: Return the saved post
  throw new Error('Not implemented');
}

/**
 * Find a subdocument by its _id using the .id() method.
 *
 * @param {Object} post - A post document with comments subdocs
 * @param {ObjectId|string} commentId - The _id of the comment to find
 * @returns {Object} The found comment subdocument
 */
export async function findSubdocById(post, commentId) {
  // TODO: Use post.comments.id(commentId) to find the subdocument
  // TODO: Return the found comment
  throw new Error('Not implemented');
}

/**
 * Add a new comment subdocument to an existing post.
 *
 * @param {mongoose.Model} Model - The Post model
 * @param {ObjectId|string} postId - The _id of the post
 * @param {Object} comment - The comment object to add
 * @returns {Promise<Object>} The updated post document
 */
export async function addSubdocument(Model, postId, comment) {
  // TODO: Find the post by postId
  // TODO: Push the new comment to the comments array
  // TODO: Save and return the updated post
  throw new Error('Not implemented');
}

/**
 * Remove a comment subdocument from a post by its _id.
 *
 * @param {mongoose.Model} Model - The Post model
 * @param {ObjectId|string} postId - The _id of the post
 * @param {ObjectId|string} commentId - The _id of the comment to remove
 * @returns {Promise<Object>} The updated post document
 */
export async function removeSubdocument(Model, postId, commentId) {
  // TODO: Find the post by postId
  // TODO: Use pull on the comments array to remove the comment by _id
  // TODO: Save and return the updated post
  throw new Error('Not implemented');
}

/**
 * Demonstrate subdocument validation. Create a post schema where
 * comment text is required. Try adding a comment without text.
 * Catch and return the ValidationError.
 *
 * @returns {Promise<Object>} The ValidationError that was caught
 */
export async function validateSubdocument() {
  // TODO: Define commentSchema with text as { type: String, required: true }
  // TODO: Define postSchema with comments: [commentSchema]
  // TODO: Create a post with a comment missing the text field
  // TODO: Try to validate/save it, catch the ValidationError, and return it
  throw new Error('Not implemented');
}
