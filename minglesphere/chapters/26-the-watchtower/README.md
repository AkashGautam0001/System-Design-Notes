# Chapter 26: The Watchtower

## Story

MingleSphere users are demanding real-time experiences. When someone likes your photo, comments on your post, or sends you credits, you want to know immediately -- not the next time you refresh the page. The team needs a way to react to database changes the instant they happen, without polling or building a separate message queue.

Enter The Watchtower: a real-time notification system built on MongoDB Change Streams. Change streams let your application subscribe to a live feed of database operations -- inserts, updates, deletes, and more. They work because MongoDB runs as a replica set, maintaining an oplog (operations log) that records every change. Change streams tap into that oplog and push events to your application as they occur.

Your mission is to build the watchtower's core functionality. You will open change streams to detect inserts and updates, request the full document on update events, filter streams to only capture specific operation types, and extract resume tokens that allow you to pick up where you left off after a restart.

## Concepts

### Opening a Change Stream

Use `Model.watch()` to open a change stream on a collection. The stream emits events for every change that occurs.

```js
const stream = Model.watch();
const change = await stream.next(); // waits for the next change event
await stream.close();
```

### Change Event Structure

Each change event includes:
- `operationType` -- `'insert'`, `'update'`, `'delete'`, `'replace'`, etc.
- `fullDocument` -- The full document (always present for inserts, optional for updates)
- `updateDescription` -- For updates, contains `updatedFields` and `removedFields`
- `_id` -- The resume token for this event

### Full Document on Updates

By default, update events only include the changed fields. Pass `{ fullDocument: 'updateLookup' }` to receive the entire document as it exists after the update.

```js
const stream = Model.watch([], { fullDocument: 'updateLookup' });
// On update events, change.fullDocument will contain the complete document
```

### Filtering with a Pipeline

Pass an aggregation pipeline to `watch()` to filter which events you receive. This is more efficient than filtering in application code because MongoDB filters at the server level.

```js
const pipeline = [{ $match: { operationType: 'insert' } }];
const stream = Model.watch(pipeline);
// Only insert events will be emitted
```

### Resume Tokens

Every change event carries a resume token in its `_id` field. If your application disconnects, you can resume the stream from where you left off by passing the token.

```js
const change = await stream.next();
const token = change._id; // save this token

// Later, resume from this point:
const resumedStream = Model.watch([], { resumeAfter: token });
```

## Your Mission

Open `exercise.js` and implement the five exported functions:

1. **watchForInserts** -- Open a change stream, insert a document, capture and return the insert event.
2. **watchForUpdates** -- Create a document, open a stream, update it, capture and return the update event.
3. **watchWithFullDocument** -- Open a stream with `fullDocument: 'updateLookup'`, update a document, return the full document from the event.
4. **watchWithFilter** -- Open a filtered stream (inserts only), perform an insert and an update, verify only the insert was captured.
5. **getResumeToken** -- Open a stream, trigger a change, extract and return the resume token from the event.

Run your tests with:
```bash
npm run test:26
```

## Hints

<details>
<summary>Hint 1: Using stream.next()</summary>

`stream.next()` returns a promise that resolves when the next change event arrives. This is the simplest way to capture a single event. Make sure to trigger the database operation after opening the stream but you can start the operation without awaiting it before calling `stream.next()`.

</details>

<details>
<summary>Hint 2: Order of operations matters</summary>

Open the change stream BEFORE performing the database operation you want to capture. If you insert first and then open the stream, you will miss the event.

</details>

<details>
<summary>Hint 3: Always close the stream</summary>

Call `await stream.close()` when you are done. Leaving streams open leaks resources and can cause test timeouts.

</details>

<details>
<summary>Hint 4: Collecting multiple events</summary>

For the filter test, you need to collect events over a time window. Use the event listener pattern with `stream.on('change', callback)` and a `setTimeout` to wait, then close the stream and return the collected events.

</details>

<details>
<summary>Hint 5: Resume tokens</summary>

The resume token is the `_id` field of a change event. It is an object (not a string). Just return `change._id` and the test will verify it is truthy.

</details>
