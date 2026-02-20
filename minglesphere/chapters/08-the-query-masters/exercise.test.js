import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/08-the-query-masters.solution.js'
  : './exercise.js';
const {
  findByComparison,
  findByInOperator,
  findByLogicalOr,
  findByRegex,
  findByExists,
} = await import(exercisePath);

beforeAll(async () => { await connectToDatabase(); });
afterAll(async () => { await disconnectFromDatabase(); });
beforeEach(async () => { await clearAllCollections(); });

describe('Chapter 8: The Query Masters', () => {
  let QueryUser;

  beforeEach(() => {
    delete mongoose.connection.models['QueryUser'];
    delete mongoose.models['QueryUser'];
    const schema = new mongoose.Schema({
      username: String,
      email: String,
      age: Number,
      role: String,
      bio: mongoose.Schema.Types.Mixed,
    }, { strict: false });
    QueryUser = mongoose.model('QueryUser', schema);
  });

  test('findByComparison returns users with age > 25 AND age < 50', async () => {
    const results = await findByComparison(QueryUser);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const user of results) {
      expect(user.age).toBeGreaterThan(25);
      expect(user.age).toBeLessThan(50);
    }
  });

  test('findByInOperator returns only admin and moderator users', async () => {
    const results = await findByInOperator(QueryUser);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const user of results) {
      expect(['admin', 'moderator']).toContain(user.role);
    }
  });

  test('findByLogicalOr returns users where age < 18 OR role is admin', async () => {
    const results = await findByLogicalOr(QueryUser);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const user of results) {
      const matchesAge = user.age < 18;
      const matchesRole = user.role === 'admin';
      expect(matchesAge || matchesRole).toBe(true);
    }
  });

  test('findByRegex returns users whose username starts with "john" (case-insensitive)', async () => {
    const results = await findByRegex(QueryUser);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const user of results) {
      expect(user.username.toLowerCase()).toMatch(/^john/);
    }
  });

  test('findByExists returns only users that have a bio field', async () => {
    const results = await findByExists(QueryUser);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const user of results) {
      expect(user.bio).toBeDefined();
      expect(user.bio).not.toBeNull();
    }
  });
});
