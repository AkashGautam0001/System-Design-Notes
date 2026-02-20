import mongoose from 'mongoose';

/**
 * Connect to MongoDB with custom pool options.
 * Return the connection options that were set.
 */
export async function configureConnectionPool() {
  const uri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/minglesphere_test?replicaSet=rs0';

  const conn = mongoose.createConnection(uri, {
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
  });

  await conn.asPromise();

  const options = {
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
  };

  await conn.close();

  return options;
}

/**
 * Seed 100 users. Query with .lean() and without.
 * Return { leanResult, normalResult }.
 */
export async function leanQueryPerformance(Model) {
  // Seed 100 users
  const users = [];
  for (let i = 0; i < 100; i++) {
    users.push({
      name: `User${i}`,
      email: `user${i}@example.com`,
      role: i % 5 === 0 ? 'admin' : 'user',
    });
  }
  await Model.insertMany(users);

  // Query with lean (returns plain JS objects)
  const leanResult = await Model.find().lean();

  // Query without lean (returns Mongoose documents)
  const normalResult = await Model.find();

  return { leanResult, normalResult };
}

/**
 * Seed users, create an index on email, run explain('executionStats').
 * Return the explain output.
 */
export async function analyzeQueryWithExplain(Model) {
  // Seed users
  const users = [];
  for (let i = 0; i < 100; i++) {
    users.push({
      name: `User${i}`,
      email: `user${i}@example.com`,
      role: 'user',
    });
  }
  await Model.insertMany(users);

  // Create an index on email
  await Model.collection.createIndex({ email: 1 });

  // Run explain
  const explainOutput = await Model.find({ email: 'user50@example.com' }).explain('executionStats');

  return explainOutput;
}

/**
 * Demonstrate proper error handling: try connecting to an invalid URI,
 * catch the error, return a standardized error object.
 */
export async function handleErrors() {
  try {
    const conn = mongoose.createConnection('mongodb://invalid-host-that-does-not-exist:27017/fake_db', {
      serverSelectionTimeoutMS: 1000,
      connectTimeoutMS: 1000,
    });
    await conn.asPromise();
    await conn.close();
    return { type: 'NoError', message: 'Connection succeeded unexpectedly' };
  } catch (error) {
    return { type: 'ConnectionError', message: error.message };
  }
}

/**
 * Create a new mongoose connection, perform an operation,
 * then cleanly close the connection.
 */
export async function gracefulShutdown() {
  const uri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/minglesphere_test?replicaSet=rs0';

  const conn = mongoose.createConnection(uri);
  await conn.asPromise();
  const connected = true;

  // Perform a simple operation
  const collections = await conn.db.listCollections().toArray();
  const operationDone = true;

  // Clean shutdown
  await conn.close();
  const disconnected = true;

  return { connected, operationDone, disconnected };
}
