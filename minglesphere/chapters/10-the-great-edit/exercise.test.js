import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/10-the-great-edit.solution.js'
  : './exercise.js';
const {
  updateOneUser,
  findByIdAndUpdateUser,
  incrementProfileViews,
  unsetField,
  upsertUser,
} = await import(exercisePath);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  bio: String,
  profileViews: { type: Number, default: 0 },
  city: String,
}, { strict: false });

const User = mongoose.models.EditUser || mongoose.model('EditUser', userSchema);

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
  await disconnectFromDatabase();
});

beforeEach(async () => {
  await clearAllCollections();
});

describe('Chapter 10: The Great Edit', () => {
  test('updateOneUser should update a user with $set and return the update result', async () => {
    const user = await User.create({ name: 'Alice', email: 'alice@minglesphere.io', bio: 'Hello!' });
    const result = await updateOneUser(User, user._id, { bio: 'Updated bio' });

    expect(result.modifiedCount).toBe(1);
    expect(result.matchedCount).toBe(1);

    const updated = await User.findById(user._id).lean();
    expect(updated.bio).toBe('Updated bio');
  });

  test('findByIdAndUpdateUser should return the updated document with { new: true }', async () => {
    const user = await User.create({ name: 'Bob', email: 'bob@minglesphere.io', city: 'NYC' });
    const updated = await findByIdAndUpdateUser(User, user._id, { city: 'San Francisco' });

    expect(updated).not.toBeNull();
    expect(updated.city).toBe('San Francisco');
    expect(updated._id.toString()).toBe(user._id.toString());
  });

  test('incrementProfileViews should increment profileViews by 1', async () => {
    const user = await User.create({ name: 'Carol', email: 'carol@minglesphere.io', profileViews: 5 });
    const updated = await incrementProfileViews(User, user._id);

    expect(updated.profileViews).toBe(6);

    const again = await incrementProfileViews(User, user._id);
    expect(again.profileViews).toBe(7);
  });

  test('unsetField should remove a field from the document', async () => {
    const user = await User.create({ name: 'Dave', email: 'dave@minglesphere.io', bio: 'Will be removed' });
    const result = await unsetField(User, user._id, 'bio');

    expect(result.modifiedCount).toBe(1);

    const updated = await User.findById(user._id).lean();
    expect(updated.bio).toBeUndefined();
    expect(updated.name).toBe('Dave');
  });

  test('upsertUser should insert a new document when no match is found', async () => {
    const filter = { email: 'newuser@minglesphere.io' };
    const data = { name: 'New User', email: 'newuser@minglesphere.io', bio: 'Upserted!' };
    const result = await upsertUser(User, filter, data);

    expect(result.upsertedCount).toBe(1);

    const found = await User.findOne({ email: 'newuser@minglesphere.io' }).lean();
    expect(found).not.toBeNull();
    expect(found.name).toBe('New User');
    expect(found.bio).toBe('Upserted!');
  });
});
