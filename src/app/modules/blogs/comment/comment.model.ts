import { Schema, model } from 'mongoose';
import { IComment, CommentModel } from './comment.interface';

const commentSchema = new Schema<IComment, CommentModel>(
  {
    blog: {
      type: Schema.Types.ObjectId,
      ref: 'Blog',
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
  },
  { timestamps: true },
);

commentSchema.index({
  blog: 1,
  createdAt: -1,
});

export const Comment = model<IComment, CommentModel>('Comment', commentSchema);

// Safely drop legacy post_1_createdAt_-1 index if it exists in MongoDB
Comment.collection.dropIndex('post_1_createdAt_-1').catch(() => {
  // Ignored if index does not exist
});
