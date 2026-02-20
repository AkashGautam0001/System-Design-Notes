import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection } from '../../shared/connection.js';
import { clearAllTables, seedUsers } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/10-the-great-edit.solution.ts'
  : './exercise.ts';

const {
  updateUserDisplayName,
  updateUserStatus,
  incrementPostCount,
  updateMultipleFields,
  conditionalUpdate,
} = await import(exercisePath);

describe('Chapter 10: The Great Edit', () => {
  let seededUsers: any[];

  beforeEach(async () => {
    await clearAllTables();
    seededUsers = await seedUsers(3);
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should update a user display name', async () => {
    const user = seededUsers[0];
    const result = await updateUserDisplayName(user.id, 'New Display Name');

    expect(result).toBeDefined();
    expect(result.displayName).toBe('New Display Name');
    expect(result.id).toBe(user.id);
  });

  it('should update user status and updatedAt timestamp', async () => {
    const user = seededUsers[1];
    const beforeUpdate = new Date();

    const result = await updateUserStatus(user.id, 'away');

    expect(result).toBeDefined();
    expect(result.status).toBe('away');
    expect(new Date(result.updatedAt).getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime() - 1000);
  });

  it('should increment post count atomically', async () => {
    const user = seededUsers[0];
    const originalCount = user.post_count ?? 0;

    const result = await incrementPostCount(user.id);

    expect(result).toBeDefined();
    expect(result.postCount).toBe(originalCount + 1);
  });

  it('should update multiple fields at once', async () => {
    const user = seededUsers[2];
    const result = await updateMultipleFields(user.id, {
      displayName: 'Updated Name',
      bio: 'A new bio',
      avatarUrl: 'https://example.com/avatar.png',
    });

    expect(result).toBeDefined();
    expect(result.displayName).toBe('Updated Name');
    expect(result.bio).toBe('A new bio');
    expect(result.avatarUrl).toBe('https://example.com/avatar.png');
  });

  it('should conditionally update bio only if it is null', async () => {
    const user = seededUsers[0];

    // First, set bio to null explicitly
    const { getPool } = await import('../../shared/connection.js');
    const pool = getPool();
    await pool.query('UPDATE users SET bio = NULL WHERE id = $1', [user.id]);

    // Should succeed because bio is null
    const updated = await conditionalUpdate(user.id, 'Brand new bio');
    expect(updated).toBeDefined();
    expect(updated.bio).toBe('Brand new bio');

    // Should return null because bio is no longer null
    const notUpdated = await conditionalUpdate(user.id, 'Another bio');
    expect(notUpdated).toBeNull();
  });
});
