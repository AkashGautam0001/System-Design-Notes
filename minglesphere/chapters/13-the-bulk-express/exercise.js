/**
 * Chapter 13: The Bulk Express
 *
 * Nightly maintenance tasks at scale require bulk operations.
 * Learn bulkWrite with mixed operations, ordered vs unordered, and result interpretation.
 */

/**
 * Insert multiple users using bulkWrite with insertOne operations.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {Array<Object>} users - Array of user objects to insert
 * @returns {Promise<Object>} The bulkWrite result
 */
export async function bulkInsertUsers(Model, users) {
  // TODO: Build an array of { insertOne: { document: user } } operations
  // TODO: Pass the array to Model.bulkWrite()
  // TODO: Return the bulkWrite result
  throw new Error('Not implemented: bulkInsertUsers');
}

/**
 * Execute a bulkWrite with mixed insertOne, updateOne, and deleteOne operations.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {Array<Object>} operations - Array of bulkWrite operations
 * @returns {Promise<Object>} The bulkWrite result
 */
export async function bulkMixedOperations(Model, operations) {
  // TODO: Pass the operations array directly to Model.bulkWrite()
  // TODO: Return the result
  throw new Error('Not implemented: bulkMixedOperations');
}

/**
 * Execute a bulkWrite in ordered mode (default).
 * Operations execute sequentially; the batch stops on the first error.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {Array<Object>} ops - Array of bulkWrite operations
 * @returns {Promise<Object>} The bulkWrite result
 */
export async function orderedBulkWrite(Model, ops) {
  // TODO: Use Model.bulkWrite(ops, { ordered: true })
  // TODO: Return the result
  throw new Error('Not implemented: orderedBulkWrite');
}

/**
 * Execute a bulkWrite in unordered mode.
 * Operations may execute in parallel; all operations are attempted even if some fail.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {Array<Object>} ops - Array of bulkWrite operations
 * @returns {Promise<Object>} The bulkWrite result
 */
export async function unorderedBulkWrite(Model, ops) {
  // TODO: Use Model.bulkWrite(ops, { ordered: false })
  // TODO: Return the result
  throw new Error('Not implemented: unorderedBulkWrite');
}

/**
 * Perform a bulk write that inserts, updates, and deletes, then return
 * a summary object interpreting the result.
 *
 * Steps:
 * 1. Insert three users: Alice, Bob, Charlie
 * 2. Update Alice's age to 30
 * 3. Delete Charlie
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @returns {Promise<Object>} An object with { insertedCount, modifiedCount, deletedCount, totalOperations }
 */
export async function interpretBulkResult(Model) {
  // TODO: Build a bulkWrite with 5 operations: 3 insertOne, 1 updateOne, 1 deleteOne
  // TODO: Execute Model.bulkWrite(ops)
  // TODO: Return { insertedCount, modifiedCount, deletedCount, totalOperations }
  //       where totalOperations = insertedCount + modifiedCount + deletedCount
  throw new Error('Not implemented: interpretBulkResult');
}
