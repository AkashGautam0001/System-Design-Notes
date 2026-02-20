import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/25-the-vault.solution.js'
  : './exercise.js';
const {
  basicTransaction,
  transactionWithAbort,
  withTransactionHelper,
  transactionWithError,
  concurrentSafety,
} = await import(exercisePath);

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
  await disconnectFromDatabase();
});

beforeEach(async () => {
  await clearAllCollections();
});

const vaultUserSchema = new mongoose.Schema({
  name: String,
  credits: { type: Number, default: 0 },
});
const VaultUser = mongoose.models.VaultUser || mongoose.model('VaultUser', vaultUserSchema);

describe('Chapter 25: The Vault', () => {
  test('basicTransaction should atomically transfer credits between two users', async () => {
    const [userA, userB] = await basicTransaction(VaultUser);

    expect(userA).toBeDefined();
    expect(userB).toBeDefined();
    expect(userA.credits).toBe(70);
    expect(userB.credits).toBe(130);
    // Total credits should be preserved
    expect(userA.credits + userB.credits).toBe(200);
  });

  test('transactionWithAbort should roll back changes when aborted', async () => {
    const user = await transactionWithAbort(VaultUser);

    expect(user).toBeDefined();
    expect(user.credits).toBe(100);
  });

  test('withTransactionHelper should transfer credits using session.withTransaction()', async () => {
    const [userA, userB] = await withTransactionHelper(VaultUser);

    expect(userA).toBeDefined();
    expect(userB).toBeDefined();
    expect(userA.credits).toBe(50);
    expect(userB.credits).toBe(150);
    expect(userA.credits + userB.credits).toBe(200);
  });

  test('transactionWithError should roll back all changes when an error occurs', async () => {
    const [userA, userB] = await transactionWithError(VaultUser);

    expect(userA).toBeDefined();
    expect(userB).toBeDefined();
    expect(userA.credits).toBe(100);
    expect(userB.credits).toBe(100);
  });

  test('concurrentSafety should ensure only one deduction succeeds with concurrent transactions', async () => {
    const user = await concurrentSafety(VaultUser);

    expect(user).toBeDefined();
    // Only one deduction of 60 should succeed from 100 credits
    expect(user.credits).toBe(40);
    // Credits should never go negative
    expect(user.credits).toBeGreaterThanOrEqual(0);
  });
});
