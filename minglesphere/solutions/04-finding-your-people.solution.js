/**
 * Find all users in the collection.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to query
 * @returns {Promise<Object[]>} Array of all documents
 */
export async function findAllUsers(Model) {
  return Model.find();
}

/**
 * Find a single user by their username.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to query
 * @param {string} username - The username to search for
 * @returns {Promise<Object|null>} The found document, or null
 */
export async function findUserByUsername(Model, username) {
  return Model.findOne({ username });
}

/**
 * Find a user by their _id.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to query
 * @param {string|ObjectId} id - The document _id to search for
 * @returns {Promise<Object|null>} The found document, or null
 */
export async function findUserById(Model, id) {
  return Model.findById(id);
}

/**
 * Find all active users.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to query
 * @returns {Promise<Object[]>} Array of active user documents
 */
export async function findActiveUsers(Model) {
  return Model.find({ isActive: true });
}

/**
 * Find all users using lean() for plain JavaScript objects.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model to query
 * @returns {Promise<Object[]>} Array of plain JavaScript objects
 */
export async function findUsersLean(Model) {
  return Model.find().lean();
}
