import mongoose from 'mongoose';

/**
 * Seed users and select only username and email fields.
 */
export async function selectFields(Model) {
  await Model.create([
    { username: 'alice', email: 'alice@example.com', age: 25, role: 'user' },
    { username: 'bob', email: 'bob@example.com', age: 30, role: 'admin' },
    { username: 'charlie', email: 'charlie@example.com', age: 35, role: 'moderator' },
  ]);

  const results = await Model.find().select('username email');
  return results;
}

/**
 * Seed users and sort by age descending.
 */
export async function sortUsers(Model) {
  await Model.create([
    { username: 'alice', age: 25, role: 'user' },
    { username: 'bob', age: 45, role: 'admin' },
    { username: 'charlie', age: 30, role: 'moderator' },
    { username: 'diana', age: 55, role: 'user' },
  ]);

  const results = await Model.find().sort({ age: -1 });
  return results;
}

/**
 * Seed 10 users and implement pagination.
 */
export async function paginateUsers(Model, page, limit) {
  const users = [];
  for (let i = 1; i <= 10; i++) {
    const padded = String(i).padStart(2, '0');
    users.push({
      username: `user_${padded}`,
      email: `user${padded}@example.com`,
      age: 20 + i,
      role: 'user',
    });
  }
  await Model.create(users);

  const skip = (page - 1) * limit;
  const results = await Model.find().sort({ username: 1 }).skip(skip).limit(limit);
  return results;
}

/**
 * Seed users with various roles and return distinct roles.
 */
export async function getDistinctRoles(Model) {
  await Model.create([
    { username: 'alice', role: 'user' },
    { username: 'bob', role: 'admin' },
    { username: 'charlie', role: 'moderator' },
    { username: 'diana', role: 'user' },
    { username: 'eve', role: 'admin' },
  ]);

  const roles = await Model.distinct('role');
  return roles;
}

/**
 * Seed users with mixed isActive values and count active ones.
 */
export async function countActiveUsers(Model) {
  await Model.create([
    { username: 'alice', isActive: true },
    { username: 'bob', isActive: false },
    { username: 'charlie', isActive: true },
    { username: 'diana', isActive: true },
    { username: 'eve', isActive: false },
  ]);

  const count = await Model.countDocuments({ isActive: true });
  return count;
}
