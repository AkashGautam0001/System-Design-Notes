import mongoose from 'mongoose';

/**
 * Perform a text search on a model's collection.
 * Ensure a text index exists on 'title' and 'content' fields before searching.
 *
 * @param {mongoose.Model} Model - A Mongoose model with title and content fields
 * @param {string} searchTerm - The term to search for
 * @returns {Promise<Array>} The matching documents
 */
export async function textSearch(Model, searchTerm) {
  // TODO: Ensure a text index exists on { title: 'text', content: 'text' }
  // TODO: Use Model.find({ $text: { $search: searchTerm } })
  // TODO: Return the results
  throw new Error('Not implemented');
}

/**
 * Perform a text search and include the text score in results.
 * Sort results by relevance score descending.
 *
 * @param {mongoose.Model} Model - A Mongoose model with title and content fields
 * @param {string} searchTerm - The term to search for
 * @returns {Promise<Array>} The matching documents with score, sorted by relevance
 */
export async function textSearchWithScore(Model, searchTerm) {
  // TODO: Ensure a text index exists on { title: 'text', content: 'text' }
  // TODO: Use $text search with { score: { $meta: 'textScore' } } in projection
  // TODO: Sort by { score: { $meta: 'textScore' } }
  // TODO: Return the results
  throw new Error('Not implemented');
}

/**
 * Perform an exact phrase search using $text.
 * Wrap the phrase in escaped quotes for exact matching.
 *
 * @param {mongoose.Model} Model - A Mongoose model with title and content fields
 * @param {string} phrase - The exact phrase to search for
 * @returns {Promise<Array>} The matching documents
 */
export async function phraseSearch(Model, phrase) {
  // TODO: Ensure a text index exists on { title: 'text', content: 'text' }
  // TODO: Use $text: { $search: '"exact phrase"' } (wrap phrase in quotes)
  // TODO: Return the results
  throw new Error('Not implemented');
}

/**
 * Use $regex to search for a pattern in the username field.
 *
 * @param {mongoose.Model} Model - A Mongoose model with a username field
 * @param {string} pattern - The regex pattern to match
 * @returns {Promise<Array>} The matching documents
 */
export async function regexSearch(Model, pattern) {
  // TODO: Use Model.find({ username: { $regex: pattern, $options: 'i' } })
  // TODO: Return the results
  throw new Error('Not implemented');
}

/**
 * Implement autocomplete search using $regex with ^ anchor.
 * Case-insensitive, sorted by username.
 *
 * @param {mongoose.Model} Model - A Mongoose model with a username field
 * @param {string} prefix - The prefix to autocomplete
 * @returns {Promise<Array>} The matching documents sorted by username
 */
export async function autocompleteSearch(Model, prefix) {
  // TODO: Use Model.find({ username: { $regex: `^${prefix}`, $options: 'i' } })
  // TODO: Sort by username ascending
  // TODO: Return the results
  throw new Error('Not implemented');
}
