import mongoose from 'mongoose';

/**
 * Use $lookup to join posts to users.
 */
export async function lookupPosts(UserModel, PostModel) {
  const alice = await UserModel.create({
    username: 'alice',
    email: 'alice@example.com',
    role: 'admin',
    age: 30,
  });
  const bob = await UserModel.create({
    username: 'bob',
    email: 'bob@example.com',
    role: 'user',
    age: 25,
  });

  await PostModel.insertMany([
    { title: 'First Post', content: 'Hello world', author: alice._id },
    { title: 'Second Post', content: 'Mongoose is great', author: alice._id },
    { title: 'Bobs Post', content: 'Hi from Bob', author: bob._id },
  ]);

  const results = await UserModel.aggregate([
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'author',
        as: 'userPosts',
      },
    },
  ]);

  return results;
}

/**
 * Use $unwind on tags, then $group by tag to count occurrences.
 */
export async function unwindArray(Model) {
  await Model.insertMany([
    { title: 'Post 1', content: 'Content 1', tags: ['javascript', 'nodejs', 'mongodb'] },
    { title: 'Post 2', content: 'Content 2', tags: ['javascript', 'react'] },
    { title: 'Post 3', content: 'Content 3', tags: ['mongodb', 'mongoose', 'nodejs'] },
    { title: 'Post 4', content: 'Content 4', tags: ['javascript', 'mongodb'] },
  ]);

  const results = await Model.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return results;
}

/**
 * Use $bucket to group users into age ranges.
 */
export async function bucketByAge(Model) {
  await Model.insertMany([
    { username: 'child1', email: 'child1@example.com', age: 10 },
    { username: 'teen1', email: 'teen1@example.com', age: 15 },
    { username: 'young1', email: 'young1@example.com', age: 22 },
    { username: 'young2', email: 'young2@example.com', age: 28 },
    { username: 'mid1', email: 'mid1@example.com', age: 35 },
    { username: 'mid2', email: 'mid2@example.com', age: 45 },
    { username: 'senior1', email: 'senior1@example.com', age: 55 },
    { username: 'senior2', email: 'senior2@example.com', age: 70 },
  ]);

  const results = await Model.aggregate([
    {
      $bucket: {
        groupBy: '$age',
        boundaries: [0, 18, 30, 50, 100],
        default: 'Other',
        output: {
          count: { $sum: 1 },
        },
      },
    },
  ]);

  return results;
}

/**
 * Use $facet to run multiple sub-pipelines simultaneously.
 */
export async function facetSearch(Model) {
  await Model.insertMany([
    { username: 'alice', email: 'alice@example.com', role: 'admin', age: 30 },
    { username: 'bob', email: 'bob@example.com', role: 'user', age: 25 },
    { username: 'charlie', email: 'charlie@example.com', role: 'user', age: 28 },
    { username: 'diana', email: 'diana@example.com', role: 'moderator', age: 35 },
    { username: 'eve', email: 'eve@example.com', role: 'user', age: 22 },
    { username: 'frank', email: 'frank@example.com', role: 'admin', age: 40 },
  ]);

  const results = await Model.aggregate([
    {
      $facet: {
        byRole: [
          { $group: { _id: '$role', count: { $sum: 1 } } },
        ],
        ageStats: [
          {
            $group: {
              _id: null,
              avgAge: { $avg: '$age' },
              minAge: { $min: '$age' },
              maxAge: { $max: '$age' },
            },
          },
        ],
        total: [
          { $count: 'count' },
        ],
      },
    },
  ]);

  return results[0];
}

/**
 * Use $addFields with $cond to categorize users by age.
 */
export async function conditionalExpression(Model) {
  await Model.insertMany([
    { username: 'child1', email: 'child1@example.com', age: 12 },
    { username: 'adult1', email: 'adult1@example.com', age: 30 },
    { username: 'senior1', email: 'senior1@example.com', age: 70 },
    { username: 'teen1', email: 'teen1@example.com', age: 16 },
    { username: 'adult2', email: 'adult2@example.com', age: 50 },
  ]);

  const results = await Model.aggregate([
    {
      $addFields: {
        category: {
          $cond: {
            if: { $lt: ['$age', 18] },
            then: 'minor',
            else: {
              $cond: {
                if: { $lt: ['$age', 65] },
                then: 'adult',
                else: 'senior',
              },
            },
          },
        },
      },
    },
  ]);

  return results;
}
