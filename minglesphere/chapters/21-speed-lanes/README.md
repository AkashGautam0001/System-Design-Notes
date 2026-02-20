# Chapter 21: Speed Lanes

## Story

MingleSphere has hit a milestone -- millions of documents across dozens of collections. The platform is thriving, but something is wrong. Page loads are slowing down. The analytics dashboard takes ten seconds to render. User search feels sluggish. The database logs reveal the problem: full collection scans on every query.

The operations team raises the alarm. "We need speed lanes," the lead architect declares at the emergency standup. "Right now every query is like driving through a city with no highway system. Every request has to crawl through every single document to find what it needs. Indexes are the highways of a database -- they give queries a fast path to the data they need."

Your mission: build the index infrastructure that will transform MingleSphere from a crawling mess into a lightning-fast platform.

## Concepts

### What Is an Index?

An index is a special data structure that stores a small portion of the collection's data in an easily traversable form. Without an index, MongoDB must scan every document in a collection (a "collection scan") to find matching documents. With an index, MongoDB can limit the number of documents it inspects.

### Single-Field Index

The simplest type -- an index on a single field.

```js
// Using the raw MongoDB driver collection
await collection.createIndex({ email: 1 });

// 1 = ascending, -1 = descending
await collection.createIndex({ createdAt: -1 });
```

### Compound Index

An index on multiple fields. The order of fields matters -- it determines which queries can use the index efficiently.

```js
await collection.createIndex({ role: 1, createdAt: -1 });
```

This index supports queries that filter by `role`, or by `role` and `createdAt` together. It does NOT efficiently support queries that filter only by `createdAt`.

### Unique Index

Ensures that no two documents have the same value for the indexed field. MongoDB will reject inserts or updates that would create a duplicate.

```js
await collection.createIndex({ username: 1 }, { unique: true });
```

### TTL Index

A Time-To-Live index automatically removes documents after a specified number of seconds. It must be on a field that holds a Date value.

```js
await collection.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 3600 } // documents expire 1 hour after expiresAt
);
```

### Using explain() to Analyze Queries

The `explain()` method reveals how MongoDB executes a query -- whether it uses an index, how many documents it examines, and how long it takes.

```js
const result = await Model.find({ role: 'admin' }).explain('executionStats');

console.log(result.executionStats.totalDocsExamined);
console.log(result.executionStats.executionTimeMillis);
```

Key fields in `executionStats`:
- **totalDocsExamined** -- how many documents MongoDB scanned
- **executionTimeMillis** -- how long the query took
- **nReturned** -- how many documents matched

With a good index, `totalDocsExamined` should be close to `nReturned`.

### Raw Collection Access

In Mongoose, you can access the underlying MongoDB driver collection to create indexes directly:

```js
const collection = Model.collection;
// or
const collection = mongoose.connection.db.collection('collectionName');

await collection.createIndex({ field: 1 });
```

## Your Mission

Open `exercise.js` and implement the five exported functions:

1. **createSingleIndex(collection)** -- Create a single-field index on `email`. Return the index name.
2. **createCompoundIndex(collection)** -- Create a compound index on `{ role: 1, createdAt: -1 }`. Return the index name.
3. **createUniqueIndex(collection)** -- Create a unique index on `username`. Verify uniqueness by inserting a duplicate. Return `{ indexName, duplicateRejected: true }`.
4. **createTTLIndex(collection)** -- Create a TTL index on `expiresAt` with `expireAfterSeconds: 3600`. Return the index name.
5. **explainQuery(Model)** -- Seed data, create an index, run an explained query, and return execution stats.

Run your tests with:
```bash
npm run test:21
```

## Hints

<details>
<summary>Hint 1: Creating indexes with the raw collection</summary>

The `collection.createIndex()` method returns a promise that resolves to the index name string:

```js
const name = await collection.createIndex({ email: 1 });
// name === 'email_1'
```
</details>

<details>
<summary>Hint 2: Verifying unique index rejection</summary>

Insert a document, then try to insert another with the same unique field value. The second insert will throw an error with `code: 11000` (duplicate key). Catch it and set a flag.

```js
try {
  await collection.insertOne({ username: 'alice' });
  await collection.insertOne({ username: 'alice' }); // throws!
} catch (error) {
  if (error.code === 11000) duplicateRejected = true;
}
```
</details>

<details>
<summary>Hint 3: TTL index options</summary>

Pass the `expireAfterSeconds` as the second argument to `createIndex`:

```js
await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
```
</details>

<details>
<summary>Hint 4: Using explain()</summary>

Chain `.explain('executionStats')` to a Mongoose query. The result object has an `executionStats` property with `totalDocsExamined` and `executionTimeMillis`.

```js
const result = await Model.find({ role: 'admin' }).explain('executionStats');
const stats = result.executionStats;
```
</details>
