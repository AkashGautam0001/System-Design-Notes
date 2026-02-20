import mongoose from 'mongoose';

/**
 * Create a User schema with an instance method `getPublicProfile()` that
 * returns { username, email } (omitting password). Create a user document,
 * call the method, and return the result.
 *
 * @returns {Promise<Object>} The public profile object { username, email }
 */
export async function createModelWithInstanceMethod() {
  // TODO: Create a schema with username, email, password fields
  // TODO: Add an instance method getPublicProfile() that returns { username, email }
  // TODO: Create a model, save a user, call getPublicProfile(), return result
  throw new Error('Not implemented');
}

/**
 * Create a schema with a static method `findByEmail(email)` that does
 * `this.findOne({ email })`. Seed a user, use the static to find them,
 * and return the result.
 *
 * @returns {Promise<Object>} The found user document
 */
export async function createModelWithStaticMethod() {
  // TODO: Create a schema with username, email fields
  // TODO: Add a static method findByEmail(email) using this.findOne({ email })
  // TODO: Create a model, save a user, find them by email, return result
  throw new Error('Not implemented');
}

/**
 * Create a schema with a query helper `byRole(role)` that adds
 * `this.where({ role })`. Use it: Model.find().byRole('admin').
 * Return the results array.
 *
 * @returns {Promise<Array>} Array of matching user documents
 */
export async function createModelWithQueryHelper() {
  // TODO: Create a schema with username, email, role fields
  // TODO: Add a query helper byRole(role) using this.where({ role })
  // TODO: Create a model, seed users with different roles, query with byRole('admin')
  // TODO: Return the results
  throw new Error('Not implemented');
}

/**
 * Create a schema with two query helpers: `active()` (isActive: true) and
 * `byRole(role)`. Chain them: Model.find().active().byRole('admin').
 * Return the results array.
 *
 * @returns {Promise<Array>} Array of active admin user documents
 */
export async function chainQueryHelpers() {
  // TODO: Create a schema with username, role, isActive fields
  // TODO: Add query helpers active() and byRole(role)
  // TODO: Create a model, seed users, chain both helpers, return results
  throw new Error('Not implemented');
}

/**
 * Create a schema with an instance method `deactivate()` that sets
 * isActive=false and calls this.save(). Call it, verify the doc is
 * updated in DB, and return the updated document.
 *
 * @returns {Promise<Object>} The updated (deactivated) user document
 */
export async function instanceMethodWithSave() {
  // TODO: Create a schema with username, isActive (default: true) fields
  // TODO: Add an instance method deactivate() that sets isActive=false and saves
  // TODO: Create a model, save a user, call deactivate(), return the updated doc
  throw new Error('Not implemented');
}
