import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables, seedUsers, getRowCount } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/13-the-batch-express.solution.ts'
  : './exercise.ts';

const {
  bulkInsertUsers,
  upsertUser,
  insertOrIgnore,
  batchUpdateStatuses,
  bulkDeleteByIds,
} = await import(exercisePath);

describe('Chapter 13: The Batch Express', () => {
  beforeEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should bulk insert multiple users in a single operation', async () => {
    const usersData = [
      { username: 'batch1', email: 'batch1@test.com' },
      { username: 'batch2', email: 'batch2@test.com' },
      { username: 'batch3', email: 'batch3@test.com' },
    ];

    const result = await bulkInsertUsers(usersData);

    expect(result).toHaveLength(3);
    expect(result[0].username).toBe('batch1');
    expect(result[1].username).toBe('batch2');
    expect(result[2].username).toBe('batch3');

    const count = await getRowCount('users');
    expect(count).toBe(3);
  });

  it('should upsert a user - insert new or update on conflict', async () => {
    // First insert
    const first = await upsertUser({
      username: 'upsertuser',
      email: 'upsert@test.com',
      displayName: 'Original Name',
    });
    expect(first).toBeDefined();
    expect(first.displayName).toBe('Original Name');

    // Second call with same username should update
    const second = await upsertUser({
      username: 'upsertuser',
      email: 'upsert@test.com',
      displayName: 'Updated Name',
    });
    expect(second).toBeDefined();
    expect(second.displayName).toBe('Updated Name');

    // Should still be only one user
    const count = await getRowCount('users');
    expect(count).toBe(1);
  });

  it('should insert or ignore on conflict without error', async () => {
    // First insert should succeed
    const first = await insertOrIgnore({
      username: 'ignoreuser',
      email: 'ignore@test.com',
    });
    expect(first).toHaveLength(1);
    expect(first[0].username).toBe('ignoreuser');

    // Second insert with same username should return empty array
    const second = await insertOrIgnore({
      username: 'ignoreuser',
      email: 'ignore2@test.com',
    });
    expect(second).toHaveLength(0);

    // Should still be only one user
    const count = await getRowCount('users');
    expect(count).toBe(1);
  });

  it('should batch update statuses for multiple users at once', async () => {
    const seededUsers = await seedUsers(4);
    const targetIds = [seededUsers[0].id, seededUsers[1].id, seededUsers[2].id];

    const result = await batchUpdateStatuses(targetIds, 'busy');

    expect(result).toHaveLength(3);
    result.forEach((user: any) => {
      expect(user.status).toBe('busy');
    });

    // Fourth user should be unchanged
    const pool = getPool();
    const fourthUser = await pool.query('SELECT status FROM users WHERE id = $1', [seededUsers[3].id]);
    expect(fourthUser.rows[0].status).not.toBe('busy');
  });

  it('should bulk delete multiple users by IDs', async () => {
    const seededUsers = await seedUsers(5);
    const idsToDelete = [seededUsers[0].id, seededUsers[2].id, seededUsers[4].id];

    const deleted = await bulkDeleteByIds(idsToDelete);

    expect(deleted).toHaveLength(3);

    const remainingCount = await getRowCount('users');
    expect(remainingCount).toBe(2);
  });
});
