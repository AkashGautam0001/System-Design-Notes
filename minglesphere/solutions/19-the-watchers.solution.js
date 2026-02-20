import mongoose from 'mongoose';

/**
 * Create a schema with a pre('save') hook that uppercases the username.
 */
export async function createPreSaveHook() {
  const schema = new mongoose.Schema({
    username: { type: String, required: true },
  });

  schema.pre('save', function (next) {
    this.username = this.username.toUpperCase();
    next();
  });

  const User = mongoose.models.PreSaveUser || mongoose.model('PreSaveUser', schema);

  const user = await User.create({ username: 'alice' });
  return user;
}

/**
 * Create a schema with a post('save') hook that adds savedAt to the doc.
 */
export async function createPostSaveHook() {
  const schema = new mongoose.Schema({
    username: { type: String, required: true },
  });

  schema.post('save', function (doc) {
    doc.savedAt = new Date();
  });

  const User = mongoose.models.PostSaveUser || mongoose.model('PostSaveUser', schema);

  const user = await User.create({ username: 'bob' });
  return user;
}

/**
 * Create a schema with a pre('validate') hook that trims email.
 */
export async function createPreValidateHook() {
  const schema = new mongoose.Schema({
    email: { type: String, required: true },
  });

  schema.pre('validate', function (next) {
    if (this.email) {
      this.email = this.email.trim();
    }
    next();
  });

  const User = mongoose.models.PreValidateUser || mongoose.model('PreValidateUser', schema);

  const user = await User.create({ email: '  user@test.com  ' });
  return user;
}

/**
 * Create a schema with a pre('find') hook that filters out deleted docs.
 */
export async function createPreFindHook() {
  const schema = new mongoose.Schema({
    username: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  });

  schema.pre('find', function () {
    this.where({ isDeleted: { $ne: true } });
  });

  const User = mongoose.models.PreFindUser || mongoose.model('PreFindUser', schema);

  await User.create([
    { username: 'alice', isDeleted: false },
    { username: 'bob', isDeleted: true },
    { username: 'charlie', isDeleted: false },
  ]);

  const results = await User.find();
  return results;
}

/**
 * Create a schema with an async pre('save') hook that simulates password hashing.
 */
export async function createAsyncHook() {
  const schema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
  });

  schema.pre('save', async function () {
    if (this.isModified('password')) {
      this.password = 'hashed_' + this.password;
    }
  });

  const User = mongoose.models.AsyncHookUser || mongoose.model('AsyncHookUser', schema);

  const user = await User.create({ username: 'alice', password: 'mypassword' });
  return user;
}
