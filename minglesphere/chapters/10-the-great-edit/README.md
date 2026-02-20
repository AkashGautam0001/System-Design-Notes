# Chapter 10: The Great Edit

## The Story So Far

MingleSphere is growing fast, and users are clamoring for one essential feature: the ability to update their profiles. Some want to change their bio, others want a new display name, and a few power users have been refreshing their profiles so often that you need to track view counts.

The CTO walks over with a whiteboard sketch: "We need full update support -- surgical $set operations, atomic counters, field removal, and even upserts for our onboarding flow where we create-or-update in one shot."

You crack your knuckles. It is time to master the art of the edit.

## Concepts

### updateOne -- The Precision Strike

`updateOne` finds the first document matching a filter and applies an update. It returns a result object with metadata about what happened, but does **not** return the document itself.

```js
const result = await User.updateOne(
  { _id: userId },
  { $set: { bio: 'New bio text' } }
);

console.log(result.matchedCount);  // 1 if found
console.log(result.modifiedCount); // 1 if changed
```

### findByIdAndUpdate -- Edit and Return

When you need the updated document back, `findByIdAndUpdate` is your friend. Pass `{ new: true }` to get the document **after** the update is applied (otherwise you get the old version).

```js
const updated = await User.findByIdAndUpdate(
  userId,
  { $set: { city: 'San Francisco' } },
  { new: true }
);

console.log(updated.city); // 'San Francisco'
```

### $inc -- Atomic Counters

The `$inc` operator atomically increments (or decrements) a numeric field. Perfect for view counts, likes, and scores.

```js
await User.findByIdAndUpdate(userId, { $inc: { profileViews: 1 } });
// profileViews goes from 5 to 6 -- atomically, no race conditions
```

### $unset -- Removing Fields

Sometimes you need to remove a field entirely, not just set it to null. The `$unset` operator does exactly that.

```js
await User.updateOne(
  { _id: userId },
  { $unset: { temporaryToken: '' } }
);
// The temporaryToken field is completely gone from the document
```

### Upsert -- Create or Update

An **upsert** combines "update" and "insert." If the filter matches a document, it updates it. If not, it creates a new one with the filter criteria and the update data merged.

```js
const result = await User.updateOne(
  { email: 'new@example.com' },
  { $set: { name: 'New User', email: 'new@example.com' } },
  { upsert: true }
);

console.log(result.upsertedCount); // 1 if a new document was created
```

## Your Mission

Implement these five functions in `exercise.js`:

1. **`updateOneUser(Model, id, updates)`** -- Use `updateOne` to update a user by `_id` with `$set`. Return the raw update result.
2. **`findByIdAndUpdateUser(Model, id, updates)`** -- Use `findByIdAndUpdate` with `{ new: true }` to return the updated document.
3. **`incrementProfileViews(Model, id)`** -- Use `$inc` to increment `profileViews` by 1. Return the updated document.
4. **`unsetField(Model, id, fieldName)`** -- Use `$unset` to remove a field from the document. Return the update result.
5. **`upsertUser(Model, filter, data)`** -- Use `updateOne` with `upsert: true`. Return the result.

Run the tests with:
```bash
npm run test:10
```

## Hints

<details>
<summary>Hint 1: updateOneUser</summary>

Use the update operator `$set` to change only the specified fields:
```js
const result = await Model.updateOne({ _id: id }, { $set: updates });
return result;
```
The result object contains `matchedCount` and `modifiedCount`.

</details>

<details>
<summary>Hint 2: findByIdAndUpdateUser</summary>

The key is `{ new: true }` in the options -- without it you get the **old** document:
```js
const updated = await Model.findByIdAndUpdate(id, { $set: updates }, { new: true });
return updated;
```

</details>

<details>
<summary>Hint 3: incrementProfileViews</summary>

`$inc` adds a value to a numeric field atomically:
```js
const updated = await Model.findByIdAndUpdate(
  id,
  { $inc: { profileViews: 1 } },
  { new: true }
);
```

</details>

<details>
<summary>Hint 4: unsetField</summary>

Use computed property names to build the `$unset` dynamically:
```js
const result = await Model.updateOne({ _id: id }, { $unset: { [fieldName]: '' } });
```
The value you pass to `$unset` does not matter -- only the key matters.

</details>

<details>
<summary>Hint 5: upsertUser</summary>

Add `{ upsert: true }` as the third argument to `updateOne`:
```js
const result = await Model.updateOne(filter, { $set: data }, { upsert: true });
```
Check `result.upsertedCount` to see if a new document was created.

</details>
