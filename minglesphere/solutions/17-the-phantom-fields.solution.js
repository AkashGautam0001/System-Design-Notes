import mongoose from 'mongoose';

/**
 * Create a User schema with firstName and lastName fields,
 * plus a fullName virtual getter.
 */
export async function createSchemaWithVirtual() {
  const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
  });

  userSchema.virtual('fullName').get(function () {
    return this.firstName + ' ' + this.lastName;
  });

  const User = mongoose.models.VirtUser || mongoose.model('VirtUser', userSchema);

  const user = await User.create({ firstName: 'John', lastName: 'Smith' });
  return user.fullName;
}

/**
 * Create a schema with a fullName virtual that has both getter AND setter.
 */
export async function createVirtualSetter() {
  const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
  });

  userSchema.virtual('fullName')
    .get(function () {
      return this.firstName + ' ' + this.lastName;
    })
    .set(function (value) {
      const parts = value.split(' ');
      this.set('firstName', parts[0]);
      this.set('lastName', parts.slice(1).join(' '));
    });

  const User = mongoose.models.VirtSetUser || mongoose.model('VirtSetUser', userSchema);

  const user = new User();
  user.fullName = 'Jane Doe';
  await user.save();
  return user;
}

/**
 * Create a schema configured to include virtuals when toJSON() is called.
 */
export async function ensureVirtualsInJSON() {
  const userSchema = new mongoose.Schema(
    {
      firstName: String,
      lastName: String,
    },
    {
      toJSON: { virtuals: true },
    }
  );

  userSchema.virtual('fullName').get(function () {
    return this.firstName + ' ' + this.lastName;
  });

  const User = mongoose.models.VirtJSONUser || mongoose.model('VirtJSONUser', userSchema);

  const user = await User.create({ firstName: 'Sarah', lastName: 'Connor' });
  return user.toJSON();
}

/**
 * Create Author and Post schemas where Author has a virtual 'posts' field.
 */
export async function virtualPopulate() {
  const authorSchema = new mongoose.Schema(
    {
      name: String,
    },
    {
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  authorSchema.virtual('posts', {
    ref: 'VPPost',
    localField: '_id',
    foreignField: 'author',
  });

  const postSchema = new mongoose.Schema({
    title: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'VPAuthor' },
  });

  const Author = mongoose.models.VPAuthor || mongoose.model('VPAuthor', authorSchema);
  const Post = mongoose.models.VPPost || mongoose.model('VPPost', postSchema);

  const author = await Author.create({ name: 'Ernest Hemingway' });
  await Post.create([
    { title: 'The Old Man and the Sea', author: author._id },
    { title: 'A Farewell to Arms', author: author._id },
  ]);

  return Author.findById(author._id).populate('posts');
}

/**
 * Create a schema with a virtual populate using count: true.
 */
export async function virtualWithCount() {
  const authorSchema = new mongoose.Schema(
    {
      name: String,
    },
    {
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  authorSchema.virtual('postCount', {
    ref: 'VCPost',
    localField: '_id',
    foreignField: 'author',
    count: true,
  });

  const postSchema = new mongoose.Schema({
    title: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'VCAuthor' },
  });

  const Author = mongoose.models.VCAuthor || mongoose.model('VCAuthor', authorSchema);
  const Post = mongoose.models.VCPost || mongoose.model('VCPost', postSchema);

  const author = await Author.create({ name: 'Agatha Christie' });
  await Post.create([
    { title: 'Murder on the Orient Express', author: author._id },
    { title: 'And Then There Were None', author: author._id },
    { title: 'The ABC Murders', author: author._id },
  ]);

  return Author.findById(author._id).populate('postCount');
}
