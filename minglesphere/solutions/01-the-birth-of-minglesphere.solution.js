import mongoose from 'mongoose';

/**
 * Connect to the MingleSphere MongoDB database.
 *
 * @param {string} [uri] - Optional MongoDB connection URI
 * @returns {Promise<mongoose.Connection>} The mongoose connection object
 */
export async function connectToMingleSphere(uri = 'mongodb://localhost:27017/minglesphere_test?replicaSet=rs0') {
  await mongoose.connect(uri);
  return mongoose.connection;
}

/**
 * Get the current connection state of mongoose.
 *
 * @returns {number} The current readyState value
 */
export function getConnectionState() {
  return mongoose.connection.readyState;
}

/**
 * Get the host that mongoose is currently connected to.
 *
 * @returns {string} The host string from the active connection
 */
export function getConnectionHost() {
  return mongoose.connection.host;
}

/**
 * List all databases available on the MongoDB server.
 *
 * @returns {Promise<Object>} The result of the listDatabases admin command
 */
export async function listDatabases() {
  const admin = mongoose.connection.db.admin();
  return admin.command({ listDatabases: 1 });
}

/**
 * Disconnect from the MingleSphere MongoDB database.
 *
 * @returns {Promise<void>}
 */
export async function disconnectFromMingleSphere() {
  await mongoose.disconnect();
}
