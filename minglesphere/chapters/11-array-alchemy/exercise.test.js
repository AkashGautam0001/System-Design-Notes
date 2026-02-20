import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/11-array-alchemy.solution.js'
  : './exercise.js';
const {
  pushToArray,
  addToSetArray,
  pullFromArray,
  pushMultipleWithSlice,
  updateArrayElement,
} = await import(exercisePath);

const postSchema = new mongoose.Schema({
  title: String,
  tags: [String],
});

const Post = mongoose.models.ArrayPost || mongoose.model('ArrayPost', postSchema);

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
  await disconnectFromDatabase();
});

beforeEach(async () => {
  await clearAllCollections();
});

describe('Chapter 11: Array Alchemy', () => {
  test('pushToArray should add a tag to the tags array', async () => {
    const post = await Post.create({ title: 'My Post', tags: ['javascript'] });
    const updated = await pushToArray(Post, post._id, 'mongodb');

    expect(updated.tags).toContain('javascript');
    expect(updated.tags).toContain('mongodb');
    expect(updated.tags).toHaveLength(2);
  });

  test('addToSetArray should add a tag only if it does not already exist', async () => {
    const post = await Post.create({ title: 'Unique Tags', tags: ['nodejs', 'express'] });

    const updated1 = await addToSetArray(Post, post._id, 'express');
    expect(updated1.tags).toHaveLength(2);

    const updated2 = await addToSetArray(Post, post._id, 'mongodb');
    expect(updated2.tags).toHaveLength(3);
    expect(updated2.tags).toContain('mongodb');
  });

  test('pullFromArray should remove a specific tag from the array', async () => {
    const post = await Post.create({ title: 'Remove Me', tags: ['alpha', 'beta', 'gamma'] });
    const updated = await pullFromArray(Post, post._id, 'beta');

    expect(updated.tags).toHaveLength(2);
    expect(updated.tags).not.toContain('beta');
    expect(updated.tags).toContain('alpha');
    expect(updated.tags).toContain('gamma');
  });

  test('pushMultipleWithSlice should add tags and cap the array at maxSize', async () => {
    const post = await Post.create({ title: 'Capped Tags', tags: ['a', 'b'] });
    const updated = await pushMultipleWithSlice(Post, post._id, ['c', 'd', 'e'], 3);

    expect(updated.tags).toHaveLength(3);
    expect(updated.tags).toContain('e');
    expect(updated.tags).toContain('d');
    expect(updated.tags).toContain('c');
  });

  test('updateArrayElement should replace a specific tag with a new value using positional $', async () => {
    const post = await Post.create({ title: 'Rename Tag', tags: ['react', 'vue', 'angular'] });
    const updated = await updateArrayElement(Post, post._id, 'vue', 'svelte');

    expect(updated.tags).toContain('svelte');
    expect(updated.tags).not.toContain('vue');
    expect(updated.tags).toContain('react');
    expect(updated.tags).toContain('angular');
    expect(updated.tags).toHaveLength(3);
  });
});
