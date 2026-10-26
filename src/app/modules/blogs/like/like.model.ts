import { Schema, Types, model } from 'mongoose';
import { ILike, LikeModel } from './like.interface';

const likeSchema = new Schema<ILike, LikeModel>(
  {
    blog: {
      type: Schema.Types.ObjectId,
      ref: 'Blog',
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

// prevent duplicate like
likeSchema.index(
  {
    blog: 1,
    user: 1,
  },
  { unique: true },
);

likeSchema.statics.isLikeByMe = async function (
  userId: Types.ObjectId | string,
  blogId: Types.ObjectId | string,
) {
  const isLiked = await this.exists({ user: userId, blog: blogId });
  return !!isLiked;
};

export const Like = model<ILike, LikeModel>('Like', likeSchema);

// Safely drop legacy post_1_user_1 index if it exists in MongoDB
Like.collection.dropIndex('post_1_user_1').catch(() => {
  // Ignored if index does not exist
});
