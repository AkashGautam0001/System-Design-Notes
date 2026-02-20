/**
 * Chapter 13: The Bulk Express - SOLUTION
 *
 * Nightly maintenance tasks at scale require bulk operations.
 */

/**
 * Insert multiple users using bulkWrite with insertOne operations.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {Array<Object>} users - Array of user objects to insert
 * @returns {Promise<Object>} The bulkWrite result
 */
export async function bulkInsertUsers(Model, users) {
  const ops = users.map(user => ({
    insertOne: { document: user },
  }));
  const result = await Model.bulkWrite(ops);
  return result;
}

/**
 * Execute a bulkWrite with mixed insertOne, updateOne, and deleteOne operations.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {Array<Object>} operations - Array of bulkWrite operations
 * @returns {Promise<Object>} The bulkWrite result
 */
export async function bulkMixedOperations(Model, operations) {
  const result = await Model.bulkWrite(operations);
  return result;
}

/**
 * Execute a bulkWrite in ordered mode (default).
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {Array<Object>} ops - Array of bulkWrite operations
 * @returns {Promise<Object>} The bulkWrite result
 */
export async function orderedBulkWrite(Model, ops) {
  const result = await Model.bulkWrite(ops, { ordered: true });
  return result;
}

/**
 * Execute a bulkWrite in unordered mode.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @param {Array<Object>} ops - Array of bulkWrite operations
 * @returns {Promise<Object>} The bulkWrite result
 */
export async function unorderedBulkWrite(Model, ops) {
  const result = await Model.bulkWrite(ops, { ordered: false });
  return result;
}

/**
 * Perform a bulk write that inserts, updates, and deletes, then return a summary.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to operate on
 * @returns {Promise<Object>} An object with { insertedCount, modifiedCount, deletedCount, totalOperations }
 */
export async function interpretBulkResult(Model) {
  const ops = [
    { insertOne: { document: { name: 'Alice', email: 'alice@minglesphere.io', age: 25 } } },
    { insertOne: { document: { name: 'Bob', email: 'bob@minglesphere.io', age: 30 } } },
    { insertOne: { document: { name: 'Charlie', email: 'charlie@minglesphere.io', age: 35 } } },
    { updateOne: { filter: { name: 'Alice' }, update: { $set: { age: 30 } } } },
    { deleteOne: { filter: { name: 'Charlie' } } },
  ];

  const result = await Model.bulkWrite(ops);

  return {
    insertedCount: result.insertedCount,
    modifiedCount: result.modifiedCount,
    deletedCount: result.deletedCount,
    totalOperations: result.insertedCount + result.modifiedCount + result.deletedCount,
  };
}
