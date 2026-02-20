/**
 * Create a user document using `new Model()` and `.save()`.
 *
 * This is the classic two-step approach:
 *   1. Instantiate a new document with `new Model(userData)`
 *   2. Persist it to the database with `.save()`
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to use
 * @param {Object} userData - The data for the new user
 * @returns {Promise<Object>} The saved document
 */
export async function createUserWithSave(Model, userData) {
  // TODO: Create a new document with `new Model(userData)`
  // TODO: Call `.save()` on the document
  // TODO: Return the saved document
  throw new Error('Not implemented: createUserWithSave');
}

/**
 * Create a user document using `Model.create()`.
 *
 * Model.create() is a shorthand that combines instantiation and save in one step.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to use
 * @param {Object} userData - The data for the new user
 * @returns {Promise<Object>} The created document
 */
export async function createUserWithCreate(Model, userData) {
  // TODO: Use Model.create(userData)
  // TODO: Return the created document
  throw new Error('Not implemented: createUserWithCreate');
}

/**
 * Create multiple user documents at once using `Model.insertMany()`.
 *
 * insertMany() is optimized for bulk inserts -- it sends a single
 * command to MongoDB rather than one per document.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to use
 * @param {Object[]} usersArray - Array of user data objects
 * @returns {Promise<Object[]>} Array of created documents
 */
export async function createMultipleUsers(Model, usersArray) {
  // TODO: Use Model.insertMany(usersArray)
  // TODO: Return the array of created documents
  throw new Error('Not implemented: createMultipleUsers');
}

/**
 * Verify that a document's _id is a valid MongoDB ObjectId.
 *
 * Every document in MongoDB gets an _id field automatically.
 * By default, it's a 12-byte ObjectId.
 *
 * @param {Object} doc - A Mongoose document
 * @returns {boolean} True if doc._id is a valid ObjectId
 */
export function verifyObjectId(doc) {
  // TODO: Use mongoose.Types.ObjectId.isValid(doc._id) or similar
  // TODO: Return true/false
  throw new Error('Not implemented: verifyObjectId');
}

/**
 * Get the version key (__v) of a document.
 *
 * Mongoose adds __v to every document to track the number of times
 * the document has been modified using `.save()`.
 *
 * @param {Object} doc - A Mongoose document
 * @returns {number} The __v value
 */
export function getVersionKey(doc) {
  // TODO: Return doc.__v
  throw new Error('Not implemented: getVersionKey');
}
