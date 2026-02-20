import mongoose from 'mongoose';

/**
 * Connect to the MingleSphere MongoDB database.
 *
 * Use mongoose.connect() to establish a connection to the database.
 * The connection URI should default to: 'mongodb://localhost:27017/minglesphere_test?replicaSet=rs0'
 *
 * @param {string} [uri] - Optional MongoDB connection URI
 * @returns {Promise<mongoose.Connection>} The mongoose connection object
 */
export async function connectToMingleSphere(uri = 'mongodb://localhost:27017/minglesphere_test?replicaSet=rs0') {
  // TODO: Use mongoose.connect(uri) to connect to MongoDB
  // TODO: Return mongoose.connection
  throw new Error('Not implemented: connectToMingleSphere');
}

/**
 * Get the current connection state of mongoose.
 *
 * mongoose.connection.readyState returns a number:
 *   0 = disconnected
 *   1 = connected
 *   2 = connecting
 *   3 = disconnecting
 *
 * @returns {number} The current readyState value
 */
export function getConnectionState() {
  // TODO: Return mongoose.connection.readyState
  throw new Error('Not implemented: getConnectionState');
}

/**
 * Get the host that mongoose is currently connected to.
 *
 * @returns {string} The host string from the active connection
 */
export function getConnectionHost() {
  // TODO: Return the host from mongoose.connection
  // Hint: Check mongoose.connection.host
  throw new Error('Not implemented: getConnectionHost');
}

/**
 * List all databases available on the MongoDB server.
 *
 * Use the admin command { listDatabases: 1 } to retrieve the list.
 *
 * @returns {Promise<Object>} The result of the listDatabases admin command
 */
export async function listDatabases() {
  // TODO: Use mongoose.connection.db.admin().command({ listDatabases: 1 })
  // TODO: Return the result
  throw new Error('Not implemented: listDatabases');
}

/**
 * Disconnect from the MingleSphere MongoDB database.
 *
 * @returns {Promise<void>}
 */
export async function disconnectFromMingleSphere() {
  // TODO: Use mongoose.disconnect() to close the connection
  throw new Error('Not implemented: disconnectFromMingleSphere');
}
