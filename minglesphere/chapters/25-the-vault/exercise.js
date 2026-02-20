import mongoose from 'mongoose';

/**
 * Create two users with credits: 100 each. Start a session, start a
 * transaction. Deduct 30 from user A, add 30 to user B. Commit.
 * Return both updated users as an array [userA, userB].
 *
 * @param {mongoose.Model} Model - A Mongoose model with name and credits fields
 * @returns {Promise<Array>} [userA, userB] after the transfer
 */
export async function basicTransaction(Model) {
  // TODO: Create two users (Alice and Bob) with credits: 100 each
  // TODO: Start a session with mongoose.startSession()
  // TODO: Call session.startTransaction()
  // TODO: Deduct 30 credits from Alice using $inc: { credits: -30 } with { session }
  // TODO: Add 30 credits to Bob using $inc: { credits: 30 } with { session }
  // TODO: Commit the transaction with session.commitTransaction()
  // TODO: End the session with session.endSession()
  // TODO: Re-fetch and return both users as [userA, userB]
  throw new Error('Not implemented');
}

/**
 * Start a transaction, update a user, then abort. Verify the update
 * was rolled back. Return the user (should have original data).
 *
 * @param {mongoose.Model} Model - A Mongoose model with name and credits fields
 * @returns {Promise<Object>} The user with original data after abort
 */
export async function transactionWithAbort(Model) {
  // TODO: Create a user with credits: 100
  // TODO: Start a session and a transaction
  // TODO: Update the user's credits to 0 within the transaction
  // TODO: Abort the transaction with session.abortTransaction()
  // TODO: End the session
  // TODO: Re-fetch and return the user (credits should still be 100)
  throw new Error('Not implemented');
}

/**
 * Use session.withTransaction() helper to transfer credits.
 * Return both users after the transfer.
 *
 * @param {mongoose.Model} Model - A Mongoose model with name and credits fields
 * @returns {Promise<Array>} [userA, userB] after the transfer
 */
export async function withTransactionHelper(Model) {
  // TODO: Create two users with credits: 100 each
  // TODO: Start a session
  // TODO: Use session.withTransaction(async () => { ... })
  // TODO: Inside the callback, deduct 50 from user A, add 50 to user B
  // TODO: End the session
  // TODO: Re-fetch and return both users as [userA, userB]
  throw new Error('Not implemented');
}

/**
 * Start a transaction, do partial updates, then throw an error
 * mid-transaction. Catch the error, abort. Verify nothing changed.
 * Return the original users.
 *
 * @param {mongoose.Model} Model - A Mongoose model with name and credits fields
 * @returns {Promise<Array>} Both users with original data
 */
export async function transactionWithError(Model) {
  // TODO: Create two users with credits: 100 each
  // TODO: Start a session and a transaction
  // TODO: Deduct 30 from user A within the transaction
  // TODO: Throw an error before completing the transfer
  // TODO: In the catch block, abort the transaction
  // TODO: End the session
  // TODO: Re-fetch and return both users (both should still have 100 credits)
  throw new Error('Not implemented');
}

/**
 * Demonstrate that transactions provide isolation. Create a user with
 * credits: 100. Run two concurrent transactions that each try to
 * deduct 60. One should succeed, one should fail or retry.
 * Return the final user showing credits went to 40.
 *
 * @param {mongoose.Model} Model - A Mongoose model with name and credits fields
 * @returns {Promise<Object>} The user with final credits value (should be 40)
 */
export async function concurrentSafety(Model) {
  // TODO: Create a user with credits: 100
  // TODO: Define a function that runs a transaction deducting 60 credits
  // TODO: Run two instances of that function concurrently with Promise.allSettled
  // TODO: Handle the case where one transaction fails due to write conflict
  // TODO: Re-fetch and return the user (credits should be 40, not -20)
  throw new Error('Not implemented');
}
