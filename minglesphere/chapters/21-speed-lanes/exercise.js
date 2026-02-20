import mongoose from 'mongoose';

/**
 * Create a single-field index on the 'email' field.
 *
 * @param {Collection} collection - A raw MongoDB collection (e.g., Model.collection)
 * @returns {Promise<string>} The name of the created index
 */
export async function createSingleIndex(collection) {
  // TODO: Use collection.createIndex() to create an index on { email: 1 }
  // TODO: Return the index name string
  throw new Error('Not implemented');
}

/**
 * Create a compound index on { role: 1, createdAt: -1 }.
 *
 * @param {Collection} collection - A raw MongoDB collection
 * @returns {Promise<string>} The name of the created index
 */
export async function createCompoundIndex(collection) {
  // TODO: Use collection.createIndex() to create a compound index
  // TODO: Return the index name string
  throw new Error('Not implemented');
}

/**
 * Create a unique index on 'username'. Verify uniqueness by inserting
 * a duplicate document and confirming it is rejected.
 *
 * @param {Collection} collection - A raw MongoDB collection
 * @returns {Promise<{ indexName: string, duplicateRejected: boolean }>}
 */
export async function createUniqueIndex(collection) {
  // TODO: Create a unique index on { username: 1 }
  // TODO: Insert a document with a username
  // TODO: Try to insert another document with the same username
  // TODO: Catch the duplicate key error
  // TODO: Return { indexName, duplicateRejected: true }
  throw new Error('Not implemented');
}

/**
 * Create a TTL index on 'expiresAt' with expireAfterSeconds: 3600.
 *
 * @param {Collection} collection - A raw MongoDB collection
 * @returns {Promise<string>} The name of the created index
 */
export async function createTTLIndex(collection) {
  // TODO: Use collection.createIndex() to create a TTL index on { expiresAt: 1 }
  // TODO: Pass { expireAfterSeconds: 3600 } as options
  // TODO: Return the index name string
  throw new Error('Not implemented');
}

/**
 * Seed data into the collection, create an index, and run an explained query.
 * Return execution stats from the explain output.
 *
 * @param {mongoose.Model} Model - A Mongoose model to work with
 * @returns {Promise<{ totalDocsExamined: number, executionTimeMillis: number }>}
 */
export async function explainQuery(Model) {
  // TODO: Seed at least 10 documents into the model's collection
  // TODO: Create an index on a field you will query (e.g., 'role')
  // TODO: Run Model.find({ role: 'admin' }).explain('executionStats')
  // TODO: Extract and return { totalDocsExamined, executionTimeMillis } from the result
  throw new Error('Not implemented');
}
