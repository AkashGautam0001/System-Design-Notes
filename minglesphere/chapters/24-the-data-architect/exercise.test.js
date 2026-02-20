import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/24-the-data-architect.solution.js'
  : './exercise.js';
const {
  lookupPosts,
  unwindArray,
  bucketByAge,
  facetSearch,
  conditionalExpression,
} = await import(exercisePath);

beforeAll(async () => { await connectToDatabase(); });
afterAll(async () => { await disconnectFromDatabase(); });
beforeEach(async () => { await clearAllCollections(); });

describe('Chapter 24: The Data Architect', () => {
  let LookupUser;
  let LookupPost;
  let TagPost;
  let BucketUser;

  beforeEach(() => {
    const userSchema = new mongoose.Schema({
      username: String,
      email: String,
      role: String,
      age: Number,
    }, { collection: 'users', strict: false });
    LookupUser = mongoose.models.LookupUser || mongoose.model('LookupUser', userSchema);

    const postSchema = new mongoose.Schema({
      title: String,
      content: String,
      author: { type: mongoose.Schema.Types.ObjectId },
      tags: [String],
    }, { collection: 'posts', strict: false });
    LookupPost = mongoose.models.LookupPost || mongoose.model('LookupPost', postSchema);

    const tagPostSchema = new mongoose.Schema({
      title: String,
      content: String,
      tags: [String],
    }, { strict: false });
    TagPost = mongoose.models.TagPost || mongoose.model('TagPost', tagPostSchema);

    const bucketUserSchema = new mongoose.Schema({
      username: String,
      email: String,
      role: String,
      age: Number,
    }, { strict: false });
    BucketUser = mongoose.models.BucketUser || mongoose.model('BucketUser', bucketUserSchema);
  });

  test('lookupPosts joins posts to users using $lookup', async () => {
    const results = await lookupPosts(LookupUser, LookupPost);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(2);

    // Each user should have a userPosts array
    results.forEach((user) => {
      expect(user.userPosts).toBeDefined();
      expect(Array.isArray(user.userPosts)).toBe(true);
    });

    // At least one user should have posts
    const usersWithPosts = results.filter((u) => u.userPosts.length > 0);
    expect(usersWithPosts.length).toBeGreaterThanOrEqual(1);

    // Verify post structure
    const userWithPosts = usersWithPosts[0];
    expect(userWithPosts.userPosts[0].title).toBeDefined();
  });

  test('unwindArray unwinds tags and counts occurrences per tag', async () => {
    const results = await unwindArray(TagPost);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(3);

    // Each result should have _id (tag name) and count
    results.forEach((item) => {
      expect(typeof item._id).toBe('string');
      expect(typeof item.count).toBe('number');
      expect(item.count).toBeGreaterThan(0);
    });

    // Results should be sorted by count descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].count).toBeGreaterThanOrEqual(results[i].count);
    }
  });

  test('bucketByAge groups users into age-range buckets', async () => {
    const results = await bucketByAge(BucketUser);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(3);

    // Buckets should have _id (lower boundary) and count
    results.forEach((bucket) => {
      expect(bucket._id).toBeDefined();
      expect(typeof bucket.count).toBe('number');
      expect(bucket.count).toBeGreaterThan(0);
    });

    // Verify known boundaries appear
    const bucketIds = results.map((b) => b._id);
    expect(bucketIds).toContain(0);
    expect(bucketIds).toContain(18);
  });

  test('facetSearch returns byRole, ageStats, and total facets simultaneously', async () => {
    const result = await facetSearch(BucketUser);

    expect(result).toBeDefined();
    expect(result.byRole).toBeDefined();
    expect(result.ageStats).toBeDefined();
    expect(result.total).toBeDefined();

    // byRole should be an array of role groups
    expect(Array.isArray(result.byRole)).toBe(true);
    expect(result.byRole.length).toBeGreaterThanOrEqual(2);
    result.byRole.forEach((item) => {
      expect(item._id).toBeDefined();
      expect(typeof item.count).toBe('number');
    });

    // ageStats should have avg, min, max
    expect(result.ageStats.length).toBe(1);
    expect(typeof result.ageStats[0].avgAge).toBe('number');
    expect(typeof result.ageStats[0].minAge).toBe('number');
    expect(typeof result.ageStats[0].maxAge).toBe('number');

    // total should have count
    expect(result.total.length).toBe(1);
    expect(result.total[0].count).toBeGreaterThan(0);
  });

  test('conditionalExpression adds category field based on age conditions', async () => {
    const results = await conditionalExpression(BucketUser);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(3);

    const validCategories = ['minor', 'adult', 'senior'];
    results.forEach((item) => {
      expect(item.category).toBeDefined();
      expect(validCategories).toContain(item.category);
    });

    // Verify correct categorization logic
    results.forEach((item) => {
      if (item.age < 18) {
        expect(item.category).toBe('minor');
      } else if (item.age < 65) {
        expect(item.category).toBe('adult');
      } else {
        expect(item.category).toBe('senior');
      }
    });
  });
});
