/**
 * Find all users in the collection.
 *
 * Use Model.find() with no filter to return every document.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to query
 * @returns {Promise<Object[]>} Array of all documents
 */
export async function findAllUsers(Model) {
  // TODO: Use Model.find() to retrieve all documents
  // TODO: Return the result array
  throw new Error('Not implemented: findAllUsers');
}

/**
 * Find a single user by their username.
 *
 * Use Model.findOne() with a filter object to match the username field.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to query
 * @param {string} username - The username to search for
 * @returns {Promise<Object|null>} The found document, or null
 */
export async function findUserByUsername(Model, username) {
  // TODO: Use Model.findOne({ username }) to find a single document
  // TODO: Return the result
  throw new Error('Not implemented: findUserByUsername');
}

/**
 * Find a user by their _id.
 *
 * Use Model.findById() which is a shorthand for findOne({ _id: id }).
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to query
 * @param {string|ObjectId} id - The document _id to search for
 * @returns {Promise<Object|null>} The found document, or null
 */
export async function findUserById(Model, id) {
  // TODO: Use Model.findById(id)
  // TODO: Return the result
  throw new Error('Not implemented: findUserById');
}

/**
 * Find all active users.
 *
 * Use Model.find() with a filter for isActive: true.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to query
 * @returns {Promise<Object[]>} Array of active user documents
 */
export async function findActiveUsers(Model) {
  // TODO: Use Model.find({ isActive: true })
  // TODO: Return the result array
  throw new Error('Not implemented: findActiveUsers');
}

/**
 * Find all users using lean() for plain JavaScript objects.
 *
 * By default, Mongoose queries return full Mongoose documents with
 * methods like .save(), .populate(), etc. Using .lean() returns
 * plain JavaScript objects instead, which is faster and uses less memory.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to query
 * @returns {Promise<Object[]>} Array of plain JavaScript objects
 */
export async function findUsersLean(Model) {
  // TODO: Use Model.find().lean()
  // TODO: Return the result array (these should be plain objects, not Mongoose docs)
  throw new Error('Not implemented: findUsersLean');
}
