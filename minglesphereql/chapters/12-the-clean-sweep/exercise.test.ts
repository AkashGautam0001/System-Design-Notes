import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables, seedUsers } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/12-the-clean-sweep.solution.ts'
  : './exercise.ts';

const {
  hardDeleteUser,
  softDeleteUser,
  findActiveUsers,
  cascadeDeleteTest,
  restoreSoftDeletedUser,
} = await import(exercisePath);

describe('Chapter 12: The Clean Sweep', () => {
  let seededUsers: any[];

  beforeEach(async () => {
    await clearAllTables();
    seededUsers = await seedUsers(3);
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should hard delete a user and return the deleted row', async () => {
    const user = seededUsers[0];
    const result = await hardDeleteUser(user.id);

    expect(result).toBeDefined();
    expect(result.id).toBe(user.id);

    // Verify user is actually gone
    const pool = getPool();
    const check = await pool.query('SELECT COUNT(*)::int as count FROM users WHERE id = $1', [user.id]);
    expect(check.rows[0].count).toBe(0);
  });

  it('should soft delete a user by setting deletedAt', async () => {
    const user = seededUsers[1];
    const result = await softDeleteUser(user.id);

    expect(result).toBeDefined();
    expect(result.id).toBe(user.id);
    expect(result.deletedAt).not.toBeNull();
    expect(new Date(result.deletedAt)).toBeInstanceOf(Date);
  });

  it('should find only active (non-soft-deleted) users', async () => {
    // Soft delete one user
    const pool = getPool();
    await pool.query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [seededUsers[0].id]);

    const activeUsers = await findActiveUsers();

    expect(activeUsers).toHaveLength(2);
    const activeIds = activeUsers.map((u: any) => u.id);
    expect(activeIds).not.toContain(seededUsers[0].id);
    expect(activeIds).toContain(seededUsers[1].id);
    expect(activeIds).toContain(seededUsers[2].id);
  });

  it('should cascade delete posts when user is deleted', async () => {
    const user = seededUsers[0];
    const result = await cascadeDeleteTest(user.id);

    expect(result).toBeDefined();
    expect(result.userDeleted).toBe(true);
    expect(result.postsRemaining).toBe(0);
  });

  it('should restore a soft-deleted user by setting deletedAt to null', async () => {
    // First soft delete the user
    const pool = getPool();
    await pool.query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [seededUsers[2].id]);

    const restored = await restoreSoftDeletedUser(seededUsers[2].id);

    expect(restored).toBeDefined();
    expect(restored.id).toBe(seededUsers[2].id);
    expect(restored.deletedAt).toBeNull();
  });
});
