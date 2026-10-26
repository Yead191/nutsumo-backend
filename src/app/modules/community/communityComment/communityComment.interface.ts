import { Model, Types } from 'mongoose';

export type ICommunityComment = {
  post: Types.ObjectId;
  author: Types.ObjectId;
  text: string;
  parentComment?: Types.ObjectId | null;
  totalLikes: number;
  totalReplies: number;
  isLikedByMe?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CommunityCommentModel = Model<ICommunityComment>;

export type ICommunityCommentLike = {
  comment: Types.ObjectId;
  user: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CommunityCommentLikeModel = Model<ICommunityCommentLike> & {
  isLikeByMe: (
    userId: Types.ObjectId | string,
    commentId: Types.ObjectId | string,
  ) => Promise<boolean>;
};
