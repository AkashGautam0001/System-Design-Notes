# Chapter 11: Array Alchemy

## The Story So Far

MingleSphere users love tagging their posts. Some tag everything with #mongodb, others go wild with dozens of niche tags. The product team wants rich array manipulation: adding tags, preventing duplicates, removing stale tags, capping tag lists, and even renaming tags in-place.

"Arrays are the secret sauce of document databases," the CTO explains. "In SQL you would need a whole join table. In MongoDB, arrays live right inside the document -- but you need the right operators to manipulate them safely."

Time to learn array alchemy.

## Concepts

### $push -- Adding to an Array

The `$push` operator appends a value to an array field.

```js
await Post.findByIdAndUpdate(postId, {
  $push: { tags: 'mongodb' }
}, { new: true });
// tags: ['javascript', 'mongodb']
```

Note: `$push` allows duplicates. If 'mongodb' is already there, it will appear twice.

### $addToSet -- No Duplicates Allowed

`$addToSet` works like `$push` but only adds the value if it does not already exist in the array.

```js
await Post.findByIdAndUpdate(postId, {
  $addToSet: { tags: 'mongodb' }
}, { new: true });
// If 'mongodb' is already in tags, nothing changes
```

### $pull -- Removing from an Array

`$pull` removes all instances of a value from an array.

```js
await Post.findByIdAndUpdate(postId, {
  $pull: { tags: 'deprecated-tag' }
}, { new: true });
// 'deprecated-tag' is gone from tags
```

### $push with $each and $slice -- Capped Arrays

You can push multiple values at once with `$each`, and use `$slice` to cap the array size. A negative `$slice` keeps the **last** N elements.

```js
await Post.findByIdAndUpdate(postId, {
  $push: {
    tags: {
      $each: ['new1', 'new2', 'new3'],
      $slice: -5  // keep only the last 5 tags
    }
  }
}, { new: true });
```

### Positional $ Operator -- Updating a Specific Element

The positional `$` operator lets you update the first array element that matches the query condition.

```js
await Post.findOneAndUpdate(
  { _id: postId, tags: 'old-tag' },   // match the array element
  { $set: { 'tags.$': 'new-tag' } },  // update the matched element
  { new: true }
);
```

The `$` in `'tags.$'` refers to the position of the element matched by `tags: 'old-tag'` in the query filter.

## Your Mission

Implement these five functions in `exercise.js`:

1. **`pushToArray(Model, id, tag)`** -- Use `$push` to add a tag to the `tags` array. Return the updated document.
2. **`addToSetArray(Model, id, tag)`** -- Use `$addToSet` to add a tag without duplicates. Return the updated document.
3. **`pullFromArray(Model, id, tag)`** -- Use `$pull` to remove a tag. Return the updated document.
4. **`pushMultipleWithSlice(Model, id, tags, maxSize)`** -- Use `$push` with `$each` and `$slice` to add multiple tags while keeping the array capped at `maxSize`. Return the updated document.
5. **`updateArrayElement(Model, id, oldTag, newTag)`** -- Use the positional `$` operator to rename a specific tag in the array. Return the updated document.

Run the tests with:
```bash
npm run test:11
```

## Hints

<details>
<summary>Hint 1: pushToArray</summary>

A straightforward `$push`:
```js
const updated = await Model.findByIdAndUpdate(
  id,
  { $push: { tags: tag } },
  { new: true }
);
```

</details>

<details>
<summary>Hint 2: addToSetArray</summary>

Replace `$push` with `$addToSet` -- same syntax, different behavior:
```js
const updated = await Model.findByIdAndUpdate(
  id,
  { $addToSet: { tags: tag } },
  { new: true }
);
```

</details>

<details>
<summary>Hint 3: pullFromArray</summary>

`$pull` removes all matching values:
```js
const updated = await Model.findByIdAndUpdate(
  id,
  { $pull: { tags: tag } },
  { new: true }
);
```

</details>

<details>
<summary>Hint 4: pushMultipleWithSlice</summary>

Combine `$each` and `$slice` inside `$push`. Use a negative slice to keep the last N elements:
```js
const updated = await Model.findByIdAndUpdate(id, {
  $push: {
    tags: { $each: tags, $slice: -maxSize }
  }
}, { new: true });
```

</details>

<details>
<summary>Hint 5: updateArrayElement</summary>

You must include the old value in the query filter so the `$` operator knows which element to target:
```js
const updated = await Model.findOneAndUpdate(
  { _id: id, tags: oldTag },
  { $set: { 'tags.$': newTag } },
  { new: true }
);
```

</details>
