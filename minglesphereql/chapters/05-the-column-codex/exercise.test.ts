import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection } from '../../shared/connection.js';
import { clearAllTables, seedUsers, rawQuery } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/05-the-column-codex.solution.ts'
  : './exercise.ts';

const {
  insertUserWithAllTypes,
  queryJsonbField,
  getUserTimestamps,
  findVerifiedUsers,
  updateUserMetadata,
} = await import(exercisePath);

describe('Chapter 5: The Column Codex', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should insert a user with all column types and return the full row', async () => {
    const user = await insertUserWithAllTypes({
      username: 'typeduser',
      email: 'typed@minglesphereql.dev',
      displayName: 'Typed User',
      bio: 'A user with every field filled in.',
      isVerified: true,
      postCount: 42,
      metadata: { theme: 'dark', language: 'en' },
    });
    expect(user).toBeDefined();
    expect(user.username).toBe('typeduser');
    expect(user.bio).toBe('A user with every field filled in.');
    expect(user.isVerified).toBe(true);
    expect(user.postCount).toBe(42);
    expect(user.metadata).toEqual({ theme: 'dark', language: 'en' });
  });

  it('should query users by a JSONB metadata field', async () => {
    // Insert users with metadata via raw SQL
    await rawQuery(
      `INSERT INTO users (username, email, metadata) VALUES ($1, $2, $3)`,
      ['jsonuser1', 'json1@test.com', JSON.stringify({ plan: 'pro', region: 'us' })]
    );
    await rawQuery(
      `INSERT INTO users (username, email, metadata) VALUES ($1, $2, $3)`,
      ['jsonuser2', 'json2@test.com', JSON.stringify({ plan: 'free', region: 'eu' })]
    );
    await rawQuery(
      `INSERT INTO users (username, email, metadata) VALUES ($1, $2, $3)`,
      ['jsonuser3', 'json3@test.com', JSON.stringify({ plan: 'pro', region: 'eu' })]
    );

    const proUsers = await queryJsonbField('plan', 'pro');
    expect(Array.isArray(proUsers)).toBe(true);
    expect(proUsers.length).toBe(2);

    const euUsers = await queryJsonbField('region', 'eu');
    expect(euUsers.length).toBe(2);
  });

  it('should return createdAt and updatedAt as Date objects', async () => {
    const users = await seedUsers(1);
    const userId = users[0].id;

    const timestamps = await getUserTimestamps(userId);
    expect(timestamps).toBeDefined();
    expect(timestamps.createdAt).toBeInstanceOf(Date);
    expect(timestamps.updatedAt).toBeInstanceOf(Date);
    // Timestamps should be recent (within last minute)
    const now = new Date();
    expect(now.getTime() - timestamps.createdAt.getTime()).toBeLessThan(60000);
  });

  it('should find only verified users', async () => {
    // Seed some users and mark one as verified
    await rawQuery(
      `INSERT INTO users (username, email, is_verified) VALUES ($1, $2, $3)`,
      ['verified1', 'v1@test.com', true]
    );
    await rawQuery(
      `INSERT INTO users (username, email, is_verified) VALUES ($1, $2, $3)`,
      ['verified2', 'v2@test.com', true]
    );
    await rawQuery(
      `INSERT INTO users (username, email, is_verified) VALUES ($1, $2, $3)`,
      ['unverified1', 'uv1@test.com', false]
    );

    const verified = await findVerifiedUsers();
    expect(Array.isArray(verified)).toBe(true);
    expect(verified.length).toBe(2);
    for (const user of verified) {
      expect(user.isVerified).toBe(true);
    }
  });

  it('should update user metadata and return the updated row', async () => {
    const users = await seedUsers(1);
    const userId = users[0].id;

    const newMetadata = { interests: ['coding', 'music'], premium: true };
    const updated = await updateUserMetadata(userId, newMetadata);

    expect(updated).toBeDefined();
    expect(updated.id).toBe(userId);
    expect(updated.metadata).toEqual(newMetadata);
  });
});
