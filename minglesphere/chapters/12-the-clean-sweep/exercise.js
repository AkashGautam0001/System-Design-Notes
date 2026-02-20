/**
 * Chapter 12: The Clean Sweep
 *
 * Account deletions and content cleanup. Hard and soft deletes.
 * Learn deleteOne, deleteMany, findByIdAndDelete, and the soft delete pattern.
 */

/**
 * Delete a single user by _id using deleteOne.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The user's _id
 * @returns {Promise<Object>} The deleteResult from MongoDB
 */
export async function deleteOneUser(Model, id) {
  // TODO: Use Model.deleteOne() with a filter on _id
  // TODO: Return the deleteResult
  throw new Error('Not implemented: deleteOneUser');
}

/**
 * Delete multiple users matching a filter.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {Object} filter - The filter to match documents for deletion
 * @returns {Promise<Object>} The deleteResult from MongoDB
 */
export async function deleteManyUsers(Model, filter) {
  // TODO: Use Model.deleteMany() with the provided filter
  // TODO: Return the deleteResult
  throw new Error('Not implemented: deleteManyUsers');
}

/**
 * Find a user by _id, delete them, and return the deleted document.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The user's _id
 * @returns {Promise<Object>} The deleted document
 */
export async function findByIdAndDeleteUser(Model, id) {
  // TODO: Use Model.findByIdAndDelete() to remove and return the document
  // TODO: Return the deleted document
  throw new Error('Not implemented: findByIdAndDeleteUser');
}

/**
 * Soft delete a user by setting isDeleted to true and deletedAt to now.
 * The document is NOT actually removed from the database.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The user's _id
 * @returns {Promise<Object>} The updated document with soft delete fields
 */
export async function softDeleteUser(Model, id) {
  // TODO: Use Model.findByIdAndUpdate() with $set to mark isDeleted: true and deletedAt: new Date()
  // TODO: Return the updated document with { new: true }
  throw new Error('Not implemented: softDeleteUser');
}

/**
 * Find all active (non-soft-deleted) users.
 * Returns users where isDeleted is not true.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @returns {Promise<Array>} Array of active user documents
 */
export async function findActiveSoftDelete(Model) {
  // TODO: Use Model.find() to get users where isDeleted is not true
  // TODO: Consider users that don't have isDeleted field at all (they are active)
  // TODO: Return the results
  throw new Error('Not implemented: findActiveSoftDelete');
}
