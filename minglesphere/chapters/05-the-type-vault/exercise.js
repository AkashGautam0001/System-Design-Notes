import mongoose from 'mongoose';

/**
 * Create a rich profile schema that demonstrates advanced Mongoose schema types.
 *
 * The schema should have the following fields:
 *   - tags: Array of String (e.g., ['tech', 'music'])
 *   - metadata: Mixed (arbitrary nested objects)
 *   - socialLinks: Map of String (key-value pairs where values are strings)
 *   - profilePicture: Buffer (binary data)
 *   - accountBalance: Decimal128 (high-precision decimal number)
 *
 * @returns {mongoose.Schema} The rich profile schema
 */
export function createRichProfileSchema() {
  // TODO: Create a new mongoose.Schema with the fields described above
  // TODO: Use [String] for an array of strings
  // TODO: Use mongoose.Schema.Types.Mixed for the metadata field
  // TODO: Use { type: Map, of: String } for socialLinks
  // TODO: Use Buffer for profilePicture
  // TODO: Use mongoose.Schema.Types.Decimal128 for accountBalance
  // TODO: Return the schema
  throw new Error('Not implemented: createRichProfileSchema');
}

/**
 * Create a document with an array field.
 *
 * Create and save a document with tags: ['tech', 'music', 'travel']
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to use
 * @returns {Promise<Object>} The created document
 */
export async function createDocWithArray(Model) {
  // TODO: Use Model.create() with tags: ['tech', 'music', 'travel']
  // TODO: Return the created document
  throw new Error('Not implemented: createDocWithArray');
}

/**
 * Create a document with a Mixed-type field.
 *
 * Create and save a document with metadata:
 *   { theme: 'dark', language: 'en', notifications: { email: true } }
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to use
 * @returns {Promise<Object>} The created document
 */
export async function createDocWithMixed(Model) {
  // TODO: Use Model.create() with the metadata object described above
  // TODO: Return the created document
  throw new Error('Not implemented: createDocWithMixed');
}

/**
 * Create a document with a Map field.
 *
 * Create and save a document with socialLinks:
 *   twitter -> '@user'
 *   github  -> 'user123'
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to use
 * @returns {Promise<Object>} The created document
 */
export async function createDocWithMap(Model) {
  // TODO: Create a document with socialLinks as a Map or plain object
  // TODO: Map entries: twitter -> '@user', github -> 'user123'
  // TODO: Return the created document
  throw new Error('Not implemented: createDocWithMap');
}

/**
 * Create a document with a Decimal128 field.
 *
 * Create and save a document with accountBalance set to Decimal128 value '99.99'.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to use
 * @returns {Promise<Object>} The created document
 */
export async function useDecimal128(Model) {
  // TODO: Use mongoose.Types.Decimal128.fromString('99.99') for the value
  // TODO: Create a document with accountBalance set to that value
  // TODO: Return the created document
  throw new Error('Not implemented: useDecimal128');
}
