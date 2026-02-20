import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/14-a-deeper-layer.solution.js'
  : './exercise.js';
const {
  createPostWithComments,
  findSubdocById,
  addSubdocument,
  removeSubdocument,
  validateSubdocument,
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

describe('Chapter 14: A Deeper Layer', () => {
  test('createPostWithComments should create a post with 2 embedded comment subdocs', async () => {
    const post = await createPostWithComments();

    expect(post).toBeDefined();
    expect(post._id).toBeDefined();
    expect(post.comments).toBeDefined();
    expect(post.comments).toHaveLength(2);
    expect(post.comments[0].author).toBeDefined();
    expect(post.comments[0].text).toBeDefined();
    expect(post.comments[0]._id).toBeDefined();
    expect(post.comments[1]._id).toBeDefined();
  });

  test('findSubdocById should find a comment subdoc by its _id', async () => {
    const post = await createPostWithComments();
    const targetId = post.comments[0]._id;

    const comment = await findSubdocById(post, targetId);

    expect(comment).toBeDefined();
    expect(comment._id.toString()).toBe(targetId.toString());
    expect(comment.text).toBe(post.comments[0].text);
  });

  test('addSubdocument should push a new comment to the post', async () => {
    const commentSchema = new mongoose.Schema({
      author: String,
      text: String,
      createdAt: { type: Date, default: Date.now },
    });
    const postSchema = new mongoose.Schema({
      title: String,
      body: String,
      comments: [commentSchema],
    });
    const TestPost = mongoose.models.SubdocPost || mongoose.model('SubdocPost', postSchema);

    const post = await TestPost.create({
      title: 'Test Post',
      body: 'Body text',
      comments: [{ author: 'Alice', text: 'First comment' }],
    });

    const updated = await addSubdocument(TestPost, post._id, {
      author: 'Bob',
      text: 'New comment',
    });

    expect(updated.comments).toHaveLength(2);
    expect(updated.comments[1].author).toBe('Bob');
    expect(updated.comments[1].text).toBe('New comment');
  });

  test('removeSubdocument should remove a comment from the post', async () => {
    const commentSchema = new mongoose.Schema({
      author: String,
      text: String,
      createdAt: { type: Date, default: Date.now },
    });
    const postSchema = new mongoose.Schema({
      title: String,
      body: String,
      comments: [commentSchema],
    });
    const TestPost = mongoose.models.SubdocPost || mongoose.model('SubdocPost', postSchema);

    const post = await TestPost.create({
      title: 'Test Post',
      body: 'Body text',
      comments: [
        { author: 'Alice', text: 'Comment A' },
        { author: 'Bob', text: 'Comment B' },
      ],
    });

    const commentToRemove = post.comments[0]._id;
    const updated = await removeSubdocument(TestPost, post._id, commentToRemove);

    expect(updated.comments).toHaveLength(1);
    expect(updated.comments[0].author).toBe('Bob');
  });

  test('validateSubdocument should return a ValidationError when comment text is missing', async () => {
    const error = await validateSubdocument();

    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
    expect(error.errors).toBeDefined();
  });
});
