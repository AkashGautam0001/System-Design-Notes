/**
 * Chapter 10: The Great Edit - SOLUTION
 *
 * Users need to update their profiles. Time to learn update operations.
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
  const result = await Model.updateOne({ _id: id }, { $set: updates });
  return result;
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
  const updated = await Model.findByIdAndUpdate(id, { $set: updates }, { new: true });
  return updated;
}

/**
 * Increment a user's profileViews by 1 using the $inc operator.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The user's _id
 * @returns {Promise<Object>} The updated document with incremented profileViews
 */
export async function incrementProfileViews(Model, id) {
  const updated = await Model.findByIdAndUpdate(
    id,
    { $inc: { profileViews: 1 } },
    { new: true }
  );
  return updated;
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
  const result = await Model.updateOne({ _id: id }, { $unset: { [fieldName]: '' } });
  return result;
}

/**
 * Update or insert a user using upsert.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {Object} filter - The filter to find the document
 * @param {Object} data - The data to $set
 * @returns {Promise<Object>} The upsert result
 */
export async function upsertUser(Model, filter, data) {
  const result = await Model.updateOne(filter, { $set: data }, { upsert: true });
  return result;
}
