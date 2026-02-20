import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/15-the-social-web.solution.js'
  : './exercise.js';
const {
  createReferencedPost,
  populateAuthor,
  selectivePopulate,
  populateMultiplePosts,
  checkRefIntegrity,
} = await import(exercisePath);

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
  await disconnectFromDatabase();
});

beforeEach(async () => {
  await clearAllCollections();
});

// Shared models for testing
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  age: Number,
});
const RefUser = mongoose.models.RefUser || mongoose.model('RefUser', userSchema);

const postSchema = new mongoose.Schema({
  title: String,
  body: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'RefUser' },
});
const RefPost = mongoose.models.RefPost || mongoose.model('RefPost', postSchema);

describe('Chapter 15: The Social Web', () => {
  test('createReferencedPost should create a post with author reference', async () => {
    const post = await createReferencedPost(
      RefUser,
      RefPost,
      { username: 'alice', email: 'alice@example.com', age: 25 },
      { title: 'Hello World', body: 'My first post' }
    );

    expect(post).toBeDefined();
    expect(post.title).toBe('Hello World');
    expect(post.author).toBeDefined();
    // author should be an ObjectId (not populated yet)
    expect(mongoose.Types.ObjectId.isValid(post.author)).toBe(true);
  });

  test('populateAuthor should populate the author field on a post', async () => {
    const user = await RefUser.create({ username: 'bob', email: 'bob@example.com', age: 30 });
    const post = await RefPost.create({ title: 'Test', body: 'Body', author: user._id });

    const populated = await populateAuthor(RefPost, post._id);

    expect(populated.author).toBeDefined();
    expect(populated.author.username).toBe('bob');
    expect(populated.author.email).toBe('bob@example.com');
  });

  test('selectivePopulate should only include selected author fields', async () => {
    const user = await RefUser.create({ username: 'carol', email: 'carol@example.com', age: 28 });
    const post = await RefPost.create({ title: 'Selective', body: 'Body', author: user._id });

    const populated = await selectivePopulate(RefPost, post._id);

    expect(populated.author.username).toBe('carol');
    expect(populated.author.email).toBe('carol@example.com');
    // age should NOT be present when only selecting 'username email'
    expect(populated.author.age).toBeUndefined();
  });

  test('populateMultiplePosts should populate author on all posts', async () => {
    const user1 = await RefUser.create({ username: 'dave', email: 'dave@example.com' });
    const user2 = await RefUser.create({ username: 'eve', email: 'eve@example.com' });
    await RefPost.create([
      { title: 'Post 1', body: 'Body 1', author: user1._id },
      { title: 'Post 2', body: 'Body 2', author: user2._id },
    ]);

    const posts = await populateMultiplePosts(RefPost);

    expect(posts).toHaveLength(2);
    expect(posts[0].author.username).toBeDefined();
    expect(posts[1].author.username).toBeDefined();
  });

  test('checkRefIntegrity should show ObjectId before populate and object after', async () => {
    const user = await RefUser.create({ username: 'frank', email: 'frank@example.com' });
    const post = await RefPost.create({ title: 'Integrity', body: 'Check', author: user._id });

    const result = await checkRefIntegrity(RefPost, post._id);

    expect(result).toBeDefined();
    expect(result.beforePopulate).toBe(true);
    expect(result.afterPopulate).toBe(true);
  });
});
