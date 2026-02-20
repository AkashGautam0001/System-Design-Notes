import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/05-the-type-vault.solution.js'
  : './exercise.js';
const { createRichProfileSchema, createDocWithArray, createDocWithMixed, createDocWithMap, useDecimal128 } = await import(exercisePath);

describe('Chapter 5: The Type Vault', () => {
  let ProfileModel;

  beforeAll(async () => {
    await connectToDatabase();

    const schema = createRichProfileSchema();
    ProfileModel = mongoose.models['ChapterFiveProfile'] || mongoose.model('ChapterFiveProfile', schema);
  });

  afterAll(async () => {
    delete mongoose.connection.models['ChapterFiveProfile'];
    delete mongoose.models['ChapterFiveProfile'];
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      await mongoose.connection.db.collection(col.name).deleteMany({});
    }
  });

  test('createRichProfileSchema should return a schema with all advanced types', () => {
    const schema = createRichProfileSchema();
    expect(schema).toBeInstanceOf(mongoose.Schema);

    const paths = schema.paths;
    expect(paths.tags).toBeDefined();
    expect(paths.metadata).toBeDefined();
    expect(paths.socialLinks).toBeDefined();
    expect(paths.profilePicture).toBeDefined();
    expect(paths.accountBalance).toBeDefined();
  });

  test('createDocWithArray should create a document with tags array', async () => {
    const doc = await createDocWithArray(ProfileModel);
    expect(doc).toBeDefined();
    expect(Array.isArray(doc.tags)).toBe(true);
    expect(doc.tags).toEqual(['tech', 'music', 'travel']);
    expect(doc.tags.length).toBe(3);
  });

  test('createDocWithMixed should create a document with nested metadata', async () => {
    const doc = await createDocWithMixed(ProfileModel);
    expect(doc).toBeDefined();
    expect(doc.metadata).toBeDefined();
    expect(doc.metadata.theme).toBe('dark');
    expect(doc.metadata.language).toBe('en');
    expect(doc.metadata.notifications).toBeDefined();
    expect(doc.metadata.notifications.email).toBe(true);
  });

  test('createDocWithMap should create a document with socialLinks map', async () => {
    const doc = await createDocWithMap(ProfileModel);
    expect(doc).toBeDefined();
    expect(doc.socialLinks).toBeDefined();
    // Map values can be accessed with .get()
    expect(doc.socialLinks.get('twitter')).toBe('@user');
    expect(doc.socialLinks.get('github')).toBe('user123');
  });

  test('useDecimal128 should create a document with Decimal128 accountBalance', async () => {
    const doc = await useDecimal128(ProfileModel);
    expect(doc).toBeDefined();
    expect(doc.accountBalance).toBeDefined();
    expect(doc.accountBalance.toString()).toBe('99.99');
  });
});
