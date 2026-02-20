import mongoose from 'mongoose';

/**
 * Create two users with credits: 100 each. Start a session, start a
 * transaction. Deduct 30 from user A, add 30 to user B. Commit.
 * Return both updated users as an array [userA, userB].
 */
export async function basicTransaction(Model) {
  const userA = await Model.create({ name: 'Alice', credits: 100 });
  const userB = await Model.create({ name: 'Bob', credits: 100 });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await Model.findByIdAndUpdate(
      userA._id,
      { $inc: { credits: -30 } },
      { session }
    );
    await Model.findByIdAndUpdate(
      userB._id,
      { $inc: { credits: 30 } },
      { session }
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

  const updatedA = await Model.findById(userA._id);
  const updatedB = await Model.findById(userB._id);
  return [updatedA, updatedB];
}

/**
 * Start a transaction, update a user, then abort. Verify the update
 * was rolled back. Return the user (should have original data).
 */
export async function transactionWithAbort(Model) {
  const user = await Model.create({ name: 'Charlie', credits: 100 });

  const session = await mongoose.startSession();
  session.startTransaction();

  await Model.findByIdAndUpdate(
    user._id,
    { $set: { credits: 0 } },
    { session }
  );

  await session.abortTransaction();
  await session.endSession();

  const retrieved = await Model.findById(user._id);
  return retrieved;
}

/**
 * Use session.withTransaction() helper to transfer credits.
 * Return both users after the transfer.
 */
export async function withTransactionHelper(Model) {
  const userA = await Model.create({ name: 'Dave', credits: 100 });
  const userB = await Model.create({ name: 'Eve', credits: 100 });

  const session = await mongoose.startSession();

  await session.withTransaction(async () => {
    await Model.findByIdAndUpdate(
      userA._id,
      { $inc: { credits: -50 } },
      { session }
    );
    await Model.findByIdAndUpdate(
      userB._id,
      { $inc: { credits: 50 } },
      { session }
    );
  });

  await session.endSession();

  const updatedA = await Model.findById(userA._id);
  const updatedB = await Model.findById(userB._id);
  return [updatedA, updatedB];
}

/**
 * Start a transaction, do partial updates, then throw an error
 * mid-transaction. Catch the error, abort. Verify nothing changed.
 * Return the original users.
 */
export async function transactionWithError(Model) {
  const userA = await Model.create({ name: 'Frank', credits: 100 });
  const userB = await Model.create({ name: 'Grace', credits: 100 });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await Model.findByIdAndUpdate(
      userA._id,
      { $inc: { credits: -30 } },
      { session }
    );

    // Simulate an error mid-transaction
    throw new Error('Something went wrong during transfer!');

    // This line is never reached
    // await Model.findByIdAndUpdate(userB._id, { $inc: { credits: 30 } }, { session });
  } catch (error) {
    await session.abortTransaction();
  } finally {
    await session.endSession();
  }

  const retrievedA = await Model.findById(userA._id);
  const retrievedB = await Model.findById(userB._id);
  return [retrievedA, retrievedB];
}

/**
 * Demonstrate that transactions provide isolation. Create a user with
 * credits: 100. Run two concurrent transactions that each try to
 * deduct 60. One should succeed, one should fail or retry.
 * Return the final user showing credits went to 40.
 */
export async function concurrentSafety(Model) {
  const user = await Model.create({ name: 'Hannah', credits: 100 });

  async function deduct60() {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const current = await Model.findById(user._id).session(session);
        if (current.credits < 60) {
          throw new Error('Insufficient credits');
        }
        await Model.findByIdAndUpdate(
          user._id,
          { $inc: { credits: -60 } },
          { session }
        );
      });
    } catch (error) {
      // Transaction failed - write conflict or insufficient credits
    } finally {
      await session.endSession();
    }
  }

  // Run two concurrent transactions
  await Promise.allSettled([deduct60(), deduct60()]);

  const finalUser = await Model.findById(user._id);
  return finalUser;
}
