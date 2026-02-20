import mongoose from 'mongoose';

const commentSubSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Post must have an author'],
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      maxlength: [5000, 'Post cannot exceed 5000 characters'],
    },
    title: {
      type: String,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    tags: {
      type: [String],
      default: [],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    comments: [commentSubSchema],
    visibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    discriminatorKey: '__t',
  }
);

// Virtual: like count
postSchema.virtual('likeCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

// Virtual: comment count
postSchema.virtual('commentCount').get(function () {
  return this.comments ? this.comments.length : 0;
});

// Instance method: add a like
postSchema.methods.addLike = async function (userId) {
  const id = userId.toString();
  if (!this.likes.some((l) => l.toString() === id)) {
    this.likes.push(userId);
    return this.save();
  }
  return this;
};

// Instance method: remove a like
postSchema.methods.removeLike = async function (userId) {
  this.likes = this.likes.filter((l) => l.toString() !== userId.toString());
  return this.save();
};

// Static: find public posts
postSchema.statics.findPublic = function (filter = {}) {
  return this.find({ ...filter, visibility: 'public', isDeleted: false });
};

// Query helper: byAuthor
postSchema.query.byAuthor = function (authorId) {
  return this.where({ author: authorId });
};

// Text index for search
postSchema.index({ content: 'text', title: 'text', tags: 'text' });
postSchema.index({ author: 1, createdAt: -1 });

const Post = mongoose.models.Post || mongoose.model('Post', postSchema);
export default Post;
export { postSchema, commentSubSchema };
