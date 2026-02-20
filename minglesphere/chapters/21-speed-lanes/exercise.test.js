import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/21-speed-lanes.solution.js'
  : './exercise.js';
const {
  createSingleIndex,
  createCompoundIndex,
  createUniqueIndex,
  createTTLIndex,
  explainQuery,
} = await import(exercisePath);

beforeAll(async () => { await connectToDatabase(); });
afterAll(async () => { await disconnectFromDatabase(); });
beforeEach(async () => {
  await clearAllCollections();
  // Drop all non-default indexes on our test collections
  try {
    await mongoose.connection.db.collection('speedlane_emails').drop();
  } catch (e) { /* collection may not exist */ }
  try {
    await mongoose.connection.db.collection('speedlane_compounds').drop();
  } catch (e) { /* collection may not exist */ }
  try {
    await mongoose.connection.db.collection('speedlane_uniques').drop();
  } catch (e) { /* collection may not exist */ }
  try {
    await mongoose.connection.db.collection('speedlane_ttls').drop();
  } catch (e) { /* collection may not exist */ }
});

describe('Chapter 21: Speed Lanes', () => {
  test('createSingleIndex creates an index on the email field and returns its name', async () => {
    const collection = mongoose.connection.db.collection('speedlane_emails');
    const indexName = await createSingleIndex(collection);

    expect(typeof indexName).toBe('string');
    expect(indexName).toContain('email');

    const indexes = await collection.indexes();
    const emailIndex = indexes.find((idx) => idx.key && idx.key.email === 1);
    expect(emailIndex).toBeDefined();
  });

  test('createCompoundIndex creates a compound index on role and createdAt', async () => {
    const collection = mongoose.connection.db.collection('speedlane_compounds');
    const indexName = await createCompoundIndex(collection);

    expect(typeof indexName).toBe('string');
    expect(indexName).toContain('role');
    expect(indexName).toContain('createdAt');

    const indexes = await collection.indexes();
    const compoundIndex = indexes.find(
      (idx) => idx.key && idx.key.role === 1 && idx.key.createdAt === -1
    );
    expect(compoundIndex).toBeDefined();
  });

  test('createUniqueIndex creates a unique index and rejects duplicate usernames', async () => {
    const collection = mongoose.connection.db.collection('speedlane_uniques');
    const result = await createUniqueIndex(collection);

    expect(result).toBeDefined();
    expect(result.indexName).toContain('username');
    expect(result.duplicateRejected).toBe(true);

    const indexes = await collection.indexes();
    const uniqueIndex = indexes.find(
      (idx) => idx.key && idx.key.username === 1 && idx.unique === true
    );
    expect(uniqueIndex).toBeDefined();
  });

  test('createTTLIndex creates a TTL index on expiresAt with correct expiry time', async () => {
    const collection = mongoose.connection.db.collection('speedlane_ttls');
    const indexName = await createTTLIndex(collection);

    expect(typeof indexName).toBe('string');
    expect(indexName).toContain('expiresAt');

    const indexes = await collection.indexes();
    const ttlIndex = indexes.find(
      (idx) => idx.key && idx.key.expiresAt === 1 && idx.expireAfterSeconds === 3600
    );
    expect(ttlIndex).toBeDefined();
  });

  test('explainQuery returns execution stats after creating an index and querying', async () => {
    const schema = new mongoose.Schema({
      username: String,
      email: String,
      role: String,
      age: Number,
    }, { strict: false });
    const ExplainUser = mongoose.models.ExplainUser || mongoose.model('ExplainUser', schema);

    const stats = await explainQuery(ExplainUser);

    expect(stats).toBeDefined();
    expect(typeof stats.totalDocsExamined).toBe('number');
    expect(typeof stats.executionTimeMillis).toBe('number');
    // With an index on role, we should examine fewer docs than total inserted
    expect(stats.totalDocsExamined).toBeLessThanOrEqual(20);
  });
});
