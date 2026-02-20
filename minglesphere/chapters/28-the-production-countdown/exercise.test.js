import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/28-the-production-countdown.solution.js'
  : './exercise.js';
const {
  configureConnectionPool,
  leanQueryPerformance,
  analyzeQueryWithExplain,
  handleErrors,
  gracefulShutdown,
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

const prodSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: { type: String, default: 'user' },
});
const ProdUser = mongoose.models.ProdUser || mongoose.model('ProdUser', prodSchema);

describe('Chapter 28: The Production Countdown', () => {
  test('configureConnectionPool should return custom pool configuration options', async () => {
    const options = await configureConnectionPool();

    expect(options).toBeDefined();
    expect(options.maxPoolSize).toBe(20);
    expect(options.minPoolSize).toBe(5);
    expect(options.maxIdleTimeMS).toBe(30000);
  });

  test('leanQueryPerformance should return POJOs for lean and Mongoose docs for normal', async () => {
    const { leanResult, normalResult } = await leanQueryPerformance(ProdUser);

    expect(Array.isArray(leanResult)).toBe(true);
    expect(Array.isArray(normalResult)).toBe(true);
    expect(leanResult.length).toBe(100);
    expect(normalResult.length).toBe(100);

    // Lean results should be plain objects (no Mongoose document methods)
    expect(leanResult[0].save).toBeUndefined();
    expect(leanResult[0].toJSON).toBeUndefined();

    // Normal results should be Mongoose documents
    expect(typeof normalResult[0].save).toBe('function');
    expect(typeof normalResult[0].toJSON).toBe('function');
  });

  test('analyzeQueryWithExplain should return explain output showing index usage', async () => {
    const explainOutput = await analyzeQueryWithExplain(ProdUser);

    expect(explainOutput).toBeDefined();
    // The explain output should be an array or object containing executionStats
    const stats = Array.isArray(explainOutput) ? explainOutput[0] : explainOutput;
    expect(stats).toBeDefined();

    // Verify that the output contains query planner or execution stats info
    const hasQueryPlanner = stats.queryPlanner !== undefined;
    const hasExecutionStats = stats.executionStats !== undefined;
    expect(hasQueryPlanner || hasExecutionStats).toBe(true);
  });

  test('handleErrors should return a standardized ConnectionError object', async () => {
    const error = await handleErrors();

    expect(error).toBeDefined();
    expect(error.type).toBe('ConnectionError');
    expect(typeof error.message).toBe('string');
    expect(error.message.length).toBeGreaterThan(0);
  });

  test('gracefulShutdown should connect, perform operation, and disconnect cleanly', async () => {
    const result = await gracefulShutdown();

    expect(result).toBeDefined();
    expect(result.connected).toBe(true);
    expect(result.operationDone).toBe(true);
    expect(result.disconnected).toBe(true);
  });
});
