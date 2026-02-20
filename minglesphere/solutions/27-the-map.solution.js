import mongoose from 'mongoose';

/**
 * Create a schema with a GeoJSON 'location' field and a 2dsphere index.
 * Return the model.
 */
export async function createGeoSchema() {
  const geoSchema = new mongoose.Schema({
    name: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
  });

  geoSchema.index({ location: '2dsphere' });

  const GeoPlace = mongoose.models.GeoPlace || mongoose.model('GeoPlace', geoSchema);

  // Ensure indexes are created
  await GeoPlace.createIndexes();

  return GeoPlace;
}

/**
 * Seed locations and use $near to find nearby points.
 */
export async function findNearby(Model, longitude, latitude, maxDistanceMeters) {
  // Seed locations around New York area
  await Model.create([
    { name: 'Central Park', location: { type: 'Point', coordinates: [-73.9654, 40.7829] } },
    { name: 'Times Square', location: { type: 'Point', coordinates: [-73.9855, 40.7580] } },
    { name: 'Brooklyn Bridge', location: { type: 'Point', coordinates: [-73.9969, 40.7061] } },
    { name: 'Statue of Liberty', location: { type: 'Point', coordinates: [-74.0445, 40.6892] } },
    { name: 'JFK Airport', location: { type: 'Point', coordinates: [-73.7781, 40.6413] } },
    { name: 'Boston', location: { type: 'Point', coordinates: [-71.0589, 42.3601] } },
    { name: 'Philadelphia', location: { type: 'Point', coordinates: [-75.1652, 39.9526] } },
  ]);

  const results = await Model.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistanceMeters,
      },
    },
  });

  return results;
}

/**
 * Use $geoWithin with $centerSphere to find locations within a circle.
 */
export async function findWithinCircle(Model, centerLon, centerLat, radiusMeters) {
  // Seed locations
  await Model.create([
    { name: 'Central Park', location: { type: 'Point', coordinates: [-73.9654, 40.7829] } },
    { name: 'Times Square', location: { type: 'Point', coordinates: [-73.9855, 40.7580] } },
    { name: 'Brooklyn Bridge', location: { type: 'Point', coordinates: [-73.9969, 40.7061] } },
    { name: 'Statue of Liberty', location: { type: 'Point', coordinates: [-74.0445, 40.6892] } },
    { name: 'JFK Airport', location: { type: 'Point', coordinates: [-73.7781, 40.6413] } },
    { name: 'Boston', location: { type: 'Point', coordinates: [-71.0589, 42.3601] } },
    { name: 'Philadelphia', location: { type: 'Point', coordinates: [-75.1652, 39.9526] } },
  ]);

  // Convert meters to radians (Earth's radius ~6378100 meters)
  const radiusInRadians = radiusMeters / 6378100;

  const results = await Model.find({
    location: {
      $geoWithin: {
        $centerSphere: [[centerLon, centerLat], radiusInRadians],
      },
    },
  });

  return results;
}

/**
 * Use $geoWithin with $geometry of type Polygon to find locations within it.
 */
export async function findWithinPolygon(Model, polygonCoordinates) {
  // Seed locations
  await Model.create([
    { name: 'Central Park', location: { type: 'Point', coordinates: [-73.9654, 40.7829] } },
    { name: 'Times Square', location: { type: 'Point', coordinates: [-73.9855, 40.7580] } },
    { name: 'Brooklyn Bridge', location: { type: 'Point', coordinates: [-73.9969, 40.7061] } },
    { name: 'Statue of Liberty', location: { type: 'Point', coordinates: [-74.0445, 40.6892] } },
    { name: 'JFK Airport', location: { type: 'Point', coordinates: [-73.7781, 40.6413] } },
    { name: 'Boston', location: { type: 'Point', coordinates: [-71.0589, 42.3601] } },
    { name: 'Philadelphia', location: { type: 'Point', coordinates: [-75.1652, 39.9526] } },
  ]);

  const results = await Model.find({
    location: {
      $geoWithin: {
        $geometry: {
          type: 'Polygon',
          coordinates: polygonCoordinates,
        },
      },
    },
  });

  return results;
}

/**
 * Use $geoNear aggregation stage to find nearby locations with distance.
 */
export async function geoNearAggregation(Model, longitude, latitude) {
  // Seed locations
  await Model.create([
    { name: 'Central Park', location: { type: 'Point', coordinates: [-73.9654, 40.7829] } },
    { name: 'Times Square', location: { type: 'Point', coordinates: [-73.9855, 40.7580] } },
    { name: 'Brooklyn Bridge', location: { type: 'Point', coordinates: [-73.9969, 40.7061] } },
    { name: 'Statue of Liberty', location: { type: 'Point', coordinates: [-74.0445, 40.6892] } },
    { name: 'JFK Airport', location: { type: 'Point', coordinates: [-73.7781, 40.6413] } },
  ]);

  const results = await Model.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        distanceField: 'distance',
        spherical: true,
      },
    },
  ]);

  return results;
}
