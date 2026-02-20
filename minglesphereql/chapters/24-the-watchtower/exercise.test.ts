import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { closeConnection, getPool } from '../../shared/connection.js';
import { clearAllTables, seedUsers } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/24-the-watchtower.solution.ts'
  : './exercise.ts';

const {
  sendNotification,
  listenAndReceive,
  createNotifyTrigger,
  getNotificationChannels,
  jsonPayloadNotification,
} = await import(exercisePath);

describe('Chapter 24: The Watchtower', () => {
  beforeEach(async () => {
    const pool = getPool();
    // Clean up any triggers from previous runs
    await pool.query('DROP TRIGGER IF EXISTS trg_notify_new_post ON posts');
    await pool.query('DROP FUNCTION IF EXISTS notify_new_post CASCADE');
    await clearAllTables();
  });

  afterAll(async () => {
    const pool = getPool();
    // Final cleanup
    await pool.query('DROP TRIGGER IF EXISTS trg_notify_new_post ON posts');
    await pool.query('DROP FUNCTION IF EXISTS notify_new_post CASCADE');
    await closeConnection();
  });

  it('should send a notification on a channel', async () => {
    const result = await sendNotification('test_channel', 'hello world');
    expect(result.sent).toBe(true);
  });

  it('should listen on a channel and receive a notification', async () => {
    const result = await listenAndReceive('chat_channel', 'ping from test');
    expect(result.channel).toBe('chat_channel');
    expect(result.payload).toBe('ping from test');
  });

  it('should create a trigger that notifies on new post creation', async () => {
    const result = await createNotifyTrigger();
    expect(result.triggerCreated).toBe(true);

    // Verify the trigger exists by querying information_schema
    const pool = getPool();
    const triggerCheck = await pool.query(
      `SELECT trigger_name FROM information_schema.triggers
       WHERE event_object_table = 'posts' AND trigger_name = 'trg_notify_new_post'`
    );
    expect(triggerCheck.rows.length).toBe(1);
  });

  it('should return the list of active listening channels', async () => {
    const channels = await getNotificationChannels();
    expect(Array.isArray(channels)).toBe(true);
    // pg_listening_channels returns channels for the current session;
    // since we are not actively listening, it may be empty
    expect(channels.length).toBeGreaterThanOrEqual(0);
  });

  it('should send a JSON payload as a notification', async () => {
    const data = { userId: 42, action: 'login', timestamp: '2025-01-01T00:00:00Z' };
    const result = await jsonPayloadNotification('json_channel', data);
    expect(result.sent).toBe(true);
    const parsed = JSON.parse(result.payload);
    expect(parsed.userId).toBe(42);
    expect(parsed.action).toBe('login');
  });
});
