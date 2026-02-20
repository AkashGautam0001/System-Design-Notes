import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/27-the-map.solution.js'
  : './exercise.js';
const {
  createGeoSchema,
  findNearby,
  findWithinCircle,
  findWithinPolygon,
  geoNearAggregation,
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

describe('Chapter 27: The Map', () => {
  test('createGeoSchema should create a model with a GeoJSON location field and 2dsphere index', async () => {
    const GeoModel = await createGeoSchema();

    expect(GeoModel).toBeDefined();
    expect(GeoModel.modelName).toBeDefined();

    // Create a document with a GeoJSON point to verify the schema
    const doc = await GeoModel.create({
      name: 'Test Place',
      location: { type: 'Point', coordinates: [-73.97, 40.77] },
    });

    expect(doc.location.type).toBe('Point');
    expect(doc.location.coordinates).toEqual([-73.97, 40.77]);

    // Verify 2dsphere index exists
    const indexes = await GeoModel.collection.indexes();
    const geoIndex = indexes.find((idx) =>
      Object.values(idx.key).includes('2dsphere')
    );
    expect(geoIndex).toBeDefined();
  });

  test('findNearby should return locations near a given point within max distance', async () => {
    const GeoModel = await createGeoSchema();
    await GeoModel.collection.dropIndexes();
    await GeoModel.createIndexes();

    const results = await findNearby(GeoModel, -73.97, 40.77, 50000);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    results.forEach((doc) => {
      expect(doc.location).toBeDefined();
      expect(doc.location.coordinates).toBeDefined();
    });
  });

  test('findWithinCircle should return locations within a circular area', async () => {
    const GeoModel = await createGeoSchema();
    await GeoModel.collection.dropIndexes();
    await GeoModel.createIndexes();

    // Search within 50km of central New York
    const results = await findWithinCircle(GeoModel, -73.97, 40.77, 50000);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    results.forEach((doc) => {
      expect(doc.location).toBeDefined();
    });
  });

  test('findWithinPolygon should return locations inside a polygon', async () => {
    const GeoModel = await createGeoSchema();
    await GeoModel.collection.dropIndexes();
    await GeoModel.createIndexes();

    // A large polygon around New York area
    const polygonCoords = [[
      [-74.05, 40.65],
      [-73.85, 40.65],
      [-73.85, 40.85],
      [-74.05, 40.85],
      [-74.05, 40.65],
    ]];

    const results = await findWithinPolygon(GeoModel, polygonCoords);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    results.forEach((doc) => {
      expect(doc.location).toBeDefined();
    });
  });

  test('geoNearAggregation should return results with a calculated distance field', async () => {
    const GeoModel = await createGeoSchema();
    await GeoModel.collection.dropIndexes();
    await GeoModel.createIndexes();

    const results = await geoNearAggregation(GeoModel, -73.97, 40.77);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    // Each result should have a distance field
    results.forEach((doc) => {
      expect(doc.distance).toBeDefined();
      expect(typeof doc.distance).toBe('number');
    });
    // Results should be sorted by distance (ascending)
    for (let i = 1; i < results.length; i++) {
      expect(results[i].distance).toBeGreaterThanOrEqual(results[i - 1].distance);
    }
  });
});
