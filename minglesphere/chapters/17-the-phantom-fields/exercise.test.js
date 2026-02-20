import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/17-the-phantom-fields.solution.js'
  : './exercise.js';
const {
  createSchemaWithVirtual,
  createVirtualSetter,
  ensureVirtualsInJSON,
  virtualPopulate,
  virtualWithCount,
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

describe('Chapter 17: The Phantom Fields', () => {
  test('createSchemaWithVirtual should return fullName from firstName + lastName', async () => {
    const fullName = await createSchemaWithVirtual();

    expect(typeof fullName).toBe('string');
    expect(fullName).toContain(' ');
    const parts = fullName.split(' ');
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  test('createVirtualSetter should split fullName into firstName and lastName', async () => {
    const doc = await createVirtualSetter();

    expect(doc).toBeDefined();
    expect(doc.firstName).toBe('Jane');
    expect(doc.lastName).toBe('Doe');
  });

  test('ensureVirtualsInJSON should include virtual fields in JSON output', async () => {
    const json = await ensureVirtualsInJSON();

    expect(json).toBeDefined();
    expect(json.fullName).toBeDefined();
    expect(typeof json.fullName).toBe('string');
    expect(json.fullName).toContain(' ');
  });

  test('virtualPopulate should populate a virtual posts field on author', async () => {
    const author = await virtualPopulate();

    expect(author).toBeDefined();
    expect(author.posts).toBeDefined();
    expect(Array.isArray(author.posts)).toBe(true);
    expect(author.posts.length).toBeGreaterThanOrEqual(2);
    expect(author.posts[0].title).toBeDefined();
  });

  test('virtualWithCount should return postCount as a number', async () => {
    const author = await virtualWithCount();

    expect(author).toBeDefined();
    expect(typeof author.postCount).toBe('number');
    expect(author.postCount).toBe(3);
  });
});
