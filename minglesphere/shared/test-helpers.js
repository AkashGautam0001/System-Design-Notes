import mongoose from 'mongoose';

/**
 * Clear all documents from all collections in the current database.
 * Used in beforeEach() for test isolation.
 */
export async function clearAllCollections() {
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    await mongoose.connection.db.collection(col.name).deleteMany({});
  }
}

/**
 * Seed a collection with an array of documents.
 * @param {string} collectionName - Name of the collection
 * @param {Array} documents - Array of documents to insert
 * @returns {Object} The insertMany result
 */
export async function seedCollection(collectionName, documents) {
  const collection = mongoose.connection.db.collection(collectionName);
  if (documents.length === 0) return { insertedCount: 0 };
  return collection.insertMany(documents);
}

/**
 * Get the count of documents in a collection.
 * @param {string} collectionName
 * @returns {number}
 */
export async function getDocCount(collectionName) {
  return mongoose.connection.db.collection(collectionName).countDocuments();
}
