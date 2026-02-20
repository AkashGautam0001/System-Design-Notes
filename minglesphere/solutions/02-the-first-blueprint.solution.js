import mongoose from 'mongoose';

/**
 * Create a User schema for MingleSphere.
 *
 * @returns {mongoose.Schema} The user schema
 */
export function createUserSchema() {
  return new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    age: { type: Number },
    joinedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  });
}

/**
 * Create a Mongoose model from a schema.
 *
 * @param {mongoose.Schema} schema - The schema to create the model from
 * @returns {mongoose.Model} The created model
 */
export function createUserModel(schema) {
  return mongoose.model('ChapterTwoUser', schema);
}

/**
 * Get the name of a Mongoose model.
 *
 * @param {mongoose.Model} model - The model to inspect
 * @returns {string} The model's name
 */
export function getModelName(model) {
  return model.modelName;
}

/**
 * Get the collection name a model uses in MongoDB.
 *
 * @param {mongoose.Model} model - The model to inspect
 * @returns {string} The collection name
 */
export function getCollectionName(model) {
  return model.collection.name;
}

/**
 * Get the field names (paths) defined in a schema.
 *
 * @param {mongoose.Schema} schema - The schema to inspect
 * @returns {string[]} Array of field names
 */
export function getSchemaFields(schema) {
  return Object.keys(schema.paths).filter(
    (path) => path !== '_id' && path !== '__v'
  );
}
