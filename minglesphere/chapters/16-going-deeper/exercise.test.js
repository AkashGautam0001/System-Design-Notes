import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/16-going-deeper.solution.js'
  : './exercise.js';
const {
  deepPopulate,
  createOneToMany,
  createManyToMany,
  populateWithMatch,
  selectiveDeepPopulate,
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

// --- Models for deep populate tests ---
const deepUserSchema = new mongoose.Schema({
  username: String,
  email: String,
});
const DeepUser = mongoose.models.DeepUser || mongoose.model('DeepUser', deepUserSchema);

const deepCommentSchema = new mongoose.Schema({
  text: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'DeepUser' },
  approved: { type: Boolean, default: true },
});
const DeepComment = mongoose.models.DeepComment || mongoose.model('DeepComment', deepCommentSchema);

const deepPostSchema = new mongoose.Schema({
  title: String,
  body: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'DeepUser' },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeepComment' }],
});
const DeepPost = mongoose.models.DeepPost || mongoose.model('DeepPost', deepPostSchema);

// --- Models for 1:N ---
const authorSchema = new mongoose.Schema({
  name: String,
  books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ONBook' }],
});
const ONAuthor = mongoose.models.ONAuthor || mongoose.model('ONAuthor', authorSchema);

const bookSchema = new mongoose.Schema({
  title: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'ONAuthor' },
});
const ONBook = mongoose.models.ONBook || mongoose.model('ONBook', bookSchema);

// --- Models for M:N ---
const studentSchema = new mongoose.Schema({
  name: String,
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MNCourse' }],
});
const MNStudent = mongoose.models.MNStudent || mongoose.model('MNStudent', studentSchema);

const courseSchema = new mongoose.Schema({
  title: String,
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MNStudent' }],
});
const MNCourse = mongoose.models.MNCourse || mongoose.model('MNCourse', courseSchema);

describe('Chapter 16: Going Deeper', () => {
  test('deepPopulate should populate post.author and post.comments.author', async () => {
    const user1 = await DeepUser.create({ username: 'alice', email: 'alice@test.com' });
    const user2 = await DeepUser.create({ username: 'bob', email: 'bob@test.com' });

    const comment1 = await DeepComment.create({ text: 'Great post!', author: user2._id });
    const comment2 = await DeepComment.create({ text: 'Thanks!', author: user1._id });

    const post = await DeepPost.create({
      title: 'Deep Post',
      body: 'Content here',
      author: user1._id,
      comments: [comment1._id, comment2._id],
    });

    const populated = await deepPopulate(DeepPost, post._id);

    expect(populated.author.username).toBe('alice');
    expect(populated.comments[0].author.username).toBe('bob');
    expect(populated.comments[1].author.username).toBe('alice');
  });

  test('createOneToMany should create an author with multiple books', async () => {
    const result = await createOneToMany(ONAuthor, ONBook);

    expect(result).toBeDefined();
    expect(result.name).toBeDefined();
    expect(result.books.length).toBeGreaterThanOrEqual(2);
    expect(result.books[0].title).toBeDefined();
  });

  test('createManyToMany should create students and courses with M:N refs', async () => {
    const result = await createManyToMany(MNStudent, MNCourse);

    expect(result).toBeDefined();
    expect(result.students).toBeDefined();
    expect(result.courses).toBeDefined();
    expect(result.students.length).toBeGreaterThanOrEqual(2);
    expect(result.courses.length).toBeGreaterThanOrEqual(2);

    // Each student should have courses populated
    expect(result.students[0].courses.length).toBeGreaterThanOrEqual(1);
    expect(result.students[0].courses[0].title).toBeDefined();

    // Each course should have students populated
    expect(result.courses[0].students.length).toBeGreaterThanOrEqual(1);
    expect(result.courses[0].students[0].name).toBeDefined();
  });

  test('populateWithMatch should only populate comments matching condition', async () => {
    const user = await DeepUser.create({ username: 'carol', email: 'carol@test.com' });

    const approved = await DeepComment.create({ text: 'Approved!', author: user._id, approved: true });
    const rejected = await DeepComment.create({ text: 'Rejected!', author: user._id, approved: false });

    const post = await DeepPost.create({
      title: 'Match Post',
      body: 'Content',
      author: user._id,
      comments: [approved._id, rejected._id],
    });

    const result = await populateWithMatch(DeepPost, post._id);

    // Only approved comments should be populated (non-matching become null)
    const populatedComments = result.comments.filter((c) => c !== null);
    expect(populatedComments).toHaveLength(1);
    expect(populatedComments[0].text).toBe('Approved!');
  });

  test('selectiveDeepPopulate should populate with select at each level', async () => {
    const user1 = await DeepUser.create({ username: 'dave', email: 'dave@test.com' });
    const user2 = await DeepUser.create({ username: 'eve', email: 'eve@test.com' });

    const comment = await DeepComment.create({ text: 'Nice!', author: user2._id });

    const post = await DeepPost.create({
      title: 'Selective Post',
      body: 'Content',
      author: user1._id,
      comments: [comment._id],
    });

    const result = await selectiveDeepPopulate(DeepPost, post._id);

    expect(result.author.username).toBe('dave');
    expect(result.author.email).toBeUndefined();

    const populatedComment = result.comments[0];
    expect(populatedComment.author.username).toBe('eve');
    expect(populatedComment.author.email).toBeUndefined();
  });
});
