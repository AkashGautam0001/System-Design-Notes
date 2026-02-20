# Chapter 13: The Bulk Express

## The Story So Far

MingleSphere now runs nightly maintenance jobs: deactivating dormant accounts, promoting power users, purging expired sessions, and importing batches of new users from a partner integration. Doing these one-at-a-time is too slow -- the maintenance window closes at 4 AM.

The CTO announces: "We need bulk operations. One round trip to the database, hundreds of operations executed together. That is the Bulk Express."

You dive into `bulkWrite` -- MongoDB's Swiss army knife for batch processing.

## Concepts

### bulkWrite -- One Call, Many Operations

`bulkWrite` lets you send an array of mixed operations (inserts, updates, deletes) in a single request. Each operation is an object with a key specifying the type.

```js
const result = await User.bulkWrite([
  { insertOne: { document: { name: 'Alice', age: 25 } } },
  { updateOne: { filter: { name: 'Bob' }, update: { $set: { age: 31 } } } },
  { deleteOne: { filter: { name: 'Charlie' } } },
]);
```

### The bulkWrite Result Object

The result contains counters for each type of operation:

```js
console.log(result.insertedCount);  // number of inserted documents
console.log(result.modifiedCount);  // number of modified documents
console.log(result.deletedCount);   // number of deleted documents
console.log(result.matchedCount);   // number of documents matched by update filters
console.log(result.upsertedCount);  // number of upserted documents
```

### Ordered vs Unordered

By default, `bulkWrite` runs in **ordered** mode: operations execute sequentially and stop on the first error.

```js
// Ordered (default) -- stops on first error
await User.bulkWrite(ops, { ordered: true });

// Unordered -- attempts all operations even if some fail
await User.bulkWrite(ops, { ordered: false });
```

**Ordered mode** is useful when operations depend on each other (e.g., insert then update the same document).

**Unordered mode** is faster for independent operations because MongoDB can execute them in parallel, and a single failure does not halt the batch.

### Building insertOne Operations

When inserting multiple documents, map each one into the `insertOne` format:

```js
const users = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
const ops = users.map(user => ({
  insertOne: { document: user }
}));
await User.bulkWrite(ops);
```

### Interpreting Results

After a bulkWrite, you can summarize what happened:

```js
const result = await User.bulkWrite(ops);
const summary = {
  insertedCount: result.insertedCount,
  modifiedCount: result.modifiedCount,
  deletedCount: result.deletedCount,
  totalOperations: result.insertedCount + result.modifiedCount + result.deletedCount,
};
```

## Your Mission

Implement these five functions in `exercise.js`:

1. **`bulkInsertUsers(Model, users)`** -- Build `insertOne` operations from the users array and execute with `bulkWrite`. Return the result.
2. **`bulkMixedOperations(Model, operations)`** -- Pass a mixed array of operations directly to `bulkWrite`. Return the result.
3. **`orderedBulkWrite(Model, ops)`** -- Execute `bulkWrite` with `{ ordered: true }`. Return the result.
4. **`unorderedBulkWrite(Model, ops)`** -- Execute `bulkWrite` with `{ ordered: false }`. Return the result.
5. **`interpretBulkResult(Model)`** -- Perform a bulkWrite that inserts 3 users, updates 1, and deletes 1. Return a summary object: `{ insertedCount, modifiedCount, deletedCount, totalOperations }`.

Run the tests with:
```bash
npm run test:13
```

## Hints

<details>
<summary>Hint 1: bulkInsertUsers</summary>

Map each user to the `insertOne` format:
```js
const ops = users.map(user => ({ insertOne: { document: user } }));
const result = await Model.bulkWrite(ops);
return result;
```

</details>

<details>
<summary>Hint 2: bulkMixedOperations</summary>

The operations array is already in the right format -- just pass it through:
```js
const result = await Model.bulkWrite(operations);
return result;
```

</details>

<details>
<summary>Hint 3: orderedBulkWrite</summary>

Ordered is the default, but be explicit:
```js
const result = await Model.bulkWrite(ops, { ordered: true });
return result;
```

</details>

<details>
<summary>Hint 4: unorderedBulkWrite</summary>

Set `ordered: false` for parallel execution:
```js
const result = await Model.bulkWrite(ops, { ordered: false });
return result;
```

</details>

<details>
<summary>Hint 5: interpretBulkResult</summary>

Build an array of 5 operations (3 inserts, 1 update, 1 delete), execute them, then pick out the counts:
```js
const ops = [
  { insertOne: { document: { name: 'Alice', ... } } },
  { insertOne: { document: { name: 'Bob', ... } } },
  { insertOne: { document: { name: 'Charlie', ... } } },
  { updateOne: { filter: { name: 'Alice' }, update: { $set: { age: 30 } } } },
  { deleteOne: { filter: { name: 'Charlie' } } },
];
const result = await Model.bulkWrite(ops);
return {
  insertedCount: result.insertedCount,
  modifiedCount: result.modifiedCount,
  deletedCount: result.deletedCount,
  totalOperations: result.insertedCount + result.modifiedCount + result.deletedCount,
};
```

</details>
