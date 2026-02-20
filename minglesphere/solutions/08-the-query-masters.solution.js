import mongoose from 'mongoose';

/**
 * Seed users and find those with age > 25 AND age < 50.
 */
export async function findByComparison(Model) {
  await Model.create([
    { username: 'alice', age: 20, role: 'user' },
    { username: 'bob', age: 30, role: 'user' },
    { username: 'charlie', age: 40, role: 'moderator' },
    { username: 'diana', age: 55, role: 'admin' },
  ]);

  const results = await Model.find({ age: { $gt: 25, $lt: 50 } });
  return results;
}

/**
 * Seed users and find those with role in ['admin', 'moderator'].
 */
export async function findByInOperator(Model) {
  await Model.create([
    { username: 'alice', age: 25, role: 'user' },
    { username: 'bob', age: 30, role: 'admin' },
    { username: 'charlie', age: 35, role: 'moderator' },
    { username: 'diana', age: 40, role: 'user' },
  ]);

  const results = await Model.find({ role: { $in: ['admin', 'moderator'] } });
  return results;
}

/**
 * Seed users and find those where age < 18 OR role is 'admin'.
 */
export async function findByLogicalOr(Model) {
  await Model.create([
    { username: 'alice', age: 16, role: 'user' },
    { username: 'bob', age: 30, role: 'admin' },
    { username: 'charlie', age: 25, role: 'user' },
    { username: 'diana', age: 15, role: 'user' },
  ]);

  const results = await Model.find({
    $or: [{ age: { $lt: 18 } }, { role: 'admin' }],
  });
  return results;
}

/**
 * Seed users and find those whose username matches /^john/i.
 */
export async function findByRegex(Model) {
  await Model.create([
    { username: 'john_doe', age: 25, role: 'user' },
    { username: 'Johnny', age: 30, role: 'user' },
    { username: 'Jane', age: 28, role: 'moderator' },
    { username: 'JOHNSON', age: 35, role: 'admin' },
  ]);

  const results = await Model.find({ username: { $regex: /^john/i } });
  return results;
}

/**
 * Seed users (some with bio, some without) and find those where bio $exists.
 */
export async function findByExists(Model) {
  await Model.create([
    { username: 'alice', age: 25, role: 'user', bio: 'I love coding' },
    { username: 'bob', age: 30, role: 'user' },
    { username: 'charlie', age: 35, role: 'moderator', bio: 'Gamer and developer' },
    { username: 'diana', age: 40, role: 'admin' },
  ]);

  const results = await Model.find({ bio: { $exists: true } });
  return results;
}
