import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection } from '../../shared/connection.js';
import { clearAllTables } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/03-opening-the-gates.solution.ts'
  : './exercise.ts';

const {
  insertSingleUser,
  insertMultipleUsers,
  insertUserWithDefaults,
  insertAndReturnSpecificFields,
  getInsertedUserCount,
} = await import(exercisePath);

describe('Chapter 3: Opening the Gates', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should insert a single user and return the full row', async () => {
    const user = await insertSingleUser({
      username: 'alice',
      email: 'alice@minglesphereql.dev',
      displayName: 'Alice Wonderland',
    });
    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.username).toBe('alice');
    expect(user.email).toBe('alice@minglesphereql.dev');
    expect(user.displayName).toBe('Alice Wonderland');
  });

  it('should insert multiple users and return all rows', async () => {
    const users = await insertMultipleUsers([
      { username: 'bob', email: 'bob@minglesphereql.dev' },
      { username: 'charlie', email: 'charlie@minglesphereql.dev' },
      { username: 'diana', email: 'diana@minglesphereql.dev' },
    ]);
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBe(3);
    expect(users[0].username).toBe('bob');
    expect(users[1].username).toBe('charlie');
    expect(users[2].username).toBe('diana');
  });

  it('should insert a user with defaults and verify default values', async () => {
    const user = await insertUserWithDefaults('eve', 'eve@minglesphereql.dev');
    expect(user).toBeDefined();
    expect(user.username).toBe('eve');
    expect(user.email).toBe('eve@minglesphereql.dev');
    expect(user.status).toBe('offline');
    expect(user.isVerified).toBe(false);
    expect(user.postCount).toBe(0);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('should insert a user and return only id and username', async () => {
    const result = await insertAndReturnSpecificFields({
      username: 'frank',
      email: 'frank@minglesphereql.dev',
      displayName: 'Frank Castle',
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.username).toBe('frank');
    // Should NOT have other fields
    expect(Object.keys(result)).toEqual(['id', 'username']);
  });

  it('should return the correct count of inserted users', async () => {
    // Insert some users first
    await insertSingleUser({
      username: 'count1',
      email: 'count1@minglesphereql.dev',
      displayName: 'Count One',
    });
    await insertSingleUser({
      username: 'count2',
      email: 'count2@minglesphereql.dev',
      displayName: 'Count Two',
    });
    const userCount = await getInsertedUserCount();
    expect(userCount).toBe(2);
  });
});
