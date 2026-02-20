# Chapter 18: Document Intelligence

## Story

MingleSphere's user documents are getting smarter. Until now, they have been dumb data containers -- flat objects that know nothing about themselves. But the platform's needs have grown. When rendering a profile card, the frontend requests a "public profile" that omits the password. When the admin dashboard searches for users, it needs a one-liner like `User.findByEmail(email)` instead of repeating raw queries everywhere. And the notification system needs to ask a query "give me only the active admins" without writing a new filter every time.

The team realizes that documents and models themselves should carry behavior. Instance methods let individual documents act on their own data. Static methods give the model class reusable query shortcuts. Query helpers let you chain custom filters onto any query, composing them like building blocks.

Your mission: breathe intelligence into MingleSphere's documents by attaching instance methods, static methods, and query helpers to Mongoose schemas.

## Concepts

### Instance Methods

Instance methods are functions attached to individual document instances. They have access to the document via `this`.

```js
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
});

userSchema.methods.getPublicProfile = function () {
  return {
    username: this.username,
    email: this.email,
  };
};

const User = mongoose.model('User', userSchema);
const user = await User.create({ username: 'alice', email: 'a@b.com', password: 'secret' });
const profile = user.getPublicProfile();
// { username: 'alice', email: 'a@b.com' } -- no password!
```

**Important:** Do not use arrow functions for instance methods. Arrow functions do not bind `this`, so `this` would be `undefined` instead of the document.

### Static Methods

Static methods are attached to the Model class itself (not to individual documents). Inside a static method, `this` refers to the Model.

```js
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email });
};

const user = await User.findByEmail('alice@example.com');
```

### Query Helpers

Query helpers extend the Mongoose query chain. They let you define reusable filter segments that can be composed together.

```js
userSchema.query.byRole = function (role) {
  return this.where({ role });
};

userSchema.query.active = function () {
  return this.where({ isActive: true });
};

// Chain them together
const activeAdmins = await User.find().active().byRole('admin');
```

### Instance Methods That Save

Instance methods can also modify the document and persist changes by calling `this.save()`.

```js
userSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

const user = await User.findById(id);
await user.deactivate(); // isActive is now false in the DB
```

### The `this` Context

Understanding `this` is critical:

| Location | `this` refers to |
|---|---|
| Instance method | The document instance |
| Static method | The Model class |
| Query helper | The Query object |

Always use regular `function` declarations (not arrow functions) so that `this` is bound correctly.

## Your Mission

Open `exercise.js` and implement the five exported functions:

1. **createModelWithInstanceMethod()** -- Create a User schema with `getPublicProfile()` that returns `{ username, email }` while omitting `password`.
2. **createModelWithStaticMethod()** -- Create a schema with a `findByEmail(email)` static that uses `this.findOne({ email })`.
3. **createModelWithQueryHelper()** -- Create a schema with a `byRole(role)` query helper and use it to find admins.
4. **chainQueryHelpers()** -- Create a schema with `active()` and `byRole(role)` query helpers and chain them together.
5. **instanceMethodWithSave()** -- Create a schema with a `deactivate()` instance method that sets `isActive = false` and calls `this.save()`.

Run your tests with:
```bash
npm run test:18
```

## Hints

<details>
<summary>Hint 1: Instance method pattern</summary>

Define instance methods on `schema.methods`:

```js
schema.methods.getPublicProfile = function () {
  return { username: this.username, email: this.email };
};
```

Remember: use `function`, not an arrow function.
</details>

<details>
<summary>Hint 2: Static method pattern</summary>

Define static methods on `schema.statics`:

```js
schema.statics.findByEmail = function (email) {
  return this.findOne({ email });
};
```

Here `this` refers to the Model, so `this.findOne()` is like `User.findOne()`.
</details>

<details>
<summary>Hint 3: Query helper pattern</summary>

Define query helpers on `schema.query`:

```js
schema.query.byRole = function (role) {
  return this.where({ role });
};
```

Use them after `find()`: `Model.find().byRole('admin')`.
</details>

<details>
<summary>Hint 4: Avoiding model registration conflicts</summary>

Use the pattern `mongoose.models.ModelName || mongoose.model('ModelName', schema)` to avoid "Cannot overwrite model" errors when tests re-run.
</details>

<details>
<summary>Hint 5: Instance method that saves</summary>

```js
schema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};
```

`this.save()` returns a promise that resolves to the updated document.
</details>
