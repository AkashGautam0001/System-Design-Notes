import mongoose from 'mongoose';

/**
 * Create a user and then a post that references the user as author.
 */
export async function createReferencedPost(UserModel, PostModel, userData, postData) {
  const user = await UserModel.create(userData);
  const post = await PostModel.create({
    ...postData,
    author: user._id,
  });
  return post;
}

/**
 * Find a post by its _id and populate the author field.
 */
export async function populateAuthor(PostModel, postId) {
  return PostModel.findById(postId).populate('author');
}

/**
 * Populate the author field but only select specific fields (username, email).
 */
export async function selectivePopulate(PostModel, postId) {
  return PostModel.findById(postId).populate({
    path: 'author',
    select: 'username email',
  });
}

/**
 * Find all posts and populate the author field on each.
 */
export async function populateMultiplePosts(PostModel) {
  return PostModel.find().populate('author');
}

/**
 * Demonstrate the difference between a ref field before and after populate.
 */
export async function checkRefIntegrity(PostModel, postId) {
  const beforePost = await PostModel.findById(postId);
  const isObjectId = beforePost.author instanceof mongoose.Types.ObjectId;

  const afterPost = await PostModel.findById(postId).populate('author');
  const isObject = afterPost.author !== null
    && typeof afterPost.author === 'object'
    && afterPost.author._id !== undefined;

  return {
    beforePopulate: isObjectId,
    afterPopulate: isObject,
  };
}
