import mongoose from 'mongoose';

/**
 * Seed users with different ages and find those where age > 25 AND age < 50.
 *
 * @param {mongoose.Model} Model - A Mongoose user model
 * @returns {Promise<Array>} Array of matching user documents
 */
export async function findByComparison(Model) {
  // TODO: Seed users with ages like 20, 30, 40, 55 using Model.create()
  // TODO: Use Model.find() with $gt and $lt on the age field
  // TODO: Return the results
  throw new Error('Not implemented: findByComparison');
}

/**
 * Seed users with different roles and find those whose role is in
 * ['admin', 'moderator'] using the $in operator.
 *
 * @param {mongoose.Model} Model - A Mongoose user model
 * @returns {Promise<Array>} Array of matching user documents
 */
export async function findByInOperator(Model) {
  // TODO: Seed users with roles 'user', 'admin', 'moderator', 'user'
  // TODO: Use Model.find() with $in to find admins and moderators
  // TODO: Return the results
  throw new Error('Not implemented: findByInOperator');
}

/**
 * Seed users and find those where age < 18 OR role is 'admin'
 * using the $or logical operator.
 *
 * @param {mongoose.Model} Model - A Mongoose user model
 * @returns {Promise<Array>} Array of matching user documents
 */
export async function findByLogicalOr(Model) {
  // TODO: Seed users with various ages and roles
  // TODO: Use Model.find() with $or to match age < 18 OR role 'admin'
  // TODO: Return the results
  throw new Error('Not implemented: findByLogicalOr');
}

/**
 * Seed users and find those whose username matches the regex /^john/i
 * (starts with "john", case-insensitive).
 *
 * @param {mongoose.Model} Model - A Mongoose user model
 * @returns {Promise<Array>} Array of matching user documents
 */
export async function findByRegex(Model) {
  // TODO: Seed users with usernames like 'john_doe', 'Johnny', 'Jane', 'JOHNSON'
  // TODO: Use Model.find() with $regex to match /^john/i
  // TODO: Return the results
  throw new Error('Not implemented: findByRegex');
}

/**
 * Seed users (some with a bio field, some without) and find those
 * where the bio field exists using the $exists operator.
 *
 * @param {mongoose.Model} Model - A Mongoose user model (should have bio as a mixed/optional field)
 * @returns {Promise<Array>} Array of matching user documents
 */
export async function findByExists(Model) {
  // TODO: Seed users; some with bio field set, some without
  // TODO: Use Model.find() with $exists: true on bio
  // TODO: Return the results
  throw new Error('Not implemented: findByExists');
}
