import { getPool } from '../shared/connection.js';

/**
 * Chapter 24: The Watchtower - SOLUTIONS
 */

export async function sendNotification(
  channel: string,
  payload: string
): Promise<{ sent: boolean }> {
  const pool = getPool();
  await pool.query(`SELECT pg_notify($1, $2)`, [channel, payload]);
  return { sent: true };
}

export async function listenAndReceive(
  channel: string,
  messageToSend: string
): Promise<{ channel: string; payload: string }> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await new Promise<{ channel: string; payload: string }>(
      async (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Notification not received within timeout'));
        }, 5000);

        client.on('notification', (msg) => {
          clearTimeout(timeout);
          resolve({ channel: msg.channel!, payload: msg.payload! });
        });

        await client.query(`LISTEN ${channel}`);

        // Use a separate connection to send the notification
        await pool.query(`SELECT pg_notify($1, $2)`, [channel, messageToSend]);
      }
    );

    await client.query(`UNLISTEN ${channel}`);
    return result;
  } finally {
    client.release();
  }
}

export async function createNotifyTrigger(): Promise<{ triggerCreated: boolean }> {
  const pool = getPool();

  await pool.query(`
    CREATE OR REPLACE FUNCTION notify_new_post() RETURNS TRIGGER AS $$
    BEGIN
      PERFORM pg_notify('new_post', json_build_object(
        'id', NEW.id,
        'content', NEW.content,
        'author_id', NEW.author_id
      )::text);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await pool.query(`
    CREATE OR REPLACE TRIGGER trg_notify_new_post
    AFTER INSERT ON posts
    FOR EACH ROW EXECUTE FUNCTION notify_new_post();
  `);

  return { triggerCreated: true };
}

export async function getNotificationChannels(): Promise<string[]> {
  const pool = getPool();
  const result = await pool.query(`SELECT * FROM pg_listening_channels()`);
  return result.rows.map((row: any) => row.pg_listening_channels);
}

export async function jsonPayloadNotification(
  channel: string,
  data: object
): Promise<{ sent: boolean; payload: string }> {
  const pool = getPool();
  const payload = JSON.stringify(data);
  await pool.query(`SELECT pg_notify($1, $2)`, [channel, payload]);
  return { sent: true, payload };
}
