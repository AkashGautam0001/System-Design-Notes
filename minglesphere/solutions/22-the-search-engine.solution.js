import mongoose from 'mongoose';

/**
 * Perform a text search on a model's collection.
 */
export async function textSearch(Model, searchTerm) {
  // Ensure text index exists
  try {
    await Model.collection.createIndex({ title: 'text', content: 'text' });
  } catch (error) {
    // Index may already exist, that's fine
    if (error.code !== 85 && error.code !== 86) throw error;
  }

  const results = await Model.find({ $text: { $search: searchTerm } }).lean();
  return results;
}

/**
 * Perform a text search with text score, sorted by relevance.
 */
export async function textSearchWithScore(Model, searchTerm) {
  try {
    await Model.collection.createIndex({ title: 'text', content: 'text' });
  } catch (error) {
    if (error.code !== 85 && error.code !== 86) throw error;
  }

  const results = await Model.find(
    { $text: { $search: searchTerm } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .lean();
  return results;
}

/**
 * Perform an exact phrase search using $text.
 */
export async function phraseSearch(Model, phrase) {
  try {
    await Model.collection.createIndex({ title: 'text', content: 'text' });
  } catch (error) {
    if (error.code !== 85 && error.code !== 86) throw error;
  }

  const results = await Model.find({
    $text: { $search: `"${phrase}"` },
  }).lean();
  return results;
}

/**
 * Use $regex to search for a pattern in the username field.
 */
export async function regexSearch(Model, pattern) {
  const results = await Model.find({
    username: { $regex: pattern, $options: 'i' },
  }).lean();
  return results;
}

/**
 * Implement autocomplete search using $regex with ^ anchor.
 */
export async function autocompleteSearch(Model, prefix) {
  const results = await Model.find({
    username: { $regex: `^${prefix}`, $options: 'i' },
  })
    .sort({ username: 1 })
    .lean();
  return results;
}
