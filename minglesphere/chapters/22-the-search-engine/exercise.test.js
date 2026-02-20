import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/22-the-search-engine.solution.js'
  : './exercise.js';
const {
  textSearch,
  textSearchWithScore,
  phraseSearch,
  regexSearch,
  autocompleteSearch,
} = await import(exercisePath);

beforeAll(async () => { await connectToDatabase(); });
afterAll(async () => { await disconnectFromDatabase(); });
beforeEach(async () => {
  await clearAllCollections();
  // Drop and recreate collections to clear text indexes
  try {
    await mongoose.connection.db.collection('searchposts').drop();
  } catch (e) { /* collection may not exist */ }
  try {
    await mongoose.connection.db.collection('searchusers').drop();
  } catch (e) { /* collection may not exist */ }
});

describe('Chapter 22: The Search Engine', () => {
  let PostModel;
  let UserModel;

  beforeEach(() => {
    const postSchema = new mongoose.Schema({
      title: String,
      content: String,
      author: String,
    }, { collection: 'searchposts' });
    PostModel = mongoose.models.SearchPost || mongoose.model('SearchPost', postSchema);

    const userSchema = new mongoose.Schema({
      username: String,
      email: String,
      bio: String,
    }, { collection: 'searchusers' });
    UserModel = mongoose.models.SearchUser || mongoose.model('SearchUser', userSchema);
  });

  test('textSearch finds documents matching the search term', async () => {
    await PostModel.insertMany([
      { title: 'Learning MongoDB', content: 'MongoDB is a NoSQL database', author: 'alice' },
      { title: 'Cooking Pasta', content: 'A great recipe for Italian pasta', author: 'bob' },
      { title: 'Advanced MongoDB', content: 'Sharding and replication in MongoDB', author: 'charlie' },
    ]);

    const results = await textSearch(PostModel, 'MongoDB');

    expect(results.length).toBeGreaterThanOrEqual(2);
    results.forEach((doc) => {
      const text = `${doc.title} ${doc.content}`.toLowerCase();
      expect(text).toContain('mongodb');
    });
  });

  test('textSearchWithScore returns results sorted by relevance score', async () => {
    await PostModel.insertMany([
      { title: 'MongoDB Basics', content: 'Learn MongoDB fundamentals and MongoDB queries', author: 'alice' },
      { title: 'Cooking Tips', content: 'How to cook well', author: 'bob' },
      { title: 'MongoDB Advanced', content: 'Deep dive into database concepts', author: 'charlie' },
    ]);

    const results = await textSearchWithScore(PostModel, 'MongoDB');

    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].score).toBeDefined();
    // First result should have highest score (most relevant)
    if (results.length > 1) {
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    }
  });

  test('phraseSearch finds only documents containing the exact phrase', async () => {
    await PostModel.insertMany([
      { title: 'NoSQL Guide', content: 'MongoDB is a powerful NoSQL database engine', author: 'alice' },
      { title: 'SQL vs NoSQL', content: 'Comparing database approaches for NoSQL', author: 'bob' },
      { title: 'Getting Started', content: 'A powerful engine for web apps', author: 'charlie' },
    ]);

    const results = await phraseSearch(PostModel, 'NoSQL database');

    expect(results.length).toBeGreaterThanOrEqual(1);
    results.forEach((doc) => {
      const text = `${doc.title} ${doc.content}`.toLowerCase();
      expect(text).toContain('nosql database');
    });
  });

  test('regexSearch finds documents matching the regex pattern in username', async () => {
    await UserModel.insertMany([
      { username: 'alice_dev', email: 'alice@example.com', bio: 'Developer' },
      { username: 'bob_designer', email: 'bob@example.com', bio: 'Designer' },
      { username: 'alice_admin', email: 'alice2@example.com', bio: 'Admin' },
      { username: 'charlie', email: 'charlie@example.com', bio: 'Tester' },
    ]);

    const results = await regexSearch(UserModel, 'alice');

    expect(results.length).toBe(2);
    results.forEach((doc) => {
      expect(doc.username.toLowerCase()).toContain('alice');
    });
  });

  test('autocompleteSearch returns prefix-matched results sorted by username', async () => {
    await UserModel.insertMany([
      { username: 'alice', email: 'alice@example.com' },
      { username: 'alexander', email: 'alex@example.com' },
      { username: 'bob', email: 'bob@example.com' },
      { username: 'alicia', email: 'alicia@example.com' },
      { username: 'amanda', email: 'amanda@example.com' },
    ]);

    const results = await autocompleteSearch(UserModel, 'ali');

    expect(results.length).toBe(2);
    expect(results[0].username).toBe('alice');
    expect(results[1].username).toBe('alicia');
    // Verify sorted order
    for (let i = 1; i < results.length; i++) {
      expect(results[i].username >= results[i - 1].username).toBe(true);
    }
  });
});
