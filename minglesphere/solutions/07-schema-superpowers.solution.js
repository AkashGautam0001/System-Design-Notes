import mongoose from 'mongoose';

/**
 * Create a document using the provided Model (which has timestamps enabled).
 */
export async function createTimestampSchema(Model) {
  const doc = await Model.create({ username: 'alice', email: 'alice@example.com' });
  return doc;
}

/**
 * Demonstrate strict mode stripping extra fields.
 */
export async function testStrictMode() {
  const schema = new mongoose.Schema(
    { name: String },
    { strict: true }
  );

  delete mongoose.connection.models['StrictTestUser'];
  delete mongoose.models['StrictTestUser'];
  const StrictTestUser = mongoose.model('StrictTestUser', schema);

  const doc = await StrictTestUser.create({ name: 'Test', notInSchema: 'hello' });
  const retrieved = await StrictTestUser.findById(doc._id);
  return retrieved;
}

/**
 * Test static and dynamic default values.
 */
export async function testDefaultValues() {
  const schema = new mongoose.Schema({
    name: String,
    role: { type: String, default: 'user' },
    joinCode: {
      type: String,
      default: () => Math.random().toString(36).substring(2, 10),
    },
  });

  delete mongoose.connection.models['DefaultTestUser'];
  delete mongoose.models['DefaultTestUser'];
  const DefaultTestUser = mongoose.model('DefaultTestUser', schema);

  const doc = await DefaultTestUser.create({ name: 'Alice' });
  return doc;
}

/**
 * Test toJSON transform that removes password.
 */
export async function testToJSONTransform() {
  const schema = new mongoose.Schema(
    { username: String, password: String },
    {
      toJSON: {
        transform: function (doc, ret) {
          delete ret.password;
          return ret;
        },
      },
    }
  );

  delete mongoose.connection.models['JSONTransformUser'];
  delete mongoose.models['JSONTransformUser'];
  const JSONTransformUser = mongoose.model('JSONTransformUser', schema);

  const doc = await JSONTransformUser.create({ username: 'alice', password: 'secret123' });
  return doc.toJSON();
}

/**
 * Combine timestamps, defaults, and toJSON transform in one schema.
 */
export async function createSchemaWithAllOptions() {
  const schema = new mongoose.Schema(
    {
      username: String,
      password: String,
      role: { type: String, default: 'user' },
    },
    {
      timestamps: true,
      toJSON: {
        transform: function (doc, ret) {
          delete ret.password;
          return ret;
        },
      },
    }
  );

  delete mongoose.connection.models['AllOptionsUser'];
  delete mongoose.models['AllOptionsUser'];
  const AllOptionsUser = mongoose.model('AllOptionsUser', schema);

  const doc = await AllOptionsUser.create({ username: 'alice', password: 'secret123' });
  return { doc, json: doc.toJSON() };
}
