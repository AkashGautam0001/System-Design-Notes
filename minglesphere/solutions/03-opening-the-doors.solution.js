import mongoose from 'mongoose';

/**
 * Create a user document using `new Model()` and `.save()`.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to use
 * @param {Object} userData - The data for the new user
 * @returns {Promise<Object>} The saved document
 */
export async function createUserWithSave(Model, userData) {
  const doc = new Model(userData);
  await doc.save();
  return doc;
}

/**
 * Create a user document using `Model.create()`.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to use
 * @param {Object} userData - The data for the new user
 * @returns {Promise<Object>} The created document
 */
export async function createUserWithCreate(Model, userData) {
  const doc = await Model.create(userData);
  return doc;
}

/**
 * Create multiple user documents at once using `Model.insertMany()`.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to use
 * @param {Object[]} usersArray - Array of user data objects
 * @returns {Promise<Object[]>} Array of created documents
 */
export async function createMultipleUsers(Model, usersArray) {
  const docs = await Model.insertMany(usersArray);
  return docs;
}

/**
 * Verify that a document's _id is a valid MongoDB ObjectId.
 *
 * @param {Object} doc - A Mongoose document
 * @returns {boolean} True if doc._id is a valid ObjectId
 */
export function verifyObjectId(doc) {
  return mongoose.Types.ObjectId.isValid(doc._id);
}

/**
 * Get the version key (__v) of a document.
 *
 * @param {Object} doc - A Mongoose document
 * @returns {number} The __v value
 */
export function getVersionKey(doc) {
  return doc.__v;
}
