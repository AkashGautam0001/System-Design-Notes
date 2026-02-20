import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/23-the-data-refinery.solution.js'
  : './exercise.js';
const {
  groupByRole,
  matchAndGroup,
  projectFields,
  addFieldsStage,
  countDocumentsAgg,
} = await import(exercisePath);

beforeAll(async () => { await connectToDatabase(); });
afterAll(async () => { await disconnectFromDatabase(); });
beforeEach(async () => { await clearAllCollections(); });

describe('Chapter 23: The Data Refinery', () => {
  let AggUser;

  beforeEach(() => {
    const schema = new mongoose.Schema({
      username: String,
      email: String,
      role: String,
      age: Number,
      active: Boolean,
    }, { strict: false });
    AggUser = mongoose.models.AggUser || mongoose.model('AggUser', schema);
  });

  test('groupByRole groups users by role and returns counts sorted descending', async () => {
    const results = await groupByRole(AggUser);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(2);

    // Each result should have _id (role) and count
    results.forEach((item) => {
      expect(item._id).toBeDefined();
      expect(typeof item.count).toBe('number');
      expect(item.count).toBeGreaterThan(0);
    });

    // Verify sorted by count descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].count).toBeGreaterThanOrEqual(results[i].count);
    }
  });

  test('matchAndGroup filters active users and computes average age per role', async () => {
    const results = await matchAndGroup(AggUser);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);

    // Each result should have _id (role) and avgAge
    results.forEach((item) => {
      expect(item._id).toBeDefined();
      expect(typeof item.avgAge).toBe('number');
      expect(item.avgAge).toBeGreaterThan(0);
    });
  });

  test('projectFields creates a displayInfo field combining username and email', async () => {
    const results = await projectFields(AggUser);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);

    results.forEach((item) => {
      expect(item.displayInfo).toBeDefined();
      expect(typeof item.displayInfo).toBe('string');
      // displayInfo should contain both username and email
      expect(item.displayInfo).toContain('<');
      expect(item.displayInfo).toContain('>');
    });
  });

  test('addFieldsStage adds ageGroup field based on age ranges', async () => {
    const results = await addFieldsStage(AggUser);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(3);

    const validGroups = ['teen', 'adult', 'senior'];
    results.forEach((item) => {
      expect(item.ageGroup).toBeDefined();
      expect(validGroups).toContain(item.ageGroup);
    });

    // Verify at least two different groups are represented
    const groups = new Set(results.map((r) => r.ageGroup));
    expect(groups.size).toBeGreaterThanOrEqual(2);
  });

  test('countDocumentsAgg returns the count of active users as a number', async () => {
    const count = await countDocumentsAgg(AggUser);

    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0);
    // Based on the seeded data, we expect 3 active users
    expect(count).toBe(3);
  });
});
