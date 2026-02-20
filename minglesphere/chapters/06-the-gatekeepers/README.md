# Chapter 6: The Gatekeepers

## Story

MingleSphere is growing fast. Thousands of new users are signing up every day, and with growth comes trouble. Spammers have started infiltrating the platform, creating accounts with blank usernames, impossibly young ages, and roles that don't even exist in the system. The integrity of the data is crumbling under the weight of garbage input.

The core team gathers for an emergency meeting. "We need gatekeepers," says the lead developer. "Every piece of data that enters our database must pass through a gauntlet of validation rules. No more trusting the client. The schema itself must enforce the rules." This is where Mongoose validation shines -- the ability to define constraints directly in your schema so that invalid data never reaches the database.

Your mission: fortify MingleSphere's schemas with validation rules that reject bad data before it can do any harm. You will work with built-in validators like `required`, `min`, `max`, `enum`, and `match`, and you will also craft a custom validator to enforce password complexity.

## Concepts

### Required Fields

The simplest validator. Mark a field as `required` and Mongoose will reject any document that omits it.

```js
const schema = new mongoose.Schema({
  username: { type: String, required: true },
});
```

### String Length: minlength and maxlength

Control the acceptable length of string fields.

```js
const schema = new mongoose.Schema({
  username: { type: String, minlength: 3, maxlength: 30 },
});
```

### Number Range: min and max

Restrict numeric fields to a valid range.

```js
const schema = new mongoose.Schema({
  age: { type: Number, min: 13, max: 120 },
});
```

### Enum Validation

Restrict a string field to a fixed set of allowed values.

```js
const schema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'moderator', 'admin'] },
});
```

### Pattern Matching with match

Use a regular expression to validate string format.

```js
const schema = new mongoose.Schema({
  email: { type: String, match: /^[\w.-]+@[\w.-]+\.\w{2,}$/ },
});
```

### Custom Validators

For rules that go beyond the built-in validators, define your own using the `validate` property.

```js
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
```

### Catching ValidationErrors

When validation fails, Mongoose throws a `ValidationError`. Each failing field is accessible on `error.errors`.

```js
try {
  await Model.create({ /* invalid data */ });
} catch (error) {
  if (error instanceof mongoose.Error.ValidationError) {
    console.log(error.errors); // object keyed by field name
  }
}
```

## Your Mission

Open `exercise.js` and implement the five exported functions:

1. **createValidatedUserSchema()** -- Build a schema with all the validation rules described above.
2. **testRequiredValidation(Model)** -- Trigger and catch a required field error.
3. **testMinMaxValidation(Model)** -- Trigger and catch a min/max number error.
4. **testEnumValidation(Model)** -- Trigger and catch an invalid enum error.
5. **testCustomValidator(Model)** -- Build a custom password validator and trigger it.

Run your tests with:
```bash
npm run test:06
```

## Hints

<details>
<summary>Hint 1: Schema structure for createValidatedUserSchema</summary>

```js
new mongoose.Schema({
  username: { type: String, required: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, match: /^[\w.-]+@[\w.-]+\.\w{2,}$/ },
  age: { type: Number, min: 13, max: 120 },
  role: { type: String, enum: ['user', 'moderator', 'admin'] },
});
```
</details>

<details>
<summary>Hint 2: Catching validation errors</summary>

Wrap `Model.create()` in a try/catch. The caught error will be an instance of `mongoose.Error.ValidationError`. Return the error from the catch block.

```js
try {
  await Model.create({ /* bad data */ });
} catch (error) {
  return error;
}
```
</details>

<details>
<summary>Hint 3: Custom validator for password</summary>

Create a new schema inside the function. Use `validate` with a function that tests `/\d/.test(v)`. Create a temporary model with `mongoose.model()`, then try to create a document with a password that has no digits.

</details>

<details>
<summary>Hint 4: Ensuring the right error fields</summary>

For `testRequiredValidation`, omit `username` but provide `email` so only the username error triggers. For `testMinMaxValidation`, provide valid username and email but set `age: 10`. For `testEnumValidation`, provide valid fields but set `role: 'superadmin'`.

</details>
