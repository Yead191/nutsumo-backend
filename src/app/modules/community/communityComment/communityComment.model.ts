import { Schema, Types, model } from 'mongoose';
import {
  ICommunityComment,
  CommunityCommentModel,
  ICommunityCommentLike,
  CommunityCommentLikeModel,
} from './communityComment.interface';

const communityCommentSchema = new Schema<
  ICommunityComment,
  CommunityCommentModel
>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'CommunityComment',
      default: null,
    },
    totalLikes: {
      type: Number,
      default: 0,
    },
    totalReplies: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

communityCommentSchema.index({
  post: 1,
  parentComment: 1,
  createdAt: -1,
});

export const CommunityComment = model<
  ICommunityComment,
  CommunityCommentModel
>('CommunityComment', communityCommentSchema, 'community_comments');

const communityCommentLikeSchema = new Schema<
  ICommunityCommentLike,
  CommunityCommentLikeModel
>(
  {
    comment: {
      type: Schema.Types.ObjectId,
      ref: 'CommunityComment',
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

communityCommentLikeSchema.index(
  {
    comment: 1,
    user: 1,
  },
  { unique: true },
);

communityCommentLikeSchema.statics.isLikeByMe = async function (
  userId: Types.ObjectId | string,
  commentId: Types.ObjectId | string,
) {
  if (!userId || !commentId) return false;
  const isLiked = await this.exists({ user: userId, comment: commentId });
  return !!isLiked;
};

export const CommunityCommentLike = model<
  ICommunityCommentLike,
  CommunityCommentLikeModel
>(
  'CommunityCommentLike',
  communityCommentLikeSchema,
  'community_comment_likes',
);
