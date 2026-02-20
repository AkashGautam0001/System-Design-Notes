# Chapter 2: The First Blueprint

## The Story So Far

The connection is live -- MongoDB is humming along beautifully. The CTO pops by your desk again with a whiteboard sketch: "We need a User model. Something to represent everyone who signs up for MingleSphere. Start with the basics -- username, email, age, when they joined, and whether they're active."

Before you can store any data, you need a blueprint -- a schema that defines the shape of every user document. In the relational world, this would be a table definition. In MongoDB with Mongoose, it's a Schema. Schemas enforce structure on your otherwise flexible documents, giving you the best of both worlds: the flexibility of a document database with the safety of defined types.

Once you have a schema, you'll create a Model from it. The Model is your primary tool for interacting with the database -- it's the class you'll use to create, read, update, and delete documents. Think of the schema as the architectural blueprint and the model as the construction crew that builds from it.

## Concepts

### Mongoose Schemas

A schema defines the structure and rules for documents in a collection:

```js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,            // Simple type declaration
  email: {                 // With options
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now      // Default value
  },
  isActive: {
    type: Boolean,
    default: true
  }
});
```

### Schema Types

Mongoose supports these core types:
- `String`
- `Number`
- `Date`
- `Boolean`
- `Buffer`
- `ObjectId`
- `Array`
- `Decimal128`
- `Map`
- `Schema.Types.Mixed`

### Creating Models

A model is a compiled version of the schema. It maps to a MongoDB collection:

```js
const User = mongoose.model('User', userSchema);
// Collection name will be 'users' (lowercased, pluralized)
```

### Model and Collection Names

Mongoose automatically determines the collection name by lowercasing and pluralizing the model name:

```js
mongoose.model('User', schema);        // -> collection: 'users'
mongoose.model('BlogPost', schema);    // -> collection: 'blogposts'
```

You can inspect these:
```js
User.modelName;          // 'User'
User.collection.name;    // 'users'
```

### Inspecting Schema Paths

Every schema has a `paths` object that contains all defined fields:

```js
const fields = Object.keys(schema.paths);
// ['name', 'email', 'createdAt', 'isActive', '_id', '__v']
```

Note: `_id` and `__v` are added automatically by Mongoose.

## Your Mission

Implement these five functions in `exercise.js`:

1. **`createUserSchema()`** -- Create a schema with username, email, age, joinedAt, and isActive fields
2. **`createUserModel(schema)`** -- Create a model named 'ChapterTwoUser' from the schema
3. **`getModelName(model)`** -- Return the model's name
4. **`getCollectionName(model)`** -- Return the model's MongoDB collection name
5. **`getSchemaFields(schema)`** -- Return the schema's field names, excluding _id and __v

Run the tests with:
```bash
npm run test:02
```

## Hints

<details>
<summary>Hint 1: Creating the schema</summary>

```js
const schema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  // ... add the remaining fields
});
```

For `joinedAt`, use `default: Date.now` (not `Date.now()` -- pass the function, not its result).

</details>

<details>
<summary>Hint 2: Creating the model</summary>

```js
return mongoose.model('ChapterTwoUser', schema);
```

The first argument is the model name. Mongoose will create a collection called `chaptertwousers`.

</details>

<details>
<summary>Hint 3: Getting model and collection names</summary>

- Model name: `model.modelName`
- Collection name: `model.collection.name`

</details>

<details>
<summary>Hint 4: Getting schema fields</summary>

Use `Object.keys(schema.paths)` and filter out `'_id'` and `'__v'`:

```js
return Object.keys(schema.paths).filter(
  (path) => path !== '_id' && path !== '__v'
);
```

</details>
