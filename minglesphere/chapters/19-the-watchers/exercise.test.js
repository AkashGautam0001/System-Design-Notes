import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/19-the-watchers.solution.js'
  : './exercise.js';
const {
  createPreSaveHook,
  createPostSaveHook,
  createPreValidateHook,
  createPreFindHook,
  createAsyncHook,
} = await import(exercisePath);

beforeAll(async () => { await connectToDatabase(); });
afterAll(async () => { await disconnectFromDatabase(); });
beforeEach(async () => { await clearAllCollections(); });

describe('Chapter 19: The Watchers', () => {
  test('createPreSaveHook uppercases the username via a pre-save hook', async () => {
    const user = await createPreSaveHook();

    expect(user).toBeDefined();
    expect(user.username).toBe('ALICE');
  });

  test('createPostSaveHook attaches a savedAt property to the doc after save', async () => {
    const user = await createPostSaveHook();

    expect(user).toBeDefined();
    expect(user.username).toBe('bob');
    expect(user.savedAt).toBeDefined();
    expect(user.savedAt).toBeInstanceOf(Date);
  });

  test('createPreValidateHook trims whitespace from email before validation', async () => {
    const user = await createPreValidateHook();

    expect(user).toBeDefined();
    expect(user.email).toBe('user@test.com');
  });

  test('createPreFindHook automatically excludes deleted documents from find queries', async () => {
    const results = await createPreFindHook();

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(2);
    results.forEach((user) => {
      expect(user.isDeleted).not.toBe(true);
    });
  });

  test('createAsyncHook simulates password hashing with an async pre-save hook', async () => {
    const user = await createAsyncHook();

    expect(user).toBeDefined();
    expect(user.password).toMatch(/^hashed_/);
    expect(user.password).toBe('hashed_mypassword');
  });
});
