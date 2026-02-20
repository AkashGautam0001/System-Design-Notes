import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/08-the-query-masters.solution.ts'
  : './exercise.ts';

const {
  findOnlineVerifiedUsers,
  findUsersNotOffline,
  findUsersCreatedBetween,
  findUsersWithNullBio,
  findUsersByMultipleStatuses,
} = await import(exercisePath);

async function seedUsersForFiltering() {
  const pool = getPool();
  // User 1: online, verified, has bio
  await pool.query(
    `INSERT INTO users (username, email, display_name, bio, status, is_verified, created_at)
     VALUES ('alice', 'alice@test.com', 'Alice', 'Hello I am Alice', 'online', true, '2024-01-15T00:00:00Z')`
  );
  // User 2: online, not verified, has bio
  await pool.query(
    `INSERT INTO users (username, email, display_name, bio, status, is_verified, created_at)
     VALUES ('bob', 'bob@test.com', 'Bob', 'Hello I am Bob', 'online', false, '2024-03-10T00:00:00Z')`
  );
  // User 3: offline, verified, no bio
  await pool.query(
    `INSERT INTO users (username, email, display_name, status, is_verified, created_at)
     VALUES ('charlie', 'charlie@test.com', 'Charlie', 'offline', true, '2024-06-20T00:00:00Z')`
  );
  // User 4: away, not verified, no bio
  await pool.query(
    `INSERT INTO users (username, email, display_name, status, is_verified, created_at)
     VALUES ('diana', 'diana@test.com', 'Diana', 'away', false, '2024-09-05T00:00:00Z')`
  );
  // User 5: busy, verified, has bio
  await pool.query(
    `INSERT INTO users (username, email, display_name, bio, status, is_verified, created_at)
     VALUES ('eve', 'eve@test.com', 'Eve', 'Hello I am Eve', 'busy', true, '2024-12-01T00:00:00Z')`
  );
  // User 6: online, verified, no bio
  await pool.query(
    `INSERT INTO users (username, email, display_name, status, is_verified, created_at)
     VALUES ('frank', 'frank@test.com', 'Frank', 'online', true, '2024-04-01T00:00:00Z')`
  );
}

describe('Chapter 8: The Query Masters', () => {
  beforeEach(async () => {
    await clearAllTables();
    await seedUsersForFiltering();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should find only users who are both online and verified', async () => {
    const users = await findOnlineVerifiedUsers();
    expect(users.length).toBe(2);
    const usernames = users.map((u: any) => u.username).sort();
    expect(usernames).toEqual(['alice', 'frank']);
  });

  it('should find all users whose status is not offline', async () => {
    const users = await findUsersNotOffline();
    expect(users.length).toBe(5);
    const usernames = users.map((u: any) => u.username).sort();
    expect(usernames).toEqual(['alice', 'bob', 'diana', 'eve', 'frank']);
  });

  it('should find users created between two dates', async () => {
    const startDate = new Date('2024-03-01T00:00:00Z');
    const endDate = new Date('2024-07-01T00:00:00Z');
    const users = await findUsersCreatedBetween(startDate, endDate);
    expect(users.length).toBe(3);
    const usernames = users.map((u: any) => u.username).sort();
    expect(usernames).toEqual(['bob', 'charlie', 'frank']);
  });

  it('should find users with a null bio', async () => {
    const users = await findUsersWithNullBio();
    expect(users.length).toBe(3);
    const usernames = users.map((u: any) => u.username).sort();
    expect(usernames).toEqual(['charlie', 'diana', 'frank']);
  });

  it('should find users by multiple statuses', async () => {
    const users = await findUsersByMultipleStatuses(['away', 'busy']);
    expect(users.length).toBe(2);
    const usernames = users.map((u: any) => u.username).sort();
    expect(usernames).toEqual(['diana', 'eve']);
  });
});
