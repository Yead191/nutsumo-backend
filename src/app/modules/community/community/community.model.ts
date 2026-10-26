import { Schema, model } from 'mongoose';
import { ICommunity, CommunityModel } from './community.interface';

const communitySchema = new Schema<ICommunity, CommunityModel>(
  {
    title: {
      type: String,
      trim: true,
      default: '',
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalLikes: {
      type: Number,
      default: 0,
    },
    totalComments: {
      type: Number,
      default: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['published', 'draft', 'archived'],
      default: 'published',
    },
  },
  { timestamps: true },
);

communitySchema.index({ isPinned: -1, createdAt: -1 });

export const Community = model<ICommunity, CommunityModel>(
  'Community',
  communitySchema,
);
