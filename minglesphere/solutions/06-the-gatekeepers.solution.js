import mongoose from 'mongoose';

/**
 * Create a validated user schema with comprehensive validation rules.
 */
export function createValidatedUserSchema() {
  return new mongoose.Schema({
    username: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      match: /^[\w.-]+@[\w.-]+\.\w{2,}$/,
    },
    age: {
      type: Number,
      min: 13,
      max: 120,
    },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
    },
  });
}

/**
 * Try to create a user without username, catch and return the ValidationError.
 */
export async function testRequiredValidation(Model) {
  try {
    await Model.create({ email: 'test@example.com', age: 25, role: 'user' });
  } catch (error) {
    return error;
  }
}

/**
 * Try to create a user with age below min (10), catch and return the error.
 */
export async function testMinMaxValidation(Model) {
  try {
    await Model.create({ username: 'testuser', email: 'test@example.com', age: 10, role: 'user' });
  } catch (error) {
    return error;
  }
}

/**
 * Try to create a user with invalid enum role, catch and return the error.
 */
export async function testEnumValidation(Model) {
  try {
    await Model.create({ username: 'testuser', email: 'test@example.com', age: 25, role: 'superadmin' });
  } catch (error) {
    return error;
  }
}

/**
 * Create a schema with custom password validator, test it, return the error.
 */
export async function testCustomValidator() {
  const schema = new mongoose.Schema({
    password: {
      type: String,
      validate: {
        validator: function (v) {
          return /\d/.test(v);
        },
        message: 'Password must contain at least one number',
      },
    },
  });

  // Remove existing model if it exists
  delete mongoose.connection.models['PasswordTestUser'];
  delete mongoose.models['PasswordTestUser'];
  const PasswordTestUser = mongoose.model('PasswordTestUser', schema);

  try {
    await PasswordTestUser.create({ password: 'abcdef' });
  } catch (error) {
    return error;
  }
}
