import { Model, Types } from 'mongoose';

export type IComment = {
  blog: Types.ObjectId;
  author: Types.ObjectId;
  text: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CommentModel = Model<IComment>;
