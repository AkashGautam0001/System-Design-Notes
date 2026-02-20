import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/12-the-clean-sweep.solution.js'
  : './exercise.js';
const {
  deleteOneUser,
  deleteManyUsers,
  findByIdAndDeleteUser,
  softDeleteUser,
  findActiveSoftDelete,
} = await import(exercisePath);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  status: String,
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
});

const SweepUser = mongoose.models.SweepUser || mongoose.model('SweepUser', userSchema);

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
  await disconnectFromDatabase();
});

beforeEach(async () => {
  await clearAllCollections();
});

describe('Chapter 12: The Clean Sweep', () => {
  test('deleteOneUser should delete a single user by _id and return deleteResult', async () => {
    const user = await SweepUser.create({ name: 'Alice', email: 'alice@minglesphere.io' });
    const result = await deleteOneUser(SweepUser, user._id);

    expect(result.deletedCount).toBe(1);

    const found = await SweepUser.findById(user._id);
    expect(found).toBeNull();
  });

  test('deleteManyUsers should delete all users matching the filter', async () => {
    await SweepUser.create([
      { name: 'Bob', email: 'bob@minglesphere.io', status: 'inactive' },
      { name: 'Carol', email: 'carol@minglesphere.io', status: 'inactive' },
      { name: 'Dave', email: 'dave@minglesphere.io', status: 'active' },
    ]);

    const result = await deleteManyUsers(SweepUser, { status: 'inactive' });
    expect(result.deletedCount).toBe(2);

    const remaining = await SweepUser.find();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('Dave');
  });

  test('findByIdAndDeleteUser should return the deleted document', async () => {
    const user = await SweepUser.create({ name: 'Eve', email: 'eve@minglesphere.io' });
    const deleted = await findByIdAndDeleteUser(SweepUser, user._id);

    expect(deleted).not.toBeNull();
    expect(deleted.name).toBe('Eve');
    expect(deleted._id.toString()).toBe(user._id.toString());

    const found = await SweepUser.findById(user._id);
    expect(found).toBeNull();
  });

  test('softDeleteUser should set isDeleted and deletedAt without removing the document', async () => {
    const user = await SweepUser.create({ name: 'Frank', email: 'frank@minglesphere.io' });
    const soft = await softDeleteUser(SweepUser, user._id);

    expect(soft.isDeleted).toBe(true);
    expect(soft.deletedAt).toBeDefined();
    expect(soft.deletedAt).toBeInstanceOf(Date);

    const stillExists = await SweepUser.findById(user._id);
    expect(stillExists).not.toBeNull();
  });

  test('findActiveSoftDelete should return only users where isDeleted is not true', async () => {
    await SweepUser.create([
      { name: 'Grace', email: 'grace@minglesphere.io', isDeleted: false },
      { name: 'Hank', email: 'hank@minglesphere.io', isDeleted: true, deletedAt: new Date() },
      { name: 'Ivy', email: 'ivy@minglesphere.io' },
    ]);

    const active = await findActiveSoftDelete(SweepUser);

    const names = active.map(u => u.name).sort();
    expect(names).toHaveLength(2);
    expect(names).toContain('Grace');
    expect(names).toContain('Ivy');
  });
});
