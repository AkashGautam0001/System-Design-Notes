# Chapter 7: Schema Superpowers

## Story

With the gatekeepers in place, MingleSphere's data quality has improved dramatically. But the team wants more. "Every user record should automatically track when it was created and last modified," says the product manager. "And for the love of security, never send passwords back in API responses." The lead developer nods: "It's time to unlock the schema superpowers."

Mongoose schemas are more than just blueprints for data structure and validation. They come with powerful options that handle common requirements out of the box: automatic timestamps, strict mode that silently strips unknown fields, default values that fill in the blanks, and output transforms that reshape documents before they leave the server. These features save you from writing repetitive boilerplate code.

Your mission is to explore and master each of these schema-level features. You will configure timestamps, observe strict mode in action, set up both static and dynamic defaults, and write a toJSON transform that sanitizes sensitive data before it reaches the client.

## Concepts

### Timestamps

Pass `{ timestamps: true }` as a schema option and Mongoose will automatically manage `createdAt` and `updatedAt` fields on every document.

```js
const schema = new mongoose.Schema(
  { username: String },
  { timestamps: true }
);
```

### Strict Mode

By default, Mongoose schemas use `strict: true`. Any fields not defined in the schema are silently stripped when the document is saved.

```js
const schema = new mongoose.Schema({ name: String }, { strict: true });
const Model = mongoose.model('Example', schema);

const doc = await Model.create({ name: 'Alice', secret: 'oops' });
console.log(doc.secret); // undefined -- stripped by strict mode
```

### Default Values

Defaults can be static values or functions that generate values dynamically.

```js
const schema = new mongoose.Schema({
  role: { type: String, default: 'user' },             // static
  joinCode: { type: String, default: () => randomStr() }, // dynamic
});
```

### toJSON Transform

Customize what a document looks like when converted to JSON. This is perfect for removing sensitive fields like passwords.

```js
const schema = new mongoose.Schema(
  { username: String, password: String },
  {
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);
```

### Combining Options

All schema options can be used together. A schema can have timestamps, strict mode, defaults, and toJSON transforms all at once.

```js
const schema = new mongoose.Schema(
  {
    username: String,
    password: String,
    role: { type: String, default: 'user' },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => { delete ret.password; return ret; },
    },
  }
);
```

## Your Mission

Open `exercise.js` and implement the five exported functions:

1. **createTimestampSchema(Model)** -- Create a document and verify it has automatic timestamps.
2. **testStrictMode()** -- Demonstrate that extra fields are stripped by strict mode.
3. **testDefaultValues()** -- Verify that static and dynamic defaults are applied.
4. **testToJSONTransform()** -- Ensure the password is removed from JSON output.
5. **createSchemaWithAllOptions()** -- Combine all features into one schema.

Run your tests with:
```bash
npm run test:07
```

## Hints

<details>
<summary>Hint 1: Creating a document for timestamps</summary>

Just call `Model.create({ username: 'alice', email: 'alice@example.com' })` and return the result. Mongoose adds `createdAt` and `updatedAt` automatically when `timestamps: true` is set on the schema.

</details>

<details>
<summary>Hint 2: Testing strict mode</summary>

Create your own schema inside the function with `strict: true` (the default). Save a document with an extra field. Then retrieve it with `Model.findById()` to confirm the extra field was not persisted.

</details>

<details>
<summary>Hint 3: Dynamic defaults</summary>

Use an arrow function as the default value: `default: () => Math.random().toString(36).substring(2, 10)`. This generates a new random string for each document.

</details>

<details>
<summary>Hint 4: toJSON transform</summary>

In the schema options, pass a `toJSON` object with a `transform` function. The function receives `(doc, ret)` where `ret` is the plain object. Delete `ret.password` and return `ret`. Then call `.toJSON()` on the saved document.

</details>
