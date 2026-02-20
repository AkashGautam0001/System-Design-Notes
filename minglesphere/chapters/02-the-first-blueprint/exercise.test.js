import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/02-the-first-blueprint.solution.js'
  : './exercise.js';
const { createUserSchema, createUserModel, getModelName, getCollectionName, getSchemaFields } = await import(exercisePath);

describe('Chapter 2: The First Blueprint', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    delete mongoose.connection.models['ChapterTwoUser'];
    delete mongoose.models['ChapterTwoUser'];
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      await mongoose.connection.db.collection(col.name).deleteMany({});
    }
  });

  test('createUserSchema should return a schema with the correct fields and options', () => {
    const schema = createUserSchema();
    expect(schema).toBeInstanceOf(mongoose.Schema);

    const paths = schema.paths;
    expect(paths.username).toBeDefined();
    expect(paths.username.options.required).toBe(true);
    expect(paths.email).toBeDefined();
    expect(paths.email.options.required).toBe(true);
    expect(paths.age).toBeDefined();
    expect(paths.joinedAt).toBeDefined();
    expect(paths.isActive).toBeDefined();
    expect(paths.isActive.options.default).toBe(true);
  });

  test('createUserModel should return a model named ChapterTwoUser', () => {
    const schema = createUserSchema();
    const Model = createUserModel(schema);
    expect(Model).toBeDefined();
    expect(Model.modelName).toBe('ChapterTwoUser');
  });

  test('getModelName should return the model name', () => {
    const schema = createUserSchema();
    // Re-use existing model if already registered
    const Model = mongoose.models['ChapterTwoUser'] || createUserModel(schema);
    const name = getModelName(Model);
    expect(name).toBe('ChapterTwoUser');
  });

  test('getCollectionName should return the pluralized, lowercased collection name', () => {
    const schema = createUserSchema();
    const Model = mongoose.models['ChapterTwoUser'] || createUserModel(schema);
    const collName = getCollectionName(Model);
    expect(collName).toBe('chaptertwousers');
  });

  test('getSchemaFields should return field names excluding _id and __v', () => {
    const schema = createUserSchema();
    const fields = getSchemaFields(schema);
    expect(Array.isArray(fields)).toBe(true);
    expect(fields).toContain('username');
    expect(fields).toContain('email');
    expect(fields).toContain('age');
    expect(fields).toContain('joinedAt');
    expect(fields).toContain('isActive');
    expect(fields).not.toContain('_id');
    expect(fields).not.toContain('__v');
    expect(fields.length).toBe(5);
  });
});
