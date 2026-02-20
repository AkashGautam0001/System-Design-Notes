import mongoose from 'mongoose';

/**
 * Create a schema with {timestamps: true}, create a document using the
 * provided Model, and return the saved document. The document should
 * automatically have createdAt and updatedAt fields.
 *
 * @param {mongoose.Model} Model - A Mongoose model with timestamps enabled
 * @returns {Promise<Object>} The saved document
 */
export async function createTimestampSchema(Model) {
  // TODO: Create a document using Model.create() with some basic data
  // TODO: Return the saved document (it should have createdAt and updatedAt)
  throw new Error('Not implemented: createTimestampSchema');
}

/**
 * Demonstrate strict mode behavior. Create a schema with {strict: true},
 * save a document with an extra field not defined in the schema, then
 * retrieve it and verify the extra field was stripped.
 *
 * @returns {Promise<Object>} The retrieved document (should NOT have the extra field)
 */
export async function testStrictMode() {
  // TODO: Create a schema with only 'name' field and strict: true
  // TODO: Create a model, save a doc with { name: 'Test', notInSchema: 'hello' }
  // TODO: Retrieve the doc and return it
  throw new Error('Not implemented: testStrictMode');
}

/**
 * Create a schema with static and dynamic default values.
 *   - role: defaults to 'user' (static default)
 *   - joinCode: defaults to a function that returns a random string
 *
 * Create a document WITHOUT providing role or joinCode, and return it.
 *
 * @returns {Promise<Object>} The saved document with defaults applied
 */
export async function testDefaultValues() {
  // TODO: Create a schema with 'name' (String), 'role' (String, default: 'user'),
  //       and 'joinCode' (String, default: () => Math.random().toString(36).substring(2, 10))
  // TODO: Create a model and save a doc with only { name: 'Alice' }
  // TODO: Return the saved document
  throw new Error('Not implemented: testDefaultValues');
}

/**
 * Create a schema with a toJSON transform that removes the password field
 * from the JSON output. Create a document with a password, call toJSON()
 * on it, and return the JSON object.
 *
 * @returns {Promise<Object>} The JSON representation of the doc (without password)
 */
export async function testToJSONTransform() {
  // TODO: Create a schema with 'username' and 'password' fields
  // TODO: Add toJSON transform in schema options that deletes ret.password
  // TODO: Create a model, save a doc, call .toJSON() on it, and return the result
  throw new Error('Not implemented: testToJSONTransform');
}

/**
 * Create a schema combining timestamps, toJSON transform, and default values.
 * Demonstrate all features working together by creating and returning a document.
 *
 * @returns {Promise<Object>} An object with { doc, json } where doc is the saved
 *   document and json is the toJSON() output
 */
export async function createSchemaWithAllOptions() {
  // TODO: Create a schema with:
  //   - 'username' (String)
  //   - 'password' (String)
  //   - 'role' (String, default: 'user')
  //   - timestamps: true
  //   - toJSON transform that removes password
  // TODO: Create a model, save a doc with { username: 'alice', password: 'secret123' }
  // TODO: Return { doc: savedDoc, json: savedDoc.toJSON() }
  throw new Error('Not implemented: createSchemaWithAllOptions');
}
