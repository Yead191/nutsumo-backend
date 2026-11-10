import { Schema, model } from 'mongoose';
import { IReview, ReviewModel } from './review.interface';
import { REVIEW_STATUSES } from './review.constants';

const reviewReplySchema = new Schema(
  {
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    repliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const reviewSchema = new Schema<IReview, ReviewModel>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
      index: true,
    },
    job: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    artisan: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    qualityRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    communicationRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    timelinessRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    reply: {
      type: reviewReplySchema,
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(REVIEW_STATUSES),
      default: REVIEW_STATUSES.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

reviewSchema.index({ artisan: 1, createdAt: -1 });
reviewSchema.index({ customer: 1, createdAt: -1 });
reviewSchema.index({ artisan: 1, rating: -1 });

export const Review = model<IReview, ReviewModel>('Review', reviewSchema);
