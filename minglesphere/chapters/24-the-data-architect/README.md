# Chapter 24: The Data Architect

## Story

The analytics dashboard is live, but the product team wants more. "Show me each user with all their posts." "Which tags are trending?" "Give me a demographic breakdown and role summary -- in a single query." These requests go beyond basic aggregation. They require joining collections, deconstructing arrays, bucketing data into ranges, and running parallel pipelines.

You have graduated from data refinery operator to data architect. The aggregation pipeline's advanced stages -- `$lookup`, `$unwind`, `$bucket`, `$facet` -- are your power tools. With them, you can build complex analytical queries that would require multiple round trips or application-level processing in other systems.

Your mission: architect the advanced data pipelines that give MingleSphere's team deep insight into their platform.

## Concepts

### $lookup (Joins)

MongoDB is not a relational database, but `$lookup` gives you the ability to perform left outer joins between collections:

```js
{
  $lookup: {
    from: 'posts',           // The collection to join
    localField: '_id',       // Field from the input documents
    foreignField: 'author',  // Field from the "from" collection
    as: 'userPosts',         // Output array field name
  }
}
```

This adds a `userPosts` array to each document containing all matching documents from the `posts` collection.

### $unwind

Deconstructs an array field, outputting one document per array element:

```js
// Before: { tags: ['js', 'mongo', 'node'] }
{ $unwind: '$tags' }
// After: three documents, each with tags: 'js', tags: 'mongo', tags: 'node'
```

Commonly paired with `$group` to count or aggregate array elements:

```js
[
  { $unwind: '$tags' },
  { $group: { _id: '$tags', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]
```

### $bucket

Groups documents into buckets based on a specified expression and boundaries:

```js
{
  $bucket: {
    groupBy: '$age',
    boundaries: [0, 18, 30, 50, 100],  // Creates buckets: [0,18), [18,30), [30,50), [50,100)
    default: 'Other',                    // Bucket for values outside boundaries
    output: {
      count: { $sum: 1 },
    },
  }
}
```

Each bucket's `_id` is its lower boundary value.

### $facet

Runs multiple aggregation pipelines on the same set of input documents in a single stage. Each sub-pipeline produces its own output array:

```js
{
  $facet: {
    byRole: [
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ],
    ageStats: [
      { $group: { _id: null, avgAge: { $avg: '$age' }, minAge: { $min: '$age' }, maxAge: { $max: '$age' } } },
    ],
    total: [
      { $count: 'count' },
    ],
  }
}
```

The result is a single document with each facet name as a key containing its pipeline's output array.

### Conditional Expressions with $cond

Use `$cond` for if/then/else logic within aggregation expressions:

```js
{
  $addFields: {
    category: {
      $cond: {
        if: { $lt: ['$age', 18] },
        then: 'minor',
        else: {
          $cond: {
            if: { $lt: ['$age', 65] },
            then: 'adult',
            else: 'senior',
          },
        },
      },
    },
  }
}
```

For more than two branches, nested `$cond` works but `$switch` (from Chapter 23) is often cleaner.

## Your Mission

Open `exercise.js` and implement the five exported functions:

1. **lookupPosts(UserModel, PostModel)** -- Seed users and posts, use `$lookup` to join posts to users.
2. **unwindArray(Model)** -- Seed posts with tag arrays, `$unwind` tags, and count occurrences per tag.
3. **bucketByAge(Model)** -- Seed users with ages, use `$bucket` with boundaries `[0, 18, 30, 50, 100]`.
4. **facetSearch(Model)** -- Seed users, use `$facet` for role groups, age stats, and total count simultaneously.
5. **conditionalExpression(Model)** -- Seed users, use `$addFields` with `$cond` to categorize by age.

Run your tests with:
```bash
npm run test:24
```

## Hints

<details>
<summary>Hint 1: $lookup collection name</summary>

The `from` field in `$lookup` must be the actual MongoDB collection name (usually the lowercase plural of your model name). If your Post model uses collection `posts`, use `from: 'posts'`.

```js
{
  $lookup: {
    from: 'posts',
    localField: '_id',
    foreignField: 'author',
    as: 'userPosts',
  }
}
```
</details>

<details>
<summary>Hint 2: $unwind then $group pattern</summary>

This is a common two-step pattern for analyzing array data:

```js
[
  { $unwind: '$tags' },
  { $group: { _id: '$tags', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]
```
</details>

<details>
<summary>Hint 3: $bucket boundaries</summary>

Boundaries define half-open intervals: `[lower, upper)`. A document with `age: 18` falls into the `[18, 30)` bucket, not the `[0, 18)` bucket. The `default` bucket catches values outside all boundaries.
</details>

<details>
<summary>Hint 4: $facet returns a single document</summary>

The aggregation with `$facet` returns an array with one element. Access the facet result with `results[0]`:

```js
const results = await Model.aggregate([{ $facet: { ... } }]);
return results[0]; // { byRole: [...], ageStats: [...], total: [...] }
```
</details>

<details>
<summary>Hint 5: Nested $cond for three categories</summary>

For three categories (minor/adult/senior), nest two `$cond` expressions:

```js
{
  $cond: {
    if: { $lt: ['$age', 18] },
    then: 'minor',
    else: {
      $cond: {
        if: { $lt: ['$age', 65] },
        then: 'adult',
        else: 'senior',
      },
    },
  }
}
```
</details>
