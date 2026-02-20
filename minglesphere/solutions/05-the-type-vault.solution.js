import mongoose from 'mongoose';

/**
 * Create a rich profile schema that demonstrates advanced Mongoose schema types.
 *
 * @returns {mongoose.Schema} The rich profile schema
 */
export function createRichProfileSchema() {
  return new mongoose.Schema({
    tags: [String],
    metadata: mongoose.Schema.Types.Mixed,
    socialLinks: { type: Map, of: String },
    profilePicture: Buffer,
    accountBalance: mongoose.Schema.Types.Decimal128,
  });
}

/**
 * Create a document with an array field.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to use
 * @returns {Promise<Object>} The created document
 */
export async function createDocWithArray(Model) {
  return Model.create({ tags: ['tech', 'music', 'travel'] });
}

/**
 * Create a document with a Mixed-type field.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to use
 * @returns {Promise<Object>} The created document
 */
export async function createDocWithMixed(Model) {
  return Model.create({
    metadata: {
      theme: 'dark',
      language: 'en',
      notifications: { email: true },
    },
  });
}

/**
 * Create a document with a Map field.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to use
 * @returns {Promise<Object>} The created document
 */
export async function createDocWithMap(Model) {
  return Model.create({
    socialLinks: {
      twitter: '@user',
      github: 'user123',
    },
  });
}

/**
 * Create a document with a Decimal128 field.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to use
 * @returns {Promise<Object>} The created document
 */
export async function useDecimal128(Model) {
  return Model.create({
    accountBalance: mongoose.Types.Decimal128.fromString('99.99'),
  });
}
