import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getPool, closeConnection } from '../../shared/connection.js';
import { clearAllTables } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/32-the-map.solution.ts'
  : './exercise.ts';

const {
  insertLocation,
  findLocationsWithinRadius,
  calculateDistance,
  createSpatialIndex,
  findLocationsInBoundingBox,
} = await import(exercisePath);

describe('Chapter 32: The Map', () => {
  beforeEach(async () => {
    await clearAllTables();
    const pool = getPool();
    await pool.query('DROP INDEX IF EXISTS idx_locations_coordinates');
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('should insert a location with PostGIS coordinates', async () => {
    const result = await insertLocation('Central Park', -73.9654, 40.7829, 'landmark');

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBe('Central Park');
    expect(result.category).toBe('landmark');
    expect(result.coordinates_text).toContain('POINT');
    expect(result.coordinates_text).toContain('-73.9654');
    expect(result.coordinates_text).toContain('40.7829');
  });

  it('should find locations within a given radius', async () => {
    // Insert several locations around New York City
    await insertLocation('Times Square', -73.9855, 40.7580, 'landmark');
    await insertLocation('Central Park', -73.9654, 40.7829, 'landmark');
    await insertLocation('Statue of Liberty', -74.0445, 40.6892, 'landmark');
    await insertLocation('Los Angeles', -118.2437, 34.0522, 'city');

    // Search within 10km of Times Square
    const nearby = await findLocationsWithinRadius(-73.9855, 40.7580, 10000);

    // Times Square, Central Park, and Statue of Liberty should be within 10km
    // Los Angeles should NOT be
    expect(nearby.length).toBe(3);
    expect(nearby.every((loc: any) => loc.distance_meters !== undefined)).toBe(true);
    // Results should be ordered by distance
    for (let i = 1; i < nearby.length; i++) {
      expect(parseFloat(nearby[i].distance_meters)).toBeGreaterThanOrEqual(
        parseFloat(nearby[i - 1].distance_meters),
      );
    }
  });

  it('should calculate the distance between two geographic points', async () => {
    // Distance between the Eiffel Tower and the Statue of Liberty
    const eiffelLng = 2.2945;
    const eiffelLat = 48.8584;
    const libertyLng = -74.0445;
    const libertyLat = 40.6892;

    const result = await calculateDistance(eiffelLng, eiffelLat, libertyLng, libertyLat);

    expect(result).toBeDefined();
    expect(result.distanceMeters).toBeDefined();
    expect(typeof result.distanceMeters).toBe('number');
    // The real distance is roughly 5,837 km
    expect(result.distanceMeters).toBeGreaterThan(5_500_000);
    expect(result.distanceMeters).toBeLessThan(6_200_000);
  });

  it('should create a GiST spatial index on coordinates', async () => {
    const result = await createSpatialIndex();

    expect(result).toBeDefined();
    expect(result.created).toBe(true);

    // Verify the index exists in the database
    const pool = getPool();
    const indexCheck = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_locations_coordinates'`,
    );
    expect(indexCheck.rows.length).toBe(1);
  });

  it('should find locations within a bounding box', async () => {
    // Insert locations
    await insertLocation('Brooklyn Bridge', -73.9969, 40.7061, 'landmark');
    await insertLocation('Empire State', -73.9857, 40.7484, 'landmark');
    await insertLocation('Golden Gate Bridge', -122.4783, 37.8199, 'landmark');

    // Bounding box roughly covering Manhattan
    const results = await findLocationsInBoundingBox(-74.05, 40.68, -73.90, 40.80);

    expect(results.length).toBe(2);
    const names = results.map((r: any) => r.name);
    expect(names).toContain('Brooklyn Bridge');
    expect(names).toContain('Empire State');
    // Golden Gate Bridge is in San Francisco, should be excluded
    expect(names).not.toContain('Golden Gate Bridge');
    // Results ordered by name
    expect(results[0].name).toBe('Brooklyn Bridge');
    expect(results[1].name).toBe('Empire State');
    expect(results[0].coordinates_text).toBeDefined();
  });
});
