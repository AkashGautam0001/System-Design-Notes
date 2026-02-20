import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/09-select-sort-and-slice.solution.js'
  : './exercise.js';
const {
  selectFields,
  sortUsers,
  paginateUsers,
  getDistinctRoles,
  countActiveUsers,
} = await import(exercisePath);

beforeAll(async () => { await connectToDatabase(); });
afterAll(async () => { await disconnectFromDatabase(); });
beforeEach(async () => { await clearAllCollections(); });

describe('Chapter 9: Select, Sort, and Slice', () => {
  let SelectUser;

  beforeEach(() => {
    delete mongoose.connection.models['SelectUser'];
    delete mongoose.models['SelectUser'];
    const schema = new mongoose.Schema({
      username: String,
      email: String,
      age: Number,
      role: String,
      isActive: Boolean,
    });
    SelectUser = mongoose.model('SelectUser', schema);
  });

  test('selectFields returns documents with only username and email fields', async () => {
    const results = await selectFields(SelectUser);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const user of results) {
      const obj = user.toObject();
      expect(obj.username).toBeDefined();
      expect(obj.email).toBeDefined();
      // age and role should not be present (only _id, username, email)
      expect(obj.age).toBeUndefined();
      expect(obj.role).toBeUndefined();
    }
  });

  test('sortUsers returns users sorted by age in descending order', async () => {
    const results = await sortUsers(SelectUser);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(1);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].age).toBeGreaterThanOrEqual(results[i].age);
    }
  });

  test('paginateUsers returns the correct page of results with skip/limit', async () => {
    const page1 = await paginateUsers(SelectUser, 1, 3);
    expect(Array.isArray(page1)).toBe(true);
    expect(page1.length).toBe(3);

    // Clean collection and re-run for page 2
    await clearAllCollections();
    const page2 = await paginateUsers(SelectUser, 2, 3);
    expect(page2.length).toBe(3);

    // Ensure page 1 and page 2 have different users
    const page1Names = page1.map(u => u.username);
    const page2Names = page2.map(u => u.username);
    const overlap = page1Names.filter(n => page2Names.includes(n));
    expect(overlap.length).toBe(0);
  });

  test('getDistinctRoles returns an array of unique role strings', async () => {
    const roles = await getDistinctRoles(SelectUser);
    expect(Array.isArray(roles)).toBe(true);
    expect(roles.length).toBeGreaterThan(0);
    // Check uniqueness
    const uniqueRoles = [...new Set(roles)];
    expect(roles.length).toBe(uniqueRoles.length);
    // Should contain at least 'user' and 'admin'
    expect(roles).toContain('user');
    expect(roles).toContain('admin');
  });

  test('countActiveUsers returns the correct count of active users', async () => {
    const count = await countActiveUsers(SelectUser);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0);
    // Verify by checking the database
    const actualCount = await SelectUser.countDocuments({ isActive: true });
    expect(count).toBe(actualCount);
  });
});
