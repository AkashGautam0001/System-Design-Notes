import mongoose from 'mongoose';

const hashtagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    postCount: {
      type: Number,
      default: 0,
    },
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
      },
    ],
    trending: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

hashtagSchema.index({ name: 'text' });

const Hashtag = mongoose.models.Hashtag || mongoose.model('Hashtag', hashtagSchema);
export default Hashtag;
export { hashtagSchema };
