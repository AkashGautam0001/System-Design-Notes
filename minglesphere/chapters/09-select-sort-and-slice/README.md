# Chapter 9: Select, Sort, and Slice

## Story

The MingleSphere user list page is painfully slow. The frontend team is frustrated: "Why are you sending us every single field for every single user? We only need usernames and emails for the list view!" On top of that, users want to see the newest members first, and the infinite scroll feature needs proper pagination. The data is there, but it needs to be shaped, ordered, and portioned before it leaves the server.

Enter the trio of query refinement: `.select()` to pick only the fields you need, `.sort()` to order results, and `.skip()` / `.limit()` to slice the results into pages. Add `.distinct()` for extracting unique values and `.countDocuments()` for efficient counting, and you have a complete toolkit for optimizing data delivery.

Your mission: master these query modifiers to make MingleSphere's data layer lean and fast. You will select specific fields, sort results, implement pagination, extract distinct values, and count documents -- all essential skills for building production-ready APIs.

## Concepts

### Field Selection with .select()

Return only the fields you need. This reduces bandwidth and improves performance.

```js
// Return only username and email (plus _id by default)
const users = await User.find().select('username email');

// Exclude specific fields with a minus sign
const users = await User.find().select('-password -__v');
```

### Sorting with .sort()

Order results by one or more fields.

```js
// Sort by age, descending
const users = await User.find().sort({ age: -1 });

// String shorthand: prefix with '-' for descending
const users = await User.find().sort('-age');

// Multiple fields
const users = await User.find().sort({ role: 1, age: -1 });
```

### Pagination with .skip() and .limit()

Implement page-based navigation through results.

```js
const page = 2;
const limit = 10;
const skip = (page - 1) * limit;

const users = await User.find()
  .sort({ username: 1 })
  .skip(skip)
  .limit(limit);
```

### Distinct Values with .distinct()

Extract unique values for a specific field across all documents.

```js
const roles = await User.distinct('role');
// ['user', 'admin', 'moderator']
```

### Counting with .countDocuments()

Efficiently count documents matching a filter without fetching them.

```js
const activeCount = await User.countDocuments({ isActive: true });
console.log(`There are ${activeCount} active users`);
```

## Your Mission

Open `exercise.js` and implement the five exported functions. Each function receives a Mongoose Model and should seed its own data before running the query.

1. **selectFields(Model)** -- Seed users, use `.select('username email')` to return only those fields.
2. **sortUsers(Model)** -- Seed users, sort by age descending.
3. **paginateUsers(Model, page, limit)** -- Seed 10 users, implement skip/limit pagination.
4. **getDistinctRoles(Model)** -- Seed users with various roles, use `.distinct('role')`.
5. **countActiveUsers(Model)** -- Seed users with mixed `isActive` values, use `.countDocuments()`.

Run your tests with:
```bash
npm run test:09
```

## Hints

<details>
<summary>Hint 1: Select only specific fields</summary>

```js
const results = await Model.find().select('username email');
```

This returns documents with only `_id`, `username`, and `email`. The `_id` field is included by default unless explicitly excluded with `select('-_id username email')`.

</details>

<details>
<summary>Hint 2: Sorting descending</summary>

Use `-1` for descending order:

```js
const results = await Model.find().sort({ age: -1 });
```

Or use the string shorthand: `.sort('-age')`.

</details>

<details>
<summary>Hint 3: Implementing pagination</summary>

Calculate the skip value from the page number:

```js
const skip = (page - 1) * limit;
const results = await Model.find().sort({ username: 1 }).skip(skip).limit(limit);
```

Always sort before paginating for consistent results across pages.

</details>

<details>
<summary>Hint 4: Distinct and countDocuments</summary>

Both are straightforward:

```js
const roles = await Model.distinct('role');
const count = await Model.countDocuments({ isActive: true });
```

Make sure to seed diverse data so your results are meaningful.

</details>
