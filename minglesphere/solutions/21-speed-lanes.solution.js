import mongoose from 'mongoose';

/**
 * Create a single-field index on the 'email' field.
 */
export async function createSingleIndex(collection) {
  const indexName = await collection.createIndex({ email: 1 });
  return indexName;
}

/**
 * Create a compound index on { role: 1, createdAt: -1 }.
 */
export async function createCompoundIndex(collection) {
  const indexName = await collection.createIndex({ role: 1, createdAt: -1 });
  return indexName;
}

/**
 * Create a unique index on 'username' and verify duplicate rejection.
 */
export async function createUniqueIndex(collection) {
  const indexName = await collection.createIndex({ username: 1 }, { unique: true });

  await collection.insertOne({ username: 'alice', email: 'alice@example.com' });

  let duplicateRejected = false;
  try {
    await collection.insertOne({ username: 'alice', email: 'alice2@example.com' });
  } catch (error) {
    if (error.code === 11000) {
      duplicateRejected = true;
    }
  }

  return { indexName, duplicateRejected };
}

/**
 * Create a TTL index on 'expiresAt' with expireAfterSeconds: 3600.
 */
export async function createTTLIndex(collection) {
  const indexName = await collection.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 3600 }
  );
  return indexName;
}

/**
 * Seed data, create an index, and run an explained query.
 */
export async function explainQuery(Model) {
  // Seed data
  const users = [];
  for (let i = 0; i < 20; i++) {
    users.push({
      username: `user${i}`,
      email: `user${i}@example.com`,
      role: i < 5 ? 'admin' : 'user',
      age: 20 + i,
    });
  }
  await Model.insertMany(users);

  // Create an index on 'role'
  await Model.collection.createIndex({ role: 1 });

  // Run explain
  const explainResult = await Model.find({ role: 'admin' }).explain('executionStats');

  const stats = explainResult.executionStats;
  return {
    totalDocsExamined: stats.totalDocsExamined,
    executionTimeMillis: stats.executionTimeMillis,
  };
}
