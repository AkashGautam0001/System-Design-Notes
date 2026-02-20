# Chapter 24: The Watchtower

## Story

The MingleSphereQL platform had a problem that no amount of clever querying could solve: latency. When a user published a new post, their followers needed to see it -- but the only way to check for new content was to poll the database. Every client would fire a query every few seconds, asking "is there anything new?" Multiply that by thousands of connected users and the database was drowning in redundant SELECT queries, most of which returned nothing.

The infrastructure team proposed an elegant solution buried deep in PostgreSQL's feature set: LISTEN/NOTIFY. Unlike traditional polling, where the client repeatedly asks the database for updates, LISTEN/NOTIFY flips the model. A client registers interest in a channel by executing `LISTEN channel_name`. From that point on, whenever any session in the database executes `NOTIFY channel_name` (or calls `pg_notify()`), PostgreSQL pushes the notification to every listening client in real time. No polling. No wasted queries. The database itself becomes a message broker.

The team built the Watchtower -- a service that sat between the database and the application's WebSocket layer. When a new post was created, a trigger on the `posts` table would fire, calling `pg_notify('new_post', ...)` with a JSON payload containing the post's ID, content, and author. The Watchtower listened on the `new_post` channel and forwarded every notification to the appropriate WebSocket connections. Users saw new posts appear in their feeds within milliseconds of creation, without a single polling query.

But LISTEN/NOTIFY was useful for more than just posts. The team added channels for friend requests, direct messages, and system alerts. Each channel carried its own payload format, usually serialized as JSON. The Watchtower became the central nervous system of real-time communication in MingleSphereQL, and it was all powered by a feature that had been in PostgreSQL since version 9.0.

The most surprising part? The entire implementation required zero additional infrastructure. No Redis, no RabbitMQ, no Kafka. Just PostgreSQL doing what it does best -- managing data and keeping everyone informed.

## Key Concepts

- **LISTEN**: Registers the current database session to receive notifications on a named channel. The channel does not need to be created in advance -- any string works.
- **NOTIFY / pg_notify()**: Sends a notification to all sessions listening on a channel. `pg_notify(channel, payload)` is the function form that accepts a payload string (up to 8000 bytes).
- **Notification Payloads**: Notifications can carry a text payload, typically JSON-serialized data. This allows listeners to receive structured information without additional queries.
- **Trigger-Based NOTIFY**: By calling `pg_notify()` from within a trigger function, you can automatically broadcast notifications whenever data changes.
- **pg_listening_channels()**: A system function that returns the list of channels the current session is listening on.
- **Connection Semantics**: LISTEN is session-scoped. If the connection is closed or returned to a pool, the listener is lost. For persistent listening, you need a dedicated connection.

## Code Examples

### Sending a Notification
```typescript
await pool.query(`SELECT pg_notify($1, $2)`, ['my_channel', 'hello']);
```

### Listening for Notifications
```typescript
const client = await pool.connect();
client.on('notification', (msg) => {
  console.log(`Received on ${msg.channel}: ${msg.payload}`);
});
await client.query('LISTEN my_channel');
```

### Trigger-Based Notification
```sql
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

CREATE TRIGGER trg_notify_new_post
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION notify_new_post();
```

### Checking Active Channels
```typescript
const result = await pool.query('SELECT * FROM pg_listening_channels()');
const channels = result.rows.map(r => r.pg_listening_channels);
```

## What You Will Practice

1. Sending a notification on a PostgreSQL channel using `pg_notify()`
2. Setting up a LISTEN client that receives notifications in real time
3. Creating a trigger that automatically sends NOTIFY when a new post is inserted
4. Querying `pg_listening_channels()` to inspect active listeners
5. Sending structured JSON payloads through the notification system

## Tips

- **LISTEN requires a dedicated connection**: When using a connection pool, a connection returned to the pool may lose its LISTEN registrations. For production use, maintain a dedicated long-lived connection for listening.
- **Payload size limit**: The payload for `pg_notify()` is limited to about 8000 bytes. For large data, send only an ID in the payload and let the listener query the full data separately.
- **UNLISTEN when done**: Always clean up your listeners with `UNLISTEN channel_name` or `UNLISTEN *` when you no longer need notifications.
- **Notifications are transactional**: If `NOTIFY` is called inside a transaction, the notification is not delivered until the transaction commits. If the transaction rolls back, the notification is discarded.
- **Testing LISTEN/NOTIFY**: In tests, you need separate connections for the listener and the sender. A connection cannot receive its own synchronous notification reliably -- use the pool for sending and a dedicated client for listening.
