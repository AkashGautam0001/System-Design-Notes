import mongoose from 'mongoose';

/**
 * Seed users and posts. Use $lookup to join posts to their authors.
 *
 * @param {mongoose.Model} UserModel - The User model
 * @param {mongoose.Model} PostModel - The Post model
 * @returns {Promise<Array>} Users with their posts joined as 'userPosts'
 */
export async function lookupPosts(UserModel, PostModel) {
  // TODO: Seed users and posts (posts should reference user _id in 'author' field)
  // TODO: Use UserModel.aggregate() with $lookup:
  //   { from: 'posts', localField: '_id', foreignField: 'author', as: 'userPosts' }
  // TODO: Return the results
  throw new Error('Not implemented');
}

/**
 * Seed posts with tags arrays. Use $unwind on tags, then $group by tag
 * to count how many times each tag appears.
 *
 * @param {mongoose.Model} Model - A Post model with tags field
 * @returns {Promise<Array>} Tag counts: [{ _id: tagName, count: N }, ...]
 */
export async function unwindArray(Model) {
  // TODO: Seed posts with arrays of tags
  // TODO: Use $unwind on '$tags'
  // TODO: Use $group to group by '$tags' and count with $sum: 1
  // TODO: Sort by count descending
  // TODO: Return the results
  throw new Error('Not implemented');
}

/**
 * Seed users with age field. Use $bucket to group users into age ranges.
 *
 * @param {mongoose.Model} Model - A User model with age field
 * @returns {Promise<Array>} Bucket results with _id as lower boundary and count
 */
export async function bucketByAge(Model) {
  // TODO: Seed users with various ages spanning the range
  // TODO: Use $bucket with groupBy: '$age', boundaries: [0, 18, 30, 50, 100]
  // TODO: Set default: 'Other' and output: { count: { $sum: 1 } }
  // TODO: Return the results
  throw new Error('Not implemented');
}

/**
 * Seed users. Use $facet to run multiple aggregation pipelines simultaneously:
 * - byRole: group by role with count
 * - ageStats: compute avg, min, max age
 * - total: count all documents
 *
 * @param {mongoose.Model} Model - A User model
 * @returns {Promise<Object>} The facet result object
 */
export async function facetSearch(Model) {
  // TODO: Seed users with role and age fields
  // TODO: Use $facet with three sub-pipelines:
  //   byRole: [$group by role, count]
  //   ageStats: [$group with $avg, $min, $max on age]
  //   total: [$count]
  // TODO: Return the first element of the aggregation result
  throw new Error('Not implemented');
}

/**
 * Seed users with age field. Use $addFields with $cond to categorize users:
 * age < 18 -> 'minor', age < 65 -> 'adult', else 'senior'.
 *
 * @param {mongoose.Model} Model - A User model with age field
 * @returns {Promise<Array>} Results with 'category' field added
 */
export async function conditionalExpression(Model) {
  // TODO: Seed users with various ages
  // TODO: Use $addFields with nested $cond to add 'category' field
  // TODO: Return the results
  throw new Error('Not implemented');
}
