/**
 * Chapter 10: The Great Edit
 *
 * Users need to update their profiles. Time to learn update operations.
 * Master updateOne, findByIdAndUpdate, $set, $unset, $inc, and upsert.
 */

/**
 * Update a single user by _id using updateOne with $set.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The user's _id
 * @param {Object} updates - An object of fields to $set
 * @returns {Promise<Object>} The raw updateResult from MongoDB
 */
export async function updateOneUser(Model, id, updates) {
  // TODO: Use Model.updateOne() with a filter on _id and $set the updates
  // TODO: Return the updateResult
  throw new Error('Not implemented: updateOneUser');
}

/**
 * Find a user by _id and update them, returning the updated document.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The user's _id
 * @param {Object} updates - An object of fields to $set
 * @returns {Promise<Object>} The updated document
 */
export async function findByIdAndUpdateUser(Model, id, updates) {
  // TODO: Use Model.findByIdAndUpdate() with $set and { new: true }
  // TODO: Return the updated document
  throw new Error('Not implemented: findByIdAndUpdateUser');
}

/**
 * Increment a user's profileViews by 1 using the $inc operator.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The user's _id
 * @returns {Promise<Object>} The updated document with incremented profileViews
 */
export async function incrementProfileViews(Model, id) {
  // TODO: Use Model.findByIdAndUpdate() with $inc to add 1 to profileViews
  // TODO: Return the updated document with { new: true }
  throw new Error('Not implemented: incrementProfileViews');
}

/**
 * Remove a field from a user document using the $unset operator.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The user's _id
 * @param {string} fieldName - The name of the field to remove
 * @returns {Promise<Object>} The raw update result
 */
export async function unsetField(Model, id, fieldName) {
  // TODO: Use Model.updateOne() with $unset to remove the specified field
  // TODO: Return the update result
  throw new Error('Not implemented: unsetField');
}

/**
 * Update or insert a user using upsert.
 * If no document matches the filter, a new one is created.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {Object} filter - The filter to find the document
 * @param {Object} data - The data to $set
 * @returns {Promise<Object>} The upsert result
 */
export async function upsertUser(Model, filter, data) {
  // TODO: Use Model.updateOne() with $set and { upsert: true }
  // TODO: Return the result
  throw new Error('Not implemented: upsertUser');
}
