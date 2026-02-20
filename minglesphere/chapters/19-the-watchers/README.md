# Chapter 19: The Watchers

## Story

A security audit reveals a critical issue: passwords are being stored in plain text. Worse, usernames are inconsistently cased, causing duplicate-detection logic to fail. And a recently deleted user's posts are still showing up in search results because nobody remembered to filter them out.

The team needs watchers -- invisible guardians that intercept every save, validate, find, and delete operation. Mongoose middleware (also called hooks) lets you run custom logic before or after these operations. A pre-save hook can hash passwords before they ever touch the database. A pre-validate hook can trim and normalize input. A pre-find hook can silently exclude soft-deleted records from every query. And post hooks can trigger side effects like logging or notifications after an operation completes.

Your mission: set up the watchers that keep MingleSphere's data clean, secure, and consistent -- all without changing a single line of business logic.

## Concepts

### Pre Hooks (Middleware)

Pre hooks run **before** an operation. They receive a `next` callback (or you can use `async` functions).

```js
schema.pre('save', function (next) {
  this.username = this.username.toUpperCase();
  next();
});
```

With async/await (no need for `next`):

```js
schema.pre('save', async function () {
  this.password = await hashPassword(this.password);
});
```

### Post Hooks

Post hooks run **after** an operation completes. They receive the resulting document.

```js
schema.post('save', function (doc) {
  console.log(`${doc.username} was saved`);
  doc.savedAt = new Date(); // attach to doc object, not persisted to DB
});
```

### Pre-Validate Hooks

Run before Mongoose validation. Useful for transforming data before validators check it.

```js
schema.pre('validate', function (next) {
  if (this.email) {
    this.email = this.email.trim();
  }
  next();
});
```

### Pre-Find Hooks

Run before every `find` query. Useful for automatically filtering documents.

```js
schema.pre('find', function () {
  // `this` is the Query object
  this.where({ isDeleted: { $ne: true } });
});
```

Note: In a pre-find hook, `this` refers to the Query, not a document.

### Async Hooks

Modern Mongoose supports async middleware. If the function is `async`, Mongoose waits for the returned promise and you do not need to call `next()`.

```js
schema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = 'hashed_' + this.password;
  }
});
```

Use `this.isModified('field')` to check if a field was changed, avoiding unnecessary re-processing on every save.

### Hook Execution Order

| Phase | Hook Type | `this` context |
|---|---|---|
| validate | pre/post | Document |
| save | pre/post | Document |
| find / findOne | pre/post | Query |
| deleteOne / deleteMany | pre/post | Query or Document |

## Your Mission

Open `exercise.js` and implement the five exported functions:

1. **createPreSaveHook()** -- Uppercase the username automatically before every save.
2. **createPostSaveHook()** -- Attach a `savedAt` timestamp to the doc object after save.
3. **createPreValidateHook()** -- Trim whitespace from email before validation runs.
4. **createPreFindHook()** -- Automatically exclude soft-deleted docs from every find query.
5. **createAsyncHook()** -- Simulate password hashing with an async pre-save hook.

Run your tests with:
```bash
npm run test:19
```

## Hints

<details>
<summary>Hint 1: Pre-save hook for uppercase</summary>

```js
schema.pre('save', function (next) {
  this.username = this.username.toUpperCase();
  next();
});
```

`this` is the document being saved. Transform it in place.
</details>

<details>
<summary>Hint 2: Post-save hook for savedAt</summary>

```js
schema.post('save', function (doc) {
  doc.savedAt = new Date();
});
```

This property lives only on the in-memory document object, not in MongoDB.
</details>

<details>
<summary>Hint 3: Pre-validate vs pre-save</summary>

`pre('validate')` runs before `pre('save')`. If you need to transform data before validators check it (e.g., trimming whitespace so a `required` validator passes), use `pre('validate')`.
</details>

<details>
<summary>Hint 4: Pre-find hook to filter deleted docs</summary>

```js
schema.pre('find', function () {
  this.where({ isDeleted: { $ne: true } });
});
```

In find hooks, `this` is the Query object, not a document. Call `this.where()` to add conditions.
</details>

<details>
<summary>Hint 5: Async pre-save with isModified</summary>

```js
schema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = 'hashed_' + this.password;
  }
});
```

Using `isModified` prevents re-hashing the password on subsequent saves when only other fields change.
</details>
