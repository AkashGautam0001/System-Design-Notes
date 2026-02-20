# Chapter 23: The Data Refinery

## Story

The product team wants an analytics dashboard. "How many users do we have in each role?" "What is the average age of our active users?" "Show me user activity breakdowns." These questions cannot be answered with simple find queries -- they require computation across multiple documents.

Enter the aggregation pipeline. Think of it as an assembly line for data: documents flow in one end, pass through a series of processing stages, and emerge as refined results on the other end. Each stage transforms the data in some way -- filtering, grouping, computing, reshaping. It is one of MongoDB's most powerful features, and today you will learn its fundamentals.

Your mission: build the data processing pipelines that power MingleSphere's analytics dashboard.

## Concepts

### The Aggregation Pipeline

An aggregation pipeline is an array of stages. Documents pass through each stage sequentially:

```js
const results = await Model.aggregate([
  { $match: { active: true } },         // Stage 1: filter
  { $group: { _id: '$role', count: { $sum: 1 } } }, // Stage 2: group
  { $sort: { count: -1 } },             // Stage 3: sort
]);
```

### $match

Filters documents -- equivalent to a `find()` query. Place `$match` early in the pipeline to reduce the number of documents processed by later stages.

```js
{ $match: { active: true, age: { $gte: 18 } } }
```

### $group

Groups documents by a specified expression and applies accumulators:

```js
{
  $group: {
    _id: '$role',                    // Group key
    count: { $sum: 1 },             // Count docs in each group
    avgAge: { $avg: '$age' },       // Average of age field
    maxAge: { $max: '$age' },       // Maximum age
  }
}
```

Common accumulators: `$sum`, `$avg`, `$min`, `$max`, `$first`, `$last`, `$push`, `$addToSet`.

### $sort

Sorts the documents:

```js
{ $sort: { count: -1 } }  // descending by count
{ $sort: { username: 1 } } // ascending by username
```

### $project

Reshapes documents -- include, exclude, or compute new fields:

```js
{
  $project: {
    username: 1,
    email: 1,
    displayInfo: { $concat: ['$username', ' <', '$email', '>'] },
  }
}
```

### $addFields

Adds new fields to documents without removing existing ones (unlike `$project` which only includes fields you specify):

```js
{
  $addFields: {
    ageGroup: {
      $switch: {
        branches: [
          { case: { $lt: ['$age', 20] }, then: 'teen' },
          { case: { $lt: ['$age', 60] }, then: 'adult' },
        ],
        default: 'senior',
      },
    },
  }
}
```

### $count

Counts the number of documents at that point in the pipeline:

```js
{ $count: 'totalActive' }
// Output: [{ totalActive: 42 }]
```

### Putting It Together

```js
const results = await Model.aggregate([
  { $match: { active: true } },
  { $group: { _id: '$role', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 5 },
]);
```

## Your Mission

Open `exercise.js` and implement the five exported functions:

1. **groupByRole(Model)** -- Seed users, group by role, count each, sort by count descending.
2. **matchAndGroup(Model)** -- Seed users, match active users, group by role with average age.
3. **projectFields(Model)** -- Seed users, use `$project` with `$concat` to create a `displayInfo` field.
4. **addFieldsStage(Model)** -- Seed users with ages, use `$addFields` to compute an `ageGroup` field.
5. **countDocumentsAgg(Model)** -- Seed users, use `$match` then `$count` to count active users.

Run your tests with:
```bash
npm run test:23
```

## Hints

<details>
<summary>Hint 1: $group stage structure</summary>

The `_id` field in `$group` defines the group key. Use `$` prefix to reference document fields:

```js
{ $group: { _id: '$role', count: { $sum: 1 } } }
```
</details>

<details>
<summary>Hint 2: $concat in $project</summary>

`$concat` takes an array of strings and string expressions:

```js
{ $project: { displayInfo: { $concat: ['$username', ' <', '$email', '>'] } } }
```
</details>

<details>
<summary>Hint 3: $switch vs $cond for age groups</summary>

`$switch` is cleaner for multiple conditions:

```js
{
  $switch: {
    branches: [
      { case: { $lt: ['$age', 20] }, then: 'teen' },
      { case: { $lt: ['$age', 60] }, then: 'adult' },
    ],
    default: 'senior',
  }
}
```

`$cond` works for simple if/else but gets nested for multiple branches.
</details>

<details>
<summary>Hint 4: Extracting count value</summary>

The `$count` stage returns an array with one object. Extract the number:

```js
const results = await Model.aggregate([
  { $match: { active: true } },
  { $count: 'activeCount' },
]);
return results[0].activeCount; // returns the number
```
</details>
