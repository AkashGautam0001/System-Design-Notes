/**
 * Chapter 11: Array Alchemy
 *
 * Tags, likes, comment arrays - mastering array operations.
 * Learn $push, $pull, $addToSet, $pop, $each, $slice, and the positional $ operator.
 */

/**
 * Push a single tag to the tags array of a document.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The document's _id
 * @param {string} tag - The tag to add
 * @returns {Promise<Object>} The updated document
 */
export async function pushToArray(Model, id, tag) {
  // TODO: Use Model.findByIdAndUpdate() with $push to add the tag to the tags array
  // TODO: Return the updated document with { new: true }
  throw new Error('Not implemented: pushToArray');
}

/**
 * Add a tag to the tags array only if it doesn't already exist.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The document's _id
 * @param {string} tag - The tag to add (no duplicates)
 * @returns {Promise<Object>} The updated document
 */
export async function addToSetArray(Model, id, tag) {
  // TODO: Use Model.findByIdAndUpdate() with $addToSet to add the tag
  // TODO: Return the updated document with { new: true }
  throw new Error('Not implemented: addToSetArray');
}

/**
 * Remove a specific tag from the tags array.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The document's _id
 * @param {string} tag - The tag to remove
 * @returns {Promise<Object>} The updated document
 */
export async function pullFromArray(Model, id, tag) {
  // TODO: Use Model.findByIdAndUpdate() with $pull to remove the tag
  // TODO: Return the updated document with { new: true }
  throw new Error('Not implemented: pullFromArray');
}

/**
 * Push multiple tags but keep the array capped at a maximum size.
 * Uses $push with $each and $slice.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The document's _id
 * @param {string[]} tags - Array of tags to add
 * @param {number} maxSize - Maximum size of the tags array
 * @returns {Promise<Object>} The updated document
 */
export async function pushMultipleWithSlice(Model, id, tags, maxSize) {
  // TODO: Use Model.findByIdAndUpdate() with $push, $each, and $slice
  // TODO: $slice should be negative to keep the last maxSize elements
  // TODO: Return the updated document with { new: true }
  throw new Error('Not implemented: pushMultipleWithSlice');
}

/**
 * Update a specific element in the tags array using the positional $ operator.
 * Finds the element matching oldTag and replaces it with newTag.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The document's _id
 * @param {string} oldTag - The tag value to find
 * @param {string} newTag - The new tag value to replace it with
 * @returns {Promise<Object>} The updated document
 */
export async function updateArrayElement(Model, id, oldTag, newTag) {
  // TODO: Use Model.findOneAndUpdate() with a filter on _id and tags matching oldTag
  // TODO: Use { 'tags.$': newTag } with $set and the positional $ operator
  // TODO: Return the updated document with { new: true }
  throw new Error('Not implemented: updateArrayElement');
}
