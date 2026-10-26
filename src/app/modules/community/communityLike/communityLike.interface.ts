import { Model, Types } from 'mongoose';

export type ICommunityLike = {
  post: Types.ObjectId;
  user: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CommunityLikeModel = Model<ICommunityLike> & {
  isLikeByMe: (
    userId: Types.ObjectId | string,
    postId: Types.ObjectId | string,
  ) => Promise<boolean>;
};
