# Chapter 12: The Clean Sweep

## The Story So Far

Some MingleSphere users want to leave the platform. Others have been flagged for violating community guidelines. And then there is the GDPR compliance team asking about data deletion policies.

The CTO pulls you into a meeting: "We need two strategies. For users who want their data gone, we do a **hard delete** -- completely removed from the database. For accounts under review or temporarily deactivated, we do a **soft delete** -- mark them as deleted without actually removing the data."

You realize that deletion is not just one operation -- it is a whole philosophy.

## Concepts

### deleteOne -- Remove a Single Document

`deleteOne` removes the first document matching the filter and returns a result with `deletedCount`.

```js
const result = await User.deleteOne({ _id: userId });
console.log(result.deletedCount); // 1 if found and deleted
```

### deleteMany -- Bulk Removal

`deleteMany` removes **all** documents matching the filter. Use with caution.

```js
const result = await User.deleteMany({ status: 'inactive' });
console.log(result.deletedCount); // number of deleted documents
```

### findByIdAndDelete -- Delete and Return

When you need to see what was deleted (e.g., for logging or confirmation), `findByIdAndDelete` removes the document and returns it.

```js
const deleted = await User.findByIdAndDelete(userId);
console.log(deleted.name); // the name of the deleted user
```

### Soft Delete Pattern

A soft delete does not remove the document. Instead, you mark it with metadata:

```js
await User.findByIdAndUpdate(userId, {
  $set: {
    isDeleted: true,
    deletedAt: new Date()
  }
}, { new: true });
```

This preserves the data for auditing, recovery, or compliance while hiding it from normal queries.

### Querying Around Soft Deletes

To find only active (non-deleted) users, filter out soft-deleted documents:

```js
const activeUsers = await User.find({ isDeleted: { $ne: true } });
// Returns users where isDeleted is false, null, or the field does not exist
```

The `$ne: true` operator is better than `isDeleted: false` because it also includes documents where the `isDeleted` field does not exist at all.

## Your Mission

Implement these five functions in `exercise.js`:

1. **`deleteOneUser(Model, id)`** -- Use `deleteOne` to remove a user by `_id`. Return the delete result.
2. **`deleteManyUsers(Model, filter)`** -- Use `deleteMany` with the provided filter. Return the delete result.
3. **`findByIdAndDeleteUser(Model, id)`** -- Use `findByIdAndDelete` to remove and return the deleted document.
4. **`softDeleteUser(Model, id)`** -- Set `isDeleted: true` and `deletedAt: new Date()` without removing the document. Return the updated document.
5. **`findActiveSoftDelete(Model)`** -- Find all users where `isDeleted` is not `true`. Return the results.

Run the tests with:
```bash
npm run test:12
```

## Hints

<details>
<summary>Hint 1: deleteOneUser</summary>

Simple and direct:
```js
const result = await Model.deleteOne({ _id: id });
return result;
```
Check `result.deletedCount` to confirm deletion.

</details>

<details>
<summary>Hint 2: deleteManyUsers</summary>

Pass the filter straight through:
```js
const result = await Model.deleteMany(filter);
return result;
```

</details>

<details>
<summary>Hint 3: findByIdAndDeleteUser</summary>

This method removes the document and returns what was deleted:
```js
const deleted = await Model.findByIdAndDelete(id);
return deleted;
```

</details>

<details>
<summary>Hint 4: softDeleteUser</summary>

Use `findByIdAndUpdate` with `$set` instead of deleting:
```js
const updated = await Model.findByIdAndUpdate(
  id,
  { $set: { isDeleted: true, deletedAt: new Date() } },
  { new: true }
);
```

</details>

<details>
<summary>Hint 5: findActiveSoftDelete</summary>

Use `$ne` (not equal) to exclude soft-deleted users. This also includes documents that lack the `isDeleted` field entirely:
```js
const results = await Model.find({ isDeleted: { $ne: true } });
return results;
```

</details>
