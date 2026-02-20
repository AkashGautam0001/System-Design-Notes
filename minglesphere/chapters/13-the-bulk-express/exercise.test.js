import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/13-the-bulk-express.solution.js'
  : './exercise.js';
const {
  bulkInsertUsers,
  bulkMixedOperations,
  orderedBulkWrite,
  unorderedBulkWrite,
  interpretBulkResult,
} = await import(exercisePath);

const bulkUserSchema = new mongoose.Schema({
  name: String,
  email: String,
  age: Number,
  role: String,
});

const BulkUser = mongoose.models.BulkUser || mongoose.model('BulkUser', bulkUserSchema);

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
  await disconnectFromDatabase();
});

beforeEach(async () => {
  await clearAllCollections();
});

describe('Chapter 13: The Bulk Express', () => {
  test('bulkInsertUsers should insert multiple users via bulkWrite insertOne operations', async () => {
    const users = [
      { name: 'Alice', email: 'alice@minglesphere.io', age: 25 },
      { name: 'Bob', email: 'bob@minglesphere.io', age: 30 },
      { name: 'Carol', email: 'carol@minglesphere.io', age: 28 },
    ];
    const result = await bulkInsertUsers(BulkUser, users);

    expect(result.insertedCount).toBe(3);

    const allUsers = await BulkUser.find().lean();
    expect(allUsers).toHaveLength(3);
  });

  test('bulkMixedOperations should execute mixed insert, update, and delete operations', async () => {
    const existing = await BulkUser.create({ name: 'Dave', email: 'dave@minglesphere.io', age: 35 });

    const operations = [
      { insertOne: { document: { name: 'Eve', email: 'eve@minglesphere.io', age: 22 } } },
      { updateOne: { filter: { _id: existing._id }, update: { $set: { age: 36 } } } },
      { deleteOne: { filter: { _id: existing._id } } },
    ];

    const result = await bulkMixedOperations(BulkUser, operations);

    expect(result.insertedCount).toBe(1);
    expect(result.modifiedCount).toBe(1);
    expect(result.deletedCount).toBe(1);

    const remaining = await BulkUser.find().lean();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('Eve');
  });

  test('orderedBulkWrite should execute operations in order (ordered: true)', async () => {
    const ops = [
      { insertOne: { document: { name: 'Frank', email: 'frank@minglesphere.io', age: 40 } } },
      { insertOne: { document: { name: 'Grace', email: 'grace@minglesphere.io', age: 29 } } },
    ];

    const result = await orderedBulkWrite(BulkUser, ops);
    expect(result.insertedCount).toBe(2);

    const users = await BulkUser.find().sort({ name: 1 }).lean();
    expect(users[0].name).toBe('Frank');
    expect(users[1].name).toBe('Grace');
  });

  test('unorderedBulkWrite should execute operations with ordered: false', async () => {
    const ops = [
      { insertOne: { document: { name: 'Hank', email: 'hank@minglesphere.io', age: 33 } } },
      { insertOne: { document: { name: 'Ivy', email: 'ivy@minglesphere.io', age: 27 } } },
      { insertOne: { document: { name: 'Jack', email: 'jack@minglesphere.io', age: 31 } } },
    ];

    const result = await unorderedBulkWrite(BulkUser, ops);
    expect(result.insertedCount).toBe(3);

    const count = await BulkUser.countDocuments();
    expect(count).toBe(3);
  });

  test('interpretBulkResult should return a summary with insertedCount, modifiedCount, deletedCount, totalOperations', async () => {
    const summary = await interpretBulkResult(BulkUser);

    expect(summary).toHaveProperty('insertedCount');
    expect(summary).toHaveProperty('modifiedCount');
    expect(summary).toHaveProperty('deletedCount');
    expect(summary).toHaveProperty('totalOperations');
    expect(summary.insertedCount).toBe(3);
    expect(summary.modifiedCount).toBe(1);
    expect(summary.deletedCount).toBe(1);
    expect(summary.totalOperations).toBe(5);
  });
});
