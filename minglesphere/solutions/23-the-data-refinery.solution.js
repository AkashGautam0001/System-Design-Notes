import mongoose from 'mongoose';

/**
 * Group users by role and count, sorted by count descending.
 */
export async function groupByRole(Model) {
  await Model.insertMany([
    { username: 'alice', email: 'alice@example.com', role: 'admin', age: 30 },
    { username: 'bob', email: 'bob@example.com', role: 'user', age: 25 },
    { username: 'charlie', email: 'charlie@example.com', role: 'user', age: 28 },
    { username: 'diana', email: 'diana@example.com', role: 'moderator', age: 35 },
    { username: 'eve', email: 'eve@example.com', role: 'user', age: 22 },
    { username: 'frank', email: 'frank@example.com', role: 'admin', age: 40 },
  ]);

  const results = await Model.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return results;
}

/**
 * Match active users, group by role, compute average age.
 */
export async function matchAndGroup(Model) {
  await Model.insertMany([
    { username: 'alice', email: 'alice@example.com', role: 'admin', age: 30, active: true },
    { username: 'bob', email: 'bob@example.com', role: 'user', age: 25, active: true },
    { username: 'charlie', email: 'charlie@example.com', role: 'user', age: 28, active: false },
    { username: 'diana', email: 'diana@example.com', role: 'admin', age: 35, active: true },
    { username: 'eve', email: 'eve@example.com', role: 'user', age: 22, active: true },
    { username: 'frank', email: 'frank@example.com', role: 'moderator', age: 40, active: false },
  ]);

  const results = await Model.aggregate([
    { $match: { active: true } },
    { $group: { _id: '$role', avgAge: { $avg: '$age' } } },
  ]);

  return results;
}

/**
 * Use $project to create a computed displayInfo field.
 */
export async function projectFields(Model) {
  await Model.insertMany([
    { username: 'alice', email: 'alice@example.com', role: 'admin', age: 30 },
    { username: 'bob', email: 'bob@example.com', role: 'user', age: 25 },
    { username: 'charlie', email: 'charlie@example.com', role: 'user', age: 28 },
  ]);

  const results = await Model.aggregate([
    {
      $project: {
        displayInfo: { $concat: ['$username', ' <', '$email', '>'] },
        username: 1,
        email: 1,
      },
    },
  ]);

  return results;
}

/**
 * Use $addFields to add ageGroup based on age ranges.
 */
export async function addFieldsStage(Model) {
  await Model.insertMany([
    { username: 'teen1', email: 'teen1@example.com', age: 15 },
    { username: 'adult1', email: 'adult1@example.com', age: 30 },
    { username: 'senior1', email: 'senior1@example.com', age: 65 },
    { username: 'teen2', email: 'teen2@example.com', age: 18 },
    { username: 'adult2', email: 'adult2@example.com', age: 45 },
  ]);

  const results = await Model.aggregate([
    {
      $addFields: {
        ageGroup: {
          $switch: {
            branches: [
              { case: { $lt: ['$age', 20] }, then: 'teen' },
              { case: { $lt: ['$age', 60] }, then: 'adult' },
            ],
            default: 'senior',
          },
        },
      },
    },
  ]);

  return results;
}

/**
 * Use $match then $count to count active users.
 */
export async function countDocumentsAgg(Model) {
  await Model.insertMany([
    { username: 'alice', email: 'alice@example.com', active: true },
    { username: 'bob', email: 'bob@example.com', active: true },
    { username: 'charlie', email: 'charlie@example.com', active: false },
    { username: 'diana', email: 'diana@example.com', active: true },
    { username: 'eve', email: 'eve@example.com', active: false },
  ]);

  const results = await Model.aggregate([
    { $match: { active: true } },
    { $count: 'activeCount' },
  ]);

  return results[0].activeCount;
}
