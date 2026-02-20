import mongoose from 'mongoose';

/**
 * Seed users and use .select() to return only the username and email fields.
 *
 * @param {mongoose.Model} Model - A Mongoose user model
 * @returns {Promise<Array>} Array of user documents with only username and email
 */
export async function selectFields(Model) {
  // TODO: Seed several users with username, email, age, and role
  // TODO: Use Model.find().select('username email') to return only those fields
  // TODO: Return the results
  throw new Error('Not implemented: selectFields');
}

/**
 * Seed users and sort them by age in descending order.
 *
 * @param {mongoose.Model} Model - A Mongoose user model
 * @returns {Promise<Array>} Array of user documents sorted by age descending
 */
export async function sortUsers(Model) {
  // TODO: Seed several users with different ages
  // TODO: Use Model.find().sort({ age: -1 }) or .sort('-age')
  // TODO: Return the sorted results
  throw new Error('Not implemented: sortUsers');
}

/**
 * Seed 10 users and implement pagination using skip and limit.
 *
 * @param {mongoose.Model} Model - A Mongoose user model
 * @param {number} page - The page number (1-based)
 * @param {number} limit - Number of results per page
 * @returns {Promise<Array>} The page of user documents
 */
export async function paginateUsers(Model, page, limit) {
  // TODO: Seed 10 users with usernames like 'user_1', 'user_2', ..., 'user_10'
  // TODO: Use Model.find().sort({ username: 1 }).skip((page - 1) * limit).limit(limit)
  // TODO: Return the results
  throw new Error('Not implemented: paginateUsers');
}

/**
 * Seed users with various roles and return the distinct set of roles.
 *
 * @param {mongoose.Model} Model - A Mongoose user model
 * @returns {Promise<Array<string>>} Array of distinct role strings
 */
export async function getDistinctRoles(Model) {
  // TODO: Seed users with roles like 'user', 'admin', 'moderator', 'user', 'admin'
  // TODO: Use Model.distinct('role') to get unique roles
  // TODO: Return the array
  throw new Error('Not implemented: getDistinctRoles');
}

/**
 * Seed users (some active, some inactive) and count only the active ones.
 *
 * @param {mongoose.Model} Model - A Mongoose user model
 * @returns {Promise<number>} The count of active users
 */
export async function countActiveUsers(Model) {
  // TODO: Seed users with an isActive boolean field (mix of true/false)
  // TODO: Use Model.countDocuments({ isActive: true })
  // TODO: Return the count
  throw new Error('Not implemented: countActiveUsers');
}
