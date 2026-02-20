# Chapter 1: The Birth of MingleSphere

## The Story So Far

Welcome to MingleSphere -- the next generation social platform that's about to take the world by storm. You've just been hired as the founding backend engineer, and today is Day One. The CTO leans over your desk: "First things first -- get the database running. We need MongoDB."

You nod confidently. Every great application starts with a solid data layer, and MongoDB is the perfect fit for a social platform: flexible documents, horizontal scaling, and a rich query language. But before you can build anything, you need to establish a connection and prove the database is alive.

Your first task is deceptively simple: connect to MongoDB, verify the connection, explore what's there, and know how to disconnect cleanly. These fundamentals will be the bedrock of everything MingleSphere becomes.

## Concepts

### Connecting with Mongoose

Mongoose is the most popular ODM (Object Data Modeling) library for MongoDB in Node.js. It provides a schema-based solution to model your data.

```js
import mongoose from 'mongoose';

// Connect to MongoDB
await mongoose.connect('mongodb://localhost:27017/minglesphere');
```

### Connection Events and readyState

Once connected, you can monitor the connection through events and check its current state:

```js
// readyState values:
// 0 = disconnected
// 1 = connected
// 2 = connecting
// 3 = disconnecting
const state = mongoose.connection.readyState; // 1 when connected

// Connection events
mongoose.connection.on('connected', () => console.log('Connected!'));
mongoose.connection.on('error', (err) => console.error(err));
mongoose.connection.on('disconnected', () => console.log('Disconnected'));
```

### Connection Properties

The connection object holds useful information about where you're connected:

```js
const host = mongoose.connection.host;   // e.g., 'localhost'
const port = mongoose.connection.port;   // e.g., 27017
const name = mongoose.connection.name;   // e.g., 'minglesphere'
```

### Admin Commands

You can run administrative commands through the connection:

```js
const admin = mongoose.connection.db.admin();
const result = await admin.command({ listDatabases: 1 });
console.log(result.databases); // Array of database info objects
```

### Disconnecting

Always disconnect gracefully when you're done:

```js
await mongoose.disconnect();
```

## Your Mission

Implement these five functions in `exercise.js`:

1. **`connectToMingleSphere(uri)`** -- Connect to MongoDB using the provided URI and return the connection
2. **`getConnectionState()`** -- Return the current `readyState` of the mongoose connection
3. **`getConnectionHost()`** -- Return the host from the active connection
4. **`listDatabases()`** -- Use an admin command to list all databases on the server
5. **`disconnectFromMingleSphere()`** -- Cleanly disconnect from MongoDB

Run the tests with:
```bash
npm run test:01
```

## Hints

<details>
<summary>Hint 1: Connecting to MongoDB</summary>

`mongoose.connect(uri)` returns a promise. After it resolves, `mongoose.connection` holds the active connection object. Return `mongoose.connection` from your function.

</details>

<details>
<summary>Hint 2: Getting readyState</summary>

It's a simple property access: `mongoose.connection.readyState`. No awaiting needed.

</details>

<details>
<summary>Hint 3: Getting the host</summary>

After connecting, the host is available at `mongoose.connection.host`.

</details>

<details>
<summary>Hint 4: Listing databases</summary>

You need to get an admin reference and run a command:
```js
const admin = mongoose.connection.db.admin();
const result = await admin.command({ listDatabases: 1 });
return result;
```

</details>

<details>
<summary>Hint 5: Disconnecting</summary>

Simply `await mongoose.disconnect()`. That's all there is to it.

</details>
