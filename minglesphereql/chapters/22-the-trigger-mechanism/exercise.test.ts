import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables, seedUsers } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/22-the-trigger-mechanism.solution.ts'
  : './exercise.ts';

const {
  createUpdatedAtTrigger,
  createPostCountTrigger,
  createAuditLogTrigger,
  createPreventDeleteTrigger,
  listTriggers,
} = await import(exercisePath);

describe('Chapter 22: The Trigger Mechanism', () => {
  beforeEach(async () => {
    const pool = getPool();
    // Drop all custom triggers and functions to start clean
    await pool.query('DROP TRIGGER IF EXISTS trg_users_updated_at ON users');
    await pool.query('DROP TRIGGER IF EXISTS trg_posts_increment ON posts');
    await pool.query('DROP TRIGGER IF EXISTS trg_users_audit ON users');
    await pool.query('DROP TRIGGER IF EXISTS trg_prevent_verified_delete ON users');
    await pool.query('DROP FUNCTION IF EXISTS update_updated_at CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS increment_post_count CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS audit_trigger CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS prevent_verified_delete CASCADE');
    await pool.query('DROP TABLE IF EXISTS audit_log');
    await clearAllTables();
  });

  afterAll(async () => {
    const pool = getPool();
    // Final cleanup of triggers and functions
    await pool.query('DROP TRIGGER IF EXISTS trg_users_updated_at ON users');
    await pool.query('DROP TRIGGER IF EXISTS trg_posts_increment ON posts');
    await pool.query('DROP TRIGGER IF EXISTS trg_users_audit ON users');
    await pool.query('DROP TRIGGER IF EXISTS trg_prevent_verified_delete ON users');
    await pool.query('DROP FUNCTION IF EXISTS update_updated_at CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS increment_post_count CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS audit_trigger CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS prevent_verified_delete CASCADE');
    await pool.query('DROP TABLE IF EXISTS audit_log');
    await closeConnection();
  });

  it('should create an updated_at trigger that auto-updates the timestamp on user update', async () => {
    const result = await createUpdatedAtTrigger();
    expect(result.triggerCreated).toBe(true);
    expect(result.updatedAtChanged).toBe(true);
  });

  it('should create a post count trigger that increments when a post is inserted', async () => {
    const result = await createPostCountTrigger();
    expect(result.postCountAfterInsert).toBe(1);
  });

  it('should create an audit log trigger that records user updates', async () => {
    const result = await createAuditLogTrigger();
    expect(result.auditEntries).toBeGreaterThanOrEqual(1);
  });

  it('should create a trigger that prevents deletion of verified users', async () => {
    const result = await createPreventDeleteTrigger();
    expect(result.errorCaught).toBe(true);
    expect(result.errorMessage).toContain('Cannot delete verified users');
  });

  it('should list all triggers for a given table', async () => {
    // Create a trigger first so there is something to list
    const pool = getPool();
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);
    await pool.query(`
      CREATE OR REPLACE TRIGGER trg_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);

    const triggers = await listTriggers('users');
    expect(Array.isArray(triggers)).toBe(true);
    expect(triggers.length).toBeGreaterThanOrEqual(1);
    const triggerNames = triggers.map((t: any) => t.trigger_name);
    expect(triggerNames).toContain('trg_users_updated_at');
  });
});
