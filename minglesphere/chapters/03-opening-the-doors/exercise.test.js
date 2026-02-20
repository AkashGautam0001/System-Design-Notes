import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/03-opening-the-doors.solution.js'
  : './exercise.js';
const { createUserWithSave, createUserWithCreate, createMultipleUsers, verifyObjectId, getVersionKey } = await import(exercisePath);

describe('Chapter 3: Opening the Doors', () => {
  let UserModel;

  beforeAll(async () => {
    await connectToDatabase();

    const schema = new mongoose.Schema({
      username: { type: String, required: true },
      email: { type: String, required: true },
      age: Number,
      joinedAt: { type: Date, default: Date.now },
      isActive: { type: Boolean, default: true },
    });

    UserModel = mongoose.models['ChapterThreeUser'] || mongoose.model('ChapterThreeUser', schema);
  });

  afterAll(async () => {
    delete mongoose.connection.models['ChapterThreeUser'];
    delete mongoose.models['ChapterThreeUser'];
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      await mongoose.connection.db.collection(col.name).deleteMany({});
    }
  });

  test('createUserWithSave should create and save a document using new Model + save', async () => {
    const doc = await createUserWithSave(UserModel, {
      username: 'alice',
      email: 'alice@minglesphere.com',
      age: 28,
    });
    expect(doc).toBeDefined();
    expect(doc._id).toBeDefined();
    expect(doc.username).toBe('alice');
    expect(doc.email).toBe('alice@minglesphere.com');

    // Verify it was actually persisted
    const found = await UserModel.findById(doc._id);
    expect(found).not.toBeNull();
    expect(found.username).toBe('alice');
  });

  test('createUserWithCreate should create a document using Model.create', async () => {
    const doc = await createUserWithCreate(UserModel, {
      username: 'bob',
      email: 'bob@minglesphere.com',
      age: 32,
    });
    expect(doc).toBeDefined();
    expect(doc._id).toBeDefined();
    expect(doc.username).toBe('bob');

    // Verify persisted
    const found = await UserModel.findById(doc._id);
    expect(found).not.toBeNull();
  });

  test('createMultipleUsers should insert multiple documents at once', async () => {
    const users = [
      { username: 'charlie', email: 'charlie@minglesphere.com', age: 25 },
      { username: 'diana', email: 'diana@minglesphere.com', age: 30 },
      { username: 'eve', email: 'eve@minglesphere.com', age: 22 },
    ];
    const docs = await createMultipleUsers(UserModel, users);
    expect(Array.isArray(docs)).toBe(true);
    expect(docs.length).toBe(3);
    expect(docs[0].username).toBe('charlie');
    expect(docs[2].username).toBe('eve');

    // Verify all persisted
    const count = await UserModel.countDocuments();
    expect(count).toBe(3);
  });

  test('verifyObjectId should return true for a valid ObjectId on a saved document', async () => {
    const doc = await UserModel.create({
      username: 'frank',
      email: 'frank@minglesphere.com',
    });
    const isValid = verifyObjectId(doc);
    expect(isValid).toBe(true);
  });

  test('getVersionKey should return the __v value of a document', async () => {
    const doc = await UserModel.create({
      username: 'grace',
      email: 'grace@minglesphere.com',
    });
    const versionKey = getVersionKey(doc);
    expect(typeof versionKey).toBe('number');
    expect(versionKey).toBe(0);
  });
});
