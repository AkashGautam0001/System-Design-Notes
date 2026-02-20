# Chapter 16: Going Deeper

## The Story So Far

References and population are working -- every post shows its author's full profile. But the feature requests keep coming. The latest one: "When I view a post, I want to see the full profile of every person who commented, not just their username." The twist? Comments are stored in a separate collection now (referenced, not embedded), and each comment has its own `author` reference to a User.

This means you need to populate the post's author, populate the post's comments, and then populate each comment's author. That is a nested populate -- also known as deep population. Beyond that, the architecture team wants you to explore different relationship patterns (1:1, 1:N, M:N) and learn how to filter and select fields during deep population.

The CTO smiles: "If you master this, you can model any relationship MingleSphere will ever need."

## Concepts

### Deep (Nested) Populate

When a populated document itself has references, you can chain population:

```js
const post = await Post.findById(id)
  .populate('author')
  .populate({
    path: 'comments',
    populate: {
      path: 'author',
    },
  });

// post.author.username => 'alice'
// post.comments[0].author.username => 'bob'
```

### One-to-Many (1:N) Pattern

An author has many books. Store book refs in the author's array:

```js
const authorSchema = new mongoose.Schema({
  name: String,
  books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
});
```

### Many-to-Many (M:N) Pattern

Students and courses have a bidirectional relationship. Each side stores an array of refs to the other:

```js
const studentSchema = new mongoose.Schema({
  name: String,
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
});

const courseSchema = new mongoose.Schema({
  title: String,
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
});
```

### Populate with Match

You can filter which documents get populated using the `match` option:

```js
const post = await Post.findById(id).populate({
  path: 'comments',
  match: { approved: true },
});
// Only approved comments are populated; others become null
```

### Selective Deep Populate

Combine `select` with nested populate to control exactly which fields load at each level:

```js
const post = await Post.findById(id)
  .populate({ path: 'author', select: 'username' })
  .populate({
    path: 'comments',
    populate: { path: 'author', select: 'username' },
  });
```

## Your Mission

Implement these five functions in `exercise.js`:

1. **`deepPopulate(PostModel, postId)`** -- Find a post and deeply populate both `post.author` and `post.comments.author`. Return the fully populated post.
2. **`createOneToMany(AuthorModel, BookModel)`** -- Create an author with 2+ books in a 1:N relationship. Return the author populated with books.
3. **`createManyToMany(StudentModel, CourseModel)`** -- Create students and courses with M:N relationships. Return `{ students, courses }` both populated.
4. **`populateWithMatch(PostModel, postId)`** -- Populate comments on a post, but only those with `{ approved: true }`. Return the post.
5. **`selectiveDeepPopulate(PostModel, postId)`** -- Deep populate with select options: author (only `username`) and comments.author (only `username`). Return the post.

Run the tests with:
```bash
npm run test:16
```

## Hints

<details>
<summary>Hint 1: Deep populate</summary>

Chain two `.populate()` calls. For nested population, use the object form with a nested `populate` key:
```js
PostModel.findById(postId)
  .populate('author')
  .populate({ path: 'comments', populate: { path: 'author' } });
```

</details>

<details>
<summary>Hint 2: One-to-many pattern</summary>

Create the author first, then create books with `author: author._id`. Push each book's `_id` into the author's `books` array. Save the author, then populate with `AuthorModel.findById(id).populate('books')`.

</details>

<details>
<summary>Hint 3: Many-to-many pattern</summary>

Create both students and courses. Push course `_id`s into each student's `courses` array, and push student `_id`s into each course's `students` array. Save all, then use `find().populate()` on both models.

</details>

<details>
<summary>Hint 4: Populate with match</summary>

Use the `match` option in populate:
```js
PostModel.findById(postId).populate({ path: 'comments', match: { approved: true } });
```
Documents that do not match become `null` in the array.

</details>

<details>
<summary>Hint 5: Selective deep populate</summary>

Add `select` at each level:
```js
.populate({ path: 'author', select: 'username' })
.populate({ path: 'comments', populate: { path: 'author', select: 'username' } })
```

</details>
