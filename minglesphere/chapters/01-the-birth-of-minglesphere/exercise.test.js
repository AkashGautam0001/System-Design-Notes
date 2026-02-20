import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/01-the-birth-of-minglesphere.solution.js'
  : './exercise.js';
const { connectToMingleSphere, getConnectionState, getConnectionHost, listDatabases, disconnectFromMingleSphere } = await import(exercisePath);

describe('Chapter 1: The Birth of MingleSphere', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      await mongoose.connection.db.collection(col.name).deleteMany({});
    }
  });

  test('connectToMingleSphere should establish a connection to MongoDB', async () => {
    // The shared connection is already active, so we just verify the function works
    // We'll test with the existing connection URI
    const connection = await connectToMingleSphere(
      'mongodb://localhost:27017/minglesphere_test?replicaSet=rs0'
    );
    expect(connection).toBeDefined();
    expect(mongoose.connection.readyState).toBe(1);
  });

  test('getConnectionState should return 1 when connected', () => {
    const state = getConnectionState();
    expect(state).toBe(1);
  });

  test('getConnectionHost should return the database host', () => {
    const host = getConnectionHost();
    expect(typeof host).toBe('string');
    expect(host).toBeTruthy();
    expect(host).toMatch(/localhost|127\.0\.0\.1/);
  });

  test('listDatabases should return a list of databases', async () => {
    const result = await listDatabases();
    expect(result).toBeDefined();
    expect(result.databases).toBeDefined();
    expect(Array.isArray(result.databases)).toBe(true);
    expect(result.databases.length).toBeGreaterThan(0);
  });

  test('disconnectFromMingleSphere should disconnect from MongoDB', async () => {
    await disconnectFromMingleSphere();
    expect(mongoose.connection.readyState).not.toBe(1);
    // Reconnect for cleanup
    await connectToDatabase();
  });
});
