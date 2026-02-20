# Chapter 3: Opening the Doors

## The Story So Far

The blueprint is ready -- you have a User schema and a model. Now it's time to open the doors of MingleSphere to the world. The marketing team has been building hype, and the first signups are starting to roll in. You need to know how to actually create user documents and store them in MongoDB.

There are several ways to create documents in Mongoose, each with its own use case. You can use the classic two-step approach of `new Model()` followed by `.save()`, the convenient shorthand `Model.create()`, or the high-performance `Model.insertMany()` for bulk operations. Understanding when to use each is a key skill.

Every document that gets created automatically receives two special fields: `_id` (a unique ObjectId) and `__v` (the version key). These are Mongoose's way of tracking identity and document revisions. By the end of this chapter, you'll understand all three creation methods and these automatic fields inside and out.

## Concepts

### Creating with new Model() + save()

The two-step approach gives you the most control. You can modify the document before saving:

```js
const user = new User({
  username: 'alice',
  email: 'alice@example.com'
});

// You can modify before saving
user.age = 28;

const savedUser = await user.save();
console.log(savedUser._id); // ObjectId assigned after save
```

### Creating with Model.create()

A convenient shorthand that combines instantiation and save:

```js
const user = await User.create({
  username: 'bob',
  email: 'bob@example.com',
  age: 32
});
```

### Bulk Insert with insertMany()

For inserting multiple documents efficiently in a single database operation:

```js
const users = await User.insertMany([
  { username: 'charlie', email: 'charlie@example.com' },
  { username: 'diana', email: 'diana@example.com' },
  { username: 'eve', email: 'eve@example.com' }
]);
console.log(users.length); // 3
```

### ObjectId (_id)

Every MongoDB document has a unique `_id` field. By default, Mongoose generates a 12-byte ObjectId:

```js
const user = await User.create({ username: 'frank', email: 'frank@example.com' });
console.log(user._id);  // e.g., 507f1f77bcf86cd799439011

// Validate an ObjectId
import mongoose from 'mongoose';
mongoose.Types.ObjectId.isValid(user._id); // true
```

### Version Key (__v)

Mongoose adds `__v` to track document revisions via `.save()`:

```js
const user = await User.create({ username: 'grace' });
console.log(user.__v); // 0 (freshly created)
```

## Your Mission

Implement these five functions in `exercise.js`:

1. **`createUserWithSave(Model, userData)`** -- Create a document with `new Model()` and `.save()`
2. **`createUserWithCreate(Model, userData)`** -- Create a document with `Model.create()`
3. **`createMultipleUsers(Model, usersArray)`** -- Bulk insert with `Model.insertMany()`
4. **`verifyObjectId(doc)`** -- Check if a document's `_id` is a valid ObjectId
5. **`getVersionKey(doc)`** -- Return the `__v` value of a document

Run the tests with:
```bash
npm run test:03
```

## Hints

<details>
<summary>Hint 1: new Model() + save()</summary>

```js
const doc = new Model(userData);
await doc.save();
return doc;
```

</details>

<details>
<summary>Hint 2: Model.create()</summary>

```js
const doc = await Model.create(userData);
return doc;
```

</details>

<details>
<summary>Hint 3: insertMany()</summary>

```js
const docs = await Model.insertMany(usersArray);
return docs;
```

</details>

<details>
<summary>Hint 4: Validating ObjectId</summary>

Import mongoose and use:
```js
import mongoose from 'mongoose';
return mongoose.Types.ObjectId.isValid(doc._id);
```

</details>

<details>
<summary>Hint 5: Version key</summary>

It's simply `doc.__v`. This is a regular property on the document.

</details>
