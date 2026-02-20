import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection } from '../../shared/connection.js';
import { clearAllTables, seedUsers } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/04-finding-your-people.solution.ts'
  : './exercise.ts';

const {
  findUserByUsername,
  findUsersByStatus,
  searchUsersByName,
  findUsersWithPagination,
  findUserByEmailOrUsername,
} = await import(exercisePath);

describe('Chapter 4: Finding Your People', () => {
  beforeEach(async () => {
    await clearAllTables();
    await seedUsers(5);
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should find a user by their exact username', async () => {
    const user = await findUserByUsername('user1');
    expect(user).toBeDefined();
    expect(user).not.toBeNull();
    expect(user.username).toBe('user1');
    expect(user.email).toBe('user1@minglesphereql.dev');

    // Non-existent user should return null
    const noUser = await findUserByUsername('nonexistent');
    expect(noUser).toBeNull();
  });

  it('should find all users with a given status', async () => {
    // seedUsers sets status to 'online'
    const onlineUsers = await findUsersByStatus('online');
    expect(Array.isArray(onlineUsers)).toBe(true);
    expect(onlineUsers.length).toBe(5);

    const offlineUsers = await findUsersByStatus('offline');
    expect(offlineUsers.length).toBe(0);
  });

  it('should search users by display name with case-insensitive matching', async () => {
    // seedUsers creates users with display_name = 'User 1', 'User 2', etc.
    const results = await searchUsersByName('user');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(5);

    // Case insensitive: 'USER' should also match
    const upperResults = await searchUsersByName('USER');
    expect(upperResults.length).toBe(5);

    // Partial match
    const partialResults = await searchUsersByName('User 3');
    expect(partialResults.length).toBe(1);
    expect(partialResults[0].displayName).toBe('User 3');
  });

  it('should return paginated results in order', async () => {
    const firstPage = await findUsersWithPagination(2, 0);
    expect(firstPage.length).toBe(2);

    const secondPage = await findUsersWithPagination(2, 2);
    expect(secondPage.length).toBe(2);

    // Pages should not overlap
    const firstPageIds = firstPage.map((u: any) => u.id);
    const secondPageIds = secondPage.map((u: any) => u.id);
    for (const id of secondPageIds) {
      expect(firstPageIds).not.toContain(id);
    }

    // Results should be ordered by id ascending
    expect(firstPage[0].id).toBeLessThan(firstPage[1].id);
  });

  it('should find a user by email or username', async () => {
    // Find by email
    const byEmail = await findUserByEmailOrUsername('user2@minglesphereql.dev', 'nonexistent');
    expect(byEmail).toBeDefined();
    expect(byEmail).not.toBeNull();
    expect(byEmail.email).toBe('user2@minglesphereql.dev');

    // Find by username
    const byUsername = await findUserByEmailOrUsername('nonexistent@test.com', 'user3');
    expect(byUsername).toBeDefined();
    expect(byUsername).not.toBeNull();
    expect(byUsername.username).toBe('user3');

    // No match returns null
    const noMatch = await findUserByEmailOrUsername('no@match.com', 'nomatch');
    expect(noMatch).toBeNull();
  });
});
