# Chapter 4: Finding Your People

## The Story So Far

MingleSphere is growing! Users are signing up, and the database is filling with profiles. But a social platform isn't much use if people can't find each other. The product team has submitted the first feature request: "We need search. Users should be able to find others by name, by ID, and filter by activity status."

Querying is the bread and butter of any database application. Mongoose provides an elegant API for building queries: `find()` for multiple documents, `findOne()` for a single match, and `findById()` for ID lookups. Each returns a Query object that you can chain additional methods onto before execution.

There's also an important performance concept to learn: the difference between full Mongoose documents and lean queries. When you use `.lean()`, Mongoose skips the overhead of hydrating documents, giving you plain JavaScript objects that are faster to process. This distinction will matter a lot as MingleSphere scales.

## Concepts

### find() - Find Multiple Documents

`Model.find(filter)` returns all documents matching the filter:

```js
// Find all users
const allUsers = await User.find();

// Find users with age > 25
const adults = await User.find({ age: { $gt: 25 } });

// Find active users
const active = await User.find({ isActive: true });
```

### findOne() - Find a Single Document

`Model.findOne(filter)` returns the first document matching the filter, or `null`:

```js
const user = await User.findOne({ username: 'alice' });
if (user) {
  console.log(user.email); // alice@example.com
}
```

### findById() - Find by ID

`Model.findById(id)` is shorthand for `findOne({ _id: id })`:

```js
const user = await User.findById('507f1f77bcf86cd799439011');
```

### Query Objects

Mongoose methods return Query objects that are thenable (can be awaited). You can chain methods:

```js
const users = await User
  .find({ isActive: true })
  .sort({ username: 1 })
  .limit(10)
  .select('username email');
```

### lean() - Plain Objects

By default, queries return full Mongoose documents with change tracking, validation, and methods like `.save()`. Using `.lean()` returns plain JavaScript objects:

```js
// Full Mongoose document
const doc = await User.findOne({ username: 'alice' });
doc.save;  // function - available

// Lean / plain object
const plain = await User.findOne({ username: 'alice' }).lean();
plain.save;  // undefined - not available
```

Lean queries are significantly faster because Mongoose skips:
- Hydration (creating Mongoose document instances)
- Change tracking
- Getters/setters
- Default application

## Your Mission

Implement these five functions in `exercise.js`:

1. **`findAllUsers(Model)`** -- Return all documents using `Model.find()`
2. **`findUserByUsername(Model, username)`** -- Find one user by username with `findOne()`
3. **`findUserById(Model, id)`** -- Find a user by their `_id` with `findById()`
4. **`findActiveUsers(Model)`** -- Find all users where `isActive` is `true`
5. **`findUsersLean(Model)`** -- Find all users using `.lean()` for plain objects

Run the tests with:
```bash
npm run test:04
```

## Hints

<details>
<summary>Hint 1: Finding all users</summary>

```js
return Model.find();
```

Calling `find()` with no arguments or an empty object returns all documents.

</details>

<details>
<summary>Hint 2: Finding by username</summary>

```js
return Model.findOne({ username });
```

`findOne` returns a single document or `null` if no match is found.

</details>

<details>
<summary>Hint 3: Finding by ID</summary>

```js
return Model.findById(id);
```

You can pass a string or an ObjectId instance.

</details>

<details>
<summary>Hint 4: Finding active users</summary>

```js
return Model.find({ isActive: true });
```

</details>

<details>
<summary>Hint 5: Using lean()</summary>

```js
return Model.find().lean();
```

The `.lean()` method can be chained onto any query. The returned objects won't have Mongoose document methods like `.save()`.

</details>
