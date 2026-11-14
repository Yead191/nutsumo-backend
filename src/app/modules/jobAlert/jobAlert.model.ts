import { Schema, model } from 'mongoose';

const jobAlertSchema = new Schema(
  {
    artisan: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    keywords: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    normalizedKeywords: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

jobAlertSchema.index(
  { artisan: 1, normalizedKeywords: 1 },
  { unique: true },
);

export const JobAlert = model('JobAlert', jobAlertSchema);
