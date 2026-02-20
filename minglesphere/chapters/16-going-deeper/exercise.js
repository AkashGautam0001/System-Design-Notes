import mongoose from 'mongoose';

/**
 * Find a post and deeply populate both post.author and post.comments.author.
 *
 * @param {mongoose.Model} PostModel - The Post model
 * @param {ObjectId|string} postId - The _id of the post
 * @returns {Promise<Object>} The fully populated post
 */
export async function deepPopulate(PostModel, postId) {
  // TODO: Find the post by id
  // TODO: Populate 'author' (the post author)
  // TODO: Populate 'comments.author' (each comment's author)
  // TODO: Return the fully populated post
  throw new Error('Not implemented');
}

/**
 * Create a 1:N (one-to-many) relationship: one author with multiple books.
 * The author has a books array of refs. Create author + books, then populate.
 *
 * @param {mongoose.Model} AuthorModel - The Author model
 * @param {mongoose.Model} BookModel - The Book model
 * @returns {Promise<Object>} The author populated with their books
 */
export async function createOneToMany(AuthorModel, BookModel) {
  // TODO: Create an author
  // TODO: Create 2+ books with author ref
  // TODO: Add book _ids to author.books array, save
  // TODO: Populate author.books and return the author
  throw new Error('Not implemented');
}

/**
 * Create a M:N (many-to-many) relationship between students and courses.
 * Each student has a courses array, each course has a students array.
 *
 * @param {mongoose.Model} StudentModel - The Student model
 * @param {mongoose.Model} CourseModel - The Course model
 * @returns {Promise<Object>} { students, courses } both populated
 */
export async function createManyToMany(StudentModel, CourseModel) {
  // TODO: Create 2 students and 2 courses
  // TODO: Assign each student to both courses (and vice versa)
  // TODO: Save all documents
  // TODO: Populate and return { students, courses }
  throw new Error('Not implemented');
}

/**
 * Populate comments on a post but only those matching a condition.
 * Use populate with match option to filter populated results.
 *
 * @param {mongoose.Model} PostModel - The Post model
 * @param {ObjectId|string} postId - The _id of the post
 * @returns {Promise<Object>} The post with conditionally populated comments
 */
export async function populateWithMatch(PostModel, postId) {
  // TODO: Find the post by id
  // TODO: Populate 'comments' with a match condition (e.g., { approved: true })
  // TODO: Return the post
  throw new Error('Not implemented');
}

/**
 * Deep populate with select options at each level.
 * Populate author (select only username) and comments.author (select only username).
 *
 * @param {mongoose.Model} PostModel - The Post model
 * @param {ObjectId|string} postId - The _id of the post
 * @returns {Promise<Object>} Post with selectively deep-populated fields
 */
export async function selectiveDeepPopulate(PostModel, postId) {
  // TODO: Find post by id
  // TODO: Populate 'author' selecting only 'username'
  // TODO: Populate 'comments.author' selecting only 'username'
  // TODO: Return the post
  throw new Error('Not implemented');
}
