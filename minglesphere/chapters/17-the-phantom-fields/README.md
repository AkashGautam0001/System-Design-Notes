# Chapter 17: The Phantom Fields

## The Story So Far

MingleSphere's data model is becoming sophisticated -- subdocuments, references, deep population. But the frontend team has a request that seems paradoxical: "We need a `fullName` field on user profiles, but we do not want to store it in the database. We store `firstName` and `lastName` separately." They also want an `author.postCount` field that tells you how many posts an author has -- without storing a counter that could go stale.

The CTO raises an eyebrow: "Sounds like a job for virtuals." Virtual properties are fields that exist on your Mongoose documents but are never persisted to MongoDB. They are computed on the fly from other data. They are phantom fields -- invisible in the database, but fully real in your application.

Virtuals can have getters (compute a value from stored fields), setters (split an input value into stored fields), and even populate related documents through virtual populate. Time to master the phantoms.

## Concepts

### Virtual Getters

A virtual getter computes a value from existing fields:

```js
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
});

userSchema.virtual('fullName').get(function () {
  return this.firstName + ' ' + this.lastName;
});

const user = new User({ firstName: 'John', lastName: 'Doe' });
console.log(user.fullName); // 'John Doe'
```

The `fullName` field is never saved to the database.

### Virtual Setters

A virtual setter lets you set multiple fields from a single value:

```js
userSchema.virtual('fullName')
  .get(function () {
    return this.firstName + ' ' + this.lastName;
  })
  .set(function (value) {
    const parts = value.split(' ');
    this.set('firstName', parts[0]);
    this.set('lastName', parts.slice(1).join(' '));
  });

const user = new User();
user.fullName = 'Jane Smith';
// user.firstName === 'Jane'
// user.lastName === 'Smith'
```

### Virtuals in JSON Output

By default, virtuals are NOT included when you call `toJSON()` or `toObject()`. You must enable them in schema options:

```js
const schema = new mongoose.Schema(
  { firstName: String, lastName: String },
  { toJSON: { virtuals: true } }
);
```

Now `doc.toJSON()` will include the virtual fields.

### Virtual Populate

Instead of storing an array of references, you can define a virtual field that populates from a foreign collection:

```js
authorSchema.virtual('posts', {
  ref: 'Post',           // The model to populate from
  localField: '_id',     // The field on this model
  foreignField: 'author', // The field on the Post model
});

const author = await Author.findById(id).populate('posts');
// author.posts => [Post, Post, ...]
```

This is powerful because the Author document does not need to store post `_id`s at all.

### Virtual Populate with Count

You can get just the count of related documents instead of the documents themselves:

```js
authorSchema.virtual('postCount', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'author',
  count: true,
});

const author = await Author.findById(id).populate('postCount');
console.log(author.postCount); // 5
```

## Your Mission

Implement these five functions in `exercise.js`:

1. **`createSchemaWithVirtual()`** -- Create a User schema with `firstName`/`lastName` and a `fullName` virtual getter. Create a doc and return `doc.fullName`.
2. **`createVirtualSetter()`** -- Create a schema with a `fullName` virtual that has both getter and setter. Set `fullName` to `'Jane Doe'`, save, and return the doc (verify `firstName`/`lastName` are set).
3. **`ensureVirtualsInJSON()`** -- Create a schema with `{ toJSON: { virtuals: true } }`. Create a doc, call `toJSON()`, and return the JSON (verify virtual is present).
4. **`virtualPopulate()`** -- Create Author and Post schemas where Author has a virtual `posts` field. Create an author + 2 posts, populate the virtual, and return the author.
5. **`virtualWithCount()`** -- Create a schema with a virtual `postCount` using `count: true`. Create an author + 3 posts. Return the author with `postCount` populated.

Run the tests with:
```bash
npm run test:17
```

## Hints

<details>
<summary>Hint 1: Virtual getter</summary>

Define the virtual after creating the schema:
```js
schema.virtual('fullName').get(function () {
  return this.firstName + ' ' + this.lastName;
});
```
Access it like a regular property: `doc.fullName`.

</details>

<details>
<summary>Hint 2: Virtual setter</summary>

Chain `.set()` after `.get()`:
```js
schema.virtual('fullName')
  .get(function () { return this.firstName + ' ' + this.lastName; })
  .set(function (v) {
    const parts = v.split(' ');
    this.set('firstName', parts[0]);
    this.set('lastName', parts.slice(1).join(' '));
  });
```

</details>

<details>
<summary>Hint 3: Virtuals in JSON</summary>

Pass the option when creating the schema:
```js
new mongoose.Schema({ ... }, { toJSON: { virtuals: true } });
```
Then `doc.toJSON()` will include virtuals.

</details>

<details>
<summary>Hint 4: Virtual populate</summary>

Define the virtual with `ref`, `localField`, and `foreignField`. Make sure to also set `toObject: { virtuals: true }` on the schema so populate works correctly:
```js
schema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'author',
});
```

</details>

<details>
<summary>Hint 5: Virtual populate with count</summary>

Add `count: true` to the virtual definition:
```js
schema.virtual('postCount', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'author',
  count: true,
});
```
Then `populate('postCount')` returns a number instead of an array.

</details>
