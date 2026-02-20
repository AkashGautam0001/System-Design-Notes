import mongoose from 'mongoose';
import softDelete from '../models/plugins/softDelete.js';

/**
 * Create base Post model with TextPost and ImagePost discriminators.
 */
export async function createDiscriminators() {
  const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String },
    createdAt: { type: Date, default: Date.now },
  });

  const Post = mongoose.models.DiscrimPost || mongoose.model('DiscrimPost', postSchema);

  const textPostSchema = new mongoose.Schema({
    wordCount: { type: Number },
  });

  const imagePostSchema = new mongoose.Schema({
    imageUrl: { type: String },
    dimensions: {
      width: { type: Number },
      height: { type: Number },
    },
  });

  const TextPost = Post.discriminators?.DiscrimTextPost || Post.discriminator('DiscrimTextPost', textPostSchema);
  const ImagePost = Post.discriminators?.DiscrimImagePost || Post.discriminator('DiscrimImagePost', imagePostSchema);

  const textPost = await TextPost.create({
    title: 'My First Blog',
    content: 'This is a text post.',
    wordCount: 150,
  });

  const imagePost = await ImagePost.create({
    title: 'Sunset Photo',
    content: 'A beautiful sunset.',
    imageUrl: 'https://example.com/sunset.jpg',
    dimensions: { width: 1920, height: 1080 },
  });

  return { textPost, imagePost };
}

/**
 * Query the base Post model to return all posts.
 */
export async function queryBaseModel(PostModel) {
  const results = await PostModel.find();
  return results;
}

/**
 * Query the TextPost discriminator model to return only TextPost docs.
 */
export async function queryDiscriminatorModel(TextPostModel) {
  const results = await TextPostModel.find();
  return results;
}

/**
 * Create a timestamps plugin, apply it, create a doc, return it.
 */
export async function createPlugin() {
  function timestampsPlugin(schema) {
    schema.add({
      createdAt: { type: Date },
      updatedAt: { type: Date },
    });

    schema.pre('save', function (next) {
      const now = new Date();
      if (!this.createdAt) {
        this.createdAt = now;
      }
      this.updatedAt = now;
      next();
    });
  }

  const schema = new mongoose.Schema({
    name: { type: String, required: true },
  });

  schema.plugin(timestampsPlugin);

  const Item = mongoose.models.PluginItem || mongoose.model('PluginItem', schema);

  const doc = await Item.create({ name: 'Test Item' });
  return doc;
}

/**
 * Apply softDelete plugin, create a doc, soft delete, then restore.
 */
export async function applySoftDeletePlugin() {
  const schema = new mongoose.Schema({
    name: { type: String, required: true },
  });

  schema.plugin(softDelete);

  const Item = mongoose.models.SoftDeleteItem || mongoose.model('SoftDeleteItem', schema);

  const doc = await Item.create({ name: 'Deletable Item' });

  await doc.softDelete();

  await doc.restore();

  return doc;
}
