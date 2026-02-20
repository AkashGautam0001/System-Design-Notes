/**
 * Chapter 12: The Clean Sweep - SOLUTION
 *
 * Account deletions and content cleanup. Hard and soft deletes.
 */

/**
 * Delete a single user by _id using deleteOne.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The user's _id
 * @returns {Promise<Object>} The deleteResult from MongoDB
 */
export async function deleteOneUser(Model, id) {
  const result = await Model.deleteOne({ _id: id });
  return result;
}

/**
 * Delete multiple users matching a filter.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {Object} filter - The filter to match documents for deletion
 * @returns {Promise<Object>} The deleteResult from MongoDB
 */
export async function deleteManyUsers(Model, filter) {
  const result = await Model.deleteMany(filter);
  return result;
}

/**
 * Find a user by _id, delete them, and return the deleted document.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The user's _id
 * @returns {Promise<Object>} The deleted document
 */
export async function findByIdAndDeleteUser(Model, id) {
  const deleted = await Model.findByIdAndDelete(id);
  return deleted;
}

/**
 * Soft delete a user by setting isDeleted to true and deletedAt to now.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The user's _id
 * @returns {Promise<Object>} The updated document with soft delete fields
 */
export async function softDeleteUser(Model, id) {
  const updated = await Model.findByIdAndUpdate(
    id,
    { $set: { isDeleted: true, deletedAt: new Date() } },
    { new: true }
  );
  return updated;
}

/**
 * Find all active (non-soft-deleted) users.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @returns {Promise<Array>} Array of active user documents
 */
export async function findActiveSoftDelete(Model) {
  const results = await Model.find({ isDeleted: { $ne: true } });
  return results;
}
