# Chapter 27: The Map

## Story

MingleSphere is going local. Users want to discover people, events, and hangout spots nearby. The product team envisions a map view where you can see who is within walking distance, find the closest coffee shop for a meetup, or search for events inside a neighborhood boundary. But location queries are fundamentally different from text or numeric lookups -- you need spatial math, special indexes, and a data format the database understands.

MongoDB has first-class support for geospatial data through GeoJSON, the standard format for encoding geographic coordinates. Combined with 2dsphere indexes, MongoDB can answer questions like "find everything within 5 kilometers of me" or "what locations fall inside this polygon?" with remarkable efficiency. The aggregation framework even offers `$geoNear` for calculating actual distances in meters.

Your mission is to build the map layer for MingleSphere. You will design a GeoJSON schema with proper indexing, query for nearby locations using `$near`, search within circular and polygonal regions, and use the `$geoNear` aggregation stage to sort results by distance.

## Concepts

### GeoJSON and the 2dsphere Index

MongoDB uses the GeoJSON format to store location data. A Point is the most common type, storing longitude and latitude as coordinates.

```js
const schema = new mongoose.Schema({
  name: String,
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number], // [longitude, latitude]
  },
});

schema.index({ location: '2dsphere' });
```

**Important:** GeoJSON uses `[longitude, latitude]` order, not `[latitude, longitude]`.

### $near -- Find Nearby Points

The `$near` operator returns documents sorted by distance from a given point. It requires a 2dsphere index.

```js
const results = await Model.find({
  location: {
    $near: {
      $geometry: { type: 'Point', coordinates: [-73.97, 40.77] },
      $maxDistance: 5000, // meters
    },
  },
});
```

### $geoWithin with $centerSphere

Find all points within a circular area. The radius is specified in radians (divide meters by Earth's radius: 6378100).

```js
const radiusInRadians = 5000 / 6378100;
const results = await Model.find({
  location: {
    $geoWithin: {
      $centerSphere: [[-73.97, 40.77], radiusInRadians],
    },
  },
});
```

### $geoWithin with Polygon

Find all points inside a polygon boundary. The polygon is defined as a GeoJSON geometry with coordinates forming a closed ring.

```js
const results = await Model.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: 'Polygon',
        coordinates: [[
          [-74.05, 40.65],
          [-73.85, 40.65],
          [-73.85, 40.85],
          [-74.05, 40.85],
          [-74.05, 40.65], // first and last point must match
        ]],
      },
    },
  },
});
```

### $geoNear Aggregation Stage

The `$geoNear` stage must be the first stage in an aggregation pipeline. It calculates the distance from each document to the query point and adds it as a new field.

```js
const results = await Model.aggregate([
  {
    $geoNear: {
      near: { type: 'Point', coordinates: [-73.97, 40.77] },
      distanceField: 'distance', // name of the output field
      spherical: true,
    },
  },
]);
// Each result has a 'distance' field in meters
```

## Your Mission

Open `exercise.js` and implement the five exported functions:

1. **createGeoSchema** -- Define a schema with a GeoJSON location field, add a 2dsphere index, return the model.
2. **findNearby** -- Seed locations and use `$near` to find points within a maximum distance.
3. **findWithinCircle** -- Use `$geoWithin` with `$centerSphere` to find locations in a circular area.
4. **findWithinPolygon** -- Use `$geoWithin` with a GeoJSON Polygon to find locations inside a boundary.
5. **geoNearAggregation** -- Use the `$geoNear` aggregation stage to return results with calculated distances.

Run your tests with:
```bash
npm run test:27
```

## Hints

<details>
<summary>Hint 1: GeoJSON coordinate order</summary>

GeoJSON always uses `[longitude, latitude]`, not `[latitude, longitude]`. New York City's coordinates are approximately `[-73.97, 40.77]`. Getting the order wrong will produce empty results or errors.

</details>

<details>
<summary>Hint 2: Creating the 2dsphere index</summary>

Use `schema.index({ location: '2dsphere' })` and call `await Model.createIndexes()` to ensure the index is built before querying. Without this index, `$near` and `$geoNear` will throw errors.

</details>

<details>
<summary>Hint 3: Converting meters to radians</summary>

For `$centerSphere`, divide the radius in meters by Earth's radius (approximately 6378100 meters) to get radians. For example, 5 km = `5000 / 6378100` radians.

</details>

<details>
<summary>Hint 4: Polygon must be a closed ring</summary>

The first and last coordinate in a polygon ring must be identical. If your polygon has 4 corners, you need 5 coordinate pairs where the fifth is the same as the first.

</details>

<details>
<summary>Hint 5: $geoNear must be the first pipeline stage</summary>

The `$geoNear` aggregation stage must be the very first stage in the pipeline. Set `spherical: true` for GeoJSON data and `distanceField` to name the output field that will contain the calculated distance in meters.

</details>
