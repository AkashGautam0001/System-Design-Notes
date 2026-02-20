# Chapter 20: Family Ties

## Story

MingleSphere's content engine is evolving. What started as simple text posts has grown into a rich media platform: users now share text posts, image posts, and video posts. Each type has its own unique fields -- text posts have a word count, image posts carry dimensions and a URL, video posts store duration and resolution. But they all share a common DNA: a title, content, and timestamp.

The naive approach -- creating completely separate models for each post type -- leads to code duplication and makes it impossible to query "all posts by a user" without merging results from three collections. The elegant solution is **discriminators**: Mongoose's implementation of single-collection inheritance. Every post lives in the same collection, but each type carries a `__t` field that identifies its kind. The base model handles shared behavior, while discriminators extend it with type-specific fields.

Meanwhile, the team has been copy-pasting the same soft-delete logic across multiple schemas. It is time to extract that into a reusable **plugin** -- a function that can augment any schema with extra fields, methods, and hooks.

Your mission: unify MingleSphere's post types with discriminators and build reusable plugins that any schema can adopt.

## Concepts

### Discriminators

Discriminators let you store different document types in the same MongoDB collection. They share a base schema but can have additional fields.

```js
const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  createdAt: { type: Date, default: Date.now },
});

const Post = mongoose.model('Post', postSchema);

const textPostSchema = new mongoose.Schema({ wordCount: Number });
const TextPost = Post.discriminator('TextPost', textPostSchema);

const imagePostSchema = new mongoose.Schema({
  imageUrl: String,
  dimensions: { width: Number, height: Number },
});
const ImagePost = Post.discriminator('ImagePost', imagePostSchema);
```

### The `__t` Field

Mongoose automatically adds a `__t` field (the discriminator key) to each document. It stores the discriminator name so Mongoose knows which type to hydrate.

```js
const text = await TextPost.create({ title: 'Hello', wordCount: 500 });
console.log(text.__t); // 'TextPost'
```

### Querying with Discriminators

- **Base model query** returns all document types:
  ```js
  const allPosts = await Post.find(); // TextPost + ImagePost + ...
  ```

- **Discriminator model query** returns only that type:
  ```js
  const textPosts = await TextPost.find(); // only TextPost docs
  ```

### Plugins

Plugins are reusable functions that add fields, methods, hooks, and more to any schema.

```js
function timestampsPlugin(schema) {
  schema.add({
    createdAt: { type: Date },
    updatedAt: { type: Date },
  });

  schema.pre('save', function (next) {
    const now = new Date();
    if (!this.createdAt) {
      this.createdAt = now;
    }
    this.updatedAt = now;
    next();
  });
}

// Apply to any schema
mySchema.plugin(timestampsPlugin);
```

### The Soft Delete Plugin

A common pattern is a soft-delete plugin that adds `isDeleted` and `deletedAt` fields along with `softDelete()` and `restore()` instance methods:

```js
function softDelete(schema) {
  schema.add({
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  });

  schema.methods.softDelete = function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  schema.methods.restore = function () {
    this.isDeleted = false;
    this.deletedAt = null;
    return this.save();
  };
}

schema.plugin(softDelete);
```

### Global Plugins

You can apply a plugin to every schema in your application:

```js
mongoose.plugin(myPlugin);
```

Use this sparingly -- it affects every model.

## Your Mission

Open `exercise.js` and implement the five exported functions:

1. **createDiscriminators()** -- Build a base Post model, then create TextPost and ImagePost discriminators with type-specific fields.
2. **queryBaseModel(PostModel)** -- Query the base Post model to retrieve all post types.
3. **queryDiscriminatorModel(TextPostModel)** -- Query a discriminator model to retrieve only that type.
4. **createPlugin()** -- Write a timestamps plugin that adds `createdAt` and `updatedAt` to any schema.
5. **applySoftDeletePlugin()** -- Use the existing soft-delete plugin from `../../models/plugins/softDelete.js` and exercise its full lifecycle.

Run your tests with:
```bash
npm run test:20
```

## Hints

<details>
<summary>Hint 1: Creating discriminators</summary>

Call `BaseModel.discriminator('Name', childSchema)` to create a discriminator. The child schema only needs the additional fields -- shared fields come from the base.

```js
const TextPost = Post.discriminator('TextPost', new mongoose.Schema({
  wordCount: Number,
}));
```
</details>

<details>
<summary>Hint 2: Avoiding duplicate discriminator errors</summary>

Check if the discriminator already exists before creating it:

```js
const TextPost = Post.discriminators?.TextPost || Post.discriminator('TextPost', textPostSchema);
```
</details>

<details>
<summary>Hint 3: Plugin structure</summary>

A plugin is a function that receives a schema (and optionally options). Use `schema.add()` to add fields and `schema.pre()` / `schema.methods` to add hooks and methods.

```js
function myPlugin(schema, options) {
  schema.add({ newField: String });
  schema.methods.newMethod = function () { /* ... */ };
}
```
</details>

<details>
<summary>Hint 4: Using the softDelete plugin</summary>

Import it and apply it with `schema.plugin(softDelete)`. The plugin adds `softDelete()` and `restore()` instance methods automatically.

```js
import softDelete from '../../models/plugins/softDelete.js';
schema.plugin(softDelete);
```
</details>

<details>
<summary>Hint 5: Model registration pattern</summary>

Use `mongoose.models.Name || mongoose.model('Name', schema)` for models and `Post.discriminators?.Name || Post.discriminator('Name', schema)` for discriminators to avoid registration conflicts across test runs.
</details>
