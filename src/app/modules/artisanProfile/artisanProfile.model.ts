import { model, Schema } from 'mongoose';
import {
  IArtisanProfile,
  ArtisanProfileModel,
} from './artisanProfile.interface';

const artisanProfileSchema = new Schema<IArtisanProfile, ArtisanProfileModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    businessName: {
      type: String,
      default: '',
      trim: true,
    },
    trade: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    bio: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    experienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },
    availabilityStatus: {
      type: String,
      enum: ['Available', 'Booked', 'Unavailable'],
      default: 'Available',
      index: true,
    },
    hourlyRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    startingRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedJobs: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isProfilePublic: {
      type: Boolean,
      default: true,
    },
    postCode: {
      index: true,
      type: String,
      trim: true,
    },
    serviceLatitude: { type: Number },
    serviceLongitude: { type: Number },
    serviceRadiusKm: { type: Number, min: 1, max: 150, default: 25 },
    baseLocation: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
    quotesSent: { type: Number, default: 0, min: 0 },
    quotesAccepted: { type: Number, default: 0, min: 0 },
    acceptRate: { type: Number, default: 0, min: 0, max: 1 },
    responseTimeMinutes: { type: Number, min: 0 },
    responseSamples: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Search indexes for artisan discovery
artisanProfileSchema.index({
  businessName: 'text',
  trade: 'text',
  bio: 'text',
  location: 'text',
  postCode: 'text',
});
artisanProfileSchema.index({ availabilityStatus: 1, rating: -1 });
artisanProfileSchema.index({ baseLocation: '2dsphere' }, { sparse: true });

export const ArtisanProfile = model<IArtisanProfile, ArtisanProfileModel>(
  'ArtisanProfile',
  artisanProfileSchema,
);
