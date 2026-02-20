# Chapter 22: The Search Engine

## Story

Users are clamoring for a search feature. "I want to find posts about MongoDB!" "I want to search for people by name!" The product team has designed a sleek search bar that sits at the top of every page, but the engineering team needs to build the engine behind it.

The naive approach -- scanning every document with regex -- would bring the servers to their knees. Fortunately, MongoDB has a built-in text search engine. By creating text indexes, you can perform full-text search across string fields, rank results by relevance, and even match exact phrases. For simpler needs like autocomplete, regex with anchored patterns provides a lightweight alternative.

Your mission: build the search infrastructure that powers MingleSphere's discovery features -- from full-text post search to user autocomplete.

## Concepts

### Text Indexes

A text index lets MongoDB perform text search operations on string content. You can create a text index on one or more fields:

```js
// Single field
await collection.createIndex({ content: 'text' });

// Multiple fields
await collection.createIndex({ title: 'text', content: 'text' });
```

**Important:** A collection can have at most one text index.

### $text Search

Use the `$text` operator to search text-indexed fields:

```js
const results = await Model.find({ $text: { $search: 'mongodb tutorial' } });
```

This finds documents containing "mongodb" OR "tutorial" in any text-indexed field.

### Text Score and Relevance

MongoDB assigns a relevance score to each matching document. You can project and sort by this score:

```js
const results = await Model.find(
  { $text: { $search: 'mongodb' } },
  { score: { $meta: 'textScore' } }
)
  .sort({ score: { $meta: 'textScore' } });
```

Higher scores indicate greater relevance -- documents where the search term appears more frequently or in more indexed fields.

### Phrase Search

Wrap your search term in escaped quotes to match an exact phrase:

```js
// Finds documents containing the exact phrase "NoSQL database"
const results = await Model.find({
  $text: { $search: '"NoSQL database"' }
});
```

### $regex Pattern Matching

For pattern matching that does not require a text index, use `$regex`:

```js
const results = await Model.find({
  username: { $regex: 'alice', $options: 'i' }
});
```

The `$options: 'i'` flag makes the search case-insensitive.

### Autocomplete with Anchored Regex

For autocomplete, anchor the regex to the start of the string with `^`:

```js
const results = await Model.find({
  username: { $regex: `^${prefix}`, $options: 'i' }
}).sort({ username: 1 });
```

This efficiently matches usernames that start with the given prefix. When combined with a regular index on the field, anchored regex queries can use the index.

## Your Mission

Open `exercise.js` and implement the five exported functions:

1. **textSearch(Model, searchTerm)** -- Ensure a text index exists, then find posts matching the search term.
2. **textSearchWithScore(Model, searchTerm)** -- Search with text score projection, sorted by relevance.
3. **phraseSearch(Model, phrase)** -- Search for an exact phrase using quoted text search.
4. **regexSearch(Model, pattern)** -- Use `$regex` to find users by pattern in the username field.
5. **autocompleteSearch(Model, prefix)** -- Implement autocomplete with `^` anchored regex, sorted by username.

Run your tests with:
```bash
npm run test:22
```

## Hints

<details>
<summary>Hint 1: Ensuring a text index exists</summary>

Use `collection.createIndex()` and catch errors for existing indexes. Index error codes 85 and 86 indicate a conflicting or existing index:

```js
try {
  await Model.collection.createIndex({ title: 'text', content: 'text' });
} catch (error) {
  if (error.code !== 85 && error.code !== 86) throw error;
}
```
</details>

<details>
<summary>Hint 2: Text score projection</summary>

Pass the score in the second argument to `find()` and use it in `sort()`:

```js
Model.find(
  { $text: { $search: term } },
  { score: { $meta: 'textScore' } }
).sort({ score: { $meta: 'textScore' } })
```
</details>

<details>
<summary>Hint 3: Phrase search syntax</summary>

Wrap the phrase in escaped double quotes inside the search string:

```js
Model.find({ $text: { $search: `"${phrase}"` } })
```
</details>

<details>
<summary>Hint 4: Regex vs text search</summary>

`$text` requires a text index and is optimized for natural language search. `$regex` works on any string field without a special index but can be slower on large collections. For autocomplete with `^` anchors, `$regex` can use a regular ascending index on the field.
</details>
