import mongoose from 'mongoose';

/**
 * Seed users with various roles, then use the aggregation pipeline to
 * group by role and count users in each role. Sort by count descending.
 *
 * @param {mongoose.Model} Model - A Mongoose User model
 * @returns {Promise<Array>} Aggregation results: [{ _id: role, count: N }, ...]
 */
export async function groupByRole(Model) {
  // TODO: Seed users with different roles (e.g., 'admin', 'user', 'moderator')
  // TODO: Use Model.aggregate() with $group stage: { _id: '$role', count: { $sum: 1 } }
  // TODO: Add $sort stage: { count: -1 }
  // TODO: Return the results
  throw new Error('Not implemented');
}

/**
 * Seed users with an 'active' boolean field. Match only active users,
 * then group by role and compute the average age per role.
 *
 * @param {mongoose.Model} Model - A Mongoose User model
 * @returns {Promise<Array>} Aggregation results: [{ _id: role, avgAge: N }, ...]
 */
export async function matchAndGroup(Model) {
  // TODO: Seed users with active status and age fields
  // TODO: Use $match to filter only active: true users
  // TODO: Use $group to group by role and compute average age with $avg
  // TODO: Return the results
  throw new Error('Not implemented');
}

/**
 * Seed users with username and email. Use $project to create a computed
 * 'displayInfo' field that concatenates username and email.
 *
 * @param {mongoose.Model} Model - A Mongoose User model
 * @returns {Promise<Array>} Results with displayInfo field
 */
export async function projectFields(Model) {
  // TODO: Seed users with username and email
  // TODO: Use $project with $concat to create displayInfo: "username <email>"
  // TODO: Return the results
  throw new Error('Not implemented');
}

/**
 * Seed users with an age field. Use $addFields to add an 'ageGroup' field
 * based on age ranges: teen (< 20), adult (20-59), senior (60+).
 *
 * @param {mongoose.Model} Model - A Mongoose User model
 * @returns {Promise<Array>} Results with ageGroup field added
 */
export async function addFieldsStage(Model) {
  // TODO: Seed users with various ages
  // TODO: Use $addFields with $cond or $switch to compute 'ageGroup'
  // TODO: Return the results
  throw new Error('Not implemented');
}

/**
 * Seed users with an 'active' field. Use $match then $count to count
 * the number of active users.
 *
 * @param {mongoose.Model} Model - A Mongoose User model
 * @returns {Promise<number>} The count of active users
 */
export async function countDocumentsAgg(Model) {
  // TODO: Seed users with active: true and active: false
  // TODO: Use $match for active: true, then $count stage
  // TODO: Return the count value (number, not the array)
  throw new Error('Not implemented');
}
