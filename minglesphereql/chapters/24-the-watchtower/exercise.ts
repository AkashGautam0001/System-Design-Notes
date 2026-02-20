import { getPool } from '../../shared/connection.js';

/**
 * Chapter 24: The Watchtower
 *
 * Real-time notifications with PostgreSQL LISTEN/NOTIFY.
 * The watchtower observes changes in the database and broadcasts
 * them to anyone who is listening.
 */

/**
 * Send a notification on a given channel with a payload.
 *
 * Use: SELECT pg_notify($1, $2)
 *
 * Return { sent: true }.
 */
export async function sendNotification(
  channel: string,
  payload: string
): Promise<{ sent: boolean }> {
  throw new Error('Not implemented');
}

/**
 * Set up a listener on a channel, send a notification, and receive it.
 *
 * Steps:
 * 1. Get a dedicated client from the pool
 * 2. Register a 'notification' event handler on the client
 * 3. LISTEN on the channel
 * 4. Use a separate pool connection to send a notification via pg_notify
 * 5. Resolve with { channel, payload } when the notification is received
 *
 * Return { channel: string, payload: string }.
 */
export async function listenAndReceive(
  channel: string,
  messageToSend: string
): Promise<{ channel: string; payload: string }> {
  throw new Error('Not implemented');
}

/**
 * Create a trigger that sends a NOTIFY when a new post is created.
 *
 * The trigger function should call:
 *   PERFORM pg_notify('new_post', json_build_object(
 *     'id', NEW.id, 'content', NEW.content, 'author_id', NEW.author_id
 *   )::text);
 *
 * Return { triggerCreated: true }.
 */
export async function createNotifyTrigger(): Promise<{ triggerCreated: boolean }> {
  throw new Error('Not implemented');
}

/**
 * Get the list of channels currently being listened to.
 *
 * Query: SELECT * FROM pg_listening_channels()
 *
 * Return an array of channel name strings (may be empty).
 */
export async function getNotificationChannels(): Promise<string[]> {
  throw new Error('Not implemented');
}

/**
 * Send a JSON payload as a notification on the given channel.
 *
 * Use: SELECT pg_notify($1, $2) where the payload is JSON.stringify(data).
 *
 * Return { sent: true, payload: string } where payload is the serialized JSON.
 */
export async function jsonPayloadNotification(
  channel: string,
  data: object
): Promise<{ sent: boolean; payload: string }> {
  throw new Error('Not implemented');
}
