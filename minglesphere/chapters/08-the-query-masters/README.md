# Chapter 8: The Query Masters

## Story

MingleSphere now has thousands of users, each with different ages, roles, and profiles. The community team needs powerful search capabilities: "Find all users between 25 and 50." "Show me all admins and moderators." "Who signed up without filling in their bio?" Simple equality checks are no longer enough. It is time to become a query master.

MongoDB provides a rich query language with comparison operators (`$gt`, `$lt`, `$in`, `$nin`), logical operators (`$and`, `$or`, `$not`, `$nor`), and element operators (`$exists`, `$type`). Mongoose exposes all of these through the familiar `Model.find()` method. By combining these operators, you can express virtually any query imaginable.

Your mission: write five query functions that seed their own test data and use MongoDB query operators to find exactly the right documents. Each function must both insert the data and run the query, returning the results.

## Concepts

### Comparison Operators

Use `$gt`, `$gte`, `$lt`, `$lte` to compare values.

```js
// Find users older than 25 and younger than 50
const results = await User.find({ age: { $gt: 25, $lt: 50 } });
```

### The $in and $nin Operators

Match values against a set of allowed (or disallowed) values.

```js
// Find users with role 'admin' or 'moderator'
const results = await User.find({ role: { $in: ['admin', 'moderator'] } });

// Find users NOT in the 'banned' role
const results = await User.find({ role: { $nin: ['banned'] } });
```

### Logical Operators

Combine conditions with `$and`, `$or`, `$not`, `$nor`.

```js
// Find users who are under 18 OR have role 'admin'
const results = await User.find({
  $or: [
    { age: { $lt: 18 } },
    { role: 'admin' },
  ],
});
```

### Regular Expressions with $regex

Search for patterns in string fields.

```js
// Find usernames starting with 'john' (case-insensitive)
const results = await User.find({
  username: { $regex: /^john/i },
});
```

### The $exists Operator

Check whether a field is present (or absent) in a document.

```js
// Find users who have a bio field
const results = await User.find({ bio: { $exists: true } });

// Find users missing a bio
const results = await User.find({ bio: { $exists: false } });
```

## Your Mission

Open `exercise.js` and implement the five exported functions. Each function receives a Mongoose Model and should:

1. Seed test data into the collection using `Model.create()`.
2. Run a query using the appropriate MongoDB operator.
3. Return the query results.

Functions to implement:

1. **findByComparison(Model)** -- Seed users, find those with `age > 25 AND age < 50`.
2. **findByInOperator(Model)** -- Seed users, find those with role `$in ['admin', 'moderator']`.
3. **findByLogicalOr(Model)** -- Seed users, find those with `age < 18 OR role === 'admin'`.
4. **findByRegex(Model)** -- Seed users, find those whose username matches `/^john/i`.
5. **findByExists(Model)** -- Seed users (some with bio, some without), find those where `bio $exists: true`.

Run your tests with:
```bash
npm run test:08
```

## Hints

<details>
<summary>Hint 1: Seeding data</summary>

Use `Model.create()` with an array of objects to insert multiple documents at once:

```js
await Model.create([
  { username: 'alice', age: 20, role: 'user' },
  { username: 'bob', age: 35, role: 'admin' },
  // ...
]);
```
</details>

<details>
<summary>Hint 2: Combining comparison operators</summary>

You can use multiple comparison operators on the same field:

```js
const results = await Model.find({ age: { $gt: 25, $lt: 50 } });
```

This finds documents where age is between 25 and 50 (exclusive).
</details>

<details>
<summary>Hint 3: Using $or</summary>

The `$or` operator takes an array of conditions. A document matches if ANY condition is true:

```js
const results = await Model.find({
  $or: [{ age: { $lt: 18 } }, { role: 'admin' }],
});
```
</details>

<details>
<summary>Hint 4: $exists for optional fields</summary>

When seeding data for the `$exists` test, create some users with the `bio` field and some without it. Use `{ bio: { $exists: true } }` in your query. Make sure the schema allows the bio field (set `strict: false` or define bio as Mixed type).

</details>
