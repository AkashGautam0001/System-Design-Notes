import mongoose from 'mongoose';

/**
 * Create a User schema for MingleSphere.
 *
 * The schema should have the following fields:
 *   - username: String, required
 *   - email: String, required
 *   - age: Number
 *   - joinedAt: Date, default: Date.now
 *   - isActive: Boolean, default: true
 *
 * @returns {mongoose.Schema} The user schema
 */
export function createUserSchema() {
  // TODO: Create a new mongoose.Schema with the fields described above
  // TODO: Return the schema
  throw new Error('Not implemented: createUserSchema');
}

/**
 * Create a Mongoose model from a schema.
 *
 * The model should be named 'ChapterTwoUser'.
 *
 * @param {mongoose.Schema} schema - The schema to create the model from
 * @returns {mongoose.Model} The created model
 */
export function createUserModel(schema) {
  // TODO: Use mongoose.model() to create a model named 'ChapterTwoUser'
  // TODO: Return the model
  throw new Error('Not implemented: createUserModel');
}

/**
 * Get the name of a Mongoose model.
 *
 * @param {mongoose.Model} model - The model to inspect
 * @returns {string} The model's name
 */
export function getModelName(model) {
  // TODO: Return the model's name (model.modelName)
  throw new Error('Not implemented: getModelName');
}

/**
 * Get the collection name a model uses in MongoDB.
 *
 * Mongoose automatically pluralizes and lowercases the model name to
 * determine the collection name.
 *
 * @param {mongoose.Model} model - The model to inspect
 * @returns {string} The collection name
 */
export function getCollectionName(model) {
  // TODO: Return the model's collection name (model.collection.name)
  throw new Error('Not implemented: getCollectionName');
}

/**
 * Get the field names (paths) defined in a schema.
 *
 * Should exclude internal Mongoose fields: _id and __v
 *
 * @param {mongoose.Schema} schema - The schema to inspect
 * @returns {string[]} Array of field names
 */
export function getSchemaFields(schema) {
  // TODO: Use schema.paths to get all paths
  // TODO: Filter out '_id' and '__v'
  // TODO: Return the array of field names
  throw new Error('Not implemented: getSchemaFields');
}
