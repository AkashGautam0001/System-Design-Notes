import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/07-schema-superpowers.solution.js'
  : './exercise.js';
const {
  createTimestampSchema,
  testStrictMode,
  testDefaultValues,
  testToJSONTransform,
  createSchemaWithAllOptions,
} = await import(exercisePath);

beforeAll(async () => { await connectToDatabase(); });
afterAll(async () => { await disconnectFromDatabase(); });
beforeEach(async () => { await clearAllCollections(); });

describe('Chapter 7: Schema Superpowers', () => {
  test('createTimestampSchema creates a document with createdAt and updatedAt', async () => {
    delete mongoose.connection.models['TimestampUser'];
    delete mongoose.models['TimestampUser'];
    const schema = new mongoose.Schema(
      { username: String, email: String },
      { timestamps: true }
    );
    const TimestampUser = mongoose.model('TimestampUser', schema);

    const doc = await createTimestampSchema(TimestampUser);
    expect(doc).toBeDefined();
    expect(doc.createdAt).toBeDefined();
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeDefined();
    expect(doc.updatedAt).toBeInstanceOf(Date);
  });

  test('testStrictMode strips extra fields not defined in the schema', async () => {
    const doc = await testStrictMode();
    expect(doc).toBeDefined();
    expect(doc.name).toBeDefined();
    const plain = doc.toObject ? doc.toObject() : doc;
    expect(plain.notInSchema).toBeUndefined();
  });

  test('testDefaultValues applies static and function defaults', async () => {
    const doc = await testDefaultValues();
    expect(doc).toBeDefined();
    expect(doc.name).toBe('Alice');
    expect(doc.role).toBe('user');
    expect(doc.joinCode).toBeDefined();
    expect(typeof doc.joinCode).toBe('string');
    expect(doc.joinCode.length).toBeGreaterThan(0);
  });

  test('testToJSONTransform removes password from JSON output', async () => {
    const json = await testToJSONTransform();
    expect(json).toBeDefined();
    expect(json.username).toBeDefined();
    expect(json.password).toBeUndefined();
  });

  test('createSchemaWithAllOptions combines timestamps, defaults, and toJSON transform', async () => {
    const result = await createSchemaWithAllOptions();
    expect(result).toBeDefined();
    expect(result.doc).toBeDefined();
    expect(result.json).toBeDefined();

    // Timestamps
    expect(result.doc.createdAt).toBeDefined();
    expect(result.doc.updatedAt).toBeDefined();

    // Defaults
    expect(result.doc.role).toBe('user');

    // toJSON transform removes password
    expect(result.json.password).toBeUndefined();
    expect(result.json.username).toBe('alice');
  });
});
