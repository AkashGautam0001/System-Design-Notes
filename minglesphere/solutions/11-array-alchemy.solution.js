/**
 * Chapter 11: Array Alchemy - SOLUTION
 *
 * Tags, likes, comment arrays - mastering array operations.
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
  const updated = await Model.findByIdAndUpdate(
    id,
    { $push: { tags: tag } },
    { new: true }
  );
  return updated;
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
  const updated = await Model.findByIdAndUpdate(
    id,
    { $addToSet: { tags: tag } },
    { new: true }
  );
  return updated;
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
  const updated = await Model.findByIdAndUpdate(
    id,
    { $pull: { tags: tag } },
    { new: true }
  );
  return updated;
}

/**
 * Push multiple tags but keep the array capped at a maximum size.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The document's _id
 * @param {string[]} tags - Array of tags to add
 * @param {number} maxSize - Maximum size of the tags array
 * @returns {Promise<Object>} The updated document
 */
export async function pushMultipleWithSlice(Model, id, tags, maxSize) {
  const updated = await Model.findByIdAndUpdate(
    id,
    {
      $push: {
        tags: {
          $each: tags,
          $slice: -maxSize,
        },
      },
    },
    { new: true }
  );
  return updated;
}

/**
 * Update a specific element in the tags array using the positional $ operator.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {string|import('mongoose').Types.ObjectId} id - The document's _id
 * @param {string} oldTag - The tag value to find
 * @param {string} newTag - The new tag value to replace it with
 * @returns {Promise<Object>} The updated document
 */
export async function updateArrayElement(Model, id, oldTag, newTag) {
  const updated = await Model.findOneAndUpdate(
    { _id: id, tags: oldTag },
    { $set: { 'tags.$': newTag } },
    { new: true }
  );
  return updated;
}
