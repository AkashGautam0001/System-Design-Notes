import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/20-family-ties.solution.js'
  : './exercise.js';
const {
  createDiscriminators,
  queryBaseModel,
  queryDiscriminatorModel,
  createPlugin,
  applySoftDeletePlugin,
} = await import(exercisePath);

beforeAll(async () => { await connectToDatabase(); });
afterAll(async () => { await disconnectFromDatabase(); });
beforeEach(async () => { await clearAllCollections(); });

describe('Chapter 20: Family Ties', () => {
  test('createDiscriminators creates TextPost and ImagePost with correct __t values', async () => {
    const { textPost, imagePost } = await createDiscriminators();

    expect(textPost).toBeDefined();
    expect(textPost.__t).toBe('DiscrimTextPost');
    expect(textPost.title).toBe('My First Blog');
    expect(textPost.wordCount).toBe(150);

    expect(imagePost).toBeDefined();
    expect(imagePost.__t).toBe('DiscrimImagePost');
    expect(imagePost.title).toBe('Sunset Photo');
    expect(imagePost.imageUrl).toBe('https://example.com/sunset.jpg');
    expect(imagePost.dimensions.width).toBe(1920);
  });

  test('queryBaseModel returns all posts regardless of type', async () => {
    await createDiscriminators();
    const Post = mongoose.models.DiscrimPost;

    const allPosts = await queryBaseModel(Post);

    expect(Array.isArray(allPosts)).toBe(true);
    expect(allPosts.length).toBe(2);
    const types = allPosts.map((p) => p.__t).sort();
    expect(types).toEqual(['DiscrimImagePost', 'DiscrimTextPost']);
  });

  test('queryDiscriminatorModel returns only TextPost documents', async () => {
    await createDiscriminators();
    const TextPost = mongoose.models.DiscrimTextPost;

    const textPosts = await queryDiscriminatorModel(TextPost);

    expect(Array.isArray(textPosts)).toBe(true);
    expect(textPosts.length).toBe(1);
    expect(textPosts[0].__t).toBe('DiscrimTextPost');
    expect(textPosts[0].wordCount).toBeDefined();
  });

  test('createPlugin adds createdAt and updatedAt timestamps to a document', async () => {
    const doc = await createPlugin();

    expect(doc).toBeDefined();
    expect(doc.name).toBe('Test Item');
    expect(doc.createdAt).toBeDefined();
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeDefined();
    expect(doc.updatedAt).toBeInstanceOf(Date);
  });

  test('applySoftDeletePlugin supports soft delete and restore lifecycle', async () => {
    const doc = await applySoftDeletePlugin();

    expect(doc).toBeDefined();
    expect(doc.name).toBe('Deletable Item');
    expect(doc.isDeleted).toBe(false);

    // Verify the doc exists in DB and is not deleted
    const Model = mongoose.models.SoftDeleteItem;
    const fromDb = await Model.findById(doc._id);
    expect(fromDb.isDeleted).toBe(false);
  });
});
