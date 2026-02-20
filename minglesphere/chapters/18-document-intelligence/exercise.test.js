import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/18-document-intelligence.solution.js'
  : './exercise.js';
const {
  createModelWithInstanceMethod,
  createModelWithStaticMethod,
  createModelWithQueryHelper,
  chainQueryHelpers,
  instanceMethodWithSave,
} = await import(exercisePath);

beforeAll(async () => { await connectToDatabase(); });
afterAll(async () => { await disconnectFromDatabase(); });
beforeEach(async () => { await clearAllCollections(); });

describe('Chapter 18: Document Intelligence', () => {
  test('createModelWithInstanceMethod returns a public profile with only username and email', async () => {
    const profile = await createModelWithInstanceMethod();

    expect(profile).toBeDefined();
    expect(profile.username).toBe('alice');
    expect(profile.email).toBe('alice@minglesphere.com');
    expect(profile.password).toBeUndefined();
  });

  test('createModelWithStaticMethod finds a user by email using a static method', async () => {
    const user = await createModelWithStaticMethod();

    expect(user).toBeDefined();
    expect(user.username).toBe('bob');
    expect(user.email).toBe('bob@minglesphere.com');
  });

  test('createModelWithQueryHelper returns only admin users via byRole query helper', async () => {
    const admins = await createModelWithQueryHelper();

    expect(Array.isArray(admins)).toBe(true);
    expect(admins.length).toBe(2);
    admins.forEach((admin) => {
      expect(admin.role).toBe('admin');
    });
  });

  test('chainQueryHelpers returns only active admins when chaining active().byRole()', async () => {
    const activeAdmins = await chainQueryHelpers();

    expect(Array.isArray(activeAdmins)).toBe(true);
    expect(activeAdmins.length).toBe(2);
    activeAdmins.forEach((user) => {
      expect(user.isActive).toBe(true);
      expect(user.role).toBe('admin');
    });
  });

  test('instanceMethodWithSave deactivates a user and persists the change to DB', async () => {
    const updated = await instanceMethodWithSave();

    expect(updated).toBeDefined();
    expect(updated.isActive).toBe(false);

    // Verify it was actually persisted
    const Model = mongoose.models.DeactivateUser;
    const fromDb = await Model.findById(updated._id);
    expect(fromDb.isActive).toBe(false);
  });
});
