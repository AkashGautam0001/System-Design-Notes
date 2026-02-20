import mongoose from 'mongoose';

/**
 * Create a validated user schema with the following constraints:
 *   - username: String, required, minlength 3, maxlength 30
 *   - email: String, required, must match a basic email regex
 *   - age: Number, min 13, max 120
 *   - role: String, enum ['user', 'moderator', 'admin']
 *
 * @returns {mongoose.Schema} The validated user schema
 */
export function createValidatedUserSchema() {
  // TODO: Create and return a mongoose.Schema with the validation rules above
  throw new Error('Not implemented: createValidatedUserSchema');
}

/**
 * Attempt to create a user without a required field (username) to trigger
 * a ValidationError. Catch the error and return it.
 *
 * @param {mongoose.Model} Model - A Mongoose model built from the validated schema
 * @returns {Promise<mongoose.Error.ValidationError>} The caught ValidationError
 */
export async function testRequiredValidation(Model) {
  // TODO: Try to create a user without username using Model.create()
  // TODO: Catch the ValidationError and return it
  throw new Error('Not implemented: testRequiredValidation');
}

/**
 * Attempt to create a user with age below the minimum (e.g. age: 10)
 * to trigger a min validation error. Catch and return the error.
 *
 * @param {mongoose.Model} Model - A Mongoose model built from the validated schema
 * @returns {Promise<mongoose.Error.ValidationError>} The caught ValidationError
 */
export async function testMinMaxValidation(Model) {
  // TODO: Try to create a user with age: 10 (below min of 13)
  // TODO: Catch the ValidationError and return it
  throw new Error('Not implemented: testMinMaxValidation');
}

/**
 * Attempt to create a user with an invalid role (e.g. 'superadmin')
 * to trigger an enum validation error. Catch and return the error.
 *
 * @param {mongoose.Model} Model - A Mongoose model built from the validated schema
 * @returns {Promise<mongoose.Error.ValidationError>} The caught ValidationError
 */
export async function testEnumValidation(Model) {
  // TODO: Try to create a user with role: 'superadmin' (not in enum)
  // TODO: Catch the ValidationError and return it
  throw new Error('Not implemented: testEnumValidation');
}

/**
 * Create a schema with a custom validator that ensures the password
 * field contains at least one number. Test it by saving an invalid
 * password and returning the caught error.
 *
 * @returns {Promise<mongoose.Error.ValidationError>} The caught ValidationError
 */
export async function testCustomValidator() {
  // TODO: Create a new schema with a 'password' field that has a custom validator
  // TODO: The validator should check that the password contains at least one digit
  // TODO: Create a model, try to save with password 'abcdef' (no digits)
  // TODO: Catch the ValidationError and return it
  throw new Error('Not implemented: testCustomValidator');
}
