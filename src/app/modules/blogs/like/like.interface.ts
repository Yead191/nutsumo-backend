import { Model, Types } from 'mongoose';

export type ILike = {
  blog: Types.ObjectId;
  user: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export type LikeModel = Model<ILike> & {
  isLikeByMe: (
    userId: Types.ObjectId | string,
    blogId: Types.ObjectId | string,
  ) => Promise<boolean>;
};
