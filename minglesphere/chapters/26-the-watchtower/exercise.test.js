import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/26-the-watchtower.solution.js'
  : './exercise.js';
const {
  watchForInserts,
  watchForUpdates,
  watchWithFullDocument,
  watchWithFilter,
  getResumeToken,
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

const watchSchema = new mongoose.Schema({
  name: String,
  status: { type: String, default: 'active' },
});
const WatchUser = mongoose.models.WatchUser || mongoose.model('WatchUser', watchSchema);

describe('Chapter 26: The Watchtower', () => {
  test('watchForInserts should capture an insert change event', async () => {
    const event = await watchForInserts(WatchUser);

    expect(event).toBeDefined();
    expect(event.operationType).toBe('insert');
    expect(event.fullDocument).toBeDefined();
    expect(event.fullDocument.name).toBeDefined();
  });

  test('watchForUpdates should capture an update change event', async () => {
    const event = await watchForUpdates(WatchUser);

    expect(event).toBeDefined();
    expect(event.operationType).toBe('update');
    expect(event.updateDescription).toBeDefined();
    expect(event.updateDescription.updatedFields).toBeDefined();
  });

  test('watchWithFullDocument should include the full document on update events', async () => {
    const fullDoc = await watchWithFullDocument(WatchUser);

    expect(fullDoc).toBeDefined();
    expect(fullDoc.name).toBeDefined();
    expect(fullDoc._id).toBeDefined();
  });

  test('watchWithFilter should only capture insert events', async () => {
    const events = await watchWithFilter(WatchUser);

    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThanOrEqual(1);
    events.forEach((event) => {
      expect(event.operationType).toBe('insert');
    });
  });

  test('getResumeToken should return a truthy resume token', async () => {
    const token = await getResumeToken(WatchUser);

    expect(token).toBeDefined();
    expect(token).toBeTruthy();
  });
});
