import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
    },
    type: {
      type: String,
      enum: ['cafe', 'park', 'office', 'restaurant', 'gym', 'other'],
      default: 'other',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    checkins: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        checkedInAt: { type: Date, default: Date.now },
      },
    ],
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
  },
  { timestamps: true }
);

locationSchema.index({ location: '2dsphere' });

const Location = mongoose.models.Location || mongoose.model('Location', locationSchema);
export default Location;
export { locationSchema };
