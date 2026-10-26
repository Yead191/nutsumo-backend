import { Schema, Types, model } from 'mongoose';
import {
  ICommunityLike,
  CommunityLikeModel,
} from './communityLike.interface';

const communityLikeSchema = new Schema<ICommunityLike, CommunityLikeModel>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicate likes per post per user
communityLikeSchema.index(
  {
    post: 1,
    user: 1,
  },
  { unique: true },
);

communityLikeSchema.statics.isLikeByMe = async function (
  userId: Types.ObjectId | string,
  postId: Types.ObjectId | string,
) {
  if (!userId || !postId) return false;
  const isLiked = await this.exists({ user: userId, post: postId });
  return !!isLiked;
};

export const CommunityLike = model<ICommunityLike, CommunityLikeModel>(
  'CommunityLike',
  communityLikeSchema,
  'community_likes',
);
