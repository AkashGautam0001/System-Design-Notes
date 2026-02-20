import mongoose from 'mongoose';

/**
 * Create a user and then a post that references the user as author.
 *
 * @param {mongoose.Model} UserModel - The User model
 * @param {mongoose.Model} PostModel - The Post model
 * @param {Object} userData - Data to create the user with
 * @param {Object} postData - Data to create the post with (without author)
 * @returns {Promise<Object>} The saved post document with author ref set
 */
export async function createReferencedPost(UserModel, PostModel, userData, postData) {
  // TODO: Create and save the user
  // TODO: Create the post with author set to user._id
  // TODO: Save and return the post
  throw new Error('Not implemented');
}

/**
 * Find a post by its _id and populate the author field.
 *
 * @param {mongoose.Model} PostModel - The Post model
 * @param {ObjectId|string} postId - The _id of the post
 * @returns {Promise<Object>} The post with author populated
 */
export async function populateAuthor(PostModel, postId) {
  // TODO: Use PostModel.findById(postId).populate('author')
  // TODO: Return the populated post
  throw new Error('Not implemented');
}

/**
 * Populate the author field but only select specific fields (username, email).
 *
 * @param {mongoose.Model} PostModel - The Post model
 * @param {ObjectId|string} postId - The _id of the post
 * @returns {Promise<Object>} The post with selectively populated author
 */
export async function selectivePopulate(PostModel, postId) {
  // TODO: Use populate with path and select options
  // TODO: Only select 'username email' from the author
  // TODO: Return the populated post
  throw new Error('Not implemented');
}

/**
 * Find all posts and populate the author field on each.
 *
 * @param {mongoose.Model} PostModel - The Post model
 * @returns {Promise<Array>} Array of posts with populated authors
 */
export async function populateMultiplePosts(PostModel) {
  // TODO: Use PostModel.find().populate('author')
  // TODO: Return the array of populated posts
  throw new Error('Not implemented');
}

/**
 * Demonstrate the difference between a ref field before and after populate.
 * Before populate, author is an ObjectId. After populate, author is an object.
 *
 * @param {mongoose.Model} PostModel - The Post model
 * @param {ObjectId|string} postId - The _id of the post
 * @returns {Promise<Object>} { beforePopulate: boolean, afterPopulate: boolean }
 */
export async function checkRefIntegrity(PostModel, postId) {
  // TODO: Find the post WITHOUT populating - check if author is an ObjectId
  // TODO: Find the post WITH populating - check if author is an object
  // TODO: Return { beforePopulate: <true if ObjectId>, afterPopulate: <true if object with _id> }
  throw new Error('Not implemented');
}
