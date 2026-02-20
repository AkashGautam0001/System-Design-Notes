# Chapter 15: The Social Web

## The Story So Far

Embedded comments are working beautifully. But the product team is back with a new feature request: every post needs to show the author's full profile -- avatar, bio, join date -- not just a username string. The problem? Storing a full user profile copy inside every post would be wasteful and would quickly become stale.

The CTO outlines the solution: "Link posts to their author profiles by reference. When you need the full profile, populate it on the fly." This is the heart of relational data in MongoDB -- using ObjectId references and Mongoose's `populate()` method to resolve them. Instead of embedding the entire user document, you store just the user's `_id` in the post, and Mongoose fetches the full user when you ask for it.

This is the social web pattern: lightweight references that can be resolved into rich, populated documents whenever you need them.

## Concepts

### ObjectId References

Instead of embedding entire documents, you store a reference to another document's `_id`:

```js
const postSchema = new mongoose.Schema({
  title: String,
  body: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});
```

The `ref` option tells Mongoose which model to use when populating.

### populate()

The `populate()` method replaces the stored ObjectId with the actual referenced document:

```js
// Without populate: author is an ObjectId
const post = await Post.findById(id);
console.log(post.author); // ObjectId('64f...')

// With populate: author is the full document
const populated = await Post.findById(id).populate('author');
console.log(populated.author.username); // 'alice'
```

### Selective Population

You can choose which fields to include when populating:

```js
const post = await Post.findById(id).populate({
  path: 'author',
  select: 'username email', // Only these fields
});

// post.author.username exists
// post.author.email exists
// post.author.age does NOT exist
```

### Populating Multiple Documents

`populate()` works with `find()` as well, populating references across all returned documents:

```js
const posts = await Post.find().populate('author');
// Every post in the array has its author populated
```

### Before vs After Populate

Before calling `populate()`, a ref field holds a raw `ObjectId`. After populating, it becomes a full document object. This distinction matters when you need to check what type of value the field holds:

```js
const raw = await Post.findById(id);
raw.author instanceof mongoose.Types.ObjectId; // true

const pop = await Post.findById(id).populate('author');
typeof pop.author === 'object' && pop.author._id; // true
```

## Your Mission

Implement these five functions in `exercise.js`:

1. **`createReferencedPost(UserModel, PostModel, userData, postData)`** -- Create a user, then create a post with `author` set to the user's `_id`. Return the post.
2. **`populateAuthor(PostModel, postId)`** -- Find a post by id and use `populate('author')`. Return the populated post.
3. **`selectivePopulate(PostModel, postId)`** -- Populate author but only select `username` and `email`. Return the populated post.
4. **`populateMultiplePosts(PostModel)`** -- Find all posts and populate author on each. Return the array.
5. **`checkRefIntegrity(PostModel, postId)`** -- Check if author is an ObjectId before populate, and an object after. Return `{ beforePopulate: true/false, afterPopulate: true/false }`.

Run the tests with:
```bash
npm run test:15
```

## Hints

<details>
<summary>Hint 1: Creating a referenced post</summary>

Create the user first with `UserModel.create(userData)`. Then create the post with `PostModel.create({ ...postData, author: user._id })`. Return the post.

</details>

<details>
<summary>Hint 2: Populating the author</summary>

Chain `.populate('author')` after `findById()`:
```js
return PostModel.findById(postId).populate('author');
```

</details>

<details>
<summary>Hint 3: Selective populate</summary>

Use the object form of populate:
```js
PostModel.findById(postId).populate({ path: 'author', select: 'username email' });
```

</details>

<details>
<summary>Hint 4: Populating multiple posts</summary>

Simply chain populate on `find()`:
```js
return PostModel.find().populate('author');
```

</details>

<details>
<summary>Hint 5: Checking ref integrity</summary>

Use `instanceof mongoose.Types.ObjectId` to check if the field is a raw ObjectId. After populating, check if the field is an object with an `_id` property:
```js
const before = post.author instanceof mongoose.Types.ObjectId; // true
const after = typeof populatedPost.author === 'object' && populatedPost.author._id !== undefined;
```

</details>
