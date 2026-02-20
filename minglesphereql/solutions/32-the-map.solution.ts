import { getPool } from '../shared/connection.js';

/**
 * Chapter 32: The Map - SOLUTIONS
 */

export async function insertLocation(
  name: string,
  lng: number,
  lat: number,
  category: string,
): Promise<any> {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO locations (name, coordinates, category)
     VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4)
     RETURNING id, name, category, ST_AsText(coordinates) as coordinates_text`,
    [name, lng, lat, category],
  );
  return result.rows[0];
}

export async function findLocationsWithinRadius(
  lng: number,
  lat: number,
  radiusMeters: number,
): Promise<any[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, name, category,
       ST_Distance(coordinates::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_meters
     FROM locations
     WHERE ST_DWithin(coordinates::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
     ORDER BY distance_meters ASC`,
    [lng, lat, radiusMeters],
  );
  return result.rows;
}

export async function calculateDistance(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
): Promise<{ distanceMeters: number }> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT ST_Distance(
       ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
       ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
     ) as distance_meters`,
    [lng1, lat1, lng2, lat2],
  );
  return { distanceMeters: parseFloat(result.rows[0].distance_meters) };
}

export async function createSpatialIndex(): Promise<{ created: boolean }> {
  const pool = getPool();
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations USING GIST(coordinates)`,
  );
  const result = await pool.query(
    `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_locations_coordinates'`,
  );
  return { created: result.rows.length > 0 };
}

export async function findLocationsInBoundingBox(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
): Promise<any[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, name, category, ST_AsText(coordinates) as coordinates_text
     FROM locations
     WHERE coordinates && ST_MakeEnvelope($1, $2, $3, $4, 4326)
     ORDER BY name`,
    [minLng, minLat, maxLng, maxLat],
  );
  return result.rows;
}
