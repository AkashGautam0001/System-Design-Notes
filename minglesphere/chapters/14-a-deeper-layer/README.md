# Chapter 14: A Deeper Layer

## The Story So Far

MingleSphere is booming. Users are posting content left and right, and the community is thriving. But there is a glaring gap in the platform: posts have no comments. The product team has been flooded with requests -- people want to discuss, debate, and react to each other's posts. The CTO walks up to your desk: "We need comments, and they need to live inside each post document. No separate collection -- keep them embedded."

You nod. This is the perfect use case for MongoDB's subdocument pattern. Instead of creating a whole separate `comments` collection and linking everything with references, you can nest comment objects directly inside each post. They travel with the post, they are read with the post, and they are atomic with the post. It is elegant, fast, and perfectly suited for data that is always accessed together.

But subdocuments come with their own rules. Each one gets its own `_id`. You can find them, add them, remove them, and validate them -- all through Mongoose's subdocument API. Time to learn the deeper layer.

## Concepts

### Defining Subdocument Schemas

A subdocument is a document nested inside another document. In Mongoose, you define a child schema and embed it in the parent:

```js
const commentSchema = new mongoose.Schema({
  author: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
});

const postSchema = new mongoose.Schema({
  title: String,
  body: String,
  comments: [commentSchema], // Array of subdocuments
});
```

Each subdocument automatically gets its own `_id` field.

### Accessing Subdocuments by _id

Mongoose provides a handy `.id()` method on subdocument arrays:

```js
const post = await Post.findById(postId);
const comment = post.comments.id(commentId); // Finds subdoc by _id
```

This is much cleaner than manually filtering the array.

### Adding Subdocuments

You can push new subdocuments to the array just like any JavaScript array:

```js
post.comments.push({ author: 'Alice', text: 'Great post!' });
await post.save();
```

The new subdocument automatically gets a generated `_id`.

### Removing Subdocuments

Use the `.pull()` method to remove a subdocument by its `_id`:

```js
post.comments.pull({ _id: commentId });
await post.save();
```

### Validation in Subdocuments

Subdocument schemas support full Mongoose validation. If a subdocument fails validation, the parent document's save will fail:

```js
const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
});

// This will throw a ValidationError:
const post = new Post({ comments: [{ /* no text! */ }] });
await post.validate(); // throws ValidationError
```

## Your Mission

Implement these five functions in `exercise.js`:

1. **`createPostWithComments()`** -- Define a Post schema with embedded comment subdocuments (author, text, createdAt). Create and save a post with 2 comments. Return the post.
2. **`findSubdocById(post, commentId)`** -- Use the `.id()` method on `post.comments` to find a comment by its `_id`. Return the comment.
3. **`addSubdocument(Model, postId, comment)`** -- Find a post, push a new comment to its comments array, save, and return the updated post.
4. **`removeSubdocument(Model, postId, commentId)`** -- Find a post, pull a comment by its `_id`, save, and return the updated post.
5. **`validateSubdocument()`** -- Create a schema where comment `text` is required. Try creating a post with a comment missing `text`. Catch and return the `ValidationError`.

Run the tests with:
```bash
npm run test:14
```

## Hints

<details>
<summary>Hint 1: Creating the post schema with subdocs</summary>

Define `commentSchema` first with `new mongoose.Schema({ ... })`, then use it inside `postSchema` as `comments: [commentSchema]`. Use the `mongoose.models.X || mongoose.model('X', schema)` pattern to avoid model overwrite errors.

</details>

<details>
<summary>Hint 2: Finding a subdoc by _id</summary>

The `.id()` method is built into Mongoose document arrays:
```js
const comment = post.comments.id(commentId);
```
It returns the subdocument or `null`.

</details>

<details>
<summary>Hint 3: Adding a subdocument</summary>

Find the post with `Model.findById(postId)`, then `post.comments.push(comment)`, then `await post.save()`. Return the post.

</details>

<details>
<summary>Hint 4: Removing a subdocument</summary>

Use `post.comments.pull({ _id: commentId })` to remove the subdocument. Then save the post.

</details>

<details>
<summary>Hint 5: Catching validation errors</summary>

Wrap the `validate()` or `save()` call in a try/catch block. The caught error will be a `ValidationError` with an `errors` property containing details about each failed field.

</details>
