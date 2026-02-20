import mongoose from 'mongoose';

/**
 * Create a base Post model, then create TextPost (with wordCount field)
 * and ImagePost (with imageUrl, dimensions fields) discriminators.
 * Create one of each. Return both docs with their __t values.
 *
 * @returns {Promise<Object>} { textPost, imagePost } - both saved documents
 */
export async function createDiscriminators() {
  // TODO: Create a base Post schema with title, content, createdAt fields
  // TODO: Create a Post model
  // TODO: Create TextPost discriminator with wordCount field
  // TODO: Create ImagePost discriminator with imageUrl and dimensions fields
  // TODO: Create one of each, return { textPost, imagePost }
  throw new Error('Not implemented');
}

/**
 * Create TextPost and ImagePost via discriminators, then query the base
 * Post model. Should return all posts. Return the array.
 *
 * @param {mongoose.Model} PostModel - The base Post model
 * @returns {Promise<Array>} Array of all post documents
 */
export async function queryBaseModel(PostModel) {
  // TODO: Query the base Post model with find()
  // TODO: Return the results (should include all post types)
  throw new Error('Not implemented');
}

/**
 * Query the TextPost discriminator model. Should only return TextPost docs.
 * Return the array.
 *
 * @param {mongoose.Model} TextPostModel - The TextPost discriminator model
 * @returns {Promise<Array>} Array of TextPost documents only
 */
export async function queryDiscriminatorModel(TextPostModel) {
  // TODO: Query the TextPost model with find()
  // TODO: Return the results (should only include TextPost documents)
  throw new Error('Not implemented');
}

/**
 * Create a `timestamps` plugin that adds createdAt and updatedAt to any schema.
 * Apply it to a schema, create a doc, verify timestamps exist. Return the doc.
 *
 * @returns {Promise<Object>} The saved document with createdAt and updatedAt
 */
export async function createPlugin() {
  // TODO: Define a timestamps plugin function that adds createdAt and updatedAt fields
  // TODO: Add a pre('save') hook in the plugin to set these fields
  // TODO: Create a schema, apply the plugin, create a model, save a doc, return it
  throw new Error('Not implemented');
}

/**
 * Import and apply the softDelete plugin from '../../models/plugins/softDelete.js'.
 * Create a doc, call softDelete(), verify isDeleted is true, then call restore(),
 * verify isDeleted is false. Return the final doc.
 *
 * @returns {Promise<Object>} The restored document with isDeleted === false
 */
export async function applySoftDeletePlugin() {
  // TODO: Import the softDelete plugin
  // TODO: Create a schema, apply the plugin
  // TODO: Create a model, save a doc
  // TODO: Call softDelete(), verify isDeleted is true
  // TODO: Call restore(), verify isDeleted is false
  // TODO: Return the final doc
  throw new Error('Not implemented');
}
