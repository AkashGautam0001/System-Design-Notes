import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/04-finding-your-people.solution.js'
  : './exercise.js';
const { findAllUsers, findUserByUsername, findUserById, findActiveUsers, findUsersLean } = await import(exercisePath);

describe('Chapter 4: Finding Your People', () => {
  let UserModel;
  let seededUsers;

  beforeAll(async () => {
    await connectToDatabase();

    const schema = new mongoose.Schema({
      username: { type: String, required: true },
      email: { type: String, required: true },
      age: Number,
      joinedAt: { type: Date, default: Date.now },
      isActive: { type: Boolean, default: true },
    });

    UserModel = mongoose.models['ChapterFourUser'] || mongoose.model('ChapterFourUser', schema);
  });

  afterAll(async () => {
    delete mongoose.connection.models['ChapterFourUser'];
    delete mongoose.models['ChapterFourUser'];
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      await mongoose.connection.db.collection(col.name).deleteMany({});
    }

    // Seed test data
    seededUsers = await UserModel.insertMany([
      { username: 'alice', email: 'alice@minglesphere.com', age: 28, isActive: true },
      { username: 'bob', email: 'bob@minglesphere.com', age: 32, isActive: false },
      { username: 'charlie', email: 'charlie@minglesphere.com', age: 25, isActive: true },
    ]);
  });

  test('findAllUsers should return all documents in the collection', async () => {
    const users = await findAllUsers(UserModel);
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBe(3);
    const usernames = users.map((u) => u.username).sort();
    expect(usernames).toEqual(['alice', 'bob', 'charlie']);
  });

  test('findUserByUsername should return a single user matching the username', async () => {
    const user = await findUserByUsername(UserModel, 'bob');
    expect(user).not.toBeNull();
    expect(user.username).toBe('bob');
    expect(user.email).toBe('bob@minglesphere.com');
  });

  test('findUserById should return a user by their _id', async () => {
    const targetId = seededUsers[0]._id;
    const user = await findUserById(UserModel, targetId);
    expect(user).not.toBeNull();
    expect(user._id.toString()).toBe(targetId.toString());
    expect(user.username).toBe('alice');
  });

  test('findActiveUsers should return only users with isActive: true', async () => {
    const activeUsers = await findActiveUsers(UserModel);
    expect(Array.isArray(activeUsers)).toBe(true);
    expect(activeUsers.length).toBe(2);
    activeUsers.forEach((u) => {
      expect(u.isActive).toBe(true);
    });
    const usernames = activeUsers.map((u) => u.username).sort();
    expect(usernames).toEqual(['alice', 'charlie']);
  });

  test('findUsersLean should return plain JS objects, not Mongoose documents', async () => {
    const users = await findUsersLean(UserModel);
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBe(3);
    // Lean objects should NOT have Mongoose document methods
    users.forEach((u) => {
      expect(u.save).toBeUndefined();
      expect(u.username).toBeDefined();
    });
  });
});
