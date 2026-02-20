import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  userAgent: String,
  ipAddress: String,
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

sessionSchema.index({ user: 1 });

const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
export default Session;
export { sessionSchema };
