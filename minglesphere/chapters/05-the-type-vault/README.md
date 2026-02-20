# Chapter 5: The Type Vault

## The Story So Far

MingleSphere's user base is growing, and plain old strings and numbers aren't cutting it anymore. Users want to tag their interests, store flexible profile settings, link their social accounts, upload profile pictures, and track their in-app wallet balance with precision. The product team has handed you a spec for a much richer user profile.

This is where MongoDB's document model truly shines. Unlike rigid relational tables, MongoDB documents can contain arrays, nested objects, maps, binary data, and high-precision decimals -- all in a single document. Mongoose provides Schema Types for each of these, giving you structure and validation while preserving the flexibility.

Time to unlock the Type Vault. Each type serves a specific purpose: Arrays for lists of values, Mixed for truly flexible data, Maps for dynamic key-value pairs, Buffer for binary data like images, and Decimal128 for precise financial calculations where floating-point errors are unacceptable.

## Concepts

### Array Types

Store lists of values directly in a document:

```js
const schema = new mongoose.Schema({
  tags: [String],                    // Array of strings
  scores: [Number],                  // Array of numbers
  friends: [mongoose.ObjectId],      // Array of references
});

const user = await User.create({ tags: ['tech', 'music'] });
user.tags.push('travel');
await user.save();
```

### Mixed Type

The most flexible type -- stores any value with no defined structure:

```js
const schema = new mongoose.Schema({
  metadata: mongoose.Schema.Types.Mixed,
});

const doc = await Model.create({
  metadata: {
    theme: 'dark',
    language: 'en',
    notifications: { email: true, push: false }
  }
});
```

**Warning:** Mongoose cannot detect changes to Mixed fields. Use `doc.markModified('metadata')` before `.save()` if updating.

### Map Type

A Map of key-value pairs where keys are always strings:

```js
const schema = new mongoose.Schema({
  socialLinks: {
    type: Map,
    of: String
  }
});

const doc = await Model.create({
  socialLinks: {
    twitter: '@handle',
    github: 'username'
  }
});

// Access map values
doc.socialLinks.get('twitter'); // '@handle'
doc.socialLinks.set('linkedin', 'profile-url');
```

### Buffer Type

For storing binary data (images, files, encoded data):

```js
const schema = new mongoose.Schema({
  profilePicture: Buffer,
});

const doc = await Model.create({
  profilePicture: Buffer.from('binary-data-here')
});
```

### Decimal128

High-precision decimal for financial or scientific calculations:

```js
const schema = new mongoose.Schema({
  accountBalance: mongoose.Schema.Types.Decimal128,
});

const doc = await Model.create({
  accountBalance: mongoose.Types.Decimal128.fromString('99.99')
});

console.log(doc.accountBalance.toString()); // '99.99'
```

**Why not just use Number?** JavaScript's Number type is a 64-bit floating-point, which can't represent all decimals precisely:
```js
0.1 + 0.2; // 0.30000000000000004 -- not ideal for money!
```

## Your Mission

Implement these five functions in `exercise.js`:

1. **`createRichProfileSchema()`** -- Create a schema with tags (Array), metadata (Mixed), socialLinks (Map), profilePicture (Buffer), and accountBalance (Decimal128)
2. **`createDocWithArray(Model)`** -- Create a document with tags: `['tech', 'music', 'travel']`
3. **`createDocWithMixed(Model)`** -- Create a document with a nested metadata object
4. **`createDocWithMap(Model)`** -- Create a document with a socialLinks Map
5. **`useDecimal128(Model)`** -- Create a document with a Decimal128 accountBalance of `'99.99'`

Run the tests with:
```bash
npm run test:05
```

## Hints

<details>
<summary>Hint 1: Creating the schema</summary>

```js
return new mongoose.Schema({
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed,
  socialLinks: { type: Map, of: String },
  profilePicture: Buffer,
  accountBalance: mongoose.Schema.Types.Decimal128,
});
```

</details>

<details>
<summary>Hint 2: Creating a doc with an array</summary>

```js
return Model.create({ tags: ['tech', 'music', 'travel'] });
```

</details>

<details>
<summary>Hint 3: Creating a doc with Mixed type</summary>

Just pass the object directly:
```js
return Model.create({
  metadata: { theme: 'dark', language: 'en', notifications: { email: true } }
});
```

</details>

<details>
<summary>Hint 4: Creating a doc with a Map</summary>

You can pass a plain object and Mongoose will convert it to a Map:
```js
return Model.create({
  socialLinks: { twitter: '@user', github: 'user123' }
});
```

</details>

<details>
<summary>Hint 5: Using Decimal128</summary>

Use the `fromString` factory method:
```js
return Model.create({
  accountBalance: mongoose.Types.Decimal128.fromString('99.99')
});
```

</details>
