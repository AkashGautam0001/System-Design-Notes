import mongoose from 'mongoose';

/**
 * Create a schema with a pre('save') hook that uppercases the username.
 * Create and save a user with a lowercase username. Return the saved doc
 * (username should be uppercase).
 *
 * @returns {Promise<Object>} The saved user document with uppercase username
 */
export async function createPreSaveHook() {
  // TODO: Create a schema with a username field
  // TODO: Add a pre('save') hook that uppercases this.username
  // TODO: Create a model, save a user with lowercase username, return saved doc
  throw new Error('Not implemented');
}

/**
 * Create a schema with a post('save') hook that adds a `savedAt` property
 * to the returned doc (not persisted in DB, just on the doc object).
 * Save a user and verify savedAt exists on the doc.
 *
 * @returns {Promise<Object>} The saved user document with savedAt property
 */
export async function createPostSaveHook() {
  // TODO: Create a schema with a username field
  // TODO: Add a post('save') hook that sets doc.savedAt = new Date()
  // TODO: Create a model, save a user, return the doc (should have savedAt)
  throw new Error('Not implemented');
}

/**
 * Create a schema with a pre('validate') hook that trims whitespace from email.
 * Save a user with ' user@test.com '. Return the saved doc (email should be trimmed).
 *
 * @returns {Promise<Object>} The saved user document with trimmed email
 */
export async function createPreValidateHook() {
  // TODO: Create a schema with email field
  // TODO: Add a pre('validate') hook that trims this.email
  // TODO: Create a model, save a user with padded email, return saved doc
  throw new Error('Not implemented');
}

/**
 * Create a schema with a pre('find') hook that automatically adds
 * { isDeleted: { $ne: true } } to every query. Create active and deleted
 * users. Find all. Return results (should only contain active users).
 *
 * @returns {Promise<Array>} Array of non-deleted user documents
 */
export async function createPreFindHook() {
  // TODO: Create a schema with username, isDeleted fields
  // TODO: Add a pre('find') hook that adds isDeleted: { $ne: true } to the query
  // TODO: Create a model, seed active and deleted users, find all, return results
  throw new Error('Not implemented');
}

/**
 * Create a schema with an async pre('save') hook that simulates hashing
 * a password (prefix with 'hashed_'). Save a user with a plain password.
 * Return the saved doc (password should start with 'hashed_').
 *
 * @returns {Promise<Object>} The saved user document with hashed password
 */
export async function createAsyncHook() {
  // TODO: Create a schema with username, password fields
  // TODO: Add an async pre('save') hook that prefixes password with 'hashed_'
  // TODO: Create a model, save a user with plain password, return saved doc
  throw new Error('Not implemented');
}
