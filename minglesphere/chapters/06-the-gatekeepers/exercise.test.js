import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../../shared/connection.js';
import { clearAllCollections } from '../../shared/test-helpers.js';

const exercisePath = process.env.SOLUTIONS
  ? '../../solutions/06-the-gatekeepers.solution.js'
  : './exercise.js';
const {
  createValidatedUserSchema,
  testRequiredValidation,
  testMinMaxValidation,
  testEnumValidation,
  testCustomValidator,
} = await import(exercisePath);

beforeAll(async () => { await connectToDatabase(); });
afterAll(async () => { await disconnectFromDatabase(); });
beforeEach(async () => { await clearAllCollections(); });

describe('Chapter 6: The Gatekeepers', () => {
  let ValidatedUser;

  beforeEach(() => {
    // Clean up any previously registered model
    delete mongoose.connection.models['ValidatedUser'];
    delete mongoose.models['ValidatedUser'];
    const schema = createValidatedUserSchema();
    ValidatedUser = mongoose.model('ValidatedUser', schema);
  });

  test('createValidatedUserSchema returns a schema with required, minlength, maxlength, match, min, max, and enum validators', () => {
    const schema = createValidatedUserSchema();
    expect(schema).toBeInstanceOf(mongoose.Schema);

    const usernamePath = schema.path('username');
    expect(usernamePath).toBeDefined();
    expect(usernamePath.isRequired).toBeTruthy();

    const emailPath = schema.path('email');
    expect(emailPath).toBeDefined();
    expect(emailPath.isRequired).toBeTruthy();

    const agePath = schema.path('age');
    expect(agePath).toBeDefined();

    const rolePath = schema.path('role');
    expect(rolePath).toBeDefined();
    expect(rolePath.options.enum).toEqual(expect.arrayContaining(['user', 'moderator', 'admin']));
  });

  test('testRequiredValidation catches a ValidationError when username is missing', async () => {
    const error = await testRequiredValidation(ValidatedUser);
    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error.errors.username).toBeDefined();
  });

  test('testMinMaxValidation catches a ValidationError when age is below minimum', async () => {
    const error = await testMinMaxValidation(ValidatedUser);
    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error.errors.age).toBeDefined();
  });

  test('testEnumValidation catches a ValidationError when role is not in enum', async () => {
    const error = await testEnumValidation(ValidatedUser);
    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error.errors.role).toBeDefined();
  });

  test('testCustomValidator catches a ValidationError when password has no digits', async () => {
    const error = await testCustomValidator();
    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error.errors.password).toBeDefined();
  });
});
