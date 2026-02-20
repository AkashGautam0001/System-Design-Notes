# Chapter 25: The Vault

## Story

MingleSphere is growing fast, and with growth comes real money. Users can now purchase credits and transfer them to one another -- tipping a content creator, splitting a group event fee, or gifting a friend. But the engineering team quickly realizes that a naive implementation is dangerous. If the server crashes between deducting credits from one user and adding them to another, money simply vanishes. The community will not tolerate phantom credits or double-spending.

The lead architect calls an emergency meeting: "We need The Vault -- a system where credit transfers are all-or-nothing. If any step fails, everything rolls back as if it never happened." The team turns to MongoDB multi-document transactions, which bring the same ACID guarantees long associated with relational databases into the document world.

Your mission is to build and test The Vault's transaction layer. You will create basic transactions with manual commit, practice aborting to roll back mistakes, use the convenient `withTransaction` helper, handle mid-transaction errors gracefully, and prove that concurrent transactions cannot corrupt balances.

## Concepts

### ACID Transactions

ACID stands for Atomicity, Consistency, Isolation, and Durability. MongoDB supports multi-document ACID transactions on replica sets (and sharded clusters). This means a group of read/write operations across multiple documents can be treated as a single atomic unit.

### Starting a Session and Transaction

Every transaction lives inside a **session**. You start a session, begin a transaction on it, run your operations passing the session option, and then commit or abort.

```js
const session = await mongoose.startSession();
session.startTransaction();

try {
  await Model.findByIdAndUpdate(id1, { $inc: { credits: -30 } }, { session });
  await Model.findByIdAndUpdate(id2, { $inc: { credits: 30 } }, { session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  await session.endSession();
}
```

### The withTransaction Helper

The `session.withTransaction()` method wraps the start, commit, abort, and retry logic for you. Just pass in a callback with your operations.

```js
const session = await mongoose.startSession();
await session.withTransaction(async () => {
  await Model.findByIdAndUpdate(id1, { $inc: { credits: -50 } }, { session });
  await Model.findByIdAndUpdate(id2, { $inc: { credits: 50 } }, { session });
});
await session.endSession();
```

### Aborting a Transaction

If you detect a problem mid-transaction, call `session.abortTransaction()`. All changes made within that transaction are discarded -- as if they never happened.

```js
session.startTransaction();
await Model.updateOne({ _id: id }, { $set: { credits: 0 } }, { session });
await session.abortTransaction(); // credits remain unchanged
```

### Write Conflicts and Isolation

When two transactions try to modify the same document concurrently, MongoDB detects a write conflict. One transaction will succeed while the other receives a `WriteConflict` error. The `withTransaction` helper can automatically retry the failed transaction. This isolation guarantee prevents race conditions like double-spending.

## Your Mission

Open `exercise.js` and implement the five exported functions:

1. **basicTransaction** -- Create two users, transfer 30 credits from A to B inside a transaction, commit, and verify balances.
2. **transactionWithAbort** -- Start a transaction, modify a user, abort, and confirm the change was rolled back.
3. **withTransactionHelper** -- Use `session.withTransaction()` to transfer 50 credits between users.
4. **transactionWithError** -- Start a transaction, make a partial update, throw an error, abort, and confirm nothing changed.
5. **concurrentSafety** -- Run two concurrent transactions each deducting 60 from 100 credits. Only one should succeed.

Run your tests with:
```bash
npm run test:25
```

## Hints

<details>
<summary>Hint 1: Passing the session to operations</summary>

Every read or write inside a transaction must include `{ session }` in its options. For example: `Model.findByIdAndUpdate(id, update, { session })`. Without the session option, the operation runs outside the transaction.

</details>

<details>
<summary>Hint 2: Aborting rolls back everything</summary>

After `session.abortTransaction()`, all operations that were part of that transaction are discarded. Re-fetch the document with a normal query (no session) to confirm the original data is intact.

</details>

<details>
<summary>Hint 3: withTransaction handles retries</summary>

The `session.withTransaction()` helper automatically retries on transient transaction errors and handles commit/abort for you. Just put your operations inside the callback and pass `{ session }` to each one.

</details>

<details>
<summary>Hint 4: Handling mid-transaction errors</summary>

Wrap your transaction logic in a try/catch. In the catch block, call `session.abortTransaction()`. In the finally block, call `session.endSession()`. This ensures cleanup happens regardless of success or failure.

</details>

<details>
<summary>Hint 5: Concurrent safety with write conflicts</summary>

Use `Promise.allSettled()` to run two transaction functions at the same time. Inside each transaction, read the current balance before deducting to check if sufficient credits exist. The `withTransaction` helper will retry on write conflicts, but if the balance check fails after retry, the deduction is skipped.

</details>
