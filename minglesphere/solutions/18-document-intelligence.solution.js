import mongoose from 'mongoose';

/**
 * Create a User schema with an instance method getPublicProfile().
 */
export async function createModelWithInstanceMethod() {
  const schema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
  });

  schema.methods.getPublicProfile = function () {
    return {
      username: this.username,
      email: this.email,
    };
  };

  const User = mongoose.models.InstanceMethodUser || mongoose.model('InstanceMethodUser', schema);

  const user = await User.create({
    username: 'alice',
    email: 'alice@minglesphere.com',
    password: 'secret123',
  });

  return user.getPublicProfile();
}

/**
 * Create a schema with a static method findByEmail(email).
 */
export async function createModelWithStaticMethod() {
  const schema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
  });

  schema.statics.findByEmail = function (email) {
    return this.findOne({ email });
  };

  const User = mongoose.models.StaticMethodUser || mongoose.model('StaticMethodUser', schema);

  await User.create({ username: 'bob', email: 'bob@minglesphere.com' });

  const found = await User.findByEmail('bob@minglesphere.com');
  return found;
}

/**
 * Create a schema with a query helper byRole(role).
 */
export async function createModelWithQueryHelper() {
  const schema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String },
    role: { type: String, required: true },
  });

  schema.query.byRole = function (role) {
    return this.where({ role });
  };

  const User = mongoose.models.QueryHelperUser || mongoose.model('QueryHelperUser', schema);

  await User.create([
    { username: 'alice', email: 'alice@test.com', role: 'admin' },
    { username: 'bob', email: 'bob@test.com', role: 'user' },
    { username: 'charlie', email: 'charlie@test.com', role: 'admin' },
  ]);

  const admins = await User.find().byRole('admin');
  return admins;
}

/**
 * Create a schema with two query helpers: active() and byRole(role). Chain them.
 */
export async function chainQueryHelpers() {
  const schema = new mongoose.Schema({
    username: { type: String, required: true },
    role: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  });

  schema.query.active = function () {
    return this.where({ isActive: true });
  };

  schema.query.byRole = function (role) {
    return this.where({ role });
  };

  const User = mongoose.models.ChainedQueryUser || mongoose.model('ChainedQueryUser', schema);

  await User.create([
    { username: 'alice', role: 'admin', isActive: true },
    { username: 'bob', role: 'admin', isActive: false },
    { username: 'charlie', role: 'user', isActive: true },
    { username: 'diana', role: 'admin', isActive: true },
  ]);

  const activeAdmins = await User.find().active().byRole('admin');
  return activeAdmins;
}

/**
 * Create a schema with an instance method deactivate() that saves.
 */
export async function instanceMethodWithSave() {
  const schema = new mongoose.Schema({
    username: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  });

  schema.methods.deactivate = function () {
    this.isActive = false;
    return this.save();
  };

  const User = mongoose.models.DeactivateUser || mongoose.model('DeactivateUser', schema);

  const user = await User.create({ username: 'alice' });
  const updated = await user.deactivate();
  return updated;
}
